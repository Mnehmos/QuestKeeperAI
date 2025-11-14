"""
QuestKeeperAI - LLM Provider Abstraction (Updated November 2025)
BYOK (Bring Your Own Key) support for multiple LLM providers.

Updated with latest models as of November 2025:
- Anthropic Claude 4.5 family (Sonnet 4.5, Haiku 4.5, Opus 4.1)
- OpenAI GPT-5 and GPT-4.1 families
- Google Gemini 2.5 and 2.0 families
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

# Model aliases for easier selection
MODEL_ALIASES = {
    # Anthropic - Tier-based aliases
    "claude-best": "claude-opus-4-1",
    "claude-balanced": "claude-sonnet-4-5",
    "claude-fast": "claude-haiku-4-5",
    "claude-budget": "claude-haiku-4-5",
    
    # OpenAI - Tier-based aliases
    "gpt-best": "gpt-5",
    "gpt-balanced": "gpt-4.1",
    "gpt-fast": "gpt-4.1-mini",
    "gpt-budget": "gpt-5-nano",
    
    # Google - Tier-based aliases (Updated to 2.5 family)
    "gemini-best": "gemini-2.5-pro",
    "gemini-balanced": "gemini-2.5-flash",
    "gemini-fast": "gemini-2.5-flash",
    "gemini-budget": "gemini-2.0-flash-lite",
}

# Deprecated models with migration paths
DEPRECATED_MODELS = {
    # Anthropic
    "claude-sonnet-4-20250514": "claude-sonnet-4-5",
    "claude-3-5-sonnet-20241022": "claude-sonnet-4-5",
    "claude-3-opus-20240229": "claude-opus-4-1",
    
    # OpenAI
    "gpt-4-turbo": "gpt-4.1",
    "gpt-4o": "gpt-4.1",
    "gpt-3.5-turbo": "gpt-4.1-mini",
    
    # Google (Updated deprecation paths to 2.5)
    "gemini-1.5-pro": "gemini-2.5-pro",
    "gemini-1.5-flash": "gemini-2.5-flash",
    "gemini-pro": "gemini-2.5-flash",
    "gemini-2.0-flash": "gemini-2.5-flash",  # Upgrade 2.0 → 2.5
}

class LLMProvider(ABC):
    """Abstract base class for LLM providers"""
    
    @abstractmethod
    async def chat(
        self,
        messages: List[Message],
        system_prompt: Optional[str] = None,
        tools: Optional[List[Tool]] = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
        **kwargs  # For provider-specific parameters
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
    
    def resolve_model_alias(self, model: str) -> str:
        """Resolve model alias to actual model ID"""
        # Check for deprecated models
        if model in DEPRECATED_MODELS:
            new_model = DEPRECATED_MODELS[model]
            logger.warning(f"Model '{model}' is deprecated. Using '{new_model}' instead.")
            return new_model
        
        # Check for aliases
        if model in MODEL_ALIASES:
            resolved = MODEL_ALIASES[model]
            logger.info(f"Resolved alias '{model}' to '{resolved}'")
            return resolved
        
        return model

class AnthropicProvider(LLMProvider):
    """Anthropic Claude API provider - Updated November 2025"""
    
    def __init__(self, api_key: str, model: str = "claude-sonnet-4-5"):
        try:
            from anthropic import Anthropic
            self.client = Anthropic(api_key=api_key)
            self.model = self.resolve_model_alias(model)
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
        max_tokens: int = 2048,
        **kwargs
    ) -> Dict[str, Any]:
        """Chat with Claude using tool use"""
        
        # Handle extended context window (1M tokens with beta header)
        use_extended_context = kwargs.get('extended_context', False)
        thinking_mode = kwargs.get('thinking_mode', False)  # For Claude 3.7
        
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
            # Build request parameters
            request_params = {
                "model": self.model,
                "max_tokens": max_tokens,
                "system": system_prompt or "",
                "messages": messages_formatted,
                "temperature": temperature
            }
            
            if tools_formatted:
                request_params["tools"] = tools_formatted
            
            # Add beta headers if needed
            extra_headers = {}
            if use_extended_context and "sonnet-4-5" in self.model:
                extra_headers["anthropic-beta"] = "context-1m-2025-08-07"
            
            if thinking_mode and "3-7" in self.model:
                extra_headers["anthropic-beta"] = "extended-thinking-2025-02-24"
            
            if extra_headers:
                request_params["extra_headers"] = extra_headers
            
            response = self.client.messages.create(**request_params)
            
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
        """Current production models as of November 2025"""
        return [
            # Latest models (November 2025)
            "claude-sonnet-4-5",          # Default: Best coding model
            "claude-haiku-4-5",           # Fast & cheap: 90% of Sonnet at 1/3 cost
            "claude-opus-4-1",            # Most powerful: Complex reasoning
            
            # Hybrid reasoning model
            "claude-sonnet-3-7",          # Toggleable thinking mode
            
            # Still supported (legacy)
            "claude-sonnet-4",            # May 2025 release
            "claude-3-5-sonnet-20241022", # Legacy
            
            # Aliases for convenience
            "claude-best",
            "claude-balanced", 
            "claude-fast",
        ]

class OpenAIProvider(LLMProvider):
    """OpenAI API provider - Updated November 2025"""
    
    def __init__(self, api_key: str, model: str = "gpt-4.1"):
        try:
            from openai import AsyncOpenAI
            self.client = AsyncOpenAI(api_key=api_key)
            self.model = self.resolve_model_alias(model)
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
        max_tokens: int = 2048,
        **kwargs
    ) -> Dict[str, Any]:
        """Chat with GPT using function calling"""
        
        # Handle reasoning effort for GPT-5 models
        reasoning_effort = kwargs.get('reasoning_effort', 'medium')  # minimal, low, medium, high
        
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
            request_params = {
                "model": self.model,
                "messages": messages_formatted,
                "temperature": temperature,
                "max_tokens": max_tokens
            }
            
            if tools_formatted:
                request_params["tools"] = tools_formatted
            
            # Add reasoning effort for GPT-5 models
            if "gpt-5" in self.model or "o3" in self.model or "o4" in self.model:
                request_params["reasoning_effort"] = reasoning_effort
            
            response = await self.client.chat.completions.create(**request_params)
            
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
        """Current production models as of November 2025"""
        return [
            # GPT-5 Family (Reasoning Models) - August 2025
            "gpt-5",              # Best for coding and agentic tasks
            "gpt-5-mini",         # Faster, more affordable reasoning
            "gpt-5-nano",         # Cheapest reasoning model
            
            # GPT-4.1 Family (Standard Models) - Early 2025
            "gpt-4.1",            # Best general purpose
            "gpt-4.1-mini",       # Fast and efficient
            "gpt-4.1-nano",       # Ultra-fast, ultra-cheap
            
            # Voice/Realtime Models
            "gpt-realtime",       # Advanced speech-to-speech
            "gpt-realtime-mini",  # Cheaper voice model
            
            # Research Preview (being deprecated)
            "gpt-4.5",            # Creative, broad knowledge (retire July 2025)
            
            # Aliases for convenience
            "gpt-best",
            "gpt-balanced",
            "gpt-fast",
            "gpt-budget",
        ]

class GeminiProvider(LLMProvider):
    """Google Gemini API provider - Updated November 2025"""
    
    def __init__(self, api_key: str, model: str = "gemini-2.5-flash"):
        try:
            from google import genai
            from google.genai import types
            self.client = genai.Client(api_key=api_key)
            self.model = self.resolve_model_alias(model)
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
        max_tokens: int = 2048,
        **kwargs
    ) -> Dict[str, Any]:
        """Chat with Gemini"""
        
        # Handle thinking mode for Gemini 2.0 Flash Thinking
        thinking_mode = kwargs.get('thinking_mode', False)

        # Convert messages to Gemini format
        # Gemini expects "user" and "model" roles, not "assistant"
        messages_formatted = []
        for msg in messages:
            # Map role names: assistant -> model, skip system (handled separately)
            if msg.role == "system":
                continue  # System messages handled via system_instruction

            gemini_role = "model" if msg.role == "assistant" else msg.role
            messages_formatted.append({
                "role": gemini_role,
                "parts": [{"text": msg.content}]
            })
        
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
            # Use thinking variant if requested
            model_to_use = self.model
            if thinking_mode and "flash" in self.model.lower():
                model_to_use = f"{self.model}-thinking-exp"
            
            response = self.client.models.generate_content(
                model=model_to_use,
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
                    if hasattr(part, 'function_call') and part.function_call:
                        fc = part.function_call
                        if fc and hasattr(fc, 'name') and fc.name:
                            tool_calls.append(ToolCall(
                                id=fc.name,  # Gemini doesn't provide separate ID
                                name=fc.name,
                                args=dict(fc.args) if hasattr(fc, 'args') else {}
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
        """Current production models as of November 2025"""
        return [
            # Gemini 2.5 Family (Latest - 2025)
            "gemini-2.5-pro",          # Best overall, 2M context window!
            "gemini-2.5-flash",        # Coming soon: Fast + thinking
            
            # Gemini 2.0 Family (Current Production)
            "gemini-2.0-flash",        # Default: Fast, efficient, 1M context
            "gemini-2.0-flash-lite",   # Most cost-efficient
            "gemini-2.0-pro-exp",      # Experimental: Best coding
            
            # Thinking variants
            "gemini-2.0-flash-thinking-exp",  # Reasoning capability
            
            # Specialized models
            "gemini-2.5-computer-use",  # UI interaction agent
            
            # Aliases for convenience
            "gemini-best",
            "gemini-balanced",
            "gemini-fast",
            "gemini-budget",
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
        max_tokens: int = 2048,
        **kwargs
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

    def __init__(self, api_key: str, model: str = "anthropic/claude-sonnet-4-5"):
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
        max_tokens: int = 2048,
        **kwargs
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
        """Get popular models available on OpenRouter (Updated November 2025)"""
        return [
            # Anthropic models (Latest)
            "anthropic/claude-sonnet-4-5",
            "anthropic/claude-haiku-4-5",
            "anthropic/claude-opus-4-1",
            "anthropic/claude-3-5-sonnet",
            
            # OpenAI models (Latest)
            "openai/gpt-5",
            "openai/gpt-4.1",
            "openai/gpt-4.1-mini",
            
            # Google models (Latest)
            "google/gemini-2.5-pro",
            "google/gemini-2.0-flash",
            
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
    local_url: str = None,
    **kwargs
) -> LLMProvider:
    """
    Factory function to create appropriate LLM provider
    
    Args:
        provider: Provider name (anthropic, openai, gemini, local, openrouter)
        api_key: API key for the provider
        model: Model name (optional, uses defaults)
        local_url: URL for local LLM (only for local provider)
        **kwargs: Additional provider-specific parameters
    
    Returns:
        Configured LLMProvider instance
    """
    from app.config import settings, LLMProvider as LLMProviderEnum
    
    # Use settings defaults if not provided
    if provider is None:
        provider = settings.LLM_PROVIDER.value
    
    if api_key is None:
        api_key = settings.get_active_api_key()
    
    # Create provider with updated default models
    if provider == "anthropic" or provider == LLMProviderEnum.ANTHROPIC:
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY not set")
        return AnthropicProvider(api_key, model or "claude-sonnet-4-5")
    
    elif provider == "openai" or provider == LLMProviderEnum.OPENAI:
        if not api_key:
            raise ValueError("OPENAI_API_KEY not set")
        return OpenAIProvider(api_key, model or "gpt-4.1")
    
    elif provider == "gemini" or provider == LLMProviderEnum.GEMINI:
        if not api_key:
            raise ValueError("GEMINI_API_KEY not set")
        return GeminiProvider(api_key, model or "gemini-2.5-flash")
    
    elif provider == "openrouter" or provider == LLMProviderEnum.OPENROUTER:
        if not api_key:
            raise ValueError("OPENROUTER_API_KEY not set")
        return OpenRouterProvider(api_key, model or "anthropic/claude-sonnet-4-5")

    elif provider == "local" or provider == LLMProviderEnum.LOCAL:
        url = local_url or settings.LOCAL_LLM_URL
        model_name = model or settings.LOCAL_LLM_MODEL
        return LocalProvider(url, model_name)

    else:
        raise ValueError(f"Unknown LLM provider: {provider}")
