"""
QuestKeeperAI - Conversation Management Routes
CRUD operations for multi-conversation support
"""

from flask import Blueprint, request, jsonify
from typing import Dict, Any
from datetime import datetime
import logging

from app.models.database import Conversation, Message, get_or_create_session
from sqlalchemy import desc, func
from app.services.templates import get_all_templates, apply_template

logger = logging.getLogger(__name__)

bp = Blueprint('conversations', __name__, url_prefix='/api/conversations')


@bp.route('', methods=['GET'])
def list_conversations():
    """
    List conversations with optional filters

    Query params:
        character_id: Filter by character (optional)
        archived: Include archived (default: false)
        pinned_only: Only pinned conversations (default: false)
        limit: Max results (default: 50)
        offset: Pagination offset (default: 0)
    """
    try:
        session = get_or_create_session()

        query = session.query(Conversation)

        # Apply filters
        character_id = request.args.get('character_id')
        if character_id:
            query = query.filter_by(character_id=character_id)

        # Archived filter
        archived = request.args.get('archived', 'false').lower() == 'true'
        if not archived:
            query = query.filter_by(archived=False)

        # Pinned filter
        pinned_only = request.args.get('pinned_only', 'false').lower() == 'true'
        if pinned_only:
            query = query.filter_by(pinned=True)

        # Order by: pinned first, then last modified
        query = query.order_by(
            desc(Conversation.pinned),
            desc(Conversation.last_modified)
        )

        # Pagination
        offset = int(request.args.get('offset', 0))
        limit = int(request.args.get('limit', 50))
        query = query.offset(offset).limit(limit)

        conversations = query.all()

        return jsonify({
            "status": "success",
            "conversations": [c.to_dict() for c in conversations],
            "count": len(conversations)
        }), 200

    except Exception as e:
        logger.error(f"Error listing conversations: {e}", exc_info=True)
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500
    finally:
        session.close()


@bp.route('/<conversation_id>', methods=['GET'])
def get_conversation(conversation_id):
    """
    Get full conversation with messages

    Query params:
        include_messages: Include message history (default: true)
        message_limit: Max messages to return (default: 100)
        message_offset: Message pagination offset (default: 0)
    """
    try:
        session = get_or_create_session()

        conversation = session.query(Conversation).filter_by(
            id=conversation_id
        ).first()

        if not conversation:
            return jsonify({
                "status": "error",
                "error": "Conversation not found"
            }), 404

        result = {
            "status": "success",
            "conversation": conversation.to_dict()
        }

        # Include messages if requested
        include_messages = request.args.get('include_messages', 'true').lower() == 'true'
        if include_messages:
            message_offset = int(request.args.get('message_offset', 0))
            message_limit = int(request.args.get('message_limit', 100))

            messages_query = session.query(Message).filter_by(
                conversation_id=conversation_id
            ).order_by(Message.timestamp).offset(message_offset).limit(message_limit)

            messages = messages_query.all()
            result["messages"] = [m.to_dict() for m in messages]
            result["message_count"] = len(conversation.messages)

        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Error getting conversation: {e}", exc_info=True)
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500
    finally:
        session.close()


@bp.route('', methods=['POST'])
def create_conversation():
    """
    Create new conversation

    Request:
        {
            "title": "str" (optional, auto-generated if not provided),
            "character_id": "uuid" (optional)
        }
    """
    try:
        session = get_or_create_session()
        data = request.get_json() or {}

        # Generate title if not provided
        title = data.get('title')
        if not title:
            title = f"Chat {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}"

        conversation = Conversation(
            title=title,
            character_id=data.get('character_id')
        )

        session.add(conversation)
        session.commit()

        logger.info(f"Created conversation {conversation.id}: {title}")

        return jsonify({
            "status": "success",
            "conversation": conversation.to_dict()
        }), 201

    except Exception as e:
        session.rollback()
        logger.error(f"Error creating conversation: {e}", exc_info=True)
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500
    finally:
        session.close()


@bp.route('/<conversation_id>', methods=['PUT'])
def update_conversation(conversation_id):
    """
    Update conversation metadata

    Request:
        {
            "title": "str" (optional),
            "pinned": bool (optional),
            "archived": bool (optional)
        }
    """
    try:
        session = get_or_create_session()
        data = request.get_json() or {}

        conversation = session.query(Conversation).filter_by(
            id=conversation_id
        ).first()

        if not conversation:
            return jsonify({
                "status": "error",
                "error": "Conversation not found"
            }), 404

        # Update fields
        if 'title' in data:
            conversation.title = data['title']

        if 'pinned' in data:
            conversation.pinned = data['pinned']

        if 'archived' in data:
            conversation.archived = data['archived']

        conversation.last_modified = datetime.utcnow()

        session.commit()

        logger.info(f"Updated conversation {conversation_id}")

        return jsonify({
            "status": "success",
            "conversation": conversation.to_dict()
        }), 200

    except Exception as e:
        session.rollback()
        logger.error(f"Error updating conversation: {e}", exc_info=True)
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500
    finally:
        session.close()


@bp.route('/<conversation_id>', methods=['DELETE'])
def delete_conversation(conversation_id):
    """Delete conversation and all messages"""
    try:
        session = get_or_create_session()

        conversation = session.query(Conversation).filter_by(
            id=conversation_id
        ).first()

        if not conversation:
            return jsonify({
                "status": "error",
                "error": "Conversation not found"
            }), 404

        # Delete conversation (cascade will delete messages)
        session.delete(conversation)
        session.commit()

        logger.info(f"Deleted conversation {conversation_id}")

        return jsonify({"status": "success"}), 200

    except Exception as e:
        session.rollback()
        logger.error(f"Error deleting conversation: {e}", exc_info=True)
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500
    finally:
        session.close()


@bp.route('/<conversation_id>/archive', methods=['POST'])
def archive_conversation(conversation_id):
    """
    Archive or unarchive conversation

    Request:
        {
            "archived": bool (default: true)
        }
    """
    try:
        session = get_or_create_session()
        data = request.get_json() or {}

        conversation = session.query(Conversation).filter_by(
            id=conversation_id
        ).first()

        if not conversation:
            return jsonify({
                "status": "error",
                "error": "Conversation not found"
            }), 404

        conversation.archived = data.get('archived', True)
        conversation.last_modified = datetime.utcnow()

        session.commit()

        logger.info(
            f"{'Archived' if conversation.archived else 'Unarchived'} "
            f"conversation {conversation_id}"
        )

        return jsonify({
            "status": "success",
            "conversation": conversation.to_dict()
        }), 200

    except Exception as e:
        session.rollback()
        logger.error(f"Error archiving conversation: {e}", exc_info=True)
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500
    finally:
        session.close()


@bp.route('/<conversation_id>/pin', methods=['POST'])
def pin_conversation(conversation_id):
    """
    Pin or unpin conversation

    Request:
        {
            "pinned": bool (default: true)
        }
    """
    try:
        session = get_or_create_session()
        data = request.get_json() or {}

        conversation = session.query(Conversation).filter_by(
            id=conversation_id
        ).first()

        if not conversation:
            return jsonify({
                "status": "error",
                "error": "Conversation not found"
            }), 404

        conversation.pinned = data.get('pinned', True)
        conversation.last_modified = datetime.utcnow()

        session.commit()

        logger.info(
            f"{'Pinned' if conversation.pinned else 'Unpinned'} "
            f"conversation {conversation_id}"
        )

        return jsonify({
            "status": "success",
            "conversation": conversation.to_dict()
        }), 200

    except Exception as e:
        session.rollback()
        logger.error(f"Error pinning conversation: {e}", exc_info=True)
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500
    finally:
        session.close()


@bp.route('/stats', methods=['GET'])
def get_conversation_stats():
    """
    Get conversation statistics

    Query params:
        character_id: Filter by character (optional)
    """
    try:
        session = get_or_create_session()

        query = session.query(Conversation)

        # Apply character filter if provided
        character_id = request.args.get('character_id')
        if character_id:
            query = query.filter_by(character_id=character_id)

        # Get counts
        total_conversations = query.count()
        active_conversations = query.filter_by(archived=False).count()
        archived_conversations = query.filter_by(archived=True).count()
        pinned_conversations = query.filter_by(pinned=True).count()

        # Get total message count
        message_query = session.query(func.count(Message.id))
        if character_id:
            message_query = message_query.join(Conversation).filter(
                Conversation.character_id == character_id
            )
        total_messages = message_query.scalar() or 0

        # Get total tokens
        token_query = session.query(func.sum(Conversation.total_tokens))
        if character_id:
            token_query = token_query.filter_by(character_id=character_id)
        total_tokens = token_query.scalar() or 0

        return jsonify({
            "status": "success",
            "stats": {
                "total_conversations": total_conversations,
                "active_conversations": active_conversations,
                "archived_conversations": archived_conversations,
                "pinned_conversations": pinned_conversations,
                "total_messages": total_messages,
                "total_tokens": total_tokens
            }
        }), 200

    except Exception as e:
        logger.error(f"Error getting conversation stats: {e}", exc_info=True)
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500
    finally:
        session.close()


@bp.route('/search', methods=['GET'])
def search_messages():
    """
    Search for messages containing specific text

    Query params:
        query: Search text (required)
        character_id: Filter by character (optional)
        conversation_id: Filter by conversation (optional)
        limit: Max results (default: 50)
        offset: Pagination offset (default: 0)
    """
    try:
        session = get_or_create_session()

        # Get search query
        search_query = request.args.get('query', '').strip()
        if not search_query:
            return jsonify({
                "status": "error",
                "error": "Search query is required"
            }), 400

        # Build base query
        query = session.query(Message).join(Conversation)

        # Apply search filter (case-insensitive)
        query = query.filter(Message.content.ilike(f'%{search_query}%'))

        # Apply optional filters
        character_id = request.args.get('character_id')
        if character_id:
            query = query.filter(Conversation.character_id == character_id)

        conversation_id = request.args.get('conversation_id')
        if conversation_id:
            query = query.filter(Message.conversation_id == conversation_id)

        # Get pagination params
        limit = min(int(request.args.get('limit', 50)), 100)
        offset = int(request.args.get('offset', 0))

        # Get total count
        total = query.count()

        # Apply pagination and ordering (most recent first)
        messages = query.order_by(desc(Message.timestamp)).limit(limit).offset(offset).all()

        # Format results
        results = []
        for msg in messages:
            # Get conversation info
            conv = msg.conversation

            # Find match context (show text around the match)
            content = msg.content
            search_lower = search_query.lower()
            content_lower = content.lower()
            match_index = content_lower.find(search_lower)

            # Extract context (50 chars before and after)
            context_start = max(0, match_index - 50)
            context_end = min(len(content), match_index + len(search_query) + 50)
            context = content[context_start:context_end]

            if context_start > 0:
                context = '...' + context
            if context_end < len(content):
                context = context + '...'

            results.append({
                "message_id": msg.id,
                "conversation_id": conv.id,
                "conversation_title": conv.title,
                "role": msg.role,
                "content": msg.content,
                "context": context,
                "timestamp": msg.timestamp.isoformat(),
                "match_position": match_index
            })

        return jsonify({
            "status": "success",
            "results": results,
            "total": total,
            "limit": limit,
            "offset": offset,
            "query": search_query
        }), 200

    except ValueError as e:
        return jsonify({
            "status": "error",
            "error": f"Invalid parameter: {str(e)}"
        }), 400
    except Exception as e:
        logger.error(f"Error searching messages: {e}", exc_info=True)
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500
    finally:
        session.close()


@bp.route('/<conversation_id>/export', methods=['GET'])
def export_conversation(conversation_id):
    """
    Export conversation in JSON or Markdown format

    Query params:
        format: json|markdown (default: json)
    """
    try:
        session = get_or_create_session()

        conversation = session.query(Conversation).filter_by(
            id=conversation_id
        ).first()

        if not conversation:
            return jsonify({
                "status": "error",
                "error": "Conversation not found"
            }), 404

        export_format = request.args.get('format', 'json').lower()

        if export_format == 'markdown':
            content = _export_to_markdown(conversation)
            mimetype = 'text/markdown'
            filename = f"{conversation.title.replace(' ', '_')}.md"
        else:
            content = _export_to_json(conversation)
            mimetype = 'application/json'
            filename = f"{conversation.title.replace(' ', '_')}.json"

        from flask import Response
        return Response(
            content,
            mimetype=mimetype,
            headers={
                'Content-Disposition': f'attachment; filename="{filename}"'
            }
        )

    except Exception as e:
        logger.error(f"Error exporting conversation: {e}", exc_info=True)
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500
    finally:
        session.close()


def _export_to_json(conversation: Conversation) -> str:
    """Export conversation to JSON format"""
    import json

    data = {
        "conversation": {
            "id": conversation.id,
            "title": conversation.title,
            "character_id": conversation.character_id,
            "created_at": conversation.created_at.isoformat(),
            "last_modified": conversation.last_modified.isoformat(),
            "total_tokens": conversation.total_tokens,
            "pinned": conversation.pinned,
            "archived": conversation.archived
        },
        "messages": [
            {
                "id": msg.id,
                "role": msg.role,
                "content": msg.content,
                "timestamp": msg.timestamp.isoformat(),
                "token_count": msg.token_count,
                "execution_ms": msg.execution_ms,
                "tool_calls": msg.tool_calls,
                "provider": msg.provider,
                "model": msg.model
            }
            for msg in conversation.messages
        ],
        "metadata": {
            "exported_at": datetime.utcnow().isoformat(),
            "message_count": len(conversation.messages),
            "export_version": "1.0"
        }
    }

    return json.dumps(data, indent=2, ensure_ascii=False)


def _export_to_markdown(conversation: Conversation) -> str:
    """Export conversation to Markdown format"""
    lines = []

    # Header
    lines.append(f"# {conversation.title}\n")
    lines.append(f"**Created:** {conversation.created_at.strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append(f"**Last Modified:** {conversation.last_modified.strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append(f"**Messages:** {len(conversation.messages)}")
    lines.append(f"**Tokens:** {conversation.total_tokens:,}")
    lines.append("\n---\n")

    # Messages
    for msg in conversation.messages:
        timestamp = msg.timestamp.strftime('%Y-%m-%d %H:%M:%S')

        if msg.role == 'user':
            lines.append(f"\n## 🧙 User ({timestamp})\n")
        elif msg.role == 'assistant':
            lines.append(f"\n## 🎲 Assistant ({timestamp})\n")
        else:
            lines.append(f"\n## ⚙️ System ({timestamp})\n")

        lines.append(msg.content)

        if msg.execution_ms:
            lines.append(f"\n*Execution time: {msg.execution_ms}ms*")

        if msg.tool_calls:
            lines.append(f"\n*Tool calls: {len(msg.tool_calls)}*")

        lines.append("\n")

    # Footer
    lines.append("\n---\n")
    lines.append(f"*Exported from QuestKeeperAI on {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}*")

    return "\n".join(lines)


@bp.route('/templates', methods=['GET'])
def list_templates():
    """
    Get list of available conversation templates

    Response:
        {
            "status": "success",
            "templates": [
                {
                    "id": "character_creation",
                    "name": "Character Creation",
                    "icon": "👤",
                    "description": "..."
                },
                ...
            ]
        }
    """
    try:
        templates = get_all_templates()

        return jsonify({
            "status": "success",
            "templates": templates
        }), 200

    except Exception as e:
        logger.error(f"Error listing templates: {e}", exc_info=True)
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500


@bp.route('/from-template', methods=['POST'])
def create_from_template():
    """
    Create conversation from a template

    Request:
        {
            "template_id": "character_creation",
            "character_id": "uuid" (optional),
            "custom_title": "My Custom Title" (optional)
        }

    Response:
        {
            "status": "success",
            "conversation": {...}
        }
    """
    try:
        session = get_or_create_session()
        data = request.get_json() or {}

        template_id = data.get('template_id')
        if not template_id:
            return jsonify({
                "status": "error",
                "error": "template_id is required"
            }), 400

        # Apply template
        template_config = apply_template(template_id)

        # Create conversation
        title = data.get('custom_title') or template_config['title']
        conversation = Conversation(
            title=title,
            character_id=data.get('character_id')
        )

        session.add(conversation)
        session.flush()

        # Add initial system message if template has one
        if template_config.get('initial_message'):
            initial_msg = Message(
                conversation_id=conversation.id,
                role=template_config['initial_message']['role'],
                content=template_config['initial_message']['content']
            )
            session.add(initial_msg)

        session.commit()

        logger.info(f"Created conversation from template '{template_id}': {conversation.id}")

        return jsonify({
            "status": "success",
            "conversation": conversation.to_dict()
        }), 201

    except ValueError as e:
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 400
    except Exception as e:
        session.rollback()
        logger.error(f"Error creating conversation from template: {e}", exc_info=True)
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500
    finally:
        session.close()
