import os
import logging
from flask import Blueprint, request, jsonify
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

gemini_bp = Blueprint("gemini", __name__)

@gemini_bp.route("/gemini-search-term", methods=["POST"])
def groq_search_term_provider():
    # Validate request
    data = request.get_json()
    if not data:
        logger.error("No JSON body provided")
        return jsonify({"status": "error", "message": "No JSON body provided"}), 400
    
    imperfect_search_term = data.get("imperfect_search_term", "").strip()
    
    if not imperfect_search_term:
        logger.error("Empty search term provided")
        return jsonify({"status": "error", "message": "Field 'imperfect_search_term' is required and cannot be empty"}), 400
    
    # Validate API key
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        logger.error("GROQ_API_KEY not found in environment variables")
        return jsonify({"status": "error", "message": "GROQ_API_KEY not configured"}), 500
    
    logger.info(f"API Key present: {bool(api_key)}, Length: {len(api_key) if api_key else 0}")
    logger.info(f"Processing search term: {imperfect_search_term}")

    try:
        # Initialize Groq Client
        client = Groq(api_key=api_key)
        
        logger.info("Groq client initialized, making API request...")
        
        # Create completion
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system", 
                    "content": "You are a search query optimizer. Convert the user's input into 2-3 relevant keywords for a database search. Respond with ONLY the keywords separated by spaces. Do not include quotes, punctuation, or extra text."
                },
                {
                    "role": "user", 
                    "content": imperfect_search_term
                }
            ],
            temperature=0.3,
            max_tokens=50
        )
        
        search_term = completion.choices[0].message.content.strip()
        
        logger.info(f"Successfully generated keywords: {search_term}")
        
        if not search_term:
            logger.error("AI returned empty response")
            return jsonify({"status": "error", "message": "AI returned empty response"}), 500
        
        return jsonify({
            "status": "success",
            "search_term": search_term,
            "original_term": imperfect_search_term
        })
        
    except Exception as e:
        # Log the full error with traceback
        logger.error(f"Groq API Error: {str(e)}", exc_info=True)
        logger.error(f"Error type: {type(e).__name__}")
        
        # Return more detailed error in development
        error_detail = str(e)
        if "connection" in error_detail.lower() or "timeout" in error_detail.lower():
            return jsonify({
                "status": "error", 
                "message": "Cannot connect to Groq API. Check network/firewall settings.",
                "detail": error_detail
            }), 500
        elif "api key" in error_detail.lower() or "authentication" in error_detail.lower():
            return jsonify({
                "status": "error", 
                "message": "API key authentication failed.",
                "detail": error_detail
            }), 500
        else:
            return jsonify({
                "status": "error", 
                "message": "Failed to generate search keywords.",
                "detail": error_detail
            }), 500
        

# test
@gemini_bp.route("/test-groq-connection", methods=["GET"])
def test_groq_connection():
    api_key = os.getenv("GROQ_API_KEY")
    
    if not api_key:
        return jsonify({"status": "error", "message": "API key not found"}), 500
    
    try:
        import socket
        
        # Test DNS resolution
        socket.gethostbyname("api.groq.com")
        
        # Test Groq API
        client = Groq(api_key=api_key, timeout=10.0)
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": "test"}],
            max_tokens=5
        )
        
        return jsonify({
            "status": "success",
            "message": "Groq API connection successful",
            "response": response.choices[0].message.content
        })
        
    except socket.gaierror as e:
        return jsonify({
            "status": "error",
            "message": "DNS resolution failed",
            "detail": str(e)
        }), 500
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": "Connection test failed",
            "detail": str(e),
            "type": type(e).__name__
        }), 500