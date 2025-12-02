# Quest Keeper AI - Quick Task Map

## Recently Completed

### Secret Keeper Frontend Integration ✅
- ✅ System prompt in `settingsStore.ts` with Secret Keeper instructions
- ✅ `/secrets` command shows world secrets
- ✅ Secrets injected into LLM context with "DO NOT REVEAL" instructions
- ✅ Spoiler component exists (`src/components/chat/Spoiler.tsx`)

---

## Immediate (This Session)

### 🔴 P0: Fix Build (Worker 1)

| File | Line | Current | Change To |
|------|------|---------|-----------|
| `chatStore.ts` | 5 | `'text' \| 'error' \| 'info'` | `'text' \| 'error' \| 'info' \| 'success'` |
| `ChatInput.tsx` | 161 | `combatState.combatants` | `combatState.entities` |
| `ChatInput.tsx` | 225 | `combatState.combatants` | `combatState.entities` |
| `ChatInput.tsx` | 232 | `clearMessages()` | `clearHistory()` |
| `ChatInput.tsx` | 450 | `combatState.combatants` | `combatState.entities` |
| `LLMService.ts` | 87 | `return this.toolCache;` | `return this.toolCache \|\| [];` |
| `LLMService.ts` | 226 | `toolCall.name` | `toolCall.name!` or add null check |
| `mcpClient.ts` | 43 | `NodeJS.Timeout` | `ReturnType<typeof setTimeout>` |
| `mcpUtils.ts` | 157 | `(item, index)` | `(item, _index)` |
| `mcpUtils.ts` | 192 | `NodeJS.Timeout` | `ReturnType<typeof setTimeout>` |
| `toolResponseFormatter.ts` | 187 | `(item, index)` | `(item, _index)` |

**Also run:** `npm install --save-dev @types/node`

---

### 🟡 P1: World Environment (Worker 2)

**Step 1: LLM Context Injection**
- File: `ChatInput.tsx`
- Location: After line ~605 (after character context)
- Add environment context block

**Step 2: Create Form Component**
- Create: `WorldEnvironmentForm.tsx`
- Fields: date, timeOfDay, season, weather, temperature, lighting
- Quick buttons: Dawn, Noon, Dusk, Night, Storm

**Step 3: Integrate Form**
- File: `WorldStateView.tsx`
- Add collapsible "Set Environment" section

---

### 🟡 P1: Selection Sync (Worker 3)

**Step 1: Add Sync Lock**
- File: `gameStateStore.ts`
- Prevent selection change during `isSyncing`

**Step 2: Status Indicator**
- Create simple component showing:
  - Active Character: name (id)
  - Active World: name (id)
  - Sync: idle/syncing

**Step 3: Unified Sync Button**
- Single button in CharacterHeader or sidebar
- Calls both `syncState()` and `syncCombatState()`

---

### 🟢 P2: Character Sheet (Worker 4)

**Add to CharacterSheetView.tsx:**

1. AC = 10 + DEX mod + armor bonus
2. Proficiency = floor((level + 7) / 4)
3. Conditions section (array display)
4. 6 saving throws with modifiers
5. Currencies (gold/silver/copper)

---

## File Quick Find

```
STORES:
  gameStateStore.ts  → Characters, inventory, world, quests
  combatStore.ts     → Entities, encounters, terrain
  chatStore.ts       → Messages, sessions
  uiStore.ts         → Active tab
  settingsStore.ts   → API keys, model

COMPONENTS:
  ChatInput.tsx          → User input, LLM calls
  CharacterSheetView.tsx → Character display
  WorldStateView.tsx     → World/environment
  InventoryView.tsx      → Items
  BattlemapCanvas.tsx    → 3D combat

SERVICES:
  mcpClient.ts    → MCP connection
  LLMService.ts   → LLM orchestration
```

---

## Commands

```bash
# Check types
npm run build

# Run dev
npm run tauri dev

# Chat commands
/test    # List MCP tools
/sync    # Force sync
/debug   # Show IDs
/status  # Game state summary
```

---

---

## 🔒 Secret Keeper (Next Priority)

### Backend MCP Tools Needed
| Tool | Status | Purpose |
|------|--------|---------|
| `get_secrets` | ✅ Exists | Fetch secrets for a world |
| `create_secret` | ❓ Check | Create new secret with reveal conditions |
| `reveal_secret` | ❌ TODO | Mark secret as revealed, return spoiler markdown |
| `check_reveal_conditions` | ❌ TODO | Check if any secrets should reveal based on event |

### Frontend Components
| Component | Status | Location |
|-----------|--------|----------|
| System Prompt | ✅ Done | `settingsStore.ts` |
| `/secrets` command | ✅ Done | `ChatInput.tsx` |
| Context Injection | ✅ Done | `ChatInput.tsx` (line ~846) |
| Spoiler Component | ✅ Exists | `src/components/chat/Spoiler.tsx` |
| Leak Filter | ❌ TODO | Post-process LLM responses |
| Secret Panel UI | ❌ TODO | DM mode to view/manage secrets |

### System Prompt Features
- ✅ Reveal condition types documented
- ✅ Spoiler markdown format (:::spoiler[title]...:::)
- ✅ "DO NOT REVEAL" instructions
- ✅ Example of correct secret handling

---

## Done Criteria

- [ ] `npm run build` = 0 errors
- [ ] `/test` shows 80+ tools
- [ ] Set world env → displays correctly
- [ ] Select character → all views update
- [ ] Character sheet shows AC, proficiency
- [ ] `/secrets` shows world secrets
- [ ] LLM respects secret hiding in responses

