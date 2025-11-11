"""
QuestKeeperAI - Database Models
SQLAlchemy models for D&D 5e game state: characters, inventory, quests, combat, and MCP integration.
"""

from sqlalchemy import create_engine, Column, String, Integer, DateTime, Boolean, JSON, ForeignKey, Text, Numeric, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker
from datetime import datetime
from uuid import uuid4
from typing import Optional, Dict, List, Any

Base = declarative_base()

# ================================
# CHARACTER MANAGEMENT
# ================================

class Character(Base):
    """D&D 5e Character with full stat tracking"""
    __tablename__ = "characters"
    
    # Identity
    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id = Column(String(36), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    
    # Core D&D Stats
    character_class = Column(String(50), nullable=False)
    race = Column(String(50), nullable=False)
    background = Column(String(50))
    alignment = Column(String(50))
    level = Column(Integer, default=1)
    experience = Column(Integer, default=0)
    
    # Combat Stats
    hit_points_max = Column(Integer, nullable=False)
    hit_points_current = Column(Integer, nullable=False)
    armor_class = Column(Integer, default=10)
    initiative_modifier = Column(Integer, default=0)
    speed = Column(Integer, default=30)
    
    # Proficiency
    proficiency_bonus = Column(Integer, default=2)
    
    # Additional Stats (stored as JSON for flexibility)
    saving_throws = Column(JSON)  # {"strength": {"proficient": true, "value": 5}}
    skills = Column(JSON)  # {"athletics": {"proficient": true, "value": 3}}
    languages = Column(JSON)  # ["Common", "Elvish"]
    equipment = Column(JSON)  # Currently equipped items
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_played = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    ability_scores = relationship("AbilityScores", back_populates="character", uselist=False, cascade="all, delete-orphan")
    inventory = relationship("InventoryItem", back_populates="character", cascade="all, delete-orphan")
    quests = relationship("Quest", back_populates="character", cascade="all, delete-orphan")
    combat_sessions = relationship("CombatSession", back_populates="character", cascade="all, delete-orphan")
    spells = relationship("Spell", back_populates="character", cascade="all, delete-orphan")
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert character to dictionary"""
        return {
            "id": self.id,
            "name": self.name,
            "character_class": self.character_class,
            "race": self.race,
            "level": self.level,
            "experience": self.experience,
            "hit_points_max": self.hit_points_max,
            "hit_points_current": self.hit_points_current,
            "armor_class": self.armor_class,
            "ability_scores": self.ability_scores.to_dict() if self.ability_scores else None,
            "created_at": self.created_at.isoformat(),
            "last_played": self.last_played.isoformat() if self.last_played else None
        }

class AbilityScores(Base):
    """D&D 5e Ability Scores (STR, DEX, CON, INT, WIS, CHA)"""
    __tablename__ = "ability_scores"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    character_id = Column(String(36), ForeignKey("characters.id"), nullable=False, unique=True)
    
    # The Big Six
    strength = Column(Integer, default=10)
    dexterity = Column(Integer, default=10)
    constitution = Column(Integer, default=10)
    intelligence = Column(Integer, default=10)
    wisdom = Column(Integer, default=10)
    charisma = Column(Integer, default=10)
    
    # Relationship
    character = relationship("Character", back_populates="ability_scores")
    
    def get_modifier(self, ability: str) -> int:
        """Calculate ability modifier"""
        score = getattr(self, ability.lower(), 10)
        return (score - 10) // 2
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary with modifiers"""
        return {
            "strength": self.strength,
            "dexterity": self.dexterity,
            "constitution": self.constitution,
            "intelligence": self.intelligence,
            "wisdom": self.wisdom,
            "charisma": self.charisma,
            "modifiers": {
                "strength": self.get_modifier("strength"),
                "dexterity": self.get_modifier("dexterity"),
                "constitution": self.get_modifier("constitution"),
                "intelligence": self.get_modifier("intelligence"),
                "wisdom": self.get_modifier("wisdom"),
                "charisma": self.get_modifier("charisma"),
            }
        }

# ================================
# INVENTORY SYSTEM
# ================================

class InventoryItem(Base):
    """Character inventory items with D&D 5e rarity system"""
    __tablename__ = "inventory_items"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    character_id = Column(String(36), ForeignKey("characters.id"), nullable=False, index=True)
    
    # Item Details
    item_name = Column(String(255), nullable=False)
    item_type = Column(String(50))  # weapon, armor, consumable, tool, treasure
    quantity = Column(Integer, default=1)
    weight = Column(Numeric(8, 2))
    rarity = Column(String(50))  # common, uncommon, rare, very_rare, legendary, artifact
    description = Column(Text)
    
    # Location
    location = Column(String(50), default="backpack")  # equipped, backpack, storage
    equipped_slot = Column(String(50))  # main_hand, off_hand, head, chest, etc.
    
    # Properties (stored as JSON for flexibility)
    properties = Column(JSON)  # {"damage": "1d8", "damage_type": "slashing", "magical": true}
    
    # MCP Management
    mcp_managed = Column(Boolean, default=False)  # Can MCPs modify this item?
    mcp_source = Column(String(255))  # Which MCP created/last modified
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    character = relationship("Character", back_populates="inventory")
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "id": self.id,
            "item_name": self.item_name,
            "item_type": self.item_type,
            "quantity": self.quantity,
            "weight": float(self.weight) if self.weight else None,
            "rarity": self.rarity,
            "description": self.description,
            "location": self.location,
            "properties": self.properties,
            "mcp_managed": self.mcp_managed
        }

# ================================
# QUEST SYSTEM
# ================================

class Quest(Base):
    """Quest tracking with objectives and rewards"""
    __tablename__ = "quests"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    character_id = Column(String(36), ForeignKey("characters.id"), nullable=False, index=True)
    
    # Quest Details
    title = Column(String(255), nullable=False)
    description = Column(Text)
    quest_giver = Column(String(255))
    
    # Status
    status = Column(String(50), default="active")  # active, completed, failed, abandoned
    
    # Rewards
    reward_xp = Column(Integer, default=0)
    reward_gold = Column(Integer, default=0)
    reward_items = Column(JSON)  # Array of item IDs or names
    
    # Objectives (stored as JSON array)
    objectives = Column(JSON, default=list)  # [{"text": "Find the artifact", "completed": false}]
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # MCP Management
    mcp_managed = Column(Boolean, default=False)
    mcp_source = Column(String(255))
    
    # Relationship
    character = relationship("Character", back_populates="quests")
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "status": self.status,
            "objectives": self.objectives,
            "reward_xp": self.reward_xp,
            "reward_gold": self.reward_gold,
            "created_at": self.created_at.isoformat(),
            "completed_at": self.completed_at.isoformat() if self.completed_at else None
        }

# ================================
# COMBAT SYSTEM
# ================================

class CombatSession(Base):
    """Combat encounter tracking"""
    __tablename__ = "combat_sessions"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    character_id = Column(String(36), ForeignKey("characters.id"), nullable=False)
    
    # Session Info
    session_name = Column(String(255))
    encounter_type = Column(String(50))  # combat, skill_challenge, trap
    difficulty = Column(String(50))  # easy, medium, hard, deadly
    
    # Status
    status = Column(String(50), default="active")  # active, completed, fled, tpk
    current_round = Column(Integer, default=0)
    current_turn = Column(Integer, default=0)
    
    # Participants (stored as JSON)
    participants = Column(JSON)  # [{"name": "Goblin", "type": "enemy", "hp": 7, "ac": 15, "initiative": 12}]
    initiative_order = Column(JSON)  # Sorted list of participant names
    
    # Combat Log
    action_log = Column(JSON)  # Array of actions taken
    
    # Metadata
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime)
    
    # Relationship
    character = relationship("Character", back_populates="combat_sessions")
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "id": self.id,
            "session_name": self.session_name,
            "status": self.status,
            "current_round": self.current_round,
            "participants": self.participants,
            "initiative_order": self.initiative_order,
            "started_at": self.started_at.isoformat()
        }

# ================================
# SPELLS & ABILITIES
# ================================

class Spell(Base):
    """Character spells and abilities"""
    __tablename__ = "spells"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    character_id = Column(String(36), ForeignKey("characters.id"), nullable=False, index=True)
    
    # Spell Details
    spell_name = Column(String(255), nullable=False)
    spell_level = Column(Integer, nullable=False)  # 0 = cantrip
    school = Column(String(50))  # evocation, abjuration, etc.
    casting_time = Column(String(100))
    range = Column(String(100))
    duration = Column(String(100))
    components = Column(String(100))  # V, S, M
    description = Column(Text)
    
    # Status
    is_prepared = Column(Boolean, default=False)
    is_always_prepared = Column(Boolean, default=False)  # Domain spells, racial abilities
    
    # Usage
    uses_remaining = Column(Integer)  # For limited use abilities
    uses_max = Column(Integer)
    
    # Source
    source = Column(String(100))  # class, racial, feat, item
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationship
    character = relationship("Character", back_populates="spells")
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "id": self.id,
            "spell_name": self.spell_name,
            "spell_level": self.spell_level,
            "description": self.description,
            "is_prepared": self.is_prepared,
            "source": self.source
        }

# ================================
# MCP SERVER MANAGEMENT
# ================================

class MCPServer(Base):
    """MCP server configuration and state"""
    __tablename__ = "mcp_servers"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    
    # Server Identity
    name = Column(String(255), nullable=False, unique=True)
    display_name = Column(String(255))
    type = Column(String(50), nullable=False)  # stdio, sse, http
    
    # Connection
    executable_path = Column(String(512))
    command = Column(String(255))
    args = Column(JSON)  # Command-line arguments
    
    # Status
    enabled = Column(Boolean, default=True)
    status = Column(String(50), default="disconnected")  # connected, disconnected, error
    
    # Configuration
    config = Column(JSON)  # Server-specific settings
    environment = Column(JSON)  # Environment variables
    
    # Tools
    available_tools = Column(JSON)  # Cached list of tool names
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_connected = Column(DateTime)
    
    # Relationships
    tool_calls = relationship("ToolCall", back_populates="mcp_server", cascade="all, delete-orphan")
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "id": self.id,
            "name": self.name,
            "display_name": self.display_name,
            "type": self.type,
            "enabled": self.enabled,
            "status": self.status,
            "available_tools": self.available_tools or [],
            "last_connected": self.last_connected.isoformat() if self.last_connected else None
        }

# ================================
# TOOL EXECUTION AUDIT
# ================================

class ToolCall(Base):
    """Audit trail for MCP tool executions"""
    __tablename__ = "tool_calls"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    
    # Association
    character_id = Column(String(36), ForeignKey("characters.id"), index=True)
    mcp_server_id = Column(String(36), ForeignKey("mcp_servers.id"), nullable=False, index=True)
    
    # Tool Details
    tool_name = Column(String(255), nullable=False, index=True)
    parameters = Column(JSON)
    result = Column(JSON)
    
    # Execution
    status = Column(String(50), nullable=False)  # pending, success, error, timeout
    error_message = Column(Text)
    execution_ms = Column(Integer)
    
    # Metadata
    executed_at = Column(DateTime, default=datetime.utcnow, index=True)
    user_approved = Column(Boolean, default=False)  # Did user explicitly approve?
    
    # Relationships
    mcp_server = relationship("MCPServer", back_populates="tool_calls")
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "id": self.id,
            "tool_name": self.tool_name,
            "server": self.mcp_server.name if self.mcp_server else None,
            "parameters": self.parameters,
            "result": self.result,
            "status": self.status,
            "execution_ms": self.execution_ms,
            "executed_at": self.executed_at.isoformat()
        }

# ================================
# DATABASE INITIALIZATION
# ================================

def init_db(database_url: str):
    """Initialize database with all tables"""
    engine = create_engine(database_url, echo=False)
    Base.metadata.create_all(engine)
    return engine

def get_session(engine):
    """Get SQLAlchemy session"""
    Session = sessionmaker(bind=engine)
    return Session()

def get_or_create_session(database_url: str = None):
    """Get or create database session"""
    from app.config import settings
    
    if database_url is None:
        database_url = settings.DATABASE_URL
    
    engine = init_db(database_url)
    return get_session(engine)
