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
