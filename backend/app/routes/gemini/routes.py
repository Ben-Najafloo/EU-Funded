import os
from flask import Blueprint, request, jsonify
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

gemini_bp = Blueprint("gemini", __name__)

@gemini_bp.route("/gemini-search-term", methods=["POST"])
def groq_search_term_provider():
    # Validate request
    data = request.get_json()
    if not data:
        return jsonify({"status": "error", "message": "No JSON body provided"}), 400
    
    imperfect_search_term = data.get("imperfect_search_term", "").strip()
    
    if not imperfect_search_term:
        return jsonify({"status": "error", "message": "Field 'imperfect_search_term' is required and cannot be empty"}), 400
    
    # Validate API key
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return jsonify({"status": "error", "message": "GROQ_API_KEY not configured"}), 500

    try:
        # Initialize Groq Client
        client = Groq(api_key=api_key)
        
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
            temperature=0.3,  # Lower temperature for more consistent results
            max_tokens=50
        )
        
        search_term = completion.choices[0].message.content.strip()
        
        if not search_term:
            return jsonify({"status": "error", "message": "AI returned empty response"}), 500
        
        return jsonify({
            "status": "success",
            "search_term": search_term,
            "original_term": imperfect_search_term
        })
        
    except Exception as e:
        print(f"Groq API Error: {str(e)}")  # Log for debugging
        return jsonify({
            "status": "error", 
            "message": "Failed to generate search keywords. Please try again."
        }), 500