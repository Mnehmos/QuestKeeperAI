# RPG-MCP Backend Audit Report

**Date:** December 2024  
**Status:** ✅ COMPLETE - Both Party Management and Secret Keeper systems fully implemented

---

## System Audit Summary

| System | Tools | Schema | Repository | Migration | Index Registration |
|--------|-------|--------|------------|-----------|-------------------|
| **Party Management** | 13 | ✅ | ✅ | ✅ | ✅ |
| **Secret Keeper** | 9 | ✅ | ✅ | ✅ | ✅ |

**Total MCP Tools Registered:** 83

---

## Party Management System ✅

### Tools (13)
| Tool | Purpose |
|------|---------|
| `create_party` | Create new party with optional initial members |
| `get_party` | Get party with embedded member character data |
| `list_parties` | List all parties, filter by status/world |
| `update_party` | Update party name, location, formation, status |
| `delete_party` | Delete party (members become unassigned) |
| `add_party_member` | Add character to party with role |
| `remove_party_member` | Remove character from party |
| `update_party_member` | Change role, position, notes |
| `set_party_leader` | Set party leader (demotes existing) |
| `set_active_character` | Set player's POV character |
| `get_party_members` | Get all members with details |
| `get_party_context` | LLM-optimized context (minimal/standard/detailed) |
| `get_unassigned_characters` | Characters not in any party |

### Files
- `src/server/party-tools.ts` - Tool definitions and handlers
- `src/schema/party.ts` - Zod schemas (Party, PartyMember, PartyContext, etc.)
- `src/storage/repos/party.repo.ts` - Repository with CRUD + complex queries
- `src/storage/migrations.ts` - Tables: `parties`, `party_members`

### Database Tables
```sql
parties (id, name, description, world_id, status, current_location, 
         current_quest_id, formation, created_at, updated_at, last_played_at)

party_members (id, party_id, character_id, role, is_active, position, 
               share_percentage, joined_at, notes)

-- Added to characters table:
character_type TEXT DEFAULT 'pc' CHECK IN ('pc', 'npc', 'enemy', 'neutral')
```

### Indexes
- `idx_party_members_party`
- `idx_party_members_character`
- `idx_parties_status`
- `idx_parties_world`
- `idx_characters_type`

---

## Secret Keeper System ✅

### Tools (9)
| Tool | Purpose |
|------|---------|
| `create_secret` | Create a hidden secret the AI DM knows |
| `get_secret` | Get a single secret by ID (DM view) |
| `list_secrets` | List all secrets for a world (DM view) |
| `update_secret` | Update secret properties |
| `delete_secret` | Delete a secret |
| `reveal_secret` | Reveal secret with dramatic narration + spoiler markdown |
| `check_reveal_conditions` | Check if game event triggers any reveals |
| `get_secrets_for_context` | Get formatted secrets for LLM system prompt |
| `check_for_leaks` | Check text for potential secret leaks |

### Files
- `src/server/secret-tools.ts` - Tool definitions and handlers
- `src/schema/secret.ts` - Zod schemas (Secret, RevealCondition, GameEvent, RevealResult)
- `src/storage/repos/secret.repo.ts` - Repository with reveal logic, leak detection
- `src/storage/migrations.ts` - Table: `secrets`

### Database Table
```sql
secrets (id, world_id, type, category, name, public_description, 
         secret_description, linked_entity_id, linked_entity_type,
         revealed, revealed_at, revealed_by, reveal_conditions,
         sensitivity, leak_patterns, notes, created_at, updated_at)
```

### Indexes
- `idx_secrets_world`
- `idx_secrets_revealed`
- `idx_secrets_linked`

### Secret Types
- `npc` - NPC secrets (motivations, true identity)
- `location` - Location secrets (traps, hidden areas)
- `item` - Item secrets (curses, powers)
- `quest` - Quest secrets (twists, hidden objectives)
- `plot` - Plot secrets (major story twists)
- `mechanic` - Game mechanic secrets (weaknesses)
- `custom` - User-defined

### Reveal Conditions
- `skill_check` - DC check on specific skill
- `quest_complete` - Complete specific quest
- `item_interact` - Interact with specific item
- `dialogue` - Say trigger keyword
- `location_enter` - Enter specific location
- `combat_end` - Combat ends
- `time_passed` - In-game hours pass
- `manual` - DM explicitly reveals

### Key Features
1. **Leak Detection** - `checkForLeaks()` scans text against `leakPatterns`
2. **LLM Context Injection** - `formatForLLM()` generates DO NOT REVEAL instructions
3. **Spoiler Markdown** - Reveals use `:::spoiler[Title]...:::` format
4. **Partial Reveals** - Can hint without full reveal
5. **Event-Driven Reveals** - Auto-check conditions on game events

---

## Binary Status

**Built:** `rpg-mcp\bin\rpg-mcp-win.exe`  
**Deployed:** `QuestKeeperAI-v2\src-tauri\binaries\rpg-mcp-server-x86_64-pc-windows-msvc.exe`  
**Native Module:** `better_sqlite3.node`

---

## Frontend Integration Needed

### Party System
- [ ] Create `partyStore.ts`
- [ ] PartySelector component (header)
- [ ] PartyPanel component (sidebar/tab)
- [ ] Update AdventureView to use party context
- [ ] Integrate `get_party_context` into LLM system prompt

### Secret System
- [ ] Create `secretStore.ts` (optional, or include in DM tooling)
- [ ] Secret management UI (DM mode only)
- [ ] Spoiler markdown renderer in chat
- [ ] Integrate `get_secrets_for_context` into LLM system prompt
- [ ] Add leak check before sending LLM responses (optional guardrail)

---

## Test Commands

### Party Tools
```typescript
// Create a party
await callTool('create_party', {
  name: 'The Fellowship',
  initialMembers: [
    { characterId: 'gandalf-id', role: 'leader' },
    { characterId: 'frodo-id', role: 'member' }
  ]
});

// Get party context for LLM
await callTool('get_party_context', { partyId: '...', verbosity: 'standard' });
```

### Secret Tools
```typescript
// Create a secret
await callTool('create_secret', {
  worldId: '...',
  type: 'npc',
  category: 'identity',
  name: 'Innkeeper Secret',
  publicDescription: 'A friendly innkeeper',
  secretDescription: 'Actually a vampire hunting travelers',
  sensitivity: 'high',
  leakPatterns: ['vampire', 'undead', 'blood'],
  revealConditions: [{ type: 'skill_check', skill: 'Insight', dc: 18 }]
});

// Get secrets for LLM context
await callTool('get_secrets_for_context', { worldId: '...' });

// Check for accidental leaks
await callTool('check_for_leaks', { worldId: '...', text: 'The innkeeper...' });

// Reveal with spoiler
await callTool('reveal_secret', { secretId: '...', triggeredBy: 'DC 18 Insight check' });
```

---

## Audit Complete ✅

Both systems are:
- ✅ Fully implemented in backend
- ✅ Tools registered in server
- ✅ Schemas defined with Zod validation
- ✅ Repositories with all CRUD + specialized methods
- ✅ Database migrations with proper tables and indexes
- ✅ Binary built and deployed

**Next Step:** Frontend integration for both systems.
