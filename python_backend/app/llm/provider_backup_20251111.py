"""
QuestKeeperAI - LLM Provider Abstraction
BYOK (Bring Your Own Key) support for multiple LLM providers.
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)

@dataclass
class Message:
    """Chat message"""
    role: str  # user, assistant, system
    content: str

@dataclass
class Tool:
    """Tool definition for function calling"""
    name: str
    description: str
    input_schema: Dict[str, Any]

@dataclass
class ToolCall:
    """Result of a tool call from LLM"""
    id: str
    name: str
    args: Dict[str, Any]

class LLMProvider(ABC):
    """Abstract base class for LLM providers"""
    
    @abstractmethod
    async def chat(
        self,
        messages: List[Message],
        system_prompt: Optional[str] = None,
        tools: Optional[List[Tool]] = None,
        temperature: float = 0.7,
        max_tokens: int = 2048
    ) -> Dict[str, Any]:
        """
        Send messages to LLM and get response
        
        Returns:
            {
                "content": str,           # Text response
                "tool_calls": [ToolCall], # Tool calls if any
                "stop_reason": str        # Why generation stopped
            }
        """
        pass
    
    @abstractmethod
    async def get_available_models(self) -> List[str]:
        """Get list of available models for this provider"""
        pass
    
    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Get provider name"""
        pass

class AnthropicProvider(LLMProvider):
    """Anthropic Claude API provider"""
    
    def __init__(self, api_key: str, model: str = "claude-sonnet-4-20250514"):
        try:
            from anthropic import Anthropic
            self.client = Anthropic(api_key=api_key)
            self.model = model
        except ImportError:
            raise ImportError("anthropic package not installed. Run: pip install anthropic")
    
    @property
    def provider_name(self) -> str:
        return "Anthropic Claude"
    
    async def chat(
        self,
        messages: List[Message],
        system_prompt: Optional[str] = None,
        tools: Optional[List[Tool]] = None,
        temperature: float = 0.7,
        max_tokens: int = 2048
    ) -> Dict[str, Any]:
        """Chat with Claude using tool use"""
        
        # Convert messages to Anthropic format
        messages_formatted = [
            {"role": msg.role, "content": msg.content}
            for msg in messages
        ]
        
        # Format tools for Anthropic
        tools_formatted = None
        if tools:
            tools_formatted = [
                {
                    "name": tool.name,
                    "description": tool.description,
                    "input_schema": tool.input_schema
                }
                for tool in tools
            ]
        
        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=max_tokens,
                system=system_prompt or "",
                tools=tools_formatted,
                messages=messages_formatted,
                temperature=temperature
            )
            
            # Parse response
            content = ""
            tool_calls = []
            
            for block in response.content:
                if hasattr(block, 'text'):
                    content = block.text
                elif block.type == "tool_use":
                    tool_calls.append(ToolCall(
                        id=block.id,
                        name=block.name,
                        args=block.input
                    ))
            
            return {
                "content": content,
                "tool_calls": tool_calls,
                "stop_reason": response.stop_reason
            }
        except Exception as e:
            logger.error(f"Anthropic API error: {e}")
            raise
    
    async def get_available_models(self) -> List[str]:
        return [
            "claude-sonnet-4-20250514",
            "claude-sonnet-4-20241022",
            "claude-opus-4-20241022",
            "claude-3-5-sonnet-20241022"
        ]

class OpenAIProvider(LLMProvider):
    """OpenAI API provider"""
    
    def __init__(self, api_key: str, model: str = "gpt-4-turbo"):
        try:
            from openai import AsyncOpenAI
            self.client = AsyncOpenAI(api_key=api_key)
            self.model = model
        except ImportError:
            raise ImportError("openai package not installed. Run: pip install openai")
    
    @property
    def provider_name(self) -> str:
        return "OpenAI GPT"
    
    async def chat(
        self,
        messages: List[Message],
        system_prompt: Optional[str] = None,
        tools: Optional[List[Tool]] = None,
        temperature: float = 0.7,
        max_tokens: int = 2048
    ) -> Dict[str, Any]:
        """Chat with GPT using function calling"""
        
        # Convert messages
        messages_formatted = []
        if system_prompt:
            messages_formatted.append({"role": "system", "content": system_prompt})
        
        messages_formatted.extend([
            {"role": msg.role, "content": msg.content}
            for msg in messages
        ])
        
        # Format tools
        tools_formatted = None
        if tools:
            tools_formatted = [
                {
                    "type": "function",
                    "function": {
                        "name": tool.name,
                        "description": tool.description,
                        "parameters": tool.input_schema
                    }
                }
                for tool in tools
            ]
        
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages_formatted,
                tools=tools_formatted,
                temperature=temperature,
                max_tokens=max_tokens
            )
            
            message = response.choices[0].message
            content = message.content or ""
            
            tool_calls = []
            if message.tool_calls:
                for tc in message.tool_calls:
                    import json
                    tool_calls.append(ToolCall(
                        id=tc.id,
                        name=tc.function.name,
                        args=json.loads(tc.function.arguments)
                    ))
            
            return {
                "content": content,
                "tool_calls": tool_calls,
                "stop_reason": response.choices[0].finish_reason
            }
        except Exception as e:
            logger.error(f"OpenAI API error: {e}")
            raise
    
    async def get_available_models(self) -> List[str]:
        return ["gpt-4-turbo", "gpt-4", "gpt-3.5-turbo"]

class GeminiProvider(LLMProvider):
    """Google Gemini API provider (existing implementation)"""
    
    def __init__(self, api_key: str, model: str = "gemini-1.5-pro"):
        try:
            from google import genai
            from google.genai import types
            self.client = genai.Client(api_key=api_key)
            self.model = model
            self.types = types
        except ImportError:
            raise ImportError("google-genai package not installed. Run: pip install google-genai")
    
    @property
    def provider_name(self) -> str:
        return "Google Gemini"
    
    async def chat(
        self,
        messages: List[Message],
        system_prompt: Optional[str] = None,
        tools: Optional[List[Tool]] = None,
        temperature: float = 0.7,
        max_tokens: int = 2048
    ) -> Dict[str, Any]:
        """Chat with Gemini"""
        
        # Convert messages to Gemini format
        messages_formatted = [
            {"role": msg.role, "parts": [{"text": msg.content}]}
            for msg in messages
        ]
        
        # Format tools if provided
        tools_formatted = None
        if tools:
            tools_formatted = [
                self.types.Tool(
                    function_declarations=[
                        self.types.FunctionDeclaration(
                            name=tool.name,
                            description=tool.description,
                            parameters=tool.input_schema
                        )
                        for tool in tools
                    ]
                )
            ]
        
        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=messages_formatted,
                config=self.types.GenerateContentConfig(
                    temperature=temperature,
                    max_output_tokens=max_tokens,
                    system_instruction=system_prompt,
                    tools=tools_formatted
                )
            )
            
            content = response.text if hasattr(response, 'text') else ""
            tool_calls = []
            
            # Parse function calls from response
            if hasattr(response, 'candidates') and response.candidates:
                for part in response.candidates[0].content.parts:
                    if hasattr(part, 'function_call'):
                        fc = part.function_call
                        tool_calls.append(ToolCall(
                            id=fc.name,  # Gemini doesn't provide separate ID
                            name=fc.name,
                            args=dict(fc.args)
                        ))
            
            return {
                "content": content,
                "tool_calls": tool_calls,
                "stop_reason": "complete"
            }
        except Exception as e:
            logger.error(f"Gemini API error: {e}")
            raise
    
    async def get_available_models(self) -> List[str]:
        return [
            "gemini-2.0-flash-exp",
            "gemini-1.5-pro",
            "gemini-1.5-flash",
            "gemini-pro"
        ]

class LocalProvider(LLMProvider):
    """Local LLM provider (Ollama, vLLM, etc.)"""

    def __init__(self, url: str, model: str = "mistral"):
        import httpx
        self.url = url
        self.model = model
        self.client = httpx.AsyncClient(base_url=url, timeout=60.0)

    @property
    def provider_name(self) -> str:
        return "Local LLM"

    async def chat(
        self,
        messages: List[Message],
        system_prompt: Optional[str] = None,
        tools: Optional[List[Tool]] = None,
        temperature: float = 0.7,
        max_tokens: int = 2048
    ) -> Dict[str, Any]:
        """Chat with local LLM (Ollama format)"""

        # Convert messages
        messages_formatted = []
        if system_prompt:
            messages_formatted.append({"role": "system", "content": system_prompt})

        messages_formatted.extend([
            {"role": msg.role, "content": msg.content}
            for msg in messages
        ])

        try:
            response = await self.client.post(
                "/api/chat",
                json={
                    "model": self.model,
                    "messages": messages_formatted,
                    "stream": False,
                    "options": {
                        "temperature": temperature,
                        "num_predict": max_tokens
                    }
                }
            )

            data = response.json()
            content = data.get("message", {}).get("content", "")

            # Local models typically don't support tool calling yet
            return {
                "content": content,
                "tool_calls": [],
                "stop_reason": "complete"
            }
        except Exception as e:
            logger.error(f"Local LLM error: {e}")
            raise

    async def get_available_models(self) -> List[str]:
        """Query local LLM for available models"""
        try:
            response = await self.client.get("/api/tags")
            data = response.json()
            return [model["name"] for model in data.get("models", [])]
        except:
            return [self.model]  # Fallback to configured model

class OpenRouterProvider(LLMProvider):
    """OpenRouter API provider - unified access to multiple LLMs"""

    def __init__(self, api_key: str, model: str = "openai/gpt-4-turbo"):
        try:
            from openai import AsyncOpenAI
            # OpenRouter uses OpenAI-compatible API with custom base URL
            self.client = AsyncOpenAI(
                api_key=api_key,
                base_url="https://openrouter.ai/api/v1"
            )
            self.model = model
            self.api_key = api_key
        except ImportError:
            raise ImportError("openai package not installed. Run: pip install openai")

    @property
    def provider_name(self) -> str:
        return "OpenRouter"

    async def chat(
        self,
        messages: List[Message],
        system_prompt: Optional[str] = None,
        tools: Optional[List[Tool]] = None,
        temperature: float = 0.7,
        max_tokens: int = 2048
    ) -> Dict[str, Any]:
        """Chat via OpenRouter - supports multiple models"""

        # Convert messages
        messages_formatted = []
        if system_prompt:
            messages_formatted.append({"role": "system", "content": system_prompt})

        messages_formatted.extend([
            {"role": msg.role, "content": msg.content}
            for msg in messages
        ])

        # Format tools
        tools_formatted = None
        if tools:
            tools_formatted = [
                {
                    "type": "function",
                    "function": {
                        "name": tool.name,
                        "description": tool.description,
                        "parameters": tool.input_schema
                    }
                }
                for tool in tools
            ]

        try:
            # OpenRouter-specific headers for better routing and analytics
            extra_headers = {
                "HTTP-Referer": "https://questkeeper.ai",
                "X-Title": "QuestKeeperAI"
            }

            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages_formatted,
                tools=tools_formatted,
                temperature=temperature,
                max_tokens=max_tokens,
                extra_headers=extra_headers
            )

            message = response.choices[0].message
            content = message.content or ""

            tool_calls = []
            if message.tool_calls:
                for tc in message.tool_calls:
                    import json
                    tool_calls.append(ToolCall(
                        id=tc.id,
                        name=tc.function.name,
                        args=json.loads(tc.function.arguments)
                    ))

            return {
                "content": content,
                "tool_calls": tool_calls,
                "stop_reason": response.choices[0].finish_reason
            }
        except Exception as e:
            logger.error(f"OpenRouter API error: {e}")
            raise

    async def get_available_models(self) -> List[str]:
        """Get popular models available on OpenRouter"""
        # OpenRouter has 50+ models, returning popular ones
        return [
            # OpenAI models
            "openai/gpt-4-turbo",
            "openai/gpt-4",
            "openai/gpt-3.5-turbo",
            # Anthropic models
            "anthropic/claude-3.5-sonnet",
            "anthropic/claude-3-opus",
            "anthropic/claude-3-haiku",
            # Google models
            "google/gemini-pro",
            "google/gemini-pro-vision",
            # Meta models
            "meta-llama/llama-3-70b-instruct",
            "meta-llama/llama-3-8b-instruct",
            # Mistral models
            "mistralai/mistral-large",
            "mistralai/mistral-medium",
            # Open source models
            "nous-hermes-2-mixtral-8x7b-dpo",
            "openchat/openchat-7b"
        ]


def create_llm_provider(
    provider: str = None,
    api_key: str = None,
    model: str = None,
    local_url: str = None
) -> LLMProvider:
    """
    Factory function to create appropriate LLM provider
    
    Args:
        provider: Provider name (anthropic, openai, gemini, local)
        api_key: API key for the provider
        model: Model name (optional, uses defaults)
        local_url: URL for local LLM (only for local provider)
    
    Returns:
        Configured LLMProvider instance
    """
    from app.config import settings, LLMProvider as LLMProviderEnum
    
    # Use settings defaults if not provided
    if provider is None:
        provider = settings.LLM_PROVIDER.value
    
    if api_key is None:
        api_key = settings.get_active_api_key()
    
    # Create provider
    if provider == "anthropic" or provider == LLMProviderEnum.ANTHROPIC:
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY not set")
        return AnthropicProvider(api_key, model or "claude-sonnet-4-20250514")
    
    elif provider == "openai" or provider == LLMProviderEnum.OPENAI:
        if not api_key:
            raise ValueError("OPENAI_API_KEY not set")
        return OpenAIProvider(api_key, model or "gpt-4-turbo")
    
    elif provider == "gemini" or provider == LLMProviderEnum.GEMINI:
        if not api_key:
            raise ValueError("GEMINI_API_KEY not set")
        return GeminiProvider(api_key, model or "gemini-1.5-pro")
    
    elif provider == "openrouter" or provider == LLMProviderEnum.OPENROUTER:
        if not api_key:
            raise ValueError("OPENROUTER_API_KEY not set")
        return OpenRouterProvider(api_key, model or "openai/gpt-4-turbo")

    elif provider == "local" or provider == LLMProviderEnum.LOCAL:
        url = local_url or settings.LOCAL_LLM_URL
        model_name = model or settings.LOCAL_LLM_MODEL
        return LocalProvider(url, model_name)

    else:
        raise ValueError(f"Unknown LLM provider: {provider}")
