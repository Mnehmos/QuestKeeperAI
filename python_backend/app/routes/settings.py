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
from app.curated_models import CURATED_MODELS, PROVIDER_INFO

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

        # Load existing settings to preserve API keys
        existing_settings = load_user_settings()
        existing_api_keys = existing_settings.get('api_keys', {})

        # Save user preferences (including API keys)
        # Note: API keys are stored in plain text for convenience
        # For production, consider using system keychain
        user_settings = {
            'provider': provider,
            'model': data.get('model'),
            'debug_mode': data.get('debug_mode', False),
            'api_keys': existing_api_keys  # Preserve existing keys
        }

        # Update API key if it was provided
        if api_key:
            user_settings['api_keys'][provider] = api_key

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
    """Get curated models for current or specified provider"""
    try:
        # Get provider from query param or use current
        provider = request.args.get('provider')
        if not provider:
            user_settings = load_user_settings()
            provider = user_settings.get('provider', 'gemini')

        # Return curated models for this provider
        if provider in CURATED_MODELS:
            return jsonify({
                'status': 'success',
                'provider': provider,
                'models': CURATED_MODELS[provider]['recommended']
            })
        else:
            return jsonify({
                'status': 'error',
                'error': f'Unknown provider: {provider}'
            }), 400

    except Exception as e:
        logger.error(f"Error getting models: {e}")
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 500


@bp.route('/providers', methods=['GET'])
def get_providers():
    """Get available providers with their configuration status"""
    try:
        # Check which providers have API keys configured
        providers = []
        for provider_id, info in PROVIDER_INFO.items():
            configured = False
            
            if provider_id == 'anthropic':
                configured = bool(settings.ANTHROPIC_API_KEY)
            elif provider_id == 'openai':
                configured = bool(settings.OPENAI_API_KEY)
            elif provider_id == 'gemini':
                configured = bool(settings.GEMINI_API_KEY)
            elif provider_id == 'openrouter':
                configured = bool(settings.OPENROUTER_API_KEY)
            elif provider_id == 'local':
                configured = True  # Local is always available
            
            providers.append({
                'id': provider_id,
                'name': info['name'],
                'icon': info['icon'],
                'description': info['description'],
                'configured': configured,
                'requires_api_key': info['requires_api_key']
            })
        
        return jsonify({
            'status': 'success',
            'providers': providers
        })
    
    except Exception as e:
        logger.error(f"Error getting providers: {e}")
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 500
