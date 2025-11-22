# Phase 4: MCP Server Integration & Sidecar Design

## 1. Overview
This document defines the technical strategy for integrating the `game-state-server` and `combat-engine-server` into the Quest Keeper AI application. These servers provide core RPG logic and persistence, exposing their capabilities via the Model Context Protocol (MCP). They act as "sidecars"—separate processes managed by the main Tauri application.

## 2. Component Analysis

### 2.1 Game State Server (`rpg-game-state-server`)
*   **Role:** Manages character data, inventory, world state, and persistence via SQLite.
*   **Transport:** Stdio (Standard Input/Output).
*   **Tech Stack:** Node.js, TypeScript, SQLite (`better-sqlite3`).
*   **Integration Requirement:** Must be packaged as a standalone executable to be spawned by Tauri.

### 2.2 Combat Engine Server (`rpg-combat-engine-server`)
*   **Role:** Handles D&D 5E combat mechanics, dice rolling, action economy, and spatial validation.
*   **Transport:** Stdio.
*   **Tech Stack:** Node.js, TypeScript.
*   **Integration Requirement:** Must be packaged as a standalone executable.

## 3. Bundling Strategy (Sidecars)

To ensure the application runs on users' machines without requiring them to install Node.js, we will compile the MCP servers into standalone binaries.

### 3.1 Packaging Tool: `pkg`
We will use [Vercel's `pkg`](https://github.com/vercel/pkg) to bundle the Node.js source code and runtime into a single executable file for the target platform (Windows `x86_64`).

### 3.2 Build Pipeline
1.  **Compile TypeScript:** Run `tsc` in each server directory to generate JavaScript in `dist/`.
2.  **Package Binary:** Run `pkg` pointing to the `dist/index.js` entry point.
3.  **Target Naming:**
    *   `game-state-server-x86_64-pc-windows-msvc.exe`
    *   `combat-engine-server-x86_64-pc-windows-msvc.exe`
    *   *Note: Tauri requires sidecar binaries to include the target triple in their filename.*
4.  **Placement:** Move binaries to `src-tauri/binaries/`.

### 3.3 Tauri Configuration
We must register these binaries as external binaries (sidecars) in `src-tauri/tauri.conf.json`.

```json
{
  "bundle": {
    "externalBin": [
      "binaries/game-state-server",
      "binaries/combat-engine-server"
    ]
  }
}
```

## 4. Communication Bridge (`McpClient`)

The frontend needs a robust way to communicate with these stdio-based processes. We will implement a TypeScript `McpClient` class.

### 4.1 Architecture
*   **Spawn:** Use Tauri's `Command.sidecar()` to spawn the processes.
*   **Lifecycle:** The `McpClient` is responsible for starting the sidecar on app launch and killing it on app close (Tauri handles child process cleanup automatically, but explicit cleanup is good practice).
*   **Protocol:** JSON-RPC 2.0 over Stdio.
    *   **Request:** Send JSON string ending with newline `\n` to `stdin`.
    *   **Response:** Listen to `stdout` lines, parse JSON.

### 4.2 Implementation Details (`src/services/mcpClient.ts`)

```typescript
import { Command, Child } from '@tauri-apps/plugin-shell';

export class McpClient {
  private process: Child | null = null;
  private listeners: Map<string, (response: any) => void> = new Map();

  constructor(private binaryName: string) {}

  async start() {
    const command = Command.sidecar(`binaries/${this.binaryName}`);
    this.process = await command.spawn();
    
    command.stdout.on('data', (line) => this.handleOutput(line));
    command.stderr.on('data', (line) => console.error(`[${this.binaryName}]`, line));
  }

  async callTool(toolName: string, args: any) {
    // Construct JSON-RPC request
    // Write to this.process.write()
    // Return Promise that resolves when response ID matches
  }
  
  private handleOutput(line: string) {
    // Parse JSON-RPC
    // Match ID
    // Resolve pending promise
  }
}
```

## 5. LLM Integration

The `LlmClient` needs to know which tools are available and where to route them.

### 5.1 Tool Registry
We will maintain a mapping of tool names to MCP clients.

*   `game-state-server` handles: `get_character`, `update_character`, `add_item`, `save_world_state`, etc.
*   `combat-engine-server` handles: `roll_dice`, `attack_roll`, `move_creature`, `get_tactical_summary`, etc.

### 5.2 Routing Logic
1.  **Initialization:** On startup, `LlmClient` queries both MCP servers (via `list_tools` if supported, or hardcoded definitions from our analysis) to build the `tools` array for the LLM system prompt.
2.  **Execution:** When the LLM requests a tool call (e.g., `use_tool: "attack_roll"`):
    *   `ToolRegistry` looks up the owner of `attack_roll` (Combat Engine).
    *   Forwards the request to the appropriate `McpClient`.
    *   Returns the JSON result to the LLM.

## 6. Implementation Steps

1.  **Setup Build Scripts:** Create a `scripts/bundle-sidecars.js` (or similar) to automate the `npm install -> tsc -> pkg -> move` pipeline for both servers.
2.  **Configure Tauri:** Update `tauri.conf.json` to whitelist the sidecars and shell scope.
3.  **Develop McpClient:** Implement the TypeScript bridge for Stdio communication.
4.  **Integrate ToolRegistry:** Connect `LlmClient` to the `McpClient` instances.
5.  **Testing:** Verify end-to-end flow: User Query -> LLM -> Tool Call -> Tauri Sidecar -> Result -> LLM -> UI.