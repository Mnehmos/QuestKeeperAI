from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)

@dataclass
class Message:
    role: str  # user, assistant, system
    content: str

@dataclass
class Tool:
    name: str
    description: str
    input_schema: Dict[str, Any]

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
        Returns: {
            "content": str,
            "tool_calls": [{"name": str, "args": dict}],
            "stop_reason": str
        }
        """
        pass

    @abstractmethod
    async def get_available_models(self) -> List[str]:
        """Get list of available models for this provider"""
        pass

class AnthropicProvider(LLMProvider):
    """Anthropic Claude API provider"""

    def __init__(self, api_key: str):
        from anthropic import Anthropic
        self.client = Anthropic(api_key=api_key)
        self.model = "claude-3-5-sonnet-20241022"
        self.provider_name = "anthropic"

    async def chat(
        self,
        messages: List[Message],
        system_prompt: Optional[str] = None,
        tools: Optional[List[Tool]] = None,
        temperature: float = 0.7,
        max_tokens: int = 2048
    ) -> Dict[str, Any]:
        """Chat with Claude using tool use"""
        import json

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
                    tool_calls.append({
                        "name": block.name,
                        "args": block.input,
                        "id": block.id
                    })

            return {
                "content": content,
                "tool_calls": tool_calls,
                "stop_reason": response.stop_reason
            }
        except Exception as e:
            logger.error(f"Anthropic API error: {e}")
            raise

    async def get_available_models(self) -> List[str]:
        return ["claude-3-5-sonnet-20241022", "claude-3-opus-20240229"]

class OpenAIProvider(LLMProvider):
    """OpenAI API provider"""

    def __init__(self, api_key: str):
        from openai import AsyncOpenAI
        self.client = AsyncOpenAI(api_key=api_key)
        self.model = "gpt-4-turbo"
        self.provider_name = "openai"

    async def chat(
        self,
        messages: List[Message],
        system_prompt: Optional[str] = None,
        tools: Optional[List[Tool]] = None,
        temperature: float = 0.7,
        max_tokens: int = 2048
    ) -> Dict[str, Any]:
        """Chat with GPT using function calling"""
        # TODO: Implement OpenAI chat
        logger.warning("OpenAI provider not fully implemented yet")
        return {"content": "", "tool_calls": [], "stop_reason": "not_implemented"}

    async def get_available_models(self) -> List[str]:
        return ["gpt-4-turbo", "gpt-4", "gpt-3.5-turbo"]

class LocalProvider(LLMProvider):
    """Local LLM provider (Ollama, vLLM, etc.)"""

    def __init__(self, url: str, model: str):
        self.url = url
        self.model = model
        self.provider_name = "local"
        import httpx
        self.client = httpx.AsyncClient(base_url=url)

    async def chat(
        self,
        messages: List[Message],
        system_prompt: Optional[str] = None,
        tools: Optional[List[Tool]] = None,
        temperature: float = 0.7,
        max_tokens: int = 2048
    ) -> Dict[str, Any]:
        """Chat with local LLM"""
        # TODO: Implement local LLM chat (Ollama format)
        logger.warning("Local provider not fully implemented yet")
        return {"content": "", "tool_calls": [], "stop_reason": "not_implemented"}

    async def get_available_models(self) -> List[str]:
        return [self.model]

class GeminiProvider(LLMProvider):
    """Google Gemini API provider"""

    def __init__(self, api_key: str):
        from google import genai
        self.client = genai.Client(api_key=api_key)
        self.model = "gemini-2.0-flash"
        self.provider_name = "gemini"

    async def chat(
        self,
        messages: List[Message],
        system_prompt: Optional[str] = None,
        tools: Optional[List[Tool]] = None,
        temperature: float = 0.7,
        max_tokens: int = 2048
    ) -> Dict[str, Any]:
        """Chat with Gemini"""
        from google.genai import types as genai_types

        # Convert messages to Gemini format
        contents = []
        for msg in messages:
            contents.append(genai_types.Content(
                role=msg.role if msg.role != "assistant" else "model",
                parts=[genai_types.Part(text=msg.content)]
            ))

        # Format tools for Gemini
        gemini_tools = None
        if tools:
            gemini_tools = []
            for tool in tools:
                # Convert to Gemini FunctionDeclaration format
                func_decl = genai_types.FunctionDeclaration(
                    name=tool.name,
                    description=tool.description,
                    parameters=tool.input_schema
                )
                gemini_tools.append(genai_types.Tool(function_declarations=[func_decl]))

        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=contents,
                config=genai_types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    tools=gemini_tools,
                    temperature=temperature,
                    max_output_tokens=max_tokens
                )
            )

            # Parse response
            content = ""
            tool_calls = []

            if response.candidates:
                candidate = response.candidates[0]
                for part in candidate.content.parts:
                    if part.text:
                        content += part.text
                    elif hasattr(part, 'function_call') and part.function_call:
                        tool_calls.append({
                            "name": part.function_call.name,
                            "args": dict(part.function_call.args),
                            "id": part.function_call.name  # Gemini doesn't have IDs
                        })

            return {
                "content": content,
                "tool_calls": tool_calls,
                "stop_reason": "end_turn"
            }
        except Exception as e:
            logger.error(f"Gemini API error: {e}")
            raise

    async def get_available_models(self) -> List[str]:
        return ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"]
