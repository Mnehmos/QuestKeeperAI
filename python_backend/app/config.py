import os
from pathlib import Path
from enum import Enum
from pydantic_settings import BaseSettings

class LLMProvider(str, Enum):
    ANTHROPIC = "anthropic"
    OPENAI = "openai"
    GEMINI = "gemini"
    LOCAL = "local"

class Settings(BaseSettings):
    # Application
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")

    # Database
    DATABASE_URL: str = f"sqlite:///{Path.home() / 'AppData/Local/QuestKeeperAI/game.db'}"

    # LLM Configuration
    LLM_PROVIDER: LLMProvider = LLMProvider(os.getenv("LLM_PROVIDER", "gemini"))
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    LOCAL_LLM_URL: str = os.getenv("LOCAL_LLM_URL", "http://localhost:11434")
    LOCAL_LLM_MODEL: str = os.getenv("LOCAL_LLM_MODEL", "mistral")

    # MCP Configuration
    MCP_SERVERS_DIR: Path = Path.home() / "AppData/Local/QuestKeeperAI/servers"
    MCP_TIMEOUT_SECONDS: int = 30
    MCP_PROCESS_LIMIT: int = 10

    # IPC
    FLASK_PORT: int = int(os.getenv("FLASK_PORT", "5001"))
    FLASK_HOST: str = os.getenv("FLASK_HOST", "127.0.0.1")

    # CORS
    CORS_ORIGINS: list = ["http://localhost:3000", "http://localhost:5001"]

    class Config:
        env_file = ".env"

    def get_active_api_key(self) -> str:
        """Get the API key for the active LLM provider"""
        if self.LLM_PROVIDER == LLMProvider.ANTHROPIC:
            return self.ANTHROPIC_API_KEY
        elif self.LLM_PROVIDER == LLMProvider.OPENAI:
            return self.OPENAI_API_KEY
        elif self.LLM_PROVIDER == LLMProvider.GEMINI:
            return self.GEMINI_API_KEY
        elif self.LLM_PROVIDER == LLMProvider.LOCAL:
            return ""  # Local models don't need API key
        return ""

    def validate_config(self) -> tuple[bool, str]:
        """Validate configuration completeness"""
        if not self.get_active_api_key() and self.LLM_PROVIDER != LLMProvider.LOCAL:
            return False, f"API key not set for provider: {self.LLM_PROVIDER}"
        return True, "Configuration is valid"

settings = Settings()

# Ensure directories exist
settings.MCP_SERVERS_DIR.mkdir(parents=True, exist_ok=True)
Path(settings.DATABASE_URL.replace("sqlite:///", "")).parent.mkdir(parents=True, exist_ok=True)
