# Quest Keeper AI

> "A game where you can DO anything, TRACK everything, and GET BETTER continuously."

Quest Keeper AI is a desktop RPG companion that combines an **AI Dungeon Master** with a **visual game engine**. Think D&D Beyond meets AI Dungeon meets OSRS—where every action has mechanical weight, every quest tracks progress, and your world persists across sessions.

![Tauri](https://img.shields.io/badge/Tauri-2.x-blue)
![React](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)
![MCP](https://img.shields.io/badge/MCP-Protocol-green)

---

## Core Documentation

| Document | Description |
|----------|-------------|
| [PROJECT_VISION.md](docs/PROJECT_VISION.md) | Product vision, target personas, design principles |
| [DEVELOPMENT_PLAN.md](docs/DEVELOPMENT_PLAN.md) | Strategic roadmap, phases, and priorities |
| [TASK_MAP.md](docs/TASK_MAP.md) | Detailed task breakdown with dependencies and estimates |

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| **AI Dungeon Master** | LLM-driven storytelling with Claude, GPT-4, Gemini, or OpenRouter |
| **Mechanical Grounding** | 80+ MCP tools enforce game rules—the AI describes, the engine validates |
| **3D Battlemap** | React Three Fiber combat visualization with tokens, terrain, grid |
| **Persistent World** | SQLite-backed state survives sessions—characters, quests, inventory |
| **Procedural Generation** | Perlin noise worlds with regions, biomes, and structures |
| **OSRS-Style Progression** | Quest chains, skill requirements, achievement tracking (in development) |

---

## 🎮 What Makes It Different

### The Problem with Existing Tools

| Tool Type | Strength | Weakness |
|-----------|----------|----------|
| **AI Dungeon / NovelAI** | Great narrative | Zero mechanical tracking |
| **D&D Beyond / Roll20** | Excellent sheets | No AI storytelling |

### Our Solution

Quest Keeper AI bridges the gap:

```
┌─────────────────────────────────────────────────────────────┐
│                      QUEST KEEPER AI                        │
│                                                             │
│   ┌─────────────┐      ┌─────────────┐      ┌───────────┐  │
│   │   LLM DM    │ ──── │  MCP Engine │ ──── │  SQLite   │  │
│   │  (Claude)   │      │  (80+ tools)│      │   (DB)    │  │
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
│                     │   ├── 🌍 World State        │
│                     │   └── 📝 Notes/Quests       │
│                     │                              │
└─────────────────────┴──────────────────────────────┘
```

---

## 🛠️ Technology Stack

### Frontend
- **Framework:** Tauri 2.x (Rust backend, web frontend)
- **UI:** React 19 + TypeScript 5.8
- **3D:** React Three Fiber + Three.js
- **State:** Zustand 5.x
- **Styling:** TailwindCSS 3.x

### Backend (MCP Server)
- **Server:** rpg-mcp (unified MCP server)
- **Protocol:** MCP v2024-11-05 (JSON-RPC 2.0 over stdio)
- **Database:** SQLite with migrations
- **Tools:** 80+ tools across 8 domains

### LLM Providers
- OpenAI (GPT-4, GPT-4o)
- Anthropic (Claude 3.5, Claude 3)
- Google (Gemini Pro, Gemini Flash)
- OpenRouter (100+ models)

---

## 📂 Project Structure

```
Quest Keeper AI/
├── src/                          # React frontend
│   ├── components/
│   │   ├── layout/              # Main split layout
│   │   ├── terminal/            # Chat, sidebar, tool inspector
│   │   └── viewport/            # Battlemap, sheets, inventory
│   ├── services/
│   │   ├── mcpClient.ts         # MCP sidecar management
│   │   └── llm/                 # Provider adapters
│   ├── stores/                  # Zustand state management
│   │   ├── chatStore.ts
│   │   ├── gameStateStore.ts
│   │   ├── combatStore.ts
│   │   └── settingsStore.ts
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

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20+ and npm
- **Rust** toolchain ([install](https://rustup.rs/))
- **Tauri prerequisites** for your OS ([guide](https://tauri.app/v2/guides/getting-started/prerequisites))

### Installation

```bash
# Clone the repository
git clone https://github.com/Mnehmos/QuestKeeperAI-v2.git
cd QuestKeeperAI-v2

# Install dependencies
npm install
```

### Running

```bash
# Development (full app with MCP sidecar)
npm run tauri dev

# Web only (no Tauri APIs, limited functionality)
npm run dev
```

### Building

```bash
# Production build
npm run tauri build
```

---

## ⚙️ Configuration

### API Keys

1. Click the **[CONFIG]** button in the terminal panel
2. Enter API keys for your preferred provider(s):
   - OpenAI API Key
   - Anthropic API Key
   - Google AI API Key
   - OpenRouter API Key
3. Select your preferred model
4. Customize the system prompt (optional)

Keys are stored in browser localStorage.

### MCP Server

The unified `rpg-mcp-server` binary is bundled in `src-tauri/binaries/`. It provides:

| Domain | Tools |
|--------|-------|
| **Characters** | create, get, update, list, delete |
| **Items** | templates, give, remove, equip, transfer |
| **Inventory** | detailed listings, equipment slots |
| **Quests** | create, assign, track, complete |
| **Combat** | encounters, actions, turns, initiative |
| **World** | generation, regions, map patches |
| **Math** | dice rolls, probability, algebra |
| **Strategy** | nations, diplomacy, fog of war |

---

## 🎯 Development Status

### ✅ Implemented
- Character creation with D&D 5e stats
- Inventory system with equipment slots
- Combat encounters with initiative tracking
- 3D battlemap visualization
- Multi-LLM provider support
- Procedural world generation

### 🔧 In Progress (Current Sprint)
- Quest system overhaul (full data, not just UUIDs)
- Objective progress tracking
- Reward distribution

### 📋 Planned (Roadmap)
- World map visualization (2D tile renderer)
- Point of Interest system
- OSRS-style skill progression
- Quest chains and prerequisites
- Session save/load
- Context condensing for long sessions
- Batch generation workflows

See [DEVELOPMENT_PLAN.md](docs/DEVELOPMENT_PLAN.md) for the full roadmap.

---

## 🧪 Testing

```bash
# Verify MCP connectivity
# Type in chat: /test
# Should list 80+ available tools

# Manual tool test
# Ask the AI: "Create a fighter named Valeros"
# Should invoke create_character tool and return structured data
```

---

## 📖 Documentation

| Document | Purpose |
|----------|---------|
| [DEVELOPMENT_PLAN.md](docs/DEVELOPMENT_PLAN.md) | Strategic roadmap, phases, priorities |
| [TASK_MAP.md](docs/TASK_MAP.md) | Detailed task breakdown with estimates |
| [PROJECT_VISION.md](docs/PROJECT_VISION.md) | Product vision, personas, principles |
| [DEVELOPMENT_PROMPTS.md](docs/DEVELOPMENT_PROMPTS.md) | Reusable prompts for feature development |
| [RPG-MCP-INTEGRATION.md](docs/RPG-MCP-INTEGRATION.md) | Backend integration reference |

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

### Why Tauri?
- **Small bundle size** - ~10MB vs Electron's ~150MB
- **Native performance** - Rust backend, web frontend
- **Cross-platform** - Windows, macOS, Linux from one codebase

### Why Zustand?
- **Simple API** - No boilerplate
- **TypeScript-first** - Full type inference
- **Flexible** - Works with React 19

---

## 🐛 Known Issues

| Issue | Workaround |
|-------|------------|
| OpenRouter free models skip tools | Use paid model for full functionality |
| 5-second polling delay | Manual refresh, event system planned |
| Quest log shows UUIDs only | Fix in progress (Sprint 1) |

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
