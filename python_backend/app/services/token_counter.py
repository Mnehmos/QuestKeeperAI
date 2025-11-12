"""
Token counting with multiple strategies
Priority: Native API > Tiktoken > Estimation
"""

from typing import List, Dict, Optional
import logging

# Try to import tiktoken
try:
    import tiktoken
    TIKTOKEN_AVAILABLE = True
except ImportError:
    TIKTOKEN_AVAILABLE = False
    logging.warning("tiktoken not available, using estimation fallback")

logger = logging.getLogger(__name__)


class TokenCounter:
    """Multi-strategy token counting for LLM context management"""

    # Model context windows (tokens)
    MODEL_LIMITS = {
        # Anthropic Claude
        "claude-sonnet-4": 200000,
        "claude-sonnet-4.5": 200000,
        "claude-opus-4": 200000,
        "claude-opus-4.1": 200000,
        "claude-haiku-4": 200000,
        "claude-haiku-4.5": 200000,

        # OpenAI GPT
        "gpt-4-turbo": 128000,
        "gpt-4": 8192,
        "gpt-4o": 128000,
        "gpt-4.1": 128000,
        "gpt-5": 200000,
        "gpt-3.5-turbo": 16385,

        # Google Gemini
        "gemini-2.5-pro": 1048576,
        "gemini-2.0-flash": 1048576,
        "gemini-1.5-pro": 1048576,
        "gemini-1.5-flash": 1048576,

        # Defaults
        "default": 8192
    }

    def __init__(self):
        """Initialize token counter with tiktoken if available"""
        self.encoder = None
        if TIKTOKEN_AVAILABLE:
            try:
                # Use cl100k_base encoding (GPT-4, GPT-3.5-turbo, Claude)
                self.encoder = tiktoken.get_encoding("cl100k_base")
                logger.info("TokenCounter initialized with tiktoken")
            except Exception as e:
                logger.warning(f"Failed to load tiktoken encoder: {e}")
        else:
            logger.info("TokenCounter initialized with estimation fallback")

    def count_messages(
        self,
        messages: List[Dict[str, str]],
        model: str = "claude-sonnet-4"
    ) -> int:
        """
        Count tokens in message list

        Args:
            messages: List of {"role": str, "content": str}
            model: Model name for encoding selection

        Returns:
            Token count (int)
        """
        if self.encoder:
            return self._count_with_tiktoken(messages)
        else:
            return self._estimate_tokens(messages)

    def _count_with_tiktoken(self, messages: List[Dict]) -> int:
        """Tiktoken-based counting (accurate for OpenAI/Anthropic)"""
        total = 0

        for message in messages:
            # Per-message overhead (4 tokens)
            total += 4

            # Role tokens
            role = message.get('role', '')
            if role:
                total += len(self.encoder.encode(role))

            # Content tokens
            content = message.get('content', '')
            if isinstance(content, str):
                total += len(self.encoder.encode(content))
            elif isinstance(content, list):
                # Handle ContentBlock[] format (for multimodal)
                for block in content:
                    if isinstance(block, dict):
                        if block.get('type') == 'text':
                            text = block.get('text', '')
                            total += len(self.encoder.encode(text))
                        elif block.get('type') == 'image':
                            # Conservative image token estimate
                            total += 300

        # Conversation overhead (2 tokens)
        total += 2

        return total

    def _estimate_tokens(self, messages: List[Dict]) -> int:
        """Word-based estimation fallback"""
        total = 0

        for message in messages:
            # Message overhead
            total += 4

            content = message.get('content', '')
            if isinstance(content, str):
                text = content
            elif isinstance(content, list):
                # Extract text from ContentBlock[]
                text = ' '.join(
                    block.get('text', '')
                    for block in content
                    if isinstance(block, dict) and block.get('type') == 'text'
                )
            else:
                text = str(content)

            # Word count with 1.3x multiplier (accounts for subword tokens)
            words = len(text.split())
            total += int(words * 1.3)

            # Punctuation overhead (common punctuation chars)
            punctuation = sum(1 for c in text if c in '.,!?;:()[]{}"\'-')
            total += punctuation

            # Image blocks
            if isinstance(content, list):
                image_count = sum(
                    1 for block in content
                    if isinstance(block, dict) and block.get('type') == 'image'
                )
                total += image_count * 300

        # Conversation overhead
        total += 2

        return total

    def get_model_limit(self, model: str) -> int:
        """
        Get context window size for model

        Args:
            model: Model name or identifier

        Returns:
            Maximum context tokens for model
        """
        if not model:
            return self.MODEL_LIMITS["default"]

        # Check exact match
        if model in self.MODEL_LIMITS:
            return self.MODEL_LIMITS[model]

        # Check partial matches (case-insensitive)
        model_lower = model.lower()
        for key, limit in self.MODEL_LIMITS.items():
            if key.lower() in model_lower:
                return limit

        # Default conservative limit
        logger.warning(f"Unknown model '{model}', using default limit")
        return self.MODEL_LIMITS["default"]

    def get_available_tokens(
        self,
        current_tokens: int,
        model: str,
        reserve_percentage: float = 0.3
    ) -> int:
        """
        Calculate available tokens for new messages

        Args:
            current_tokens: Current conversation token count
            model: Model name
            reserve_percentage: Percentage to reserve for output (default: 30%)

        Returns:
            Available tokens for input
        """
        max_tokens = self.get_model_limit(model)
        reserved = int(max_tokens * reserve_percentage)
        available = max_tokens - reserved - current_tokens

        return max(0, available)

    def get_condensation_threshold(self, model: str) -> int:
        """
        Get token count threshold for triggering condensation

        Args:
            model: Model name

        Returns:
            Token count at which condensation should occur (70% of max)
        """
        max_tokens = self.get_model_limit(model)
        return int(max_tokens * 0.70)

    def get_critical_threshold(self, model: str) -> int:
        """
        Get critical token count threshold

        Args:
            model: Model name

        Returns:
            Token count at which aggressive action needed (90% of max)
        """
        max_tokens = self.get_model_limit(model)
        return int(max_tokens * 0.90)

    def needs_condensation(
        self,
        current_tokens: int,
        model: str
    ) -> bool:
        """
        Check if conversation needs condensation

        Args:
            current_tokens: Current token count
            model: Model name

        Returns:
            True if condensation recommended
        """
        threshold = self.get_condensation_threshold(model)
        return current_tokens >= threshold


# Singleton instance
_token_counter_instance = None


def get_token_counter() -> TokenCounter:
    """Get singleton TokenCounter instance"""
    global _token_counter_instance
    if _token_counter_instance is None:
        _token_counter_instance = TokenCounter()
    return _token_counter_instance


# Convenience alias
token_counter = get_token_counter()
