# Secret Keeper System - Live Test Protocol

**Copy this entire prompt into Quest Keeper AI chat to run comprehensive tests**

---

## Test Agent Prompt

```
You are testing the Secret Keeper MCP system. Execute each test phase sequentially and report results.

## PHASE 1: Environment Setup

1. Create a test world:
   - Name: "Secret Keeper Test World"
   - Use seed: "test-secrets-2024"
   - Width: 50, Height: 50

2. Create test character:
   - Name: "Test Hero"
   - Level: 5
   - Stats: STR 14, DEX 16, CON 14, INT 12, WIS 16, CHA 10
   - HP: 40/40, AC: 16

3. Verify setup:
   - List worlds, confirm test world exists
   - List characters, confirm hero exists
   - Note the worldId and characterId for subsequent tests

---

## PHASE 2: Basic Secret Creation

Create 5 different types of secrets:

### Test Secret 1: NPC Identity
```json
{
  "worldId": "[use worldId from Phase 1]",
  "type": "npc",
  "category": "identity",
  "name": "Innkeeper's Dark Secret",
  "publicDescription": "A friendly innkeeper named Marcus who runs the Prancing Pony",
  "secretDescription": "Marcus is actually a 300-year-old vampire who feeds on travelers",
  "sensitivity": "critical",
  "leakPatterns": ["vampire", "undead", "fangs", "blood", "immortal"],
  "revealConditions": [
    {
      "type": "skill_check",
      "skill": "Insight",
      "dc": 18,
      "partialReveal": true,
      "partialText": "Something seems off about Marcus. His skin is unusually pale..."
    },
    {
      "type": "skill_check",
      "skill": "Insight",
      "dc": 25,
      "partialReveal": false
    }
  ]
}
```

### Test Secret 2: Location Trap
```json
{
  "worldId": "[use worldId from Phase 1]",
  "type": "location",
  "category": "trap",
  "name": "Hidden Temple Trap",
  "publicDescription": "An ancient temple entrance with worn stone steps",
  "secretDescription": "The 5th step is a pressure plate that triggers poison darts from the walls",
  "sensitivity": "high",
  "leakPatterns": ["pressure plate", "5th step", "trap", "poison darts"],
  "revealConditions": [
    {
      "type": "skill_check",
      "skill": "Perception",
      "dc": 15
    }
  ]
}
```

### Test Secret 3: Item Curse
```json
{
  "worldId": "[use worldId from Phase 1]",
  "type": "item",
  "category": "curse",
  "name": "Cursed Sword of Greed",
  "publicDescription": "A beautiful longsword with golden engravings",
  "secretDescription": "The sword is cursed - it compels its wielder to hoard gold and betray allies",
  "sensitivity": "high",
  "leakPatterns": ["cursed", "greed", "betray", "compels"],
  "revealConditions": [
    {
      "type": "item_interact",
      "itemId": "sword-of-greed",
      "partialReveal": true,
      "partialText": "As you touch the sword, you feel an overwhelming desire for wealth..."
    }
  ]
}
```

### Test Secret 4: Plot Twist
```json
{
  "worldId": "[use worldId from Phase 1]",
  "type": "plot",
  "category": "twist",
  "name": "The True Villain",
  "publicDescription": "The quest is to stop the evil necromancer terrorizing villages",
  "secretDescription": "The necromancer is being controlled by the king, who wants to create undead armies",
  "sensitivity": "critical",
  "leakPatterns": ["king controls", "king puppet master", "royal conspiracy"],
  "revealConditions": [
    {
      "type": "quest_complete",
      "questId": "defeat-necromancer"
    }
  ]
}
```

### Test Secret 5: Mechanic Weakness
```json
{
  "worldId": "[use worldId from Phase 1]",
  "type": "mechanic",
  "category": "weakness",
  "name": "Dragon's Achilles Heel",
  "publicDescription": "The ancient red dragon Smaethyx is terrorizing the realm",
  "secretDescription": "Smaethyx has a missing scale on his left flank - attacking it deals triple damage",
  "sensitivity": "medium",
  "leakPatterns": ["missing scale", "left flank", "triple damage", "weak spot"],
  "revealConditions": [
    {
      "type": "skill_check",
      "skill": "Investigation",
      "dc": 20
    },
    {
      "type": "dialogue",
      "dialogueTrigger": "old dragon tales",
      "npcId": "sage-eldric"
    }
  ]
}
```

**Expected Results:**
- All 5 secrets created successfully
- Each returns a secret ID
- Confirm no error messages

---

## PHASE 3: Secret Retrieval & Verification

### Test 3.1: List All Secrets
Call `list_secrets` with:
```json
{
  "worldId": "[use worldId from Phase 1]",
  "includeRevealed": false
}
```

**Expected:**
- Returns 5 secrets
- All have `revealed: false`
- Count matches created secrets
- Grouped by type (npc, location, item, plot, mechanic)

### Test 3.2: Get Single Secret
Call `get_secret` for each secret ID obtained in Phase 2.

**Expected:**
- Returns full secret details
- Includes all fields: publicDescription, secretDescription, leakPatterns, revealConditions
- Sensitivity levels match what was set

### Test 3.3: Get Secrets for Context
Call `get_secrets_for_context` with:
```json
{
  "worldId": "[use worldId from Phase 1]"
}
```

**Expected:**
- Returns formatted context with DO NOT REVEAL instructions
- All 5 secrets included
- Leak patterns listed
- Instructions clear about not mentioning specific words

---

## PHASE 4: Leak Detection Testing

### Test 4.1: Clean Text (No Leaks)
Call `check_for_leaks` with:
```json
{
  "worldId": "[use worldId from Phase 1]",
  "text": "Marcus the innkeeper greets you warmly. He offers you a room for the night and some fresh bread."
}
```

**Expected:**
- `clean: true`
- `leaks: []` (empty array)
- Message indicates no leaks detected

### Test 4.2: Text with Obvious Leak
Call `check_for_leaks` with:
```json
{
  "worldId": "[use worldId from Phase 1]",
  "text": "Marcus the innkeeper smiles, revealing his vampire fangs. The undead creature offers you a room."
}
```

**Expected:**
- `clean: false`
- `leaks` array contains multiple warnings
- Patterns matched: "vampire", "fangs", "undead"
- Secret name identified: "Innkeeper's Dark Secret"

### Test 4.3: Subtle Leak
Call `check_for_leaks` with:
```json
{
  "worldId": "[use worldId from Phase 1]",
  "text": "You notice the 5th step seems slightly different from the others. Perhaps a pressure plate?"
}
```

**Expected:**
- `clean: false`
- Matches leak patterns from "Hidden Temple Trap"
- Warnings about "5th step" and "pressure plate"

---

## PHASE 5: Reveal Condition Testing

### Test 5.1: Check Skill Check Event
Call `check_reveal_conditions` with:
```json
{
  "worldId": "[use worldId from Phase 1]",
  "event": {
    "type": "skill_check",
    "skill": "Insight",
    "result": 20,
    "characterId": "[use characterId from Phase 1]"
  }
}
```

**Expected:**
- Returns secrets that can be revealed
- "Innkeeper's Dark Secret" should match (DC 18, partial reveal)
- Lists matched conditions
- Provides instructions to call reveal_secret

### Test 5.2: Check Failed Skill Check
Call `check_reveal_conditions` with:
```json
{
  "worldId": "[use worldId from Phase 1]",
  "event": {
    "type": "skill_check",
    "skill": "Insight",
    "result": 12
  }
}
```

**Expected:**
- No secrets to reveal (result too low)
- Message: "No secrets triggered by this event"

### Test 5.3: Check Quest Complete Event
Call `check_reveal_conditions` with:
```json
{
  "worldId": "[use worldId from Phase 1]",
  "event": {
    "type": "quest_complete",
    "questId": "defeat-necromancer"
  }
}
```

**Expected:**
- "The True Villain" secret can be revealed
- Full reveal (not partial)

---

## PHASE 6: Secret Revealing

### Test 6.1: Partial Reveal
Call `reveal_secret` with:
```json
{
  "secretId": "[Innkeeper's Dark Secret ID]",
  "triggeredBy": "Insight check (rolled 20)",
  "partial": true
}
```

**Expected:**
- Returns hint text (not full secret)
- `spoilerMarkdown` contains subtle hint
- Secret still marked as unrevealed in database
- Narration matches partialText from reveal condition

### Test 6.2: Full Reveal
Call `reveal_secret` with:
```json
{
  "secretId": "[Innkeeper's Dark Secret ID]",
  "triggeredBy": "Insight check (rolled 26)",
  "partial": false
}
```

**Expected:**
- Full secret revealed
- `spoilerMarkdown` formatted as: `:::spoiler[🔮 Innkeeper's Dark Secret - Click to Reveal]\n{full secret}\n:::`
- Secret marked as `revealed: true` in database
- `revealedAt` timestamp set
- `revealedBy` contains trigger text

### Test 6.3: Attempt Double Reveal
Call `reveal_secret` again with same secret ID.

**Expected:**
- Returns message: "Secret was already revealed"
- Shows original revealedAt and revealedBy
- Does not create duplicate reveal

---

## PHASE 7: Secret Modification

### Test 7.1: Update Secret
Call `update_secret` with:
```json
{
  "secretId": "[Hidden Temple Trap ID]",
  "secretDescription": "The 5th step is a pressure plate that triggers FIRE darts (not poison) from the walls",
  "sensitivity": "critical",
  "notes": "Updated after playtest feedback"
}
```

**Expected:**
- Secret updated successfully
- New description saved
- Sensitivity changed to critical
- Notes field populated
- Other fields unchanged

### Test 7.2: Verify Update
Call `get_secret` for the updated secret.

**Expected:**
- Confirms changes applied
- secretDescription shows FIRE darts
- sensitivity is "critical"
- notes field present

---

## PHASE 8: List Secrets with Filters

### Test 8.1: List Only Revealed Secrets
Call `list_secrets` with:
```json
{
  "worldId": "[use worldId from Phase 1]",
  "includeRevealed": true
}
```

**Expected:**
- Returns all secrets (including the one revealed in Phase 6)
- Statistics show: total=5, revealed=1, hidden=4

### Test 8.2: Filter by Type
Call `list_secrets` with:
```json
{
  "worldId": "[use worldId from Phase 1]",
  "type": "npc"
}
```

**Expected:**
- Returns only 1 secret (Innkeeper's Dark Secret)
- Type filter working correctly

### Test 8.3: Filter by Linked Entity
Create a linked secret first, then filter:
```json
{
  "worldId": "[use worldId from Phase 1]",
  "type": "item",
  "category": "lore",
  "name": "Sword History",
  "publicDescription": "An old blade",
  "secretDescription": "This sword was wielded by the hero who slew the previous dragon",
  "linkedEntityId": "sword-of-greed",
  "linkedEntityType": "item",
  "sensitivity": "low"
}
```

Then call `list_secrets` with:
```json
{
  "worldId": "[use worldId from Phase 1]",
  "linkedEntityId": "sword-of-greed"
}
```

**Expected:**
- Returns 2 secrets (Cursed Sword + Sword History)
- Both linked to same item ID

---

## PHASE 9: Secret Deletion

### Test 9.1: Delete Secret
Call `delete_secret` with:
```json
{
  "secretId": "[Sword History ID from Phase 8]"
}
```

**Expected:**
- Success message
- Secret removed from database

### Test 9.2: Verify Deletion
Call `list_secrets` again.

**Expected:**
- Total count reduced by 1
- Deleted secret no longer appears

### Test 9.3: Attempt to Get Deleted Secret
Call `get_secret` with deleted ID.

**Expected:**
- Error: "Secret not found"

---

## PHASE 10: Integration Test (Full Workflow)

### Scenario: The Vampire Reveal Sequence

1. **Setup:** Player enters the inn
   - Get secrets for context (confirms vampire secret active)
   - Check for leaks in narration: "Marcus welcomes you warmly"

2. **Suspicion:** Player rolls Insight
   - Check reveal conditions for Insight DC 20
   - Reveal secret with partial=true
   - Verify hint appears

3. **Discovery:** Player rolls Insight DC 26
   - Check reveal conditions for Insight DC 25
   - Reveal secret with partial=false
   - Verify full spoiler markdown generated

4. **Verification:** Check secret status
   - List secrets, confirm vampire secret revealed
   - Get secret, verify revealedAt and revealedBy populated

5. **Cleanup:** Update context
   - Get secrets for context
   - Verify vampire secret no longer in active secrets list

---

## SUCCESS CRITERIA

### All Phases Must Pass:
- ✅ 5 secrets created without errors
- ✅ All secrets retrievable by ID
- ✅ List secrets returns correct counts and filters
- ✅ Leak detection identifies patterns correctly
- ✅ Reveal conditions match events properly
- ✅ Partial reveals return hints, full reveals return spoiler markdown
- ✅ Spoiler markdown properly formatted
- ✅ Already-revealed secrets cannot be revealed again
- ✅ Secret updates persist correctly
- ✅ Secret deletion removes from database
- ✅ Context injection excludes revealed secrets
- ✅ Full workflow operates without errors

---

## REPORTING FORMAT

After each phase, report:
```
PHASE X: [Phase Name]
Status: [PASS/FAIL]
Tests Run: X/Y
Failures: [list any failures]
Notes: [any observations]
```

Final summary:
```
=== SECRET KEEPER TEST SUMMARY ===
Total Phases: 10
Passed: X/10
Failed: Y/10
Critical Issues: [list]
Recommendations: [list]
Overall Status: [READY FOR PRODUCTION / NEEDS FIXES]
```

Execute this test protocol now and report results for each phase.
```

---

## Test Execution Instructions

1. **Open Quest Keeper AI**
2. **Start a new chat session**
3. **Copy the entire test prompt above** (everything between the triple backticks)
4. **Paste into chat** and press send
5. **Watch the agent execute each phase**
6. **Review the final summary**

The agent will systematically test all 9 Secret Keeper tools across 10 comprehensive phases.

---

## Expected Duration

- **Full Test:** ~5-10 minutes
- **Per Phase:** ~30-60 seconds
- **Total Tool Calls:** ~40-50 MCP operations

---

## What to Watch For

### Good Signs ✅
- Each phase reports PASS
- Secret IDs generated correctly
- Spoiler markdown properly formatted
- Leak detection catches patterns
- Reveal conditions trigger correctly

### Red Flags 🚨
- Error messages in any phase
- Null/undefined secret IDs
- Malformed spoiler markdown
- Leak detection misses obvious patterns
- Secrets revealed without proper conditions

---

## Troubleshooting

If tests fail:

1. **Check MCP Server Logs** in Tauri dev console
2. **Verify Binary** is the newly built version
3. **Check Database** - ensure secrets table exists
4. **Test Individual Tools** via `/test` command
5. **Review Error Messages** for specific failures

---

## Quick Start

```bash
# Terminal 1: Start Quest Keeper AI
cd "C:\Users\mnehm\Desktop\Quest Keeper AI attempt 2"
npm run tauri dev

# Wait for app to load, then paste test prompt into chat
```

---

## Notes

- Test creates a dedicated test world (won't interfere with existing data)
- All test data can be deleted after verification
- Agent will self-document each test phase
- Final report indicates production readiness
