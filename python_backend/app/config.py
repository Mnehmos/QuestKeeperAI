"""
QuestKeeperAI - Configuration Management (Updated November 2025)
Centralized configuration for database, LLM providers, MCP servers, and application settings.
Updated with latest model defaults and recommendations.
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
    OPENROUTER = "openrouter"
    LOCAL = "local"

class Environment(str, Enum):
    """Application environment"""
    DEVELOPMENT = "development"
    PRODUCTION = "production"
    TESTING = "testing"

# Model tier recommendations for QuestKeeperAI
class ModelTier(str, Enum):
    """Model quality/cost tiers"""
    PREMIUM = "premium"   # Best quality, highest cost
    BALANCED = "balanced" # Good balance of quality and cost
    FAST = "fast"         # Fast responses, lower cost
    BUDGET = "budget"     # Cheapest options

# Recommended models by provider and tier (November 2025)
RECOMMENDED_MODELS = {
    LLMProvider.ANTHROPIC: {
        ModelTier.PREMIUM: "claude-opus-4-1",
        ModelTier.BALANCED: "claude-sonnet-4-5",
        ModelTier.FAST: "claude-haiku-4-5",
        ModelTier.BUDGET: "claude-haiku-4-5",
    },
    LLMProvider.OPENAI: {
        ModelTier.PREMIUM: "gpt-5",
        ModelTier.BALANCED: "gpt-4.1",
        ModelTier.FAST: "gpt-4.1-mini",
        ModelTier.BUDGET: "gpt-5-nano",
    },
    LLMProvider.GEMINI: {
        ModelTier.PREMIUM: "gemini-2.5-pro",
        ModelTier.BALANCED: "gemini-2.5-flash",
        ModelTier.FAST: "gemini-2.5-flash",
        ModelTier.BUDGET: "gemini-2.0-flash-lite",
    }
}

# Model pricing (per 1M tokens) for cost estimation
MODEL_PRICING = {
    # Anthropic (input/output per 1M tokens)
    "claude-opus-4-1": (15.00, 75.00),
    "claude-sonnet-4-5": (3.00, 15.00),
    "claude-haiku-4-5": (1.00, 5.00),
    "claude-sonnet-4": (3.00, 15.00),
    "claude-3-5-sonnet": (3.00, 15.00),
    
    # OpenAI
    "gpt-5": (1.25, 10.00),
    "gpt-5-mini": (0.25, 2.00),
    "gpt-5-nano": (0.05, 0.40),
    "gpt-4.1": (2.50, 10.00),  # Estimated
    "gpt-4.1-mini": (0.60, 2.40),  # Estimated
    "gpt-4.1-nano": (0.15, 0.60),  # Estimated
    
    # Google Gemini (2.5 family - Latest)
    "gemini-2.5-pro": (1.25, 10.00),
    "gemini-2.5-flash": (0.50, 3.00),
    "gemini-2.5-flash-preview": (0.50, 3.00),
    # Google Gemini (2.0 family - Legacy)
    "gemini-2.0-flash": (0.40, 2.50),
    "gemini-2.0-flash-lite": (0.20, 1.50),
    "gemini-2.0-pro-exp": (1.00, 8.00),
}

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
    LLM_PROVIDER: LLMProvider = LLMProvider.ANTHROPIC  # Updated default to Anthropic
    LLM_MODEL_TIER: ModelTier = ModelTier.BALANCED     # Default to balanced tier
    
    # Model Selection (can override tier-based selection)
    LLM_MODEL: Optional[str] = None  # If set, overrides tier-based selection
    
    # API Keys (BYOK - Bring Your Own Key)
    ANTHROPIC_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None
    OPENROUTER_API_KEY: Optional[str] = None
    
    # Local LLM Configuration (Ollama, vLLM, etc.)
    LOCAL_LLM_URL: str = "http://localhost:11434"
    LOCAL_LLM_MODEL: str = "mistral"
    
    # Advanced Model Features
    ENABLE_EXTENDED_CONTEXT: bool = False  # Enable 1M+ token context windows
    ENABLE_THINKING_MODE: bool = False     # Enable reasoning/thinking modes
    REASONING_EFFORT: str = "medium"       # For GPT-5: minimal, low, medium, high
    
    # Cost Management
    ENABLE_COST_TRACKING: bool = True
    MONTHLY_BUDGET_USD: Optional[float] = None  # Set budget limit
    WARN_AT_BUDGET_PERCENT: float = 80.0        # Warn at 80% of budget
    
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
        self.OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
        
        # Load provider
        provider_env = os.getenv("LLM_PROVIDER", "anthropic")
        try:
            self.LLM_PROVIDER = LLMProvider(provider_env.lower())
        except ValueError:
            print(f"Warning: Invalid LLM_PROVIDER '{provider_env}', using default ANTHROPIC")
            self.LLM_PROVIDER = LLMProvider.ANTHROPIC
        
        # Load model tier
        tier_env = os.getenv("LLM_MODEL_TIER", "balanced")
        try:
            self.LLM_MODEL_TIER = ModelTier(tier_env.lower())
        except ValueError:
            print(f"Warning: Invalid LLM_MODEL_TIER '{tier_env}', using default BALANCED")
            self.LLM_MODEL_TIER = ModelTier.BALANCED
        
        # Load specific model override
        self.LLM_MODEL = os.getenv("LLM_MODEL")
        
        # Advanced features
        self.ENABLE_EXTENDED_CONTEXT = os.getenv("ENABLE_EXTENDED_CONTEXT", "False").lower() == "true"
        self.ENABLE_THINKING_MODE = os.getenv("ENABLE_THINKING_MODE", "False").lower() == "true"
        self.REASONING_EFFORT = os.getenv("REASONING_EFFORT", "medium")
        
        # Cost management
        self.ENABLE_COST_TRACKING = os.getenv("ENABLE_COST_TRACKING", "True").lower() == "true"
        budget_str = os.getenv("MONTHLY_BUDGET_USD")
        if budget_str:
            try:
                self.MONTHLY_BUDGET_USD = float(budget_str)
            except ValueError:
                print(f"Warning: Invalid MONTHLY_BUDGET_USD '{budget_str}'")
        
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
        elif self.LLM_PROVIDER == LLMProvider.OPENROUTER:
            return self.OPENROUTER_API_KEY
        return None
    
    def get_recommended_model(self) -> str:
        """Get recommended model based on provider and tier"""
        # If specific model is set, use that
        if self.LLM_MODEL:
            return self.LLM_MODEL
        
        # Otherwise, use tier-based recommendation
        if self.LLM_PROVIDER in RECOMMENDED_MODELS:
            return RECOMMENDED_MODELS[self.LLM_PROVIDER][self.LLM_MODEL_TIER]
        
        # Fallback to provider defaults
        defaults = {
            LLMProvider.ANTHROPIC: "claude-sonnet-4-5",
            LLMProvider.OPENAI: "gpt-4.1",
            LLMProvider.GEMINI: "gemini-2.5-flash",
            LLMProvider.LOCAL: "mistral"
        }
        return defaults.get(self.LLM_PROVIDER, "claude-sonnet-4-5")
    
    def get_model_pricing(self, model: str) -> tuple[float, float]:
        """Get pricing for a specific model (input, output) per 1M tokens"""
        return MODEL_PRICING.get(model, (0.0, 0.0))
    
    def estimate_cost(self, model: str, input_tokens: int, output_tokens: int) -> float:
        """Estimate cost in USD for a given model and token usage"""
        input_price, output_price = self.get_model_pricing(model)
        input_cost = (input_tokens / 1_000_000) * input_price
        output_cost = (output_tokens / 1_000_000) * output_price
        return input_cost + output_cost
    
    def validate(self) -> bool:
        """Validate that required settings are present"""
        # Check that active provider has API key (unless using LOCAL)
        if self.LLM_PROVIDER != LLMProvider.LOCAL:
            api_key = self.get_active_api_key()
            if not api_key:
                print(f"Warning: No API key set for {self.LLM_PROVIDER.value} provider")
                return False
        return True
    
    def print_model_info(self):
        """Print current model configuration"""
        model = self.get_recommended_model()
        input_price, output_price = self.get_model_pricing(model)
        
        print("\n" + "="*60)
        print("🎮 QuestKeeperAI - LLM Configuration")
        print("="*60)
        print(f"Provider:        {self.LLM_PROVIDER.value}")
        print(f"Model Tier:      {self.LLM_MODEL_TIER.value}")
        print(f"Active Model:    {model}")
        print(f"Pricing:         ${input_price}/{output_price} per 1M tokens (in/out)")
        print(f"Extended Context: {self.ENABLE_EXTENDED_CONTEXT}")
        print(f"Thinking Mode:   {self.ENABLE_THINKING_MODE}")
        print(f"Cost Tracking:   {self.ENABLE_COST_TRACKING}")
        if self.MONTHLY_BUDGET_USD:
            print(f"Monthly Budget:  ${self.MONTHLY_BUDGET_USD:.2f}")
        print("="*60 + "\n")

# Global settings instance
settings = Settings()

# Ensure settings are valid
if not settings.validate():
    print("\n⚠️  WARNING: Configuration incomplete!")
    print(f"   Current provider: {settings.LLM_PROVIDER.value}")
    print(f"   API key set: {bool(settings.get_active_api_key())}")
    print("\n   Please set your API key via:")
    print("   1. Environment variable (e.g., ANTHROPIC_API_KEY)")
    print("   2. Settings UI in the application")
    print()
else:
    # Print model info in debug mode
    if settings.DEBUG:
        settings.print_model_info()
