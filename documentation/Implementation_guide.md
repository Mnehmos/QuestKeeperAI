# QUEST KEEPER AI - IMPLEMENTATION GUIDE & CODE TEMPLATES

## SECTION 1: IMMEDIATE ACTIONS (Week 1)

### 1.1 Repository Setup

**Current State Issues:**
- `python_backend/main.py` is a stub
- No structured Flask application
- No database layer
- No proper Python packaging

**Action Items:**

```bash
# 1. Clean up backend structure
rm python_backend/main.py  # Remove stub
mkdir -p python_backend/app/{models,routes,services,mcp}
mkdir -p python_backend/tests
mkdir -p python_backend/migrations

# 2. Initialize proper Python project
cd python_backend
python -m venv venv
source venv/Scripts/activate  # Windows: venv\Scripts\activate
```

**Updated pyproject.toml:**
```toml
[build-system]
requires = ["setuptools>=68.0", "wheel"]
build-backend = "setuptools.build_meta"

[project]
name = "quest-keeper-ai-backend"
version = "0.2.0"
description = "D&D RPG backend for Quest Keeper AI"
requires-python = ">=3.9"
dependencies = [
    "Flask==3.0.0",
    "Flask-CORS==4.0.0",
    "python-dotenv==1.0.0",
    "anthropic>=0.7.0",
    "openai>=1.0.0",
    "pydantic>=2.0.0",
    "SQLAlchemy>=2.0.0",
    "alembic>=1.13.0",
    "pydantic-settings>=2.0.0",
    "httpx>=0.25.0"
]

[project.optional-dependencies]
dev = [
    "pytest>=7.4.0",
    "pytest-cov>=4.1.0",
    "pytest-asyncio>=0.21.0",
    "black>=23.0.0",
    "flake8>=6.0.0",
    "mypy>=1.5.0"
]
```

### 1.2 Backend Modernization - Core Files

**File: python_backend/app/config.py**
```python
import os
from pathlib import Path
from enum import Enum
from pydantic_settings import BaseSettings

class LLMProvider(str, Enum):
    ANTHROPIC = "anthropic"
    OPENAI = "openai"
    GEMINI = "gemini"
    LOCAL = "local"

class Settings(BaseSettings):
    # Application
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    
    # Database
    DATABASE_URL: str = f"sqlite:///{Path.home() / 'AppData/Local/QuestKeeperAI/game.db'}"
    
    # LLM Configuration
    LLM_PROVIDER: LLMProvider = LLMProvider.ANTHROPIC
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    LOCAL_LLM_URL: str = os.getenv("LOCAL_LLM_URL", "http://localhost:11434")
    LOCAL_LLM_MODEL: str = os.getenv("LOCAL_LLM_MODEL", "mistral")
    
    # MCP Configuration
    MCP_SERVERS_DIR: Path = Path.home() / "AppData/Local/QuestKeeperAI/servers"
    MCP_TIMEOUT_SECONDS: int = 30
    MCP_PROCESS_LIMIT: int = 10
    
    # IPC
    FLASK_PORT: int = 5001
    FLASK_HOST: str = "127.0.0.1"
    
    class Config:
        env_file = ".env"

settings = Settings()
```

**File: python_backend/app/models/database.py**
```python
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
```

**File: python_backend/app/llm/__init__.py**
```python
from .provider import LLMProvider, AnthropicProvider, OpenAIProvider, GeminiProvider, LocalProvider
from .factory import create_llm_provider

__all__ = [
    "LLMProvider",
    "AnthropicProvider",
    "OpenAIProvider",
    "GeminiProvider",
    "LocalProvider",
    "create_llm_provider"
]
```

**File: python_backend/app/llm/provider.py**
```python
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)

@dataclass
class Message:
    role: str  # user, assistant, system
    content: str

@dataclass
class Tool:
    name: str
    description: str
    input_schema: Dict[str, Any]

class LLMProvider(ABC):
    """Abstract base class for LLM providers"""
    
    @abstractmethod
    async def chat(
        self,
        messages: List[Message],
        system_prompt: Optional[str] = None,
        tools: Optional[List[Tool]] = None,
        temperature: float = 0.7,
        max_tokens: int = 2048
    ) -> Dict[str, Any]:
        """
        Send messages to LLM and get response
        Returns: {
            "content": str,
            "tool_calls": [{"name": str, "args": dict}],
            "stop_reason": str
        }
        """
        pass
    
    @abstractmethod
    async def get_available_models(self) -> List[str]:
        """Get list of available models for this provider"""
        pass

class AnthropicProvider(LLMProvider):
    """Anthropic Claude API provider"""
    
    def __init__(self, api_key: str):
        from anthropic import Anthropic
        self.client = Anthropic(api_key=api_key)
        self.model = "claude-3-5-sonnet-20241022"
    
    async def chat(
        self,
        messages: List[Message],
        system_prompt: Optional[str] = None,
        tools: Optional[List[Tool]] = None,
        temperature: float = 0.7,
        max_tokens: int = 2048
    ) -> Dict[str, Any]:
        """Chat with Claude using tool use"""
        import json
        
        # Convert messages to Anthropic format
        messages_formatted = [
            {"role": msg.role, "content": msg.content}
            for msg in messages
        ]
        
        # Format tools for Anthropic
        tools_formatted = None
        if tools:
            tools_formatted = [
                {
                    "name": tool.name,
                    "description": tool.description,
                    "input_schema": tool.input_schema
                }
                for tool in tools
            ]
        
        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=max_tokens,
                system=system_prompt or "",
                tools=tools_formatted,
                messages=messages_formatted,
                temperature=temperature
            )
            
            # Parse response
            content = ""
            tool_calls = []
            
            for block in response.content:
                if hasattr(block, 'text'):
                    content = block.text
                elif block.type == "tool_use":
                    tool_calls.append({
                        "name": block.name,
                        "args": block.input,
                        "id": block.id
                    })
            
            return {
                "content": content,
                "tool_calls": tool_calls,
                "stop_reason": response.stop_reason
            }
        except Exception as e:
            logger.error(f"Anthropic API error: {e}")
            raise
    
    async def get_available_models(self) -> List[str]:
        return ["claude-3-5-sonnet-20241022", "claude-3-opus-20240229"]

class OpenAIProvider(LLMProvider):
    """OpenAI API provider"""
    
    def __init__(self, api_key: str):
        from openai import AsyncOpenAI
        self.client = AsyncOpenAI(api_key=api_key)
        self.model = "gpt-4-turbo"
    
    async def chat(
        self,
        messages: List[Message],
        system_prompt: Optional[str] = None,
        tools: Optional[List[Tool]] = None,
        temperature: float = 0.7,
        max_tokens: int = 2048
    ) -> Dict[str, Any]:
        """Chat with GPT using function calling"""
        # Implementation similar to Anthropic
        pass
    
    async def get_available_models(self) -> List[str]:
        return ["gpt-4-turbo", "gpt-4", "gpt-3.5-turbo"]

class LocalProvider(LLMProvider):
    """Local LLM provider (Ollama, vLLM, etc.)"""
    
    def __init__(self, url: str, model: str):
        self.url = url
        self.model = model
        import httpx
        self.client = httpx.AsyncClient(base_url=url)
    
    async def chat(
        self,
        messages: List[Message],
        system_prompt: Optional[str] = None,
        tools: Optional[List[Tool]] = None,
        temperature: float = 0.7,
        max_tokens: int = 2048
    ) -> Dict[str, Any]:
        """Chat with local LLM"""
        # Implementation for local models
        pass
    
    async def get_available_models(self) -> List[str]:
        return [self.model]

class GeminiProvider(LLMProvider):
    """Google Gemini API provider (legacy support)"""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.model = "gemini-pro"
    
    async def chat(
        self,
        messages: List[Message],
        system_prompt: Optional[str] = None,
        tools: Optional[List[Tool]] = None,
        temperature: float = 0.7,
        max_tokens: int = 2048
    ) -> Dict[str, Any]:
        """Chat with Gemini"""
        # Legacy implementation
        pass
    
    async def get_available_models(self) -> List[str]:
        return ["gemini-pro", "gemini-pro-vision"]
```

**File: python_backend/app/llm/factory.py**
```python
from app.config import settings, LLMProvider as LLMProviderEnum
from .provider import LLMProvider, AnthropicProvider, OpenAIProvider, LocalProvider, GeminiProvider
import logging

logger = logging.getLogger(__name__)

def create_llm_provider() -> LLMProvider:
    """Factory function to create appropriate LLM provider"""
    
    provider = settings.LLM_PROVIDER
    
    if provider == LLMProviderEnum.ANTHROPIC:
        if not settings.ANTHROPIC_API_KEY:
            raise ValueError("ANTHROPIC_API_KEY not set")
        return AnthropicProvider(settings.ANTHROPIC_API_KEY)
    
    elif provider == LLMProviderEnum.OPENAI:
        if not settings.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY not set")
        return OpenAIProvider(settings.OPENAI_API_KEY)
    
    elif provider == LLMProviderEnum.LOCAL:
        return LocalProvider(settings.LOCAL_LLM_URL, settings.LOCAL_LLM_MODEL)
    
    elif provider == LLMProviderEnum.GEMINI:
        if not settings.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY not set")
        return GeminiProvider(settings.GEMINI_API_KEY)
    
    else:
        raise ValueError(f"Unknown LLM provider: {provider}")
```

### 1.3 Electron Main Process Update

**File: mcp-gemini-desktop/main-modern.js** (Replace main.js with this)
```javascript
const { app, BrowserWindow, Menu, ipcMain, dialog, Tray, nativeTheme } = require('electron')
const path = require('path')
const isDev = require('electron-is-dev')
const fetch = require('node-fetch')
const { spawn } = require('child_process')
const fs = require('fs')

const PYTHON_PORT = 5001
const PYTHON_HOST = '127.0.0.1'

class QuestKeeperApp {
  constructor() {
    this.mainWindow = null
    this.pythonProcess = null
    this.tray = null
    this.isQuitting = false
  }

  async initialize() {
    // Start Python backend
    await this.startPythonBackend()
    
    // Create Electron app window
    await this.createWindow()
    
    // Setup menu
    this.setupMenu()
    
    // Setup tray
    this.setupTray()
    
    // Setup IPC handlers
    this.setupIPCHandlers()
  }

  async startPythonBackend() {
    return new Promise((resolve, reject) => {
      const pythonPath = isDev 
        ? 'python'
        : path.join(process.resourcesPath, 'python_backend', 'app.py')
      
      const pythonArgs = isDev 
        ? ['-m', 'flask', 'run', '--port', PYTHON_PORT]
        : []
      
      try {
        this.pythonProcess = spawn(pythonPath, pythonArgs, {
          stdio: ['ignore', 'pipe', 'pipe'],
          env: {
            ...process.env,
            FLASK_ENV: isDev ? 'development' : 'production',
            FLASK_PORT: PYTHON_PORT
          }
        })
        
        this.pythonProcess.stderr.on('data', (data) => {
          console.error(`[Python] ${data}`)
        })
        
        this.pythonProcess.stdout.on('data', (data) => {
          console.log(`[Python] ${data}`)
        })
        
        // Wait for server to be ready
        this.waitForServer().then(resolve).catch(reject)
      } catch (err) {
        reject(err)
      }
    })
  }

  async waitForServer(maxAttempts = 30) {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await fetch(`http://${PYTHON_HOST}:${PYTHON_PORT}/health`)
        if (response.ok) {
          console.log('[Backend] Python server is ready')
          return true
        }
      } catch (err) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    throw new Error('Python backend failed to start')
  }

  async createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 1000,
      minHeight: 700,
      webPreferences: {
        preload: path.join(__dirname, 'preload-modern.js'),
        contextIsolation: true,
        enableRemoteModule: false,
        nodeIntegration: false
      },
      icon: path.join(__dirname, 'assets', 'icon.ico'),
      show: false
    })

    const URL = isDev
      ? 'http://localhost:3000'
      : `file://${path.join(__dirname, '../build/index.html')}`
    
    await this.mainWindow.loadURL(URL)
    this.mainWindow.show()

    this.mainWindow.on('close', (e) => this.onWindowClose(e))
    this.mainWindow.webContents.openDevTools()
  }

  onWindowClose(e) {
    if (!this.isQuitting && process.platform !== 'darwin') {
      e.preventDefault()
      this.mainWindow.hide()
    }
  }

  setupMenu() {
    const template = [
      {
        label: 'File',
        submenu: [
          {
            label: 'New Character',
            accelerator: 'CmdOrCtrl+N',
            click: () => this.mainWindow.webContents.send('menu-new-character')
          },
          {
            label: 'Open Character',
            accelerator: 'CmdOrCtrl+O',
            click: () => this.mainWindow.webContents.send('menu-open-character')
          },
          { type: 'separator' },
          {
            label: 'Settings',
            accelerator: 'CmdOrCtrl+,',
            click: () => this.mainWindow.webContents.send('menu-settings')
          },
          { type: 'separator' },
          {
            label: 'Exit',
            accelerator: 'CmdOrCtrl+Q',
            click: () => {
              this.isQuitting = true
              app.quit()
            }
          }
        ]
      },
      {
        label: 'View',
        submenu: [
          {
            label: 'Toggle Dev Tools',
            accelerator: 'CmdOrCtrl+Shift+I',
            click: () => this.mainWindow.webContents.toggleDevTools()
          },
          {
            label: 'Reload',
            accelerator: 'CmdOrCtrl+R',
            click: () => this.mainWindow.reload()
          }
        ]
      },
      {
        label: 'Help',
        submenu: [
          {
            label: 'About Quest Keeper AI',
            click: () => dialog.showMessageBox(this.mainWindow, {
              type: 'info',
              title: 'About Quest Keeper AI',
              message: 'Quest Keeper AI v0.2.0',
              detail: 'D&D 5e Text-Based RPG Assistant'
            })
          }
        ]
      }
    ]

    Menu.setApplicationMenu(Menu.buildFromTemplate(template))
  }

  setupTray() {
    this.tray = new Tray(path.join(__dirname, 'assets', 'icon.ico'))
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show',
        click: () => {
          this.mainWindow.show()
          this.mainWindow.focus()
        }
      },
      {
        label: 'Quit',
        click: () => {
          this.isQuitting = true
          app.quit()
        }
      }
    ])
    this.tray.setContextMenu(contextMenu)
    this.tray.on('double-click', () => {
      this.mainWindow.show()
      this.mainWindow.focus()
    })
  }

  setupIPCHandlers() {
    // Game state handlers
    ipcMain.handle('api:get-character', async (event, characterId) => {
      return this.apiCall('GET', `/characters/${characterId}`)
    })

    ipcMain.handle('api:save-character', async (event, character) => {
      return this.apiCall('POST', '/characters', character)
    })

    ipcMain.handle('api:send-message', async (event, message) => {
      return this.apiCall('POST', '/chat', { message })
    })

    // Settings handlers
    ipcMain.handle('api:get-settings', async () => {
      return this.apiCall('GET', '/settings')
    })

    ipcMain.handle('api:update-settings', async (event, settings) => {
      return this.apiCall('POST', '/settings', settings)
    })

    // Inventory handlers
    ipcMain.handle('api:get-inventory', async (event, characterId) => {
      return this.apiCall('GET', `/characters/${characterId}/inventory`)
    })

    ipcMain.handle('api:add-inventory-item', async (event, characterId, item) => {
      return this.apiCall('POST', `/characters/${characterId}/inventory`, item)
    })
  }

  async apiCall(method, endpoint, data = null) {
    try {
      const url = `http://${PYTHON_HOST}:${PYTHON_PORT}${endpoint}`
      const options = {
        method,
        headers: { 'Content-Type': 'application/json' }
      }
      
      if (data) {
        options.body = JSON.stringify(data)
      }

      const response = await fetch(url, options)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      console.error(`[API Error] ${method} ${endpoint}:`, error)
      throw error
    }
  }

  cleanup() {
    if (this.pythonProcess) {
      this.pythonProcess.kill()
    }
    if (this.tray) {
      this.tray.destroy()
    }
  }
}

app.on('ready', async () => {
  const questKeeper = new QuestKeeperApp()
  try {
    await questKeeper.initialize()
  } catch (error) {
    console.error('[Fatal Error]', error)
    dialog.showErrorBox('Fatal Error', error.message)
    app.quit()
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('quit', () => {
  console.log('[App] Shutting down')
})
```

---

## SECTION 2: FRONTEND COMPONENTS (Weeks 3-4)

### 2.1 React Component Structure

**File: frontend/src/components/CharacterSheet.jsx**
```jsx
import React, { useState } from 'react'
import './CharacterSheet.css'

const ABILITY_NAMES = {
  strength: 'STR',
  dexterity: 'DEX',
  constitution: 'CON',
  intelligence: 'INT',
  wisdom: 'WIS',
  charisma: 'CHA'
}

export function CharacterSheet({ character }) {
  const [expanded, setExpanded] = useState(false)

  const getModifier = (score) => Math.floor((score - 10) / 2)
  const getShortName = (fullName) => fullName.split(' ')[0]

  return (
    <div className="character-sheet" data-expanded={expanded}>
      <header 
        className="sheet-header"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="header-left">
          <h3 className="character-name">{character.name}</h3>
          <span className="character-class">{character.character_class}</span>
        </div>
        <div className="header-right">
          <span className="level">Level {character.level}</span>
          <button className="toggle-btn">
            {expanded ? '▼' : '▶'}
          </button>
        </div>
      </header>

      {expanded && (
        <div className="sheet-body">
          {/* Vitals Section */}
          <div className="vitals-section">
            <div className="vital">
              <label>HP</label>
              <div className="hp-bar">
                <div 
                  className="hp-fill"
                  style={{ 
                    width: `${(character.hit_points_current / character.hit_points_max) * 100}%` 
                  }}
                ></div>
              </div>
              <span>{character.hit_points_current}/{character.hit_points_max}</span>
            </div>
            <div className="vital">
              <label>AC</label>
              <span className="ac-value">{character.armor_class}</span>
            </div>
          </div>

          {/* Ability Scores Grid */}
          <div className="abilities-grid">
            {Object.entries(character.ability_scores || {}).map(([ability, score]) => (
              <div key={ability} className="ability-box">
                <span className="ability-name">{ABILITY_NAMES[ability] || ability}</span>
                <span className="ability-score">{score}</span>
                <span className="ability-mod">
                  {getModifier(score) >= 0 ? '+' : ''}{getModifier(score)}
                </span>
              </div>
            ))}
          </div>

          {/* Skills Section */}
          <div className="skills-section">
            <h4>Skills</h4>
            <div className="skills-list">
              {character.skills && character.skills.map((skill, idx) => (
                <div key={idx} className="skill-item">
                  <span>{skill.name}</span>
                  <span className="skill-bonus">
                    {skill.proficient ? '🟢' : '⚪'} {skill.modifier}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

**File: frontend/src/components/Inventory.jsx**
```jsx
import React, { useState } from 'react'
import { useGameStore } from '../stores/gameState'
import './Inventory.css'

const RARITY_COLORS = {
  common: '#e0e0e0',
  uncommon: '#1eff00',
  rare: '#0070dd',
  very_rare: '#a335ee',
  legendary: '#ff8000'
}

export function Inventory() {
  const inventory = useGameStore((state) => state.inventory)
  const [activeTab, setActiveTab] = useState('all')
  const [selectedItem, setSelectedItem] = useState(null)

  const tabs = ['all', 'equipped', 'consumables', 'quest_items']
  
  const filteredItems = inventory.filter(item => {
    if (activeTab === 'all') return true
    if (activeTab === 'equipped') return item.location === 'equipped'
    if (activeTab === 'consumables') return item.rarity === 'consumable'
    if (activeTab === 'quest_items') return item.mcp_managed
    return true
  })

  return (
    <div className="inventory-panel">
      <div className="inventory-header">
        <h3>Inventory</h3>
        <button className="add-item-btn">+</button>
      </div>

      <div className="tabs-bar">
        {tabs.map(tab => (
          <button
            key={tab}
            className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.replace('_', ' ').toUpperCase()}
          </button>
        ))}
      </div>

      <div className="inventory-grid">
        {filteredItems.map(item => (
          <div
            key={item.id}
            className="item-card"
            style={{ borderColor: RARITY_COLORS[item.rarity] || '#00ff88' }}
            onClick={() => setSelectedItem(item)}
          >
            <div className="item-header">
              <span className="item-name">{item.item_name}</span>
              <span className="item-qty">×{item.quantity}</span>
            </div>
            <div className="item-rarity">{item.rarity}</div>
            {item.weight && (
              <div className="item-weight">{item.weight} lb</div>
            )}
          </div>
        ))}
      </div>

      {selectedItem && (
        <div className="item-detail-modal">
          <div className="modal-content">
            <button className="close-btn" onClick={() => setSelectedItem(null)}>×</button>
            <h3>{selectedItem.item_name}</h3>
            <p>{selectedItem.description}</p>
            <div className="item-stats">
              <div>Quantity: {selectedItem.quantity}</div>
              <div>Rarity: {selectedItem.rarity}</div>
              <div>Location: {selectedItem.location}</div>
              {selectedItem.weight && <div>Weight: {selectedItem.weight} lb</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

### 2.2 State Management (Zustand)

**File: frontend/src/stores/gameState.js**
```javascript
import create from 'zustand'
import { persist } from 'zustand/middleware'

export const useGameStore = create(
  persist(
    (set, get) => ({
      // Character State
      character: null,
      setCharacter: (character) => set({ character }),
      
      // Inventory State
      inventory: [],
      addInventoryItem: (item) => set((state) => ({
        inventory: [...state.inventory, item]
      })),
      removeInventoryItem: (itemId) => set((state) => ({
        inventory: state.inventory.filter(i => i.id !== itemId)
      })),
      updateInventoryItem: (itemId, updates) => set((state) => ({
        inventory: state.inventory.map(i => 
          i.id === itemId ? { ...i, ...updates } : i
        )
      })),
      
      // Quest State
      quests: [],
      addQuest: (quest) => set((state) => ({
        quests: [...state.quests, quest]
      })),
      updateQuest: (questId, updates) => set((state) => ({
        quests: state.quests.map(q =>
          q.id === questId ? { ...q, ...updates } : q
        )
      })),
      completeQuest: (questId) => set((state) => ({
        quests: state.quests.map(q =>
          q.id === questId ? { ...q, status: 'completed' } : q
        )
      })),
      
      // Tool Output State
      toolOutputs: [],
      addToolOutput: (output) => set((state) => ({
        toolOutputs: [...state.toolOutputs, output]
      })),
      clearToolOutputs: () => set({ toolOutputs: [] }),
      
      // Combat State
      combatActive: false,
      combatParticipants: [],
      startCombat: (participants) => set({
        combatActive: true,
        combatParticipants: participants
      }),
      endCombat: () => set({
        combatActive: false,
        combatParticipants: []
      })
    }),
    {
      name: 'quest-keeper-storage',
      getStorage: () => localStorage
    }
  )
)
```

### 2.3 CSS Design System

**File: frontend/src/styles/variables.css**
```css
:root {
  /* Colors - Neon Cyberpunk Theme */
  --primary: #00ff88;
  --primary-dark: #00cc6f;
  --neon-cyan: #00ffff;
  --neon-green: #00ff00;
  --neon-magenta: #ff00ff;
  --neon-pink: #ff006e;
  --neon-orange: #ff9500;
  --neon-blue: #00d9ff;

  /* Backgrounds */
  --bg-dark: #0a0a0f;
  --bg-darker: #050508;
  --bg-card: #111118;
  --bg-card-hover: #1a1a25;

  /* Text */
  --text-primary: #00ffff;
  --text-secondary: #00ff00;
  --text-muted: #6b7280;
  --text-white: #e0e0e0;

  /* Spacing */
  --sp-xs: 4px;
  --sp-sm: 8px;
  --sp-md: 16px;
  --sp-lg: 24px;
  --sp-xl: 32px;

  /* Font Families */
  --font-mono: 'Share Tech Mono', monospace;
  --font-mono-body: 'IBM Plex Mono', monospace;

  /* Borders & Shadows */
  --border-thin: 1px solid var(--primary);
  --border-thick: 2px solid var(--primary);
  --glow-sm: 0 0 10px rgba(0, 255, 136, 0.3);
  --glow-md: 0 0 20px rgba(0, 255, 136, 0.5);
  --glow-lg: 0 0 30px rgba(0, 255, 136, 0.7);
}
```

---

## SECTION 3: MODERNIZATION CHECKLIST

This document provides the foundational code structure to begin immediate implementation.

**Recommended Implementation Order:**
1. Backend initialization and database schema (Day 1-2)
2. API endpoint scaffolding (Day 3-4)
3. Electron main process update (Day 5)
4. Frontend component library (Days 6-10)
5. State management integration (Days 11-12)
6. CSS theming system (Days 13-14)
7. Testing framework setup (Days 15+)

**Required Environment Setup:**
```bash
# Backend
pip install -r requirements.txt
python -m pytest  # Run tests

# Frontend (when implemented)
npm install
npm start

# Electron
npm install
npm start
```

---

**Document Version:** 1.0
**Last Updated:** 2025-11-11
**Status:** Ready for Development
