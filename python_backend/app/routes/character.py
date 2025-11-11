"""
QuestKeeperAI - Character Management Routes
CRUD operations for D&D 5e characters
"""

from flask import Blueprint, request, jsonify
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)

bp = Blueprint('character', __name__, url_prefix='/api/characters')

@bp.route('', methods=['GET'])
def list_characters():
    """Get all characters for the current user"""
    try:
        from app.models import Character, get_or_create_session
        
        # TODO: Get user_id from session/auth
        user_id = request.args.get('user_id', 'default_user')
        
        session = get_or_create_session()
        characters = session.query(Character).filter_by(user_id=user_id).all()
        
        result = [char.to_dict() for char in characters]
        session.close()
        
        return jsonify({
            "status": "success",
            "characters": result,
            "count": len(result)
        }), 200
    
    except Exception as e:
        logger.error(f"Error listing characters: {e}")
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

@bp.route('', methods=['POST'])
def create_character():
    """Create a new character"""
    try:
        from app.models import Character, AbilityScores, get_or_create_session
        
        data = request.get_json()
        
        # Validate required fields
        required = ['name', 'character_class', 'race']
        for field in required:
            if field not in data:
                return jsonify({
                    "status": "error",
                    "error": f"Missing required field: {field}"
                }), 400
        
        # TODO: Get user_id from session/auth
        user_id = data.get('user_id', 'default_user')
        
        session = get_or_create_session()
        
        # Create character
        character = Character(
            user_id=user_id,
            name=data['name'],
            character_class=data['character_class'],
            race=data['race'],
            background=data.get('background'),
            alignment=data.get('alignment', 'Neutral'),
            level=data.get('level', 1),
            hit_points_max=data.get('hit_points_max', 10),
            hit_points_current=data.get('hit_points_current', 10),
            armor_class=data.get('armor_class', 10)
        )
        
        session.add(character)
        session.flush()  # Get character ID
        
        # Create ability scores
        abilities = data.get('ability_scores', {})
        ability_scores = AbilityScores(
            character_id=character.id,
            strength=abilities.get('strength', 10),
            dexterity=abilities.get('dexterity', 10),
            constitution=abilities.get('constitution', 10),
            intelligence=abilities.get('intelligence', 10),
            wisdom=abilities.get('wisdom', 10),
            charisma=abilities.get('charisma', 10)
        )
        
        session.add(ability_scores)
        session.commit()
        
        result = character.to_dict()
        session.close()
        
        logger.info(f"Created character: {character.name} (ID: {character.id})")
        
        return jsonify({
            "status": "success",
            "character": result
        }), 201
    
    except Exception as e:
        logger.error(f"Error creating character: {e}")
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

@bp.route('/<character_id>', methods=['GET'])
def get_character(character_id: str):
    """Get a specific character by ID"""
    try:
        from app.models import Character, get_or_create_session
        
        session = get_or_create_session()
        character = session.query(Character).filter_by(id=character_id).first()
        
        if not character:
            session.close()
            return jsonify({
                "status": "error",
                "error": "Character not found"
            }), 404
        
        result = character.to_dict()
        session.close()
        
        return jsonify({
            "status": "success",
            "character": result
        }), 200
    
    except Exception as e:
        logger.error(f"Error getting character: {e}")
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

@bp.route('/<character_id>', methods=['PUT'])
def update_character(character_id: str):
    """Update a character"""
    try:
        from app.models import Character, AbilityScores, get_or_create_session
        from datetime import datetime
        
        data = request.get_json()
        
        session = get_or_create_session()
        character = session.query(Character).filter_by(id=character_id).first()
        
        if not character:
            session.close()
            return jsonify({
                "status": "error",
                "error": "Character not found"
            }), 404
        
        # Update basic fields
        for field in ['name', 'level', 'experience', 'hit_points_current', 'hit_points_max', 'armor_class']:
            if field in data:
                setattr(character, field, data[field])
        
        # Update ability scores if provided
        if 'ability_scores' in data:
            abilities = data['ability_scores']
            if character.ability_scores:
                for ability in ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']:
                    if ability in abilities:
                        setattr(character.ability_scores, ability, abilities[ability])
        
        character.updated_at = datetime.utcnow()
        character.last_played = datetime.utcnow()
        
        session.commit()
        
        result = character.to_dict()
        session.close()
        
        logger.info(f"Updated character: {character.name} (ID: {character_id})")
        
        return jsonify({
            "status": "success",
            "character": result
        }), 200
    
    except Exception as e:
        logger.error(f"Error updating character: {e}")
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

@bp.route('/<character_id>', methods=['DELETE'])
def delete_character(character_id: str):
    """Delete a character"""
    try:
        from app.models import Character, get_or_create_session
        
        session = get_or_create_session()
        character = session.query(Character).filter_by(id=character_id).first()
        
        if not character:
            session.close()
            return jsonify({
                "status": "error",
                "error": "Character not found"
            }), 404
        
        name = character.name
        session.delete(character)
        session.commit()
        session.close()
        
        logger.info(f"Deleted character: {name} (ID: {character_id})")
        
        return jsonify({
            "status": "success",
            "message": f"Character {name} deleted"
        }), 200
    
    except Exception as e:
        logger.error(f"Error deleting character: {e}")
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

# Inventory routes
@bp.route('/<character_id>/inventory', methods=['GET'])
def get_inventory(character_id: str):
    """Get character's inventory"""
    try:
        from app.models import InventoryItem, get_or_create_session
        
        session = get_or_create_session()
        items = session.query(InventoryItem).filter_by(character_id=character_id).all()
        
        result = [item.to_dict() for item in items]
        session.close()
        
        return jsonify({
            "status": "success",
            "inventory": result,
            "count": len(result)
        }), 200
    
    except Exception as e:
        logger.error(f"Error getting inventory: {e}")
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

@bp.route('/<character_id>/inventory', methods=['POST'])
def add_inventory_item(character_id: str):
    """Add item to inventory"""
    try:
        from app.models import InventoryItem, Character, get_or_create_session
        
        data = request.get_json()
        
        # Validate character exists
        session = get_or_create_session()
        character = session.query(Character).filter_by(id=character_id).first()
        
        if not character:
            session.close()
            return jsonify({
                "status": "error",
                "error": "Character not found"
            }), 404
        
        # Create item
        item = InventoryItem(
            character_id=character_id,
            item_name=data.get('item_name'),
            item_type=data.get('item_type'),
            quantity=data.get('quantity', 1),
            weight=data.get('weight'),
            rarity=data.get('rarity'),
            description=data.get('description'),
            location=data.get('location', 'backpack'),
            properties=data.get('properties'),
            mcp_managed=data.get('mcp_managed', False),
            mcp_source=data.get('mcp_source')
        )
        
        session.add(item)
        session.commit()
        
        result = item.to_dict()
        session.close()
        
        logger.info(f"Added item to {character.name}: {item.item_name}")
        
        return jsonify({
            "status": "success",
            "item": result
        }), 201
    
    except Exception as e:
        logger.error(f"Error adding inventory item: {e}")
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

# Quest routes
@bp.route('/<character_id>/quests', methods=['GET'])
def get_quests(character_id: str):
    """Get character's quests"""
    try:
        from app.models import Quest, get_or_create_session
        
        status_filter = request.args.get('status')  # active, completed, failed
        
        session = get_or_create_session()
        query = session.query(Quest).filter_by(character_id=character_id)
        
        if status_filter:
            query = query.filter_by(status=status_filter)
        
        quests = query.all()
        
        result = [quest.to_dict() for quest in quests]
        session.close()
        
        return jsonify({
            "status": "success",
            "quests": result,
            "count": len(result)
        }), 200
    
    except Exception as e:
        logger.error(f"Error getting quests: {e}")
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

@bp.route('/<character_id>/quests', methods=['POST'])
def create_quest(character_id: str):
    """Create a new quest"""
    try:
        from app.models import Quest, Character, get_or_create_session
        
        data = request.get_json()
        
        # Validate character exists
        session = get_or_create_session()
        character = session.query(Character).filter_by(id=character_id).first()
        
        if not character:
            session.close()
            return jsonify({
                "status": "error",
                "error": "Character not found"
            }), 404
        
        # Create quest
        quest = Quest(
            character_id=character_id,
            title=data.get('title'),
            description=data.get('description'),
            quest_giver=data.get('quest_giver'),
            status=data.get('status', 'active'),
            objectives=data.get('objectives', []),
            reward_xp=data.get('reward_xp', 0),
            reward_gold=data.get('reward_gold', 0),
            reward_items=data.get('reward_items'),
            mcp_managed=data.get('mcp_managed', False),
            mcp_source=data.get('mcp_source')
        )
        
        session.add(quest)
        session.commit()
        
        result = quest.to_dict()
        session.close()
        
        logger.info(f"Created quest for {character.name}: {quest.title}")
        
        return jsonify({
            "status": "success",
            "quest": result
        }), 201
    
    except Exception as e:
        logger.error(f"Error creating quest: {e}")
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500
