# QUEST KEEPER AI - MODERNIZATION & TRANSFORMATION PLAN

## EXECUTIVE SUMMARY

Quest Keeper AI is transitioning from a basic MCP-enabled chat application to an enterprise-grade, D&D-focused text-based RPG assistant. The desktop app requires comprehensive modernization across architecture, UI/UX, backend infrastructure, and feature implementation.

**Current State:** Electron app with basic Gemini integration and Python backend
**Target State:** Fully-featured D&D RPG environment with native tool integration, inventory management, quest logs, character sheets, and real-time LLM-driven gameplay

---

## PART 1: CURRENT ARCHITECTURE ANALYSIS

### 1.1 Project Structure

```
QuestKeeperAI/
├── mcp-gemini-desktop/       # Main Electron app (Windows/Mac/Linux)
│   ├── main.js               # Electron main process
│   ├── renderer.js           # Frontend logic
│   ├── preload.js            # IPC bridge (context isolation)
│   ├── index.html            # Main UI
│   ├── settings.html         # Settings dialog
│   ├── style.css             # Current styles
│   └── assets/               # Icons, images
├── python_backend/           # Flask backend (MCP server management)
│   ├── main.py               # Entry point (STUB)
│   ├── mcp_flask_backend.py  # Flask API
│   └── mcp_chat_app.py       # MCP integration logic
├── .roo/                     # Roo Code configuration
│   └── mcp.json              # MCP servers definition
└── quest-keeper-ai/          # Public site documentation
    └── style-guide/          # Design system specification
```

### 1.2 Technology Stack

| Layer | Current | Assessment |
|-------|---------|------------|
| **Desktop** | Electron 31.1.0 | Modern; requires build optimization |
| **Frontend** | HTML5 + vanilla JS | Legacy; needs refactoring to modular components |
| **Styling** | CSS (no preprocessor) | Works; needs DND-specific theming |
| **Backend** | Python (Flask) | Adequate; needs modernization & standardization |
| **LLM Integration** | Gemini API | Single provider; needs abstraction layer |
| **MCP Support** | Basic (Gemini only) | Insufficient; needs custom MCP server support |
| **State Management** | Session-based | No persistence layer; needs database integration |

### 1.3 Critical Gaps

#### Backend Architecture
- **Flask is unmaintained in this context** – needs proper initialization
- **No persistent storage** – all game state lost on app restart
- **No MCP server lifecycle management** – servers not cleanly started/stopped
- **Single LLM provider** – inflexible, not BYOK-ready
- **No authentication abstraction** – API keys stored insecurely

#### Frontend Implementation
- **Monolithic renderer.js** – tightly coupled components
- **No component framework** – difficult to maintain, no reusability
- **Basic CSS** – no theming system for D&D aesthetics
- **No real-time rendering** – tool outputs not visible to user
- **No inventory/quest log UI** – game state not visually represented

#### Desktop Application
- **No window management** – missing minimize, maximize, standard controls
- **No shortcuts/hotkeys** – poor user experience
- **No tray integration** – can't minimize to tray
- **Hard-coded styling** – dark theme not configurable
- **No auto-updates** – static version on distribution

#### Game Features
- **No character sheet** – no persistent player data
- **No inventory system** – items not tracked
- **No quest log** – missions not managed
- **No combat system** – no tactical mechanics
- **No tool output visibility** – MCP tool calls invisible to user

---

## PART 2: DESIGN SYSTEM ALIGNMENT

### 2.1 Style Guide Analysis

**Color Palette (Retro-Cyberpunk):**
- Primary: #00ff88 (Neon Green-Cyan)
- Cyan: #00ffff | Green: #00ff00 | Magenta: #ff00ff | Orange: #ff9500
- Background: #0a0a0f (Dark) | #111118 (Cards)
- Text: #00ffff (Primary) | #00ff00 (Secondary) | #e0e0e0 (White)

**Typography:**
- Headers: Share Tech Mono (monospace, tech aesthetic)
- Body: IBM Plex Mono (monospace, readability)
- Letter spacing: 2-3px for headers
- Text effects: Neon glow via text-shadow

**Component Patterns:**
- Cards: Subtle dark backgrounds with glowing borders
- Buttons: Neon borders with hover glow
- Forms: Glowing focus states
- Effects: Scanline overlay, CRT aesthetic, terminal prompts

### 2.2 D&D-Specific UI Elements (NEW)

Must implement alongside existing design system:

1. **Character Sheet Panel** (expandable)
   - Player name, class, level
   - Ability scores (STR, DEX, CON, INT, WIS, CHA)
   - HP/AC display
   - Skills list with proficiencies

2. **Inventory System** (tabbed interface)
   - Equipment slots
   - Consumables
   - Quest items
   - Weight/capacity tracking
   - MCP-editable inventory

3. **Quest Log** (sidebar or modal)
   - Active quests with objectives
   - Completed quests
   - Quest rewards history
   - MCP quest state management

4. **Combat UI** (modal overlay)
   - Initiative order
   - Action queue
   - Health bars for enemies
   - Roll history
   - Ability/spell selection

5. **Dice Roller** (floating widget)
   - Multi-dice support (1d20, 2d6, etc.)
   - Advantage/disadvantage toggles
   - Roll history log
   - Quick access from chat

6. **Spell/Ability Browser** (expandable panel)
   - Class abilities
   - Spells (organized by level)
   - Item effects
   - Activated by chat or toolbar

---

## PART 3: MODERNIZATION ROADMAP

### Phase 1: Foundation & Architecture (Weeks 1-2)

#### 1.1 Backend Refactoring
```
DELIVERABLES:
├── pyproject.toml upgrade (proper dependency management)
├── API abstraction layer (Anthropic, Gemini, local models)
├── SQLite database layer (character, inventory, quest state)
├── MCP server lifecycle manager (start/stop/monitor)
├── IPC handler standardization (Electron communication)
└── Logging/debugging infrastructure
```

**Key Tasks:**
- Implement dependency injection for LLM providers
- Create SQLite schema for game state persistence
- Build MCP server process manager with stdio/SSE support
- Standardize all IPC messages (request/response envelopes)
- Add structured logging throughout

#### 1.2 Electron/Desktop Modernization
```
DELIVERABLES:
├── Window management (minimize, maximize, close, restore)
├── Standard menu bar (File, Edit, View, Help)
├── Keyboard shortcuts (Ctrl+Q, Ctrl+,, etc.)
├── Tray integration (minimize to tray on close)
├── Native file dialogs (consistent with OS)
└── Auto-update infrastructure (electron-updater)
```

**Key Tasks:**
- Implement Electron menu API for standard menus
- Add keyboard shortcuts manager
- Create tray icon handler
- Build auto-update check on startup
- Set proper window icons/branding

### Phase 2: Frontend Architecture (Weeks 3-4)

#### 2.1 Component Refactoring
```
CURRENT:
renderer.js → 800+ lines, monolithic

MODERNIZED:
components/
├── ChatMessage.js        # Message display component
├── Inventory.js          # Inventory management
├── QuestLog.js           # Quest tracking
├── CharacterSheet.js     # Player stats display
├── CombatUI.js           # Combat interface
├── DiceRoller.js         # Dice rolling widget
├── ToolOutput.js         # MCP tool result display
└── Sidebar.js            # Server/settings sidebar

stores/
├── gameState.js          # Zustand or similar
├── characterState.js     # Character data
└── uiState.js            # UI visibility toggles

utils/
├── formatter.js          # Message/tool output formatting
├── parser.js             # Chat parsing logic
└── dnd-helpers.js        # D&D calculation helpers
```

#### 2.2 CSS Architecture
```
styles/
├── variables.css         # Design system (colors, spacing, fonts)
├── base.css              # Reset, typography, layout
├── components.css        # Button, card, form styles
├── dnd-components.css    # Character sheet, inventory, quest log
├── animations.css        # Transitions, glows, scanlines
└── responsive.css        # Media queries for mobile/tablet
```

**Key Tasks:**
- Extract all colors/spacing to CSS variables
- Create reusable component classes
- Build D&D-specific component styling
- Implement responsive layouts
- Add dark/light theme toggle (maintain neon aesthetic)

#### 2.3 State Management
```
REQUIREMENTS:
├── Persistent storage (IndexedDB or electron-store)
├── Character creation/loading
├── Game session tracking
├── Tool output caching
├── Undo/redo for game actions
└── Multi-tab communication
```

### Phase 3: Game Features (Weeks 5-7)

#### 3.1 Character Management
```
FEATURES:
├── Character sheet editor
├── Ability score generation (point buy, standard array, 4d6 drop)
├── Class/race selection with modifiers
├── Skill proficiency calculation
├── Level progression with XP tracking
└── Multiple character slots
```

**Database Schema:**
```sql
characters
├── id (uuid)
├── name, class, race, level
├── abilities (str, dex, con, int, wis, cha)
├── hp_current, hp_max, ac
├── skills (json array)
├── created_at, updated_at

inventory
├── id (uuid)
├── character_id (fk)
├── item_name, quantity, weight
├── rarity, description
├── location (equipped/backpack/storage)
├── mcp_managed (boolean for MCP editing)

quests
├── id (uuid)
├── character_id (fk)
├── title, description, status (active/completed/failed)
├── objectives (json array)
├── rewards (xp, gold, items)
├── created_at, completed_at
```

#### 3.2 Inventory System
```
FEATURES:
├── Equipment slots (weapon, armor, shield, etc.)
├── Item management (add, remove, stack)
├── Weight/encumbrance calculation
├── Rarity filtering (common, uncommon, rare, etc.)
├── MCP tool write access (tools can modify inventory)
└── Visual equipment preview
```

**MCP Tool Integration:**
```
Tools can invoke:
├── add_item(character_id, item_name, qty, weight)
├── remove_item(inventory_item_id)
├── equip_item(inventory_item_id)
├── unequip_item(equipment_slot)
└── get_inventory(character_id)

All operations reflected immediately in UI
```

#### 3.3 Quest Log System
```
FEATURES:
├── Quest creation (by game master or LLM)
├── Objective tracking with checkpoints
├── Automatic completion detection
├── Reward distribution
├── Quest history/completed log
├── MCP tool control (create, update, complete)
└── Quest timer/deadline support
```

#### 3.4 Combat UI
```
FEATURES:
├── Initiative tracker
├── Turn order visualization
├── Action economy tracking (action, bonus action, movement)
├── Health bars for all combatants
├── Roll results display
├── Spell/ability selection UI
└── Combat log history
```

#### 3.5 Tool Output Visibility
```
CURRENT ISSUE:
User cannot see what tools (MCPs) are doing
Tool outputs are hidden from view

SOLUTION:
├── Tool Call Panel (collapsible)
│   ├── Tool name, parameters, status
│   ├── Real-time execution indicator
│   └── Error messages if failed
├── Tool Result Display
│   ├── Formatted output in readable format
│   ├── Structured data visualization
│   └── Copy/export tool output
├── Tool History
│   ├── Recent tool calls
│   ├── Tool call frequency stats
│   └── Filter by tool type
└── Tool Audit Trail
    ├── Who called tool
    ├── When it was called
    └── What parameters were used
```

### Phase 4: MCP Integration (Weeks 8-9)

#### 4.1 Custom MCP Server Support

**Current Limitation:** Only Gemini MCP servers supported

**Required Enhancement:**
```
mcp-server-manager.py
├── SSE (Server-Sent Events) transport support
├── Stdio transport support (spawned processes)
├── HTTP/JSON-RPC transport
├── MCP server registry (database)
├── Server health monitoring
├── Error recovery & restart logic
└── Resource quota management (CPU, memory, timeout)
```

#### 4.2 RPG-Specific MCP Servers (from rpg-mcp-servers repo)

```
INTEGRATE WITH:
├── Character management tools
├── Dice roller service
├── Quest database
├── NPC interaction engine
├── Combat resolution
├── Loot generation
└── World state management
```

**Tool Visibility in UI:**
```
For each tool call:
├── Show tool being invoked
├── Show input parameters
├── Real-time status (pending, executing, complete)
├── Show output in formatted panel
├── Option to retry or modify call
└── Integration with game state (UI updates)
```

#### 4.3 Filesystem MCP Integration

**Requirement:** Give MCPs read/write access to game state files

```
filesystem-mcp.json
{
  "rules": [
    {
      "path": "%APPDATA%/QuestKeeperAI/saves/",
      "permissions": ["read", "write", "create"],
      "mcp_access": true
    },
    {
      "path": "%APPDATA%/QuestKeeperAI/character/",
      "permissions": ["read", "write"],
      "mcp_access": true
    }
  ]
}

MCP tools can:
├── Read/write character files (JSON)
├── Manage quest progress
├── Store temporary state
├── Access world data
└── Backup/restore game sessions
```

### Phase 5: UI/UX Overhaul (Weeks 10-12)

#### 5.1 Layout Redesign
```
CURRENT:
┌─────────────────────────────┐
│ Title Bar                   │
├─────────────┬───────────────┤
│   Sidebar   │   Chat Area   │
│  (Servers)  │               │
│             ├───────────────┤
│             │  Input Box    │
└─────────────┴───────────────┘

MODERNIZED:
┌─────────────────────────────────────────────┐
│ Menu Bar (File, Edit, View, Help)           │
├──────────────┬──────────────┬───────────────┤
│ Char Sheet   │  Quest Log   │  Main Chat    │
│ (collapsible)│  (collapsible)│               │
├──────────────┼──────────────┤               │
│              │              │               │
│ Inventory    │   Servers    │               │
│              │              │               │
├──────────────┴──────────────┤               │
│  Dice Roller (floating)     │               │
├──────────────┬──────────────┤               │
│ Combat UI    │ Spell Panel  │               │
│ (if active)  │ (if active)  │               │
├──────────────┴──────────────┼───────────────┤
│          Tool Output Panel (expandable)     │
├──────────────────────────────┬───────────────┤
│       Message Input Area      │ Send Button   │
└──────────────────────────────┴───────────────┘
```

#### 5.2 Component Styling (D&D Theme)

```
Retro-Cyberpunk + D&D Elements:
├── Character Sheet
│   ├── Parchment texture background
│   ├── Neon ability score boxes
│   ├── Glowing stat lines
│   └── D&D 5e stat display format
├── Inventory
│   ├── Item cards with rarity colors
│   ├── Equipment slot visualization
│   ├── Weight bar indicator
│   └── Drag-and-drop equipping
├── Quest Log
│   ├── Quest cards with progress
│   ├── Objective checkboxes
│   ├── Reward previews
│   └── Completed quest archive
└── Combat UI
    ├── Circular initiative order
    ├── Health bars with condition indicators
    ├── Action economy tracker
    └── D20 dice animation
```

#### 5.3 Theme System
```
theme/
├── dark.css       # Current neon-on-dark (default)
├── dark-muted.css # Reduced glow for accessibility
├── light.css      # Light background variant
└── colorblind.css # Deuteranopia-friendly palette

Available in Settings:
├── Theme selector
├── Glow intensity slider
├── Font size adjustment
├── Line height for readability
└── Animation toggle (accessibility)
```

---

## PART 4: TECHNICAL IMPLEMENTATION DETAILS

### 4.1 Backend Architecture (Python)

```python
# NEW: config.py - Centralized configuration
class Config:
    LLM_PROVIDER = "anthropic"  # or "openai", "local", etc.
    LLM_API_KEY = os.getenv("LLM_API_KEY")
    MCP_SERVERS_DIR = Path.home() / "AppData/Local/QuestKeeperAI/servers"
    DB_PATH = Path.home() / "AppData/Local/QuestKeeperAI/game.db"
    LOG_LEVEL = "INFO"

# NEW: llm_provider.py - Abstraction layer
class LLMProvider(ABC):
    @abstractmethod
    def chat(self, messages: List[Dict]) -> str: pass
    @abstractmethod
    def call_tools(self, tools: List[Dict]) -> Dict: pass

class AnthropicProvider(LLMProvider): 
    # Implementation using latest Claude model
    pass

class GeminiProvider(LLMProvider):
    # Legacy support
    pass

class LocalProvider(LLMProvider):
    # Support for Ollama, vLLM, etc.
    pass

# NEW: mcp_manager.py - MCP lifecycle
class MCPServerManager:
    async def start_server(self, config: MCPConfig) -> subprocess.Popen:
        """Start MCP server process, manage stdio/SSE transport"""
        pass
    
    async def stop_server(self, server_id: str):
        """Gracefully shutdown server with timeout"""
        pass
    
    async def get_tools(self, server_id: str) -> List[Tool]:
        """Retrieve available tools from MCP server"""
        pass
    
    async def call_tool(self, server_id: str, tool_name: str, args: Dict) -> Any:
        """Execute tool and return results"""
        pass

# NEW: game_state.py - Game state persistence
class GameState:
    def __init__(self, character_id: str):
        self.db = DatabaseManager()
        self.character = self.db.get_character(character_id)
        self.inventory = self.db.get_inventory(character_id)
        self.quests = self.db.get_quests(character_id)
    
    def update_character_stat(self, stat: str, value: int):
        """Update character ability score, HP, etc."""
        pass
    
    def add_inventory_item(self, item: Item):
        """Add item to inventory"""
        pass
    
    def complete_quest(self, quest_id: str):
        """Mark quest as complete, award rewards"""
        pass

# NEW: ipc_handlers.py - Unified IPC interface
@app.route('/api/chat', methods=['POST'])
def chat():
    """
    Request: {
        "message": "str",
        "character_id": "uuid",
        "enable_tools": bool
    }
    Response: {
        "status": "success|error",
        "reply": "str",
        "tool_calls": [{
            "tool_name": "str",
            "parameters": "dict",
            "result": "any"
        }],
        "game_state_updated": bool
    }
    """
    pass
```

### 4.2 Frontend Architecture (JavaScript)

```javascript
// NEW: src/stores/gameState.js (Zustand)
import create from 'zustand'

const useGameStore = create((set) => ({
  character: null,
  inventory: [],
  quests: [],
  combatActive: false,
  toolOutputs: [],
  
  setCharacter: (character) => set({ character }),
  addInventoryItem: (item) => set((state) => ({
    inventory: [...state.inventory, item]
  })),
  updateQuest: (questId, updates) => set((state) => ({
    quests: state.quests.map(q => q.id === questId ? {...q, ...updates} : q)
  })),
  addToolOutput: (output) => set((state) => ({
    toolOutputs: [...state.toolOutputs, output]
  }))
}))

// NEW: src/components/CharacterSheet.jsx
function CharacterSheet() {
  const character = useGameStore((state) => state.character)
  const [expanded, setExpanded] = useState(false)
  
  return (
    <div className="character-sheet" data-expanded={expanded}>
      <header onClick={() => setExpanded(!expanded)}>
        <h3>{character.name}</h3>
        <span className="level">Level {character.level}</span>
      </header>
      {expanded && (
        <div className="sheet-body">
          <AbilityScores abilities={character.abilities} />
          <VitalsDisplay hp={character.hp} ac={character.ac} />
          <SkillsDisplay skills={character.skills} />
        </div>
      )}
    </div>
  )
}

// NEW: src/components/Inventory.jsx
function Inventory() {
  const inventory = useGameStore((state) => state.inventory)
  const [activeTab, setActiveTab] = useState('all')
  
  return (
    <div className="inventory-panel">
      <TabBar tabs={['all', 'equipped', 'consumables', 'quest']} 
              activeTab={activeTab} 
              onChange={setActiveTab} />
      <div className="inventory-grid">
        {inventory
          .filter(item => filterByTab(item, activeTab))
          .map(item => (
            <ItemCard key={item.id} item={item} />
          ))
        }
      </div>
    </div>
  )
}

// NEW: src/components/ToolOutput.jsx
function ToolOutput({ toolCall }) {
  const [expanded, setExpanded] = useState(false)
  
  return (
    <div className="tool-output" data-status={toolCall.status}>
      <div className="tool-header" onClick={() => setExpanded(!expanded)}>
        <span className="tool-name">{toolCall.toolName}</span>
        <StatusIndicator status={toolCall.status} />
      </div>
      {expanded && (
        <div className="tool-body">
          <div className="tool-params">
            <pre>{JSON.stringify(toolCall.parameters, null, 2)}</pre>
          </div>
          <div className="tool-result">
            <ResultFormatter result={toolCall.result} />
          </div>
        </div>
      )}
    </div>
  )
}

// NEW: src/utils/formatter.js
export function formatToolResult(tool, result) {
  switch(tool) {
    case 'add_inventory_item':
      return `Added ${result.item_name} to inventory`
    case 'roll_dice':
      return `🎲 ${result.rolls.join(', ')} = ${result.total}`
    case 'start_combat':
      return `Combat started! Initiative order: ${result.order.map(p => p.name).join(', ')}`
    default:
      return JSON.stringify(result)
  }
}
```

### 4.3 Electron Configuration (Modernized)

```javascript
// NEW: main.js (updated)
const { app, BrowserWindow, Menu } = require('electron')
const isDev = require('electron-is-dev')
const updater = require('electron-updater')

class MainApplication {
  constructor() {
    this.mainWindow = null
    this.tray = null
    this.pythonProcess = null
  }

  async initialize() {
    await this.startPythonBackend()
    await this.createWindow()
    this.setupMenu()
    this.setupTray()
    this.setupUpdateCheck()
  }

  async startPythonBackend() {
    // Use electron-builder to package Python
    const pythonPath = isDev 
      ? require('python-bridge').pythonPath 
      : path.join(process.resourcesPath, 'python_backend')
    
    this.pythonProcess = spawn('python', [path.join(pythonPath, 'app.py')])
  }

  async createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 1000,
      minHeight: 700,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        enableRemoteModule: false
      },
      icon: path.join(__dirname, 'assets/icon.ico'),
      show: false // Don't show until ready
    })

    const URL = isDev 
      ? 'http://localhost:3000' 
      : `file://${path.join(__dirname, '../build/index.html')}`
    
    await this.mainWindow.loadURL(URL)
    this.mainWindow.show()

    // Standard window events
    this.mainWindow.on('close', (e) => this.onWindowClose(e))
    this.mainWindow.on('minimize', () => this.onWindowMinimize())
  }

  setupMenu() {
    const template = [
      {
        label: 'File',
        submenu: [
          { label: 'New Character', accelerator: 'CmdOrCtrl+N', click: () => this.newCharacter() },
          { label: 'Open Character', accelerator: 'CmdOrCtrl+O', click: () => this.openCharacter() },
          { label: 'Settings', accelerator: 'CmdOrCtrl+,', click: () => this.openSettings() },
          { type: 'separator' },
          { label: 'Exit', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() }
        ]
      },
      {
        label: 'View',
        submenu: [
          { label: 'Toggle DevTools', accelerator: 'CmdOrCtrl+Shift+I', 
            click: () => this.mainWindow.webContents.toggleDevTools() },
          { type: 'separator' },
          { label: 'Reload', accelerator: 'CmdOrCtrl+R', 
            click: () => this.mainWindow.reload() }
        ]
      }
    ]

    Menu.setApplicationMenu(Menu.buildFromTemplate(template))
  }

  setupTray() {
    this.tray = new Tray(path.join(__dirname, 'assets/icon.ico'))
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Show', click: () => this.mainWindow.show() },
      { label: 'Quit', click: () => app.quit() }
    ])
    this.tray.setContextMenu(contextMenu)
    this.tray.on('double-click', () => this.mainWindow.show())
  }

  setupUpdateCheck() {
    updater.checkForUpdatesAndNotify()
  }

  onWindowClose(e) {
    if (process.platform !== 'darwin') {
      e.preventDefault()
      this.mainWindow.hide()
    }
  }

  onWindowMinimize() {
    // Can add tray minimize behavior
  }
}

app.whenReady().then(() => {
  const app = new MainApplication()
  app.initialize()
})
```

---

## PART 5: DATABASE SCHEMA

```sql
-- Characters
CREATE TABLE characters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  class VARCHAR(50) NOT NULL,
  race VARCHAR(50) NOT NULL,
  level INTEGER DEFAULT 1,
  experience INTEGER DEFAULT 0,
  hit_points_max INTEGER,
  hit_points_current INTEGER,
  armor_class INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Ability Scores
CREATE TABLE ability_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  character_id UUID NOT NULL UNIQUE,
  strength INTEGER DEFAULT 10,
  dexterity INTEGER DEFAULT 10,
  constitution INTEGER DEFAULT 10,
  intelligence INTEGER DEFAULT 10,
  wisdom INTEGER DEFAULT 10,
  charisma INTEGER DEFAULT 10,
  FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);

-- Inventory
CREATE TABLE inventory_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  character_id UUID NOT NULL,
  item_name VARCHAR(255) NOT NULL,
  quantity INTEGER DEFAULT 1,
  weight DECIMAL(8, 2),
  rarity VARCHAR(50), -- common, uncommon, rare, very_rare, legendary
  description TEXT,
  location VARCHAR(50) DEFAULT 'backpack', -- equipped, backpack, storage
  mcp_managed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
  INDEX (character_id)
);

-- Quests
CREATE TABLE quests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  character_id UUID NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'active', -- active, completed, failed, archived
  reward_xp INTEGER DEFAULT 0,
  reward_gold INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
  INDEX (character_id, status)
);

-- Quest Objectives
CREATE TABLE quest_objectives (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quest_id UUID NOT NULL,
  objective_text TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  FOREIGN KEY (quest_id) REFERENCES quests(id) ON DELETE CASCADE
);

-- Combat Sessions
CREATE TABLE combat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  character_id UUID NOT NULL,
  session_name VARCHAR(255),
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP,
  status VARCHAR(50) DEFAULT 'active', -- active, completed, abandoned
  participants JSON, -- Array of {name, type, hp_max, hp_current, ac}
  FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);

-- MCP Server Configuration
CREATE TABLE mcp_servers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL UNIQUE,
  type VARCHAR(50), -- stdio, sse, http
  executable_path VARCHAR(512),
  enabled BOOLEAN DEFAULT TRUE,
  config JSON, -- Server-specific configuration
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (enabled)
);

-- Tool Call Audit Trail
CREATE TABLE tool_calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  character_id UUID,
  mcp_server_id UUID NOT NULL,
  tool_name VARCHAR(255) NOT NULL,
  parameters JSON,
  result JSON,
  status VARCHAR(50), -- pending, success, error
  error_message TEXT,
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  execution_ms INTEGER,
  FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE SET NULL,
  FOREIGN KEY (mcp_server_id) REFERENCES mcp_servers(id),
  INDEX (character_id, executed_at)
);

-- Game Settings
CREATE TABLE settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  user_id UUID NOT NULL UNIQUE,
  theme VARCHAR(50) DEFAULT 'dark',
  language VARCHAR(10) DEFAULT 'en',
  auto_save_interval INTEGER DEFAULT 300, -- seconds
  notification_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

## PART 6: IPC MESSAGE STANDARDIZATION

### Request/Response Envelope

```json
/* REQUEST */
{
  "id": "uuid",
  "method": "string",
  "params": {...},
  "timestamp": "ISO8601"
}

/* RESPONSE */
{
  "id": "uuid", // matches request
  "status": "success|error",
  "data": {},
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  },
  "timestamp": "ISO8601",
  "execution_ms": 123
}

/* ASYNC EVENT (Server → Client) */
{
  "event": "event_name",
  "data": {},
  "timestamp": "ISO8601"
}
```

### Standard IPC Handlers

```
/* Game State */
get_character()           → Character object
update_character_stat()   → Updated character
get_inventory()           → Array of items
add_inventory_item()      → Item ID
get_quests()              → Array of quests
update_quest()            → Updated quest

/* Chat & LLM */
send_message()            → LLM response + tool calls
set_llm_provider()        → Success/error
get_available_models()    → Array of model strings

/* MCP Servers */
list_mcp_servers()        → Array of servers
add_mcp_server()          → Server ID
remove_mcp_server()       → Success
call_mcp_tool()           → Tool result
get_available_tools()     → Array of tools

/* UI Events */
combat_started            → Event with participants
quest_completed           → Event with quest ID
tool_executed             → Event with tool call result
game_state_changed        → Event with updated state

/* Settings */
get_settings()            → Settings object
update_settings()         → Updated settings
export_character()        → File path or data
import_character()        → Character ID
```

---

## PART 7: MODERNIZATION CHECKLIST

### Priority 1: Core Infrastructure
- [ ] Refactor backend to modular architecture
- [ ] Implement LLM provider abstraction
- [ ] Set up SQLite database with schema
- [ ] Create comprehensive logging system
- [ ] Standardize all IPC handlers
- [ ] Package Python backend with Electron

### Priority 2: Desktop Application
- [ ] Add window management (minimize, maximize, close)
- [ ] Implement standard menu bar
- [ ] Add keyboard shortcuts system
- [ ] Integrate tray icon
- [ ] Set up auto-update infrastructure
- [ ] Improve app icon/branding

### Priority 3: Frontend Architecture
- [ ] Modularize renderer.js into components
- [ ] Implement state management (Zustand)
- [ ] Extract CSS to design system variables
- [ ] Build responsive layouts
- [ ] Create component library documentation

### Priority 4: Game Features (Phase 1)
- [ ] Character sheet UI + database
- [ ] Inventory management system
- [ ] Quest log with tracking
- [ ] Dice roller widget
- [ ] Tool output visibility panel

### Priority 5: MCP Integration
- [ ] Support custom MCP servers (custom rpg-mcp-servers)
- [ ] Implement stdio/SSE transport
- [ ] Add tool call visualization
- [ ] Enable MCP-based game state modifications
- [ ] Create audit trail for tool calls

### Priority 6: UI/UX Overhaul
- [ ] Redesign layout with all panels
- [ ] Apply D&D-specific theming
- [ ] Implement responsive design
- [ ] Add dark/light theme toggle
- [ ] Accessibility improvements

### Priority 7: Advanced Features
- [ ] Combat system with initiative tracking
- [ ] Spell/ability browser
- [ ] Character animation/preview
- [ ] Session save/load
- [ ] Multi-character support

---

## PART 8: BYOK (Bring Your Own Key) ARCHITECTURE

### LLM Provider Selection

```python
# Backend configuration
class LLMConfig:
    PROVIDER = "anthropic"  # anthropic, openai, gemini, local
    
    # Provider-specific configs
    ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    
    # Local LLM
    LOCAL_LLM_URL = "http://localhost:11434"  # Ollama
    LOCAL_LLM_MODEL = "mistral"

# Frontend settings UI
Settings Panel:
├── LLM Provider selector
│   ├── Anthropic (Claude)
│   ├── OpenAI (GPT-4)
│   ├── Google Gemini
│   └── Local (Ollama, vLLM, etc.)
├── API Key Input (securely stored)
├── Model Selection (depends on provider)
├── Temperature/Top-P sliders
└── Context window display
```

### Custom Router (Future)

```
questkeeperai.com/api/proxy/:provider
├── Custom rate limiting
├── Usage tracking (tokens, cost)
├── Model routing logic
├── Credit system
└── Analytics dashboard
```

---

## PART 9: MODERN BEST PRACTICES

### Code Organization
```
project/
├── electron/
│   ├── main/              # Main process
│   ├── preload/           # Context isolation
│   └── resources/         # App icons, etc.
├── frontend/
│   ├── src/
│   │   ├── components/    # React/Vue components
│   │   ├── stores/        # State management
│   │   ├── utils/         # Helpers, formatters
│   │   ├── styles/        # CSS modules
│   │   └── types/         # TypeScript types
│   └── package.json
├── backend/
│   ├── app/
│   │   ├── models/        # Database models
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic
│   │   └── mcp/           # MCP integration
│   ├── tests/
│   └── requirements.txt
└── docs/
```

### Testing Strategy
```
Backend (Python):
├── Unit tests (pytest)
├── Integration tests (MCP communication)
├── Database tests (schema, migrations)
└── API tests (endpoint coverage)

Frontend (JavaScript):
├── Component tests (Jest + React Testing Library)
├── Integration tests (e2e with Cypress)
├── Visual regression (Percy or similar)
└── Accessibility tests (axe-core)

Desktop (Electron):
├── Spectron tests (Electron-specific)
├── IPC communication tests
└── Build verification
```

### Performance Optimization
```
Frontend:
├── Code splitting by feature
├── Lazy loading components
├── Image optimization (WebP)
├── CSS/JS minification
├── Bundle analysis

Backend:
├── Query optimization with indexes
├── Response caching (Redis optional)
├── MCP tool call rate limiting
├── Database connection pooling

Desktop:
├── Native modules where possible
├── Lazy load Python backend
├── Memory profiling
├── Startup time optimization
```

---

## PART 10: SECURITY CONSIDERATIONS

### API Key Management
```
CURRENT: Keys stored in settings (INSECURE)

MODERNIZED:
├── Electron keytar (OS credential storage)
├── Backend encryption at rest
├── No keys in memory longer than necessary
├── Audit trail of key usage
└── Regular key rotation recommended
```

### MCP Server Security
```
REQUIREMENTS:
├── Sandbox MCP processes
├── Resource quotas (CPU, memory, timeout)
├── Whitelist allowed tools
├── Audit trail for all tool calls
├── Error isolation (don't crash main app)
└── Network isolation (only localhost by default)
```

### User Data Protection
```
MEASURES:
├── Local-only storage (encrypted if sensitive)
├── No telemetry without consent
├── GDPR-compliant data handling
├── Regular security audits
└── Transparent privacy policy
```

---

## CONCLUSION & NEXT STEPS

**Timeline:** 12 weeks to production-ready modernized app

**Key Deliverables:**
1. Modular, maintainable codebase
2. Persistent game state with database
3. Native D&D RPG UI components
4. Custom MCP server support with visible tool outputs
5. BYOK LLM provider support
6. Professional desktop application with standard controls
7. Comprehensive testing & documentation

**Success Metrics:**
- App startup time < 3 seconds
- Tool call response time < 2 seconds
- 95%+ test coverage
- Zero critical security issues
- User-reported stability (99%+ uptime during play)

---

**Document Version:** 1.0
**Last Updated:** 2025-11-11
**Status:** Ready for Implementation
