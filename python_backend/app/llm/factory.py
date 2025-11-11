from app.config import settings, LLMProvider as LLMProviderEnum
from .provider import LLMProvider, AnthropicProvider, OpenAIProvider, LocalProvider, GeminiProvider
import logging

logger = logging.getLogger(__name__)

def create_llm_provider() -> LLMProvider:
    """Factory function to create appropriate LLM provider"""

    provider = settings.LLM_PROVIDER

    if provider == LLMProviderEnum.ANTHROPIC:
        if not settings.ANTHROPIC_API_KEY:
            raise ValueError("ANTHROPIC_API_KEY not set")
        return AnthropicProvider(settings.ANTHROPIC_API_KEY)

    elif provider == LLMProviderEnum.OPENAI:
        if not settings.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY not set")
        return OpenAIProvider(settings.OPENAI_API_KEY)

    elif provider == LLMProviderEnum.LOCAL:
        return LocalProvider(settings.LOCAL_LLM_URL, settings.LOCAL_LLM_MODEL)

    elif provider == LLMProviderEnum.GEMINI:
        if not settings.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY not set")
        return GeminiProvider(settings.GEMINI_API_KEY)

    else:
        raise ValueError(f"Unknown LLM provider: {provider}")
