# Technical Design Document: Quest Keeper AI (Desktop Client)

## 1. Project Overview

**Project Name:** Quest Keeper AI - Desktop Client
**Goal:** Create a lightweight, local-first desktop application that wraps the existing D&D 5e MCP Servers into a unified playable interface.
**Target Architecture:** Tauri v2 (Rust + React) using the "Sidecar Pattern" to bundle existing Node.js MCP servers.

## 2. System Architecture & Constraints

### 2.1 Technology Stack

  * **Host Framework:** Tauri v2 (Rust core, strictly for OS-level orchestration).
  * **Frontend:** React + Vite + TypeScript.
  * **Styling:** TailwindCSS (Retro-futuristic/Terminal aesthetic).
  * **3D Engine:** Three.js / React-Three-Fiber (R3F).
  * **Data Layer:** Existing SQLite MCP implementation (bundled as sidecar).
  * **AI Interface:** Direct API calls to Anthropic/OpenAI from the client (User provides Key).

### 2.2 The Sidecar Pattern

The application must NOT rewrite the game logic. It must run the existing logic as background processes.

1.  **The App (Tauri):** Launches the UI window.
2.  **The Sidecars:** Tauri spawns two hidden binaries on startup:
      * `rpg-game-state-server` (Port 3001)
      * `rpg-combat-engine-server` (Port 3002)
3.  **The Bridge:** The Frontend communicates with these sidecars via local HTTP/WebSocket requests, orchestrated by the Tauri IPC.

## 3. Component Specifications

### 3.1 Component: The Shell (Tauri Core)

  * **Responsibility:** Window management, File System access, Sidecar lifecycle management.
  * **Constraint:** Must handle graceful shutdown (killing sidecar processes when the app closes).
  * **Config:** `tauri.conf.json` must whitelist `shell:execute` for the binaries.

### 3.2 Component: The Interface (Frontend)

  * **Layout:** Split-screen.
      * **Left Panel (40%):** Chat Interface (Terminal style). Supports Markdown rendering.
      * **Right Panel (60%):** Tabbed view.
          * *Tab A:* 3D Battlemap (Three.js).
          * *Tab B:* Character Sheet (React Data Grid).
          * *Tab C:* World State / Inventory.

### 3.3 Component: The MCP Bridge (Client Logic)

  * **Logic:** A TypeScript service layer (`src/services/mcp.ts`) that acts as the API Client.
  * **Function:** Intercepts LLM "Tool Calls" and routes them to the correct Sidecar port (3001 vs 3002).

## 4. Implementation Roadmap (Agent Task List)

The Orchestrator should decompose these phases into atomic worker tasks.

### Phase 1: Scaffolding & Sidecar Binding

  * **Objective:** Get a "Hello World" Tauri app running that successfully spawns the `game-state-server` sidecar.
  * **Validation:** App starts, Node process appears in Task Manager, App logs "Connected to MCP".
  * **Dependencies:** Node.js binaries (bundled via `pkg`).

### Phase 2: The Terminal UI (Chat)

  * **Objective:** Build the chat interface.
  * **Features:**
      * Input field.
      * Message history.
      * "System Message" display (for dice rolls/hidden logic).
  * **Validation:** User can type a message, it renders in the log.

### Phase 3: The Visualizer (3D)

  * **Objective:** Implement the Three.js viewer.
  * **Features:**
      * Render a basic grid.
      * Fetch "Entity Positions" from the Combat MCP.
      * Update positions in real-time.
  * **Validation:** Changing a coordinate in the DB updates the 3D canvas.

### Phase 4: The Brain (LLM Integration)

  * **Objective:** Connect the loop.
  * **Flow:** User Input -> LLM -> Tool Call -> Sidecar -> Result -> LLM -> Narrative.
  * **Validation:** User types "Cast Fireball", System rolls dice, System updates HP, LLM describes explosion.

## 5. Agent Assignment Protocol

**Orchestrator Note:** Assign tasks based on the following role capabilities.

  * **Role: Architect**
      * *Task Types:* Define the JSON structure for the MCP Bridge, design the React Component hierarchy, configure `tauri.conf.json` security scopes.
  * **Role: Builder (Rust/Sys)**
      * *Task Types:* Cargo configuration, Binary compilation (using `pkg` to turn Node servers into executables), Sidecar spawning logic.
  * **Role: Builder (React/TS)**
      * *Task Types:* UI Component creation, Three.js implementation, State management (Zustand/Context).
  * **Role: Reviewer**
      * *Checks:* Ensure no API keys are hardcoded. Verify Sidecars are killed on exit. Verify Type safety.

## 6. Directory Structure (Target)

```text
/src-tauri
  /src
    main.rs        (Sidecar orchestration)
  tauri.conf.json  (Permissions)
/src
  /components
    /terminal      (Chat UI)
    /viewport      (3D UI)
  /services
    mcp_bridge.ts  (API Layer)
    llm_client.ts  (Anthropic Layer)
  App.tsx
/binaries
  quest-keeper-state-server-x86_64.exe
  quest-keeper-combat-server-x86_64.exe