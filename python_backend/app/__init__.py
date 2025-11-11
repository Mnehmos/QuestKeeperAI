"""
QuestKeeperAI Backend Application
Modern D&D 5e text-based RPG assistant with MCP integration
"""

__version__ = "0.2.0"
__author__ = "QuestKeeperAI Team"

from .config import settings, LLMProvider as LLMProviderEnum

__all__ = ["settings", "LLMProviderEnum", "__version__"]
