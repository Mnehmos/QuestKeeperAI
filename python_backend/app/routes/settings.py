"""
QuestKeeperAI - Settings Routes
API endpoints for managing application settings
"""

from flask import Blueprint, request, jsonify
from typing import Dict, Any
import logging
import os
import json
from pathlib import Path

from app.config import settings, LLMProvider
from app.llm.provider import create_llm_provider

logger = logging.getLogger(__name__)

# Blueprint
bp = Blueprint('settings', __name__, url_prefix='/api/settings')

# Settings file path
SETTINGS_FILE = Path.home() / '.questkeeperai' / 'settings.json'


def load_user_settings() -> Dict[str, Any]:
    """Load user settings from file"""
    try:
        if SETTINGS_FILE.exists():
            with open(SETTINGS_FILE, 'r') as f:
                return json.load(f)
        return {
            'provider': 'gemini',
            'model': None,  # Will use default for provider
            'debug_mode': False
        }
    except Exception as e:
        logger.error(f"Error loading settings: {e}")
        return {
            'provider': 'gemini',
            'model': None,
            'debug_mode': False
        }


def save_user_settings(user_settings: Dict[str, Any]) -> bool:
    """Save user settings to file"""
    try:
        # Ensure directory exists
        SETTINGS_FILE.parent.mkdir(parents=True, exist_ok=True)

        with open(SETTINGS_FILE, 'w') as f:
            json.dump(user_settings, f, indent=2)

        return True
    except Exception as e:
        logger.error(f"Error saving settings: {e}")
        return False


@bp.route('', methods=['GET'])
def get_settings():
    """Get current settings"""
    try:
        user_settings = load_user_settings()

        # Get current API keys status (don't expose the actual keys)
        api_keys_configured = {
            'anthropic': bool(settings.ANTHROPIC_API_KEY),
            'openai': bool(settings.OPENAI_API_KEY),
            'gemini': bool(settings.GEMINI_API_KEY),
            'openrouter': bool(settings.OPENROUTER_API_KEY),
            'local': True  # Local is always "configured"
        }

        return jsonify({
            'status': 'success',
            'settings': {
                'provider': user_settings.get('provider', 'gemini'),
                'model': user_settings.get('model'),
                'debug_mode': user_settings.get('debug_mode', False),
                'api_keys_configured': api_keys_configured
            }
        })
    except Exception as e:
        logger.error(f"Error getting settings: {e}")
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 500


@bp.route('', methods=['POST'])
def update_settings():
    """Update settings"""
    try:
        data = request.get_json()

        # Validate provider
        provider = data.get('provider')
        if provider not in ['anthropic', 'openai', 'gemini', 'openrouter', 'local']:
            return jsonify({
                'status': 'error',
                'error': 'Invalid provider'
            }), 400

        # Update API keys if provided
        api_key = data.get('api_key')
        if api_key:
            # Trim whitespace from API key
            api_key = api_key.strip()

            if provider == 'anthropic':
                settings.ANTHROPIC_API_KEY = api_key
                os.environ['ANTHROPIC_API_KEY'] = api_key
            elif provider == 'openai':
                settings.OPENAI_API_KEY = api_key
                os.environ['OPENAI_API_KEY'] = api_key
            elif provider == 'gemini':
                settings.GEMINI_API_KEY = api_key
                os.environ['GEMINI_API_KEY'] = api_key
            elif provider == 'openrouter':
                settings.OPENROUTER_API_KEY = api_key
                os.environ['OPENROUTER_API_KEY'] = api_key

            logger.info(f"Updated API key for provider: {provider}")

        # Update local URL if provided
        local_url = data.get('local_url')
        if local_url and provider == 'local':
            settings.LOCAL_BASE_URL = local_url

        # Save user preferences
        user_settings = {
            'provider': provider,
            'model': data.get('model'),
            'debug_mode': data.get('debug_mode', False)
        }

        if not save_user_settings(user_settings):
            return jsonify({
                'status': 'error',
                'error': 'Failed to save settings'
            }), 500

        return jsonify({
            'status': 'success',
            'message': 'Settings saved successfully'
        })

    except Exception as e:
        logger.error(f"Error updating settings: {e}")
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 500


@bp.route('/models', methods=['GET'])
async def get_available_models():
    """Get available models for current or specified provider"""
    try:
        # Get provider from query param or use current
        provider = request.args.get('provider')
        if not provider:
            user_settings = load_user_settings()
            provider = user_settings.get('provider', 'gemini')

        # Get appropriate API key
        api_key = None
        if provider == 'anthropic':
            api_key = settings.ANTHROPIC_API_KEY
        elif provider == 'openai':
            api_key = settings.OPENAI_API_KEY
        elif provider == 'gemini':
            api_key = settings.GEMINI_API_KEY
        elif provider == 'openrouter':
            api_key = settings.OPENROUTER_API_KEY

        # Create provider instance
        try:
            llm_provider = create_llm_provider(provider, api_key)
            models = await llm_provider.get_available_models()

            return jsonify({
                'status': 'success',
                'provider': provider,
                'models': models
            })
        except Exception as e:
            logger.error(f"Error creating provider: {e}")
            return jsonify({
                'status': 'error',
                'error': f"Provider not configured: {str(e)}"
            }), 400

    except Exception as e:
        logger.error(f"Error getting models: {e}")
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 500
