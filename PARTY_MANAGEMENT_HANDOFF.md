# Party Management System - Handoff Prompt

## Context
You are continuing work on Quest Keeper AI, a Tauri desktop RPG companion app. The previous session implemented a **Party Management System** in the rpg-mcp backend. The backend is 100% complete and the new binary has been deployed.

## What Was Completed (Backend)

### New MCP Tools (13 tools)
All registered in `src/server/index.ts`:

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

### Database Schema
```sql
CREATE TABLE parties (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  world_id TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'dormant', 'archived')),
  current_location TEXT,
  current_quest_id TEXT,
  formation TEXT DEFAULT 'standard',
  created_at, updated_at, last_played_at
);

CREATE TABLE party_members (
  id TEXT PRIMARY KEY,
  party_id TEXT NOT NULL REFERENCES parties(id),
  character_id TEXT NOT NULL REFERENCES characters(id),
  role TEXT DEFAULT 'member' CHECK (role IN ('leader', 'member', 'companion', 'hireling', 'prisoner', 'mount')),
  is_active INTEGER DEFAULT 0,
  position INTEGER,
  share_percentage INTEGER DEFAULT 100,
  joined_at TEXT,
  notes TEXT,
  UNIQUE(party_id, character_id)
);

-- Also added to characters table:
-- character_type TEXT DEFAULT 'pc' CHECK IN ('pc', 'npc', 'enemy', 'neutral')
```

### Files Changed/Added
```
src/server/party-tools.ts     # New - All 13 tools + handlers
src/schema/party.ts           # New - Zod schemas for Party, PartyMember, PartyContext
src/storage/repos/party.repo.ts # New - Repository with all CRUD + complex queries
src/storage/migrations.ts     # Updated - Added parties, party_members tables
src/server/index.ts           # Updated - Registered all party tools
```

### Binary Deployed
- Built: `rpg-mcp\bin\rpg-mcp-win.exe`
- Copied to: `QuestKeeperAI-v2\src-tauri\binaries\rpg-mcp-server-x86_64-pc-windows-msvc.exe`
- Native module: `better_sqlite3.node` also copied

---

## What Needs To Be Done (Frontend)

### 1. Create partyStore.ts
Location: `src/stores/partyStore.ts`

```typescript
interface PartyState {
  // State
  activePartyId: string | null;
  parties: Party[];
  partyDetails: Record<string, PartyWithMembers>; // Cached full party data
  
  // Loading
  isLoading: boolean;
  isSyncing: boolean;
  
  // Actions
  setActiveParty: (partyId: string | null) => void;
  createParty: (name: string, description?: string, worldId?: string, members?: { characterId: string; role?: string }[]) => Promise<string>;
  updateParty: (partyId: string, updates: Partial<Party>) => Promise<void>;
  deleteParty: (partyId: string) => Promise<void>;
  
  // Membership
  addMember: (partyId: string, characterId: string, role?: string) => Promise<void>;
  removeMember: (partyId: string, characterId: string) => Promise<void>;
  setLeader: (partyId: string, characterId: string) => Promise<void>;
  setActiveCharacter: (partyId: string, characterId: string) => Promise<void>;
  
  // Sync
  syncParties: () => Promise<void>;
  syncPartyDetails: (partyId: string) => Promise<void>;
  
  // Selectors
  getActiveParty: () => PartyWithMembers | null;
  getLeader: () => PartyMemberWithCharacter | null;
  getActiveCharacter: () => PartyMemberWithCharacter | null;
}
```

### 2. Update gameStateStore.ts
- Remove `activeCharacter` and `party` state (now in partyStore)
- Update `syncState()` to work with party context
- Keep `characters` as raw character lookup

### 3. Create UI Components

**PartySelector.tsx** (header dropdown)
```tsx
// Shows: active party name, dropdown to switch
// Actions: switch party, create new party
```

**PartyPanel.tsx** (sidebar or new tab)
```tsx
// Shows: 
// - Leader with crown icon
// - Active character highlighted  
// - Member list with HP bars
// - Formation selector
// - Add/remove member buttons
```

**PartyCreatorModal.tsx**
```tsx
// Fields: name, description, world selector
// Character picker for initial members
// Role assignment
```

**CharacterPickerModal.tsx**
```tsx
// Shows unassigned characters
// Filter by character_type (pc/npc/enemy)
// Select role when adding
```

### 4. Update AdventureView.tsx
- Replace character selector with party selector
- Use `get_party_context` for LLM context instead of dumping all characters
- Show party status in QuickStats panel

### 5. Update LLM System Prompt
When building chat context, include focused party context:
```typescript
const context = await mcpManager.gameStateClient.callTool('get_party_context', {
  partyId: activePartyId,
  verbosity: 'standard'
});
// Include in system prompt
```

---

## Key Design Decisions

### Party as First-Class Entity
Instead of a flat character list, characters belong to parties:
```
WORLD
├── Party: "Fellowship" (ACTIVE)
│   ├── Leader: Gandalf
│   ├── Active POV: Frodo ◆
│   └── Members: 9 total
└── Unassigned Characters
    ├── Balrog (enemy)
    └── Test characters
```

### Member Roles
| Role | In Combat? | Shares Loot? |
|------|------------|--------------|
| leader | Yes | Yes |
| member | Yes | Yes |
| companion | Yes | No |
| hireling | Optional | No |
| prisoner | No | No |
| mount | N/A | No |

### Character Types
Added to characters table to filter "Who's in our party?":
- `pc` - Player characters
- `npc` - Non-player characters
- `enemy` - Hostile creatures
- `neutral` - Non-hostile, non-ally

---

## Testing the Backend

You can test party tools directly:

```typescript
// Create a party
await callTool('create_party', {
  name: 'The Fellowship',
  description: 'Nine companions',
  initialMembers: [
    { characterId: 'gandalf-id', role: 'leader' },
    { characterId: 'frodo-id', role: 'member' }
  ]
});

// Get party with members
await callTool('get_party', { partyId: '...' });

// Set active character
await callTool('set_active_character', {
  partyId: '...',
  characterId: 'frodo-id'
});

// Get LLM context
await callTool('get_party_context', {
  partyId: '...',
  verbosity: 'standard'
});
```

---

## File Locations

**Backend (DONE):**
- `C:\Users\Vario\OneDrive\Desktop\MCP Servers\rpg-mcp\src\server\party-tools.ts`
- `C:\Users\Vario\OneDrive\Desktop\MCP Servers\rpg-mcp\src\schema\party.ts`
- `C:\Users\Vario\OneDrive\Desktop\MCP Servers\rpg-mcp\src\storage\repos\party.repo.ts`

**Frontend (TODO):**
- `C:\Users\Vario\OneDrive\Desktop\QuestKeeperAI-v2\src\stores\partyStore.ts` (create)
- `C:\Users\Vario\OneDrive\Desktop\QuestKeeperAI-v2\src\components\party\` (create folder)
- `C:\Users\Vario\OneDrive\Desktop\QuestKeeperAI-v2\src\components\adventure\AdventureView.tsx` (update)

**Binary:**
- `C:\Users\Vario\OneDrive\Desktop\QuestKeeperAI-v2\src-tauri\binaries\rpg-mcp-server-x86_64-pc-windows-msvc.exe`

---

## Success Criteria

- [ ] Can create a party from UI
- [ ] Can add/remove characters from party
- [ ] Can set leader and active character
- [ ] "Who's in our party?" returns ONLY party members (not all 15 characters)
- [ ] LLM receives focused party context (~400 tokens instead of ~3000)
- [ ] Can switch between multiple parties
- [ ] Unassigned characters clearly separated from party members

---

## Open Questions for Next Session

1. Should `partyStore` be a separate store or merged into `gameStateStore`?
2. Where should PartyPanel live - new viewport tab or sidebar?
3. Should we auto-create a "Default Party" on first launch?
4. How to handle the existing test data (15 characters, no parties)?

---

## Quick Start for Next Session

```
1. Read this handoff document
2. Test party tools work: list_parties, get_unassigned_characters
3. Create partyStore.ts with basic state
4. Build PartySelector component for header
5. Update AdventureView to use party context
```
