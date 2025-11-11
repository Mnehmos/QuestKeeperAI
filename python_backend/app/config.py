"""
QuestKeeperAI - Configuration Management
Centralized configuration for database, LLM providers, MCP servers, and application settings.
"""

import os
from pathlib import Path
from enum import Enum
from typing import Optional
from dataclasses import dataclass

class LLMProvider(str, Enum):
    """Supported LLM providers"""
    ANTHROPIC = "anthropic"
    OPENAI = "openai"
    GEMINI = "gemini"
    LOCAL = "local"

class Environment(str, Enum):
    """Application environment"""
    DEVELOPMENT = "development"
    PRODUCTION = "production"
    TESTING = "testing"

@dataclass
class Settings:
    """Application settings with BYOK (Bring Your Own Key) support"""
    
    # Application Environment
    ENV: Environment = Environment.DEVELOPMENT
    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"
    
    # Database Configuration
    DATABASE_URL: str = f"sqlite:///{Path.home() / 'AppData/Local/QuestKeeperAI/game.db'}"
    
    # LLM Provider Configuration
    LLM_PROVIDER: LLMProvider = LLMProvider.GEMINI  # Default to existing Gemini setup
    
    # API Keys (BYOK - Bring Your Own Key)
    ANTHROPIC_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None
    
    # Local LLM Configuration (Ollama, vLLM, etc.)
    LOCAL_LLM_URL: str = "http://localhost:11434"
    LOCAL_LLM_MODEL: str = "mistral"
    
    # MCP Server Configuration
    MCP_SERVERS_DIR: Path = Path.home() / "AppData/Local/QuestKeeperAI/servers"
    MCP_TIMEOUT_SECONDS: int = 30
    MCP_PROCESS_LIMIT: int = 10
    MCP_CONFIG_PATH: str = ".roo/mcp.json"
    
    # IPC & Flask Configuration
    FLASK_PORT: int = 5001
    FLASK_HOST: str = "127.0.0.1"
    CORS_ORIGINS: list = None
    
    # Game Configuration
    MAX_CHARACTERS_PER_USER: int = 10
    AUTO_SAVE_INTERVAL: int = 300  # seconds
    BACKUP_ENABLED: bool = True
    
    # Security
    SECRET_KEY: Optional[str] = None
    SESSION_LIFETIME: int = 86400  # 24 hours in seconds
    
    def __post_init__(self):
        """Initialize settings from environment variables"""
        # Load from environment
        self.DEBUG = os.getenv("DEBUG", "True").lower() == "true"
        self.LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
        
        # Load API keys
        self.ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
        self.OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
        self.GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
        
        # Load provider
        provider_env = os.getenv("LLM_PROVIDER", "gemini")
        try:
            self.LLM_PROVIDER = LLMProvider(provider_env.lower())
        except ValueError:
            print(f"Warning: Invalid LLM_PROVIDER '{provider_env}', using default GEMINI")
            self.LLM_PROVIDER = LLMProvider.GEMINI
        
        # Local LLM settings
        self.LOCAL_LLM_URL = os.getenv("LOCAL_LLM_URL", self.LOCAL_LLM_URL)
        self.LOCAL_LLM_MODEL = os.getenv("LOCAL_LLM_MODEL", self.LOCAL_LLM_MODEL)
        
        # Secret key
        self.SECRET_KEY = os.getenv("SECRET_KEY")
        if not self.SECRET_KEY and self.ENV == Environment.PRODUCTION:
            raise ValueError("SECRET_KEY must be set in production environment")
        
        # Ensure directories exist
        self.MCP_SERVERS_DIR.mkdir(parents=True, exist_ok=True)
        Path(self.DATABASE_URL.replace("sqlite:///", "")).parent.mkdir(parents=True, exist_ok=True)
        
        # CORS
        if self.CORS_ORIGINS is None:
            self.CORS_ORIGINS = ["http://localhost:3000"] if self.DEBUG else []
    
    def get_active_api_key(self) -> Optional[str]:
        """Get the API key for the currently selected provider"""
        if self.LLM_PROVIDER == LLMProvider.ANTHROPIC:
            return self.ANTHROPIC_API_KEY
        elif self.LLM_PROVIDER == LLMProvider.OPENAI:
            return self.OPENAI_API_KEY
        elif self.LLM_PROVIDER == LLMProvider.GEMINI:
            return self.GEMINI_API_KEY
        return None
    
    def validate(self) -> bool:
        """Validate that required settings are present"""
        # Check that active provider has API key (unless using LOCAL)
        if self.LLM_PROVIDER != LLMProvider.LOCAL:
            api_key = self.get_active_api_key()
            if not api_key:
                print(f"Warning: No API key set for {self.LLM_PROVIDER.value} provider")
                return False
        return True

# Global settings instance
settings = Settings()

# Ensure settings are valid
if not settings.validate():
    print("\n⚠️  WARNING: Configuration incomplete!")
    print(f"   Current provider: {settings.LLM_PROVIDER.value}")
    print(f"   API key set: {bool(settings.get_active_api_key())}")
    print("\n   Please set your API key via:")
    print("   1. Environment variable (e.g., GEMINI_API_KEY)")
    print("   2. Settings UI in the application")
    print()
