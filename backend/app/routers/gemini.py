import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from groq import AsyncGroq
from app.config import get_settings

router = APIRouter(prefix="/api/gemini", tags=["gemini"])
logger = logging.getLogger(__name__)
settings = get_settings()


class SearchTermRequest(BaseModel):
    imperfect_search_term: str


@router.post("/gemini-search-term")
async def groq_search_term_provider(body: SearchTermRequest):
    if not body.imperfect_search_term.strip():
        raise HTTPException(status_code=400, detail="Field 'imperfect_search_term' is required and cannot be empty")

    try:
        client = AsyncGroq(api_key=settings.GROQ_API_KEY)
        completion = await client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a search query optimizer. Convert the user's input into 2-3 relevant "
                        "keywords for a database search. Respond with ONLY the keywords separated by spaces. "
                        "Do not include quotes, punctuation, or extra text."
                    ),
                },
                {"role": "user", "content": body.imperfect_search_term},
            ],
            max_tokens=50,
            temperature=0.3,
        )
        keywords = completion.choices[0].message.content.strip()
        logger.info("Groq keywords for '%s': %s", body.imperfect_search_term, keywords)
        return {"status": "success", "search_term": keywords, "original_term": body.imperfect_search_term}
    except Exception as e:
        logger.error("Groq API error: %s", e)
        raise HTTPException(status_code=500, detail="Failed to process search term")


@router.get("/test-groq-connection")
async def test_groq_connection():
    try:
        client = AsyncGroq(api_key=settings.GROQ_API_KEY)
        await client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": "Reply with: ok"}],
            max_tokens=5,
        )
        return {"status": "success", "message": "Groq connection successful"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Groq connection failed: {str(e)}")
