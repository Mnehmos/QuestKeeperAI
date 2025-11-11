from sqlalchemy import create_engine, Column, String, Integer, DateTime, Boolean, JSON, ForeignKey, Text, Numeric
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker
from datetime import datetime
from uuid import uuid4
import json

Base = declarative_base()

class Character(Base):
    __tablename__ = "characters"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id = Column(String(36), nullable=False)
    name = Column(String(255), nullable=False)
    character_class = Column(String(50), nullable=False)
    race = Column(String(50), nullable=False)
    level = Column(Integer, default=1)
    experience = Column(Integer, default=0)
    hit_points_max = Column(Integer)
    hit_points_current = Column(Integer)
    armor_class = Column(Integer, default=10)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    ability_scores = relationship("AbilityScores", back_populates="character", cascade="all, delete-orphan")
    inventory = relationship("InventoryItem", back_populates="character", cascade="all, delete-orphan")
    quests = relationship("Quest", back_populates="character", cascade="all, delete-orphan")
    combat_sessions = relationship("CombatSession", back_populates="character", cascade="all, delete-orphan")

class AbilityScores(Base):
    __tablename__ = "ability_scores"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    character_id = Column(String(36), ForeignKey("characters.id"), nullable=False)
    strength = Column(Integer, default=10)
    dexterity = Column(Integer, default=10)
    constitution = Column(Integer, default=10)
    intelligence = Column(Integer, default=10)
    wisdom = Column(Integer, default=10)
    charisma = Column(Integer, default=10)

    character = relationship("Character", back_populates="ability_scores")

class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    character_id = Column(String(36), ForeignKey("characters.id"), nullable=False)
    item_name = Column(String(255), nullable=False)
    quantity = Column(Integer, default=1)
    weight = Column(Numeric(8, 2))
    rarity = Column(String(50))
    description = Column(Text)
    location = Column(String(50), default="backpack")  # equipped, backpack, storage
    mcp_managed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    character = relationship("Character", back_populates="inventory")

class Quest(Base):
    __tablename__ = "quests"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    character_id = Column(String(36), ForeignKey("characters.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    status = Column(String(50), default="active")  # active, completed, failed
    reward_xp = Column(Integer, default=0)
    reward_gold = Column(Integer, default=0)
    objectives = Column(JSON, default=list)  # Array of objective strings
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)

    character = relationship("Character", back_populates="quests")

class CombatSession(Base):
    __tablename__ = "combat_sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    character_id = Column(String(36), ForeignKey("characters.id"), nullable=False)
    session_name = Column(String(255))
    status = Column(String(50), default="active")  # active, completed, abandoned
    participants = Column(JSON)  # Array of {name, type, hp_max, hp_current, ac}
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime)

    character = relationship("Character", back_populates="combat_sessions")

class MCPServer(Base):
    __tablename__ = "mcp_servers"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    name = Column(String(255), nullable=False, unique=True)
    type = Column(String(50))  # stdio, sse, http
    executable_path = Column(String(512))
    enabled = Column(Boolean, default=True)
    config = Column(JSON)  # Server-specific config
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ToolCall(Base):
    __tablename__ = "tool_calls"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    character_id = Column(String(36), ForeignKey("characters.id"))
    mcp_server_id = Column(String(36), ForeignKey("mcp_servers.id"))
    tool_name = Column(String(255), nullable=False)
    parameters = Column(JSON)
    result = Column(JSON)
    status = Column(String(50))  # pending, success, error
    error_message = Column(Text)
    execution_ms = Column(Integer)
    executed_at = Column(DateTime, default=datetime.utcnow)

def init_db(database_url: str):
    """Initialize database with all tables"""
    engine = create_engine(database_url)
    Base.metadata.create_all(engine)
    return engine

def get_session(engine):
    """Get SQLAlchemy session"""
    Session = sessionmaker(bind=engine)
    return Session()
