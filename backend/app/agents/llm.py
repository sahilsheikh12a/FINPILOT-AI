"""LLM provider abstraction — supports Gemini and OpenAI."""
from functools import lru_cache
from app.core.config import settings


@lru_cache(maxsize=1)
def get_llm():
    if settings.LLM_PROVIDER == "gemini" and settings.GEMINI_API_KEY:
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(
            model=settings.LLM_MODEL,
            google_api_key=settings.GEMINI_API_KEY,
            temperature=0.3,
        )
    elif settings.LLM_PROVIDER == "openai" and settings.OPENAI_API_KEY:
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=settings.LLM_MODEL or "gpt-4o-mini",
            api_key=settings.OPENAI_API_KEY,
            temperature=0.3,
        )
    else:
        raise RuntimeError(
            "No LLM configured. Set GEMINI_API_KEY or OPENAI_API_KEY in .env"
        )
