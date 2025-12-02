# Quest Keeper AI - rpg-mcp Integration Complete

**Date:** December 2024  
**Status:** ✅ Integration Complete  
**Backend:** rpg-mcp (unified MCP server)  
**Frontend:** Quest Keeper AI v2 (Tauri + React)

---

## Overview

This document describes the completed integration of the unified `rpg-mcp` backend server with the Quest Keeper AI frontend, replacing the deprecated `rpg-game-state-server` and `rpg-combat-engine-server` binaries.

---

## Architecture

### Before (Deprecated)
```
Quest Keeper AI
    ├── rpg-game-state-server (Node.js/pkg) ❌ BROKEN
    └── rpg-combat-engine-server (Node.js/pkg) ❌ BROKEN
```

### After (Current)
```
Quest Keeper AI
    └── rpg-mcp-server (TypeScript/pkg) ✅ WORKING
        ├── CRUD Tools (characters, worlds)
        ├── Inventory Tools
        ├── Quest Tools
        ├── Combat Tools
        ├── Math Tools (dice, probability)
        └── Strategy Tools (nations, diplomacy)
```

---

## Files Modified

| File | Purpose |
|------|---------|
| `src-tauri/tauri.conf.json` | Bundle configuration - single binary |
| `src-tauri/capabilities/default.json` | Shell spawn permissions |
| `src/services/mcpClient.ts` | Unified MCP client with aliases |
| `src/stores/gameStateStore.ts` | JSON parsing, updated tool names |
| `src/stores/combatStore.ts` | Encounter-based combat system |
| `src/services/llm/LLMService.ts` | Tool sync and encounter ID extraction |
| `.gitignore` | Database file exclusions |

---

## Tool Mapping Reference

### Character Tools
| Old Tool | New Tool | Parameter Changes |
|----------|----------|-------------------|
| `list_characters` | `list_characters` | None |
| `get_character` | `get_character` | `character_id: number` → `id: string` |
| `create_character` | `create_character` | Stats object required |

### Inventory Tools
| Old Tool | New Tool | Parameter Changes |
|----------|----------|-------------------|
| `get_inventory` | `get_inventory` | `character_id` → `characterId` |
| N/A | `give_item` | New: `characterId`, `itemId`, `quantity` |
| N/A | `remove_item` | New: `characterId`, `itemId`, `quantity` |
| N/A | `equip_item` | New: `characterId`, `itemId`, `slot` |

### Quest Tools
| Old Tool | New Tool | Parameter Changes |
|----------|----------|-------------------|
| `get_active_quests` | `get_quest_log` | `character_id` → `characterId` |
| N/A | `create_quest` | New quest creation |
| N/A | `assign_quest` | New: `characterId`, `questId` |
| N/A | `complete_quest` | New: `characterId`, `questId` |

### Combat Tools
| Old Tool | New Tool | Notes |
|----------|----------|-------|
| `describe_battlefield` | `get_encounter_state` | Requires `encounterId` |
| N/A | `create_encounter` | Creates new combat |
| N/A | `execute_combat_action` | Attack/heal actions |
| N/A | `advance_turn` | Next combatant |
| N/A | `end_encounter` | End combat |

### World Tools (New)
| Tool | Purpose |
|------|---------|
| `create_world` | Create procedural world |
| `get_world` | Retrieve world by ID |
| `list_worlds` | List all worlds |
| `generate_world` | Procedural generation |

---

## Response Format Changes

### Old Format (Text with Emojis)
```
🆔 ID: 12
👤 Name: Valeros
📊 Level: 5
❤️ HP: 45/50
💪 STR: 16, 🏃 DEX: 14...
```

### New Format (JSON)
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Valeros",
  "level": 5,
  "hp": 45,
  "maxHp": 50,
  "stats": { "str": 16, "dex": 14, "con": 14, "int": 10, "wis": 12, "cha": 10 }
}
```

---

## Combat System Changes

### Old System
- Implicit battlefield state
- `describe_battlefield` returned formatted text
- Positions parsed from text descriptions

### New System
- Explicit encounter management
- Must call `create_encounter` first
- Returns `encounterId` for subsequent calls
- Participants tracked with HP, conditions
- Turn order managed server-side

### Combat Flow
```
1. create_encounter({ seed, participants }) → { encounterId }
2. get_encounter_state({ encounterId }) → { round, currentTurn, participants }
3. execute_combat_action({ encounterId, action, actorId, targetId, ... })
4. advance_turn({ encounterId })
5. end_encounter({ encounterId })
```

---

## Database

**Location:** `rpg.db` (SQLite, created in sidecar working directory)

**Tables:**
- `characters` - Player and NPC characters
- `worlds` - World definitions
- `items` - Item templates
- `inventory` - Character inventories
- `quests` - Quest definitions
- `quest_logs` - Character quest progress
- `encounters` - Combat encounters

**Important:** Database files (`*.db`, `*.db-shm`, `*.db-wal`) are excluded from git and should not trigger Tauri file watchers.

---

## Testing Checklist

### Startup Test
```bash
cd "C:\Users\mnehm\Desktop\Quest Keeper AI attempt 2"
npm run tauri dev
```

**Expected Console:**
- `[McpClient] rpg-mcp-server spawned successfully`
- `[McpClient] rpg-mcp-server stderr: RPG MCP Server running on stdio`
- `[McpManager] Unified rpg-mcp-server initialized successfully`

### Functional Tests

| Test | Command | Expected Result |
|------|---------|-----------------|
| List Tools | `/test` | 80+ tools listed |
| Create Character | "Create a fighter named Valeros" | Character created, ID returned |
| View Character | "Show my character" | Character sheet displayed |
| Add Item | "Give me a longsword" | Item added to inventory |
| View Inventory | "What's in my inventory?" | Items listed |
| Start Combat | "Start combat with 2 goblins" | Encounter created, ID stored |
| Combat Action | "Attack the first goblin" | Attack resolved, damage applied |
| End Combat | "End the combat" | Encounter ended |

---

## Troubleshooting

### Error: "Cannot find module"
**Cause:** Old binary being used  
**Fix:** Ensure `rpg-mcp-server-x86_64-pc-windows-msvc.exe` exists in `src-tauri/binaries/`

### Error: "McpClient not connected"
**Cause:** Server failed to spawn  
**Fix:** Check `tauri.conf.json` has correct binary path, check `default.json` permissions

### Error: "Encounter not found"
**Cause:** No active encounter set  
**Fix:** Use `create_encounter` before `get_encounter_state`

### Error: "Character not found"
**Cause:** UUID mismatch (old numeric ID vs new string UUID)  
**Fix:** Ensure frontend uses string IDs from `list_characters`

### Combat entities not appearing
**Cause:** `activeEncounterId` not set  
**Fix:** LLMService now auto-extracts encounter ID from `create_encounter` result

---

## Available Tools (Full List)

### CRUD (9 tools)
- `create_world`, `get_world`, `list_worlds`, `delete_world`
- `create_character`, `get_character`, `update_character`, `list_characters`, `delete_character`

### Inventory (6 tools)
- `create_item_template`, `give_item`, `remove_item`, `equip_item`, `unequip_item`, `get_inventory`

### Quest (5 tools)
- `create_quest`, `assign_quest`, `update_objective`, `complete_quest`, `get_quest_log`

### Combat (6 tools)
- `create_encounter`, `get_encounter_state`, `execute_combat_action`, `advance_turn`, `end_encounter`, `load_encounter`

### Math (5 tools)
- `dice_roll`, `probability_calculate`, `algebra_solve`, `algebra_simplify`, `physics_projectile`

### World Generation (6 tools)
- `generate_world`, `get_world_state`, `apply_map_patch`, `get_world_map_overview`, `get_region_map`, `preview_map_patch`

### Strategy (10+ tools)
- `create_nation`, `get_strategy_state`, `get_nation_state`, `propose_alliance`, `claim_region`, `resolve_turn`
- Turn management: `init_turn_state`, `get_turn_status`, `submit_turn_actions`, `mark_ready`, `poll_turn_results`

### Events (2 tools)
- `subscribe_to_events`, `unsubscribe_from_events`

---

## Future Enhancements

1. **Real-time Events** - Use PubSub for live updates instead of polling
2. **World State Tracking** - Store active world ID for proper world sync
3. **Spatial Combat** - Add grid positions to encounter participants
4. **Batch Operations** - Leverage batch tools for performance
5. **Session Management** - Use `sessionId` for multi-user support

---

## Repository References

- **Frontend:** `C:\Users\mnehm\Desktop\Quest Keeper AI attempt 2`
- **Backend:** `C:\Users\mnehm\AppData\Roaming\Roo-Code\MCP\rpg-mcp`
- **Binary:** `src-tauri/binaries/rpg-mcp-server-x86_64-pc-windows-msvc.exe`

---

## Contact

For issues with the integration, check:
1. Browser DevTools console for frontend errors
2. Tauri dev console for sidecar output
3. rpg-mcp stderr for server errors
