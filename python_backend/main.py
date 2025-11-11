#!/usr/bin/env python3
"""
QuestKeeperAI Backend Server
Modern D&D 5e assistant with MCP integration
"""

from flask import Flask
from flask_cors import CORS
import logging
from app.config import settings
from app.models import init_db

def create_app():
    """Application factory"""
    app = Flask(__name__)
    app.config.from_object(settings)

    # CORS
    CORS(app, origins=settings.CORS_ORIGINS)

    # Database
    init_db(settings.DATABASE_URL)

    # Register routes
    from app.routes import character, chat, mcp
    app.register_blueprint(character.bp)
    app.register_blueprint(chat.bp)
    app.register_blueprint(mcp.bp)

    # Health check
    @app.route('/health')
    def health():
        return {"status": "ok", "version": "0.2.0", "provider": settings.LLM_PROVIDER.value}

    # Root endpoint
    @app.route('/')
    def index():
        return {
            "name": "QuestKeeperAI Backend",
            "version": "0.2.0",
            "description": "D&D 5e AI Assistant with MCP integration",
            "endpoints": {
                "health": "/health",
                "characters": "/api/characters",
                "chat": "/api/chat",
                "mcp": "/api/mcp"
            }
        }

    return app

if __name__ == '__main__':
    logging.basicConfig(
        level=getattr(logging, settings.LOG_LEVEL),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    logger = logging.getLogger(__name__)
    logger.info(f"Starting QuestKeeperAI Backend v0.2.0")
    logger.info(f"LLM Provider: {settings.LLM_PROVIDER.value}")
    logger.info(f"Database: {settings.DATABASE_URL}")

    # Validate configuration
    if not settings.validate():
        logger.warning("Configuration incomplete - some features may not work")

    app = create_app()
    app.run(
        host=settings.FLASK_HOST,
        port=settings.FLASK_PORT,
        debug=settings.DEBUG
    )
