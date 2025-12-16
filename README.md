# Quest Keeper AI

> "A game where you can DO anything, TRACK everything, and GET BETTER continuously."

Quest Keeper AI is a desktop RPG companion that combines an **AI Dungeon Master** with a **visual game engine**. Think D&D Beyond meets AI Dungeon meets OSRS—where every action has mechanical weight, every quest tracks progress, and your world persists across sessions.

![Tauri](https://img.shields.io/badge/Tauri-2.1-blue)
![React](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)
![MCP](https://img.shields.io/badge/MCP-Protocol-green)
![Tools](https://img.shields.io/badge/MCP%20Tools-145+-brightgreen)

---

## What's New (December 2025)

### Latest Release

- **Seven-Layer Context Architecture** - Intelligent system prompt construction with ~5100 token budget
- **Token Budget Overflow Fix** - Automatic context management for long sessions
- **Claude Opus 4.5 Support** - Latest Anthropic model integration
- **Clear Scene/End Combat Buttons** - Quick combat cleanup from viewport
- **Action Economy Backend Integration** - Full bonus action/reaction tracking
- **Interactive 3D Compass** - Move/rotate controls for battlemap navigation
- **Rest Panel** - Party-wide short/long rest with HP/spell slot recovery
- **Loot Panel** - Encounter loot management with drag-and-drop
- **Spellbook View** - Full spellcasting UI with concentration tracking
- **NPC Memory Timeline** - Visualize relationship history with NPCs
- **Theme Selector** - Multiple UI themes (terminal, fantasy, modern)

---
<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/6fb01f76-fb36-4cd9-a902-cb83763a40d1" />
<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/7aaf98aa-d5fd-4604-9cad-895c83130dab" />


## Core Documentation

| Document                                        | Description                                             |
| ----------------------------------------------- | ------------------------------------------------------- |
| [PROJECT_VISION.md](docs/PROJECT_VISION.md)     | Product vision, target personas, design principles      |
| [DEVELOPMENT_PLAN.md](docs/DEVELOPMENT_PLAN.md) | Strategic roadmap, phases, and priorities               |
| [TASK_MAP.md](docs/TASK_MAP.md)                 | Detailed task breakdown with dependencies and estimates |

---

## ✨ Key Features

| Feature                    | Status | Description                                                                 |
| -------------------------- | ------ | --------------------------------------------------------------------------- |
| **AI Dungeon Master**      | ✅     | LLM-driven storytelling with Claude Opus 4.5, GPT-4, Gemini, or OpenRouter  |
| **Mechanical Grounding**   | ✅     | 145+ MCP tools enforce game rules—the AI describes, the engine validates    |
| **3D Battlemap**           | ✅     | React Three Fiber combat with tokens, terrain, auras, cover, and conditions |
| **2D World Map**           | ✅     | Canvas-based map with 28+ biomes, POIs, zoom/pan, multiple view modes       |
| **Seven-Layer Context**    | ✅     | Dynamic system prompt with world state, party, narrative, scene, secrets    |
| **Persistent World**       | ✅     | SQLite-backed state survives sessions—characters, quests, inventory         |
| **Procedural Generation**  | ✅     | Perlin noise worlds with regions, biomes, rivers, and structures            |
| **Party Management**       | ✅     | Multi-character parties with roles, formations, and share percentages       |
| **Quest System**           | ✅     | Full quest tracking with objectives, rewards, and progress                  |
| **Spellcasting**           | ✅     | Spell slots, concentration, class progression, rest recovery                |
| **Rest System**            | ✅     | Short/long rest with HP recovery, hit dice, spell slot restoration          |
| **NPC Memory**             | ✅     | Relationship tracking, conversation history, disposition changes            |
| **Notes & Journaling**     | ✅     | Categorized notes with tags, search, and pinning                            |
| **OSRS-Style Progression** | 🔧     | Quest chains, skill requirements, achievement tracking (planned)            |

---

## 🎮 What Makes It Different

### The Problem with Existing Tools

| Tool Type                | Strength         | Weakness                 |
| ------------------------ | ---------------- | ------------------------ |
| **AI Dungeon / NovelAI** | Great narrative  | Zero mechanical tracking |
| **D&D Beyond / Roll20**  | Excellent sheets | No AI storytelling       |

### Our Solution

Quest Keeper AI bridges the gap:

```
┌─────────────────────────────────────────────────────────────┐
│                      QUEST KEEPER AI                        │
│                                                             │
│   ┌─────────────┐      ┌─────────────┐      ┌───────────┐  │
│   │   LLM DM    │ ──── │  MCP Engine │ ──── │  SQLite   │  │
│   │  (Claude)   │      │ (145+ tools)│      │   (DB)    │  │
│   └─────────────┘      └─────────────┘      └───────────┘  │
│          │                    │                    │        │
│          └────────────────────┼────────────────────┘        │
│                               ▼                             │
│                    ┌─────────────────────┐                  │
│                    │   Visual Frontend   │                  │
│                    │  (React + Three.js) │                  │
│                    └─────────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

**Key Invariant:** The LLM never lies about game state. All state comes from verified database queries via MCP tools.

---

## 🖥️ Interface

### Dual-Pane Layout

```
┌─────────────────────┬──────────────────────────────┐
│                     │                              │
│   Terminal (Chat)   │   Viewport (Tabbed)          │
│                     │   ├── 🗺️ World Map           │
│   ├── Chat History  │   ├── ⚔️ 3D Battlemap       │
│   ├── Tool Calls    │   ├── 📋 Character Sheet    │
│   └── Input         │   ├── 🎒 Inventory          │
│                     │   ├── 📖 Spellbook          │
│                     │   ├── 🌍 World State        │
│                     │   ├── 👤 NPC Journal        │
│                     │   └── 📝 Notes/Quests       │
│                     │                              │
└─────────────────────┴──────────────────────────────┘
```

### Combat HUD

```
┌─────────────────────────────────────────────────────┐
│  Turn Order: [Hero] → Goblin → Orc → Mage          │
├─────────────────────────────────────────────────────┤
│  Party Status:                                      │
│  ❤️ Valeros: 45/50 HP  ⚡ Mage: 3/4 slots          │
│  🛡️ AC: 18  ⚔️ +7 to hit                          │
├─────────────────────────────────────────────────────┤
│  Quick Actions:                                     │
│  [Attack] [Cast Spell] [Move] [Dodge] [Help]       │
│  [End Turn] [Short Rest] [Clear Scene]             │
└─────────────────────────────────────────────────────┘
```

---

## 🛠️ Technology Stack

### Frontend

- **Framework:** Tauri 2.x (Rust backend, web frontend)
- **UI:** React 19 + TypeScript 5.8
- **3D:** React Three Fiber + Three.js
- **State:** Zustand 5.x with persistence
- **Styling:** TailwindCSS 3.x with theme support

### Backend (MCP Server)

- **Server:** rpg-mcp (unified MCP server with 145+ tools)
- **Protocol:** MCP v2024-11-05 (JSON-RPC 2.0 over stdio)
- **Database:** SQLite with migrations
- **Presets:** 1100+ creature templates, 50+ encounters, 30+ locations

### LLM Providers

- Anthropic (Claude Opus 4.5, Claude Sonnet 4.5, Claude 3.5)
- OpenAI (GPT-4, GPT-4o, GPT-4 Turbo)
- Google (Gemini Pro, Gemini Flash)
- OpenRouter (100+ models)

---

## 📂 Project Structure

```
Quest Keeper AI/
├── src/                          # React frontend
│   ├── components/
│   │   ├── layout/              # Main split layout, navbar
│   │   ├── terminal/            # Chat, sidebar, tool inspector
│   │   ├── viewport/            # Battlemap, sheets, inventory, spellbook
│   │   ├── hud/                 # Combat HUD, quick actions, rest panel
│   │   ├── character/           # Character sheet components
│   │   └── npc/                 # NPC memory, relationship cards
│   ├── services/
│   │   ├── mcpClient.ts         # MCP sidecar management
│   │   └── llm/
│   │       ├── LLMService.ts    # Provider adapters
│   │       └── contextBuilder.ts # Seven-layer context assembly
│   ├── stores/                  # Zustand state management
│   │   ├── chatStore.ts
│   │   ├── gameStateStore.ts
│   │   ├── combatStore.ts
│   │   ├── partyStore.ts
│   │   ├── npcStore.ts
│   │   └── settingsStore.ts
│   ├── context/
│   │   └── ThemeContext.tsx     # Theme provider
│   └── utils/
├── src-tauri/                   # Tauri/Rust backend
│   ├── binaries/                # MCP server binary
│   └── tauri.conf.json
├── docs/                        # Documentation
│   ├── DEVELOPMENT_PLAN.md
│   ├── TASK_MAP.md
│   ├── PROJECT_VISION.md
│   └── DEVELOPMENT_PROMPTS.md
└── package.json
```

---

## 📥 Installation

### For Users (Windows)

1. Go to the [Releases](https://github.com/Mnehmos/QuestKeeperAI-v2/releases) page
2. Download the latest `Quest.Keeper.AI_0.2.0_x64-setup.exe`
3. Run the installer and follow the prompts
4. Launch Quest Keeper AI from the Start Menu

> **Note:** Your game data (characters, worlds, quests) is stored in `%APPDATA%\com.questkeeper.ai\mcp-data\` and persists across updates.

---

## 🚀 Development Setup

### Prerequisites

- **Node.js** 20+ and npm
- **Rust** toolchain ([install](https://rustup.rs/))
- **Tauri prerequisites** for your OS ([guide](https://tauri.app/v2/guides/getting-started/prerequisites))

### Clone & Install

```bash
# Clone the repository
git clone https://github.com/Mnehmos/QuestKeeperAI-v2.git
cd QuestKeeperAI-v2

# Install dependencies
npm install
```

### Sidecar Binary

The MCP server binary (`rpg-mcp-server-x86_64-pc-windows-msvc.exe`) must be present in `src-tauri/binaries/`. This binary is committed to the repository. If building from a fresh checkout without it, you'll need to:

1. Build it from the [rpg-mcp](https://github.com/Mnehmos/rpg-mcp) repository
2. Place the binary at: `src-tauri/binaries/rpg-mcp-server-x86_64-pc-windows-msvc.exe`

### Running

```bash
# Development (full app with MCP sidecar)
npm run tauri dev

# Web only (no Tauri APIs, limited functionality)
npm run dev
```

### Building

```bash
# Production build (creates installer in src-tauri/target/release/bundle/)
npm run tauri build
```

### Creating a Release

Releases are automated via GitHub Actions. To create a new release:

```bash
# Tag and push
git tag v0.1.0
git push origin v0.1.0
```

This triggers the release workflow which builds the Windows installer and creates a draft release.

---

## ⚙️ Configuration

### API Keys

1. Click the **[CONFIG]** button in the terminal panel
2. Enter API keys for your preferred provider(s):
   - Anthropic API Key (recommended for Claude Opus 4.5)
   - OpenAI API Key
   - Google AI API Key
   - OpenRouter API Key
3. Select your preferred model
4. Customize the system prompt layers (optional)

Keys are stored in browser localStorage.

### Seven-Layer Context System

The system prompt is assembled from 7 dynamic layers:

| Layer       | Content                                     | Tokens |
| ----------- | ------------------------------------------- | ------ |
| **Layer 1** | AI DM Core Identity                         | ~400   |
| **Layer 2** | Game System Rules                           | ~800   |
| **Layer 3** | World State Snapshot                        | ~600   |
| **Layer 4** | Party & Character Context                   | ~1200  |
| **Layer 5** | Narrative Memory (rolling)                  | ~800   |
| **Layer 6** | Scene Context (combat/dialogue/exploration) | ~1000  |
| **Layer 7** | DM Secrets (hidden from player)             | ~300   |

Layers 1-2 are runtime-editable via settings. Layers 3-7 are dynamically fetched.

### MCP Server

The unified `rpg-mcp-server` binary is bundled in `src-tauri/binaries/`. It provides:

| Domain         | Tools | Highlights                                         |
| -------------- | ----- | -------------------------------------------------- |
| **Composite**  | 6     | spawn_preset_encounter, loot_encounter, rest_party |
| **Characters** | 5     | Full D&D stat blocks, conditions, spells           |
| **Items**      | 15    | Templates, equipment slots, currency               |
| **Combat**     | 8     | Encounters, initiative, death saves, lair actions  |
| **Spells**     | 15+   | Spell slots, concentration, rest recovery          |
| **Quests**     | 8     | Objectives, progress, rewards                      |
| **World**      | 12    | Generation, regions, map patches                   |
| **Party**      | 17    | Movement, context, world positioning               |
| **NPCs**       | 7     | Memory, relationships, conversation history        |
| **Secrets**    | 9     | Hidden info, reveal conditions, leak detection     |
| **Strategy**   | 11    | Nations, diplomacy, fog of war                     |

---

## 🎯 Development Status

**Overall Progress: ~75% Complete** | Phases 1-2 ✅ | Phase 4 🔧 | Phases 3, 5-6 ⬜

### ✅ Phase 1: Core Systems (Complete)

- Character creation with D&D 5e stats, point buy, dice rolling
- AI-generated character backstories
- Inventory system with D&D 5e item database and equipment slots
- Combat encounters with initiative, HP, conditions, cover mechanics
- Quest system with full data, objectives, rewards, and progress tracking
- Spellcasting with slot tracking, concentration, class progression

### ✅ Phase 2: World Visualization (Complete)

- 2D canvas world map with zoom (0.25x-6x) and pan
- 28+ biome types with color mapping
- POI markers (cities, towns, dungeons, temples, etc.)
- Multiple view modes: biomes, heightmap, temperature, moisture, rivers
- Region boundaries and capital markers
- Interactive POI detail panels

### 🔧 Phase 4: Enhanced Combat (80% Complete)

- ✅ 3D React Three Fiber battlemap
- ✅ Grid system with coordinate labels
- ✅ Entity tokens with size/type support
- ✅ Terrain with cover mechanics
- ✅ Aura visualization layer
- ✅ Interactive 3D compass navigation
- ✅ Combat HUD with turn order, party status
- ✅ Quick action bar with common actions
- ✅ Rest panel for short/long rests
- ✅ Loot panel for encounter rewards
- ⬜ Click-to-move token interaction
- ⬜ Combat log panel

### 🔧 Phase 5: Session Management (70% Complete)

- ✅ Auto-save via Zustand persist
- ✅ Chat session management
- ✅ Seven-layer context architecture
- ✅ Token budget management
- ⬜ Context condensing for very long sessions
- ⬜ Export to Markdown/PDF

### ⬜ Phase 3: Progression Systems (Not Started)

- Skill system with OSRS-style XP curves
- Quest chains and prerequisites
- Achievement tracking
- Faction reputation

### ⬜ Phase 6: Workflow Automation (Not Started)

- Batch generation tools
- YAML workflow definitions
- Template library

See [DEVELOPMENT_PLAN.md](docs/DEVELOPMENT_PLAN.md) for the full roadmap.

---

## 🧪 Testing

```bash
# Verify MCP connectivity
# Type in chat: /test
# Should list 145+ available tools

# Manual tool test
# Ask the AI: "Create a fighter named Valeros"
# Should invoke create_character tool and return structured data
```

---

## 📖 Documentation

| Document                                              | Purpose                                  |
| ----------------------------------------------------- | ---------------------------------------- |
| [DEVELOPMENT_PLAN.md](docs/DEVELOPMENT_PLAN.md)       | Strategic roadmap, phases, priorities    |
| [TASK_MAP.md](docs/TASK_MAP.md)                       | Detailed task breakdown with estimates   |
| [PROJECT_VISION.md](docs/PROJECT_VISION.md)           | Product vision, personas, principles     |
| [DEVELOPMENT_PROMPTS.md](docs/DEVELOPMENT_PROMPTS.md) | Reusable prompts for feature development |
| [RPG-MCP-INTEGRATION.md](docs/RPG-MCP-INTEGRATION.md) | Backend integration reference            |

---

## 🤝 Contributing

1. Check [TASK_MAP.md](docs/TASK_MAP.md) for available tasks
2. Pick a task marked ⬜ (not started)
3. Create a feature branch
4. Implement with tests
5. Submit PR with task ID reference

### Development Workflow

```bash
# Backend changes (rpg-mcp)
cd path/to/rpg-mcp
npm run build:binaries
copy bin/rpg-mcp-win.exe "Quest Keeper AI/src-tauri/binaries/rpg-mcp-server-x86_64-pc-windows-msvc.exe"

# Frontend changes
npm run tauri dev  # Hot reload enabled
```

---

## 🏗️ Architecture Decisions

### Why MCP?

- **Protocol standardization** - JSON-RPC 2.0 is well-understood
- **Tool isolation** - Backend is stateless, all state in SQLite
- **LLM compatibility** - Works with any tool-calling LLM
- **Anti-hallucination** - LLM can only modify state through validated tools

### Why Tauri?

- **Small bundle size** - ~10MB vs Electron's ~150MB
- **Native performance** - Rust backend, web frontend
- **Cross-platform** - Windows, macOS, Linux from one codebase

### Why Zustand?

- **Simple API** - No boilerplate
- **TypeScript-first** - Full type inference
- **Persistence** - Built-in localStorage sync
- **Flexible** - Works with React 19

### Why Seven-Layer Context?

- **Token efficiency** - Dynamic layers only load when relevant
- **Separation of concerns** - Identity, rules, state, narrative isolated
- **Customization** - Users can edit identity/rules layers
- **Secret management** - DM secrets never leak to player display

---

## 🐛 Known Issues

| Issue                             | Status   | Workaround                                        |
| --------------------------------- | -------- | ------------------------------------------------- |
| OpenRouter free models skip tools | Known    | Use paid model for full functionality             |
| Long sessions can exceed context  | Known    | Token budget tracking, context condensing planned |
| ~~5-second polling delay~~        | ✅ Fixed | Event-driven updates implemented                  |
| Issues with `v0.2.0`              | Active   | Please report on GitHub Issues                    |

---

## 📜 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

- [MCP Protocol](https://modelcontextprotocol.io) - Anthropic's Model Context Protocol
- [Tauri](https://tauri.app) - Desktop app framework
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber) - React renderer for Three.js
- [D&D 5e SRD](https://www.dndbeyond.com/sources/basic-rules) - Game mechanics reference
- [OSRS Wiki](https://oldschool.runescape.wiki) - Progression system inspiration

---

<p align="center">
  <strong>Quest Keeper AI</strong> - Where AI narrative meets mechanical depth
</p>
