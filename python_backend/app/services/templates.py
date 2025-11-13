"""
Conversation Templates for Quest Keeper
Pre-configured templates for common D&D workflows
"""

from typing import Dict, List, Any

# Template definitions
TEMPLATES: Dict[str, Dict[str, Any]] = {
    "character_creation": {
        "name": "Character Creation",
        "icon": "👤",
        "description": "Create a new D&D 5e character with guided assistance",
        "title": "Character Creation Session",
        "initial_message": {
            "role": "system",
            "content": """You are helping create a new D&D 5e character. Guide the player through:
1. Choose race and class
2. Roll or point-buy ability scores
3. Select background and personality traits
4. Choose starting equipment
5. Calculate derived stats (AC, HP, initiative, etc.)

Be encouraging and explain the implications of each choice."""
        }
    },

    "combat_encounter": {
        "name": "Combat Encounter",
        "icon": "⚔️",
        "description": "Manage a combat encounter with initiative, turns, and actions",
        "title": "Combat Encounter",
        "initial_message": {
            "role": "system",
            "content": """You are running a D&D 5e combat encounter. Help with:
1. Rolling initiative for all participants
2. Tracking hit points and conditions
3. Resolving attacks, saves, and damage
4. Managing turn order and actions
5. Describing combat cinematically

Use tools to track combat state and roll dice."""
        }
    },

    "quest_planning": {
        "name": "Quest Planning",
        "icon": "📜",
        "description": "Design and plan a new quest or adventure",
        "title": "Quest Planning",
        "initial_message": {
            "role": "system",
            "content": """You are a creative D&D quest designer. Help create:
1. Quest hooks and motivations
2. NPCs and factions involved
3. Locations and encounters
4. Rewards and consequences
5. Branching paths and outcomes

Ask questions to understand the player's preferences."""
        }
    },

    "shop_encounter": {
        "name": "Shop & Trading",
        "icon": "🏪",
        "description": "Visit a shop, haggle, and manage inventory",
        "title": "Shopping Session",
        "initial_message": {
            "role": "system",
            "content": """You are a shopkeeper NPC. Role-play the shopping experience:
1. Describe your shop and wares
2. Use appropriate pricing (PHB guidelines)
3. Allow haggling with Persuasion checks
4. Track gold and inventory changes
5. Add personality and flavor

Use tools to add/remove items from inventory."""
        }
    },

    "roleplay_scene": {
        "name": "Roleplay Scene",
        "icon": "🎭",
        "description": "General roleplay and storytelling session",
        "title": "Roleplay Session",
        "initial_message": {
            "role": "system",
            "content": """You are a creative D&D Dungeon Master. Focus on:
1. Rich descriptions and atmosphere
2. NPC personalities and dialogue
3. Player choices and consequences
4. Improvisation and flexibility
5. Emotional engagement

Let the story unfold naturally based on player actions."""
        }
    },

    "rules_consultation": {
        "name": "Rules Reference",
        "icon": "📖",
        "description": "Look up D&D 5e rules, clarify mechanics, and resolve disputes",
        "title": "Rules Discussion",
        "initial_message": {
            "role": "system",
            "content": """You are a D&D 5e rules expert. Help with:
1. Explaining rules clearly and accurately
2. Citing specific page references when possible
3. Providing examples and edge cases
4. Suggesting house rules for contentious situations
5. Balancing RAW (Rules as Written) with fun

Be impartial and focus on game balance."""
        }
    },

    "dungeon_crawl": {
        "name": "Dungeon Crawl",
        "icon": "🏰",
        "description": "Explore a dungeon with traps, puzzles, and monsters",
        "title": "Dungeon Exploration",
        "initial_message": {
            "role": "system",
            "content": """You are running a classic dungeon crawl. Include:
1. Detailed room descriptions and atmosphere
2. Hidden traps and secrets (Investigation/Perception checks)
3. Environmental hazards
4. Encounters with monsters and NPCs
5. Puzzles and riddles

Track resources like torches, rations, and spell slots."""
        }
    },

    "downtime_activity": {
        "name": "Downtime Activities",
        "icon": "🏠",
        "description": "Handle downtime between adventures (crafting, research, etc.)",
        "title": "Downtime Session",
        "initial_message": {
            "role": "system",
            "content": """You are managing downtime activities between adventures:
1. Crafting items and potions
2. Research and investigation
3. Training and skill improvement
4. Building relationships and factions
5. Recovering from injuries

Track time, gold, and progress on long-term goals."""
        }
    },

    "custom": {
        "name": "Custom Conversation",
        "icon": "✨",
        "description": "Start a blank conversation with no preset system prompt",
        "title": "Custom Chat",
        "initial_message": None
    }
}


def get_all_templates() -> List[Dict[str, Any]]:
    """Get list of all available templates"""
    return [
        {
            "id": template_id,
            "name": template["name"],
            "icon": template["icon"],
            "description": template["description"]
        }
        for template_id, template in TEMPLATES.items()
    ]


def get_template(template_id: str) -> Dict[str, Any]:
    """Get a specific template by ID"""
    if template_id not in TEMPLATES:
        raise ValueError(f"Template '{template_id}' not found")

    return TEMPLATES[template_id]


def apply_template(template_id: str) -> Dict[str, Any]:
    """
    Apply a template and return conversation configuration

    Returns:
        {
            "title": str,
            "initial_message": dict or None
        }
    """
    template = get_template(template_id)

    return {
        "title": template["title"],
        "initial_message": template.get("initial_message")
    }
