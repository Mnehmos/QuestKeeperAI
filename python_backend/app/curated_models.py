"""
QuestKeeperAI - Curated Models Configuration
Defines user-friendly model lists for the UI
"""

# Curated models to show in the UI (organized by use case)
CURATED_MODELS = {
    'anthropic': {
        'recommended': [
            {
                'id': 'claude-sonnet-4-5',
                'name': 'Claude Sonnet 4.5',
                'description': 'Best for coding & general use',
                'tier': 'balanced',
                'cost': '$$'
            },
            {
                'id': 'claude-haiku-4-5',
                'name': 'Claude Haiku 4.5',
                'description': 'Fast & economical',
                'tier': 'fast',
                'cost': '$'
            },
            {
                'id': 'claude-opus-4-1',
                'name': 'Claude Opus 4.1',
                'description': 'Most powerful reasoning',
                'tier': 'premium',
                'cost': '$$$'
            }
        ]
    },
    'openai': {
        'recommended': [
            {
                'id': 'gpt-4.1',
                'name': 'GPT-4.1',
                'description': 'Best general purpose',
                'tier': 'balanced',
                'cost': '$$'
            },
            {
                'id': 'gpt-5',
                'name': 'GPT-5',
                'description': 'Advanced reasoning',
                'tier': 'premium',
                'cost': '$$'
            },
            {
                'id': 'gpt-4.1-mini',
                'name': 'GPT-4.1 Mini',
                'description': 'Fast & efficient',
                'tier': 'fast',
                'cost': '$'
            }
        ]
    },
    'gemini': {
        'recommended': [
            {
                'id': 'gemini-2.5-pro',
                'name': 'Gemini 2.5 Pro',
                'description': '2M context - Best for campaigns',
                'tier': 'premium',
                'cost': '$$'
            },
            {
                'id': 'gemini-2.5-flash',
                'name': 'Gemini 2.5 Flash',
                'description': 'Fast & intelligent',
                'tier': 'balanced',
                'cost': '$'
            }
        ]
    },
    'openrouter': {
        'recommended': [
            {
                'id': 'anthropic/claude-sonnet-4-5',
                'name': 'Claude Sonnet 4.5',
                'description': 'Via OpenRouter',
                'tier': 'balanced',
                'cost': '$$'
            },
            {
                'id': 'openai/gpt-4.1',
                'name': 'GPT-4.1',
                'description': 'Via OpenRouter',
                'tier': 'balanced',
                'cost': '$$'
            },
            {
                'id': 'google/gemini-2.5-pro',
                'name': 'Gemini 2.5 Pro',
                'description': 'Via OpenRouter',
                'tier': 'premium',
                'cost': '$$'
            }
        ]
    },
    'local': {
        'recommended': [
            {
                'id': 'mistral',
                'name': 'Mistral',
                'description': 'Local model',
                'tier': 'custom',
                'cost': 'Free'
            }
        ]
    }
}

# Provider display information
PROVIDER_INFO = {
    'anthropic': {
        'name': 'Anthropic Claude',
        'icon': '🤖',
        'description': 'Best for D&D game mechanics',
        'requires_api_key': True
    },
    'openai': {
        'name': 'OpenAI',
        'icon': '🔷',
        'description': 'Great for puzzles & reasoning',
        'requires_api_key': True
    },
    'gemini': {
        'name': 'Google Gemini',
        'icon': '✨',
        'description': '2M context for long campaigns',
        'requires_api_key': True
    },
    'openrouter': {
        'name': 'OpenRouter',
        'icon': '🌐',
        'description': 'Access multiple models',
        'requires_api_key': True
    },
    'local': {
        'name': 'Local LLM',
        'icon': '🏠',
        'description': 'Run models locally',
        'requires_api_key': False
    }
}
