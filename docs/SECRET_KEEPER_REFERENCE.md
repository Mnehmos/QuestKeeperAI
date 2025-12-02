# Secret Keeper System - Quick Reference Card

## 🎭 What It Does

Prevents AI from accidentally revealing secrets while enabling dramatic, player-controlled reveals through clickable spoilers.

---

## 🔧 9 Tools Available

### Core Management

| Tool | Purpose | When to Use |
|------|---------|-------------|
| **create_secret** | Define a new secret | When setting up hidden information |
| **get_secret** | View single secret | DM wants to review specific secret |
| **list_secrets** | View all secrets | DM wants overview of hidden info |
| **update_secret** | Modify secret | Change description, sensitivity, conditions |
| **delete_secret** | Remove secret | Secret no longer relevant |
| **reveal_secret** | Mark as revealed | Condition met, time to reveal |

### Context & Safety

| Tool | Purpose | When to Use |
|------|---------|-------------|
| **check_reveal_conditions** | Test if event triggers reveal | After dice rolls, quest completion, etc. |
| **get_secrets_for_context** | Inject into LLM prompt | Before each AI DM response |
| **check_for_leaks** | Scan for accidental reveals | Before sending narration to player |

---

## 💡 Common Patterns

### Pattern 1: Creating an NPC Secret
```
Secret: Shopkeeper is a retired thief
Type: npc
Category: motivation
Leak Patterns: ["thief", "steal", "retired criminal"]
Reveal: Perception DC 18 or dialogue trigger "your past"
```

### Pattern 2: Location Hazard
```
Secret: Trap on north wall
Type: location
Category: trap
Leak Patterns: ["pressure plate", "north wall trap"]
Reveal: Perception DC 15
```

### Pattern 3: Plot Twist
```
Secret: Quest giver is the villain
Type: plot
Category: twist
Leak Patterns: ["quest giver villain", "betrayal"]
Reveal: Quest "Investigate Evidence" complete
```

### Pattern 4: Item Property
```
Secret: Ring grants invisibility
Type: item
Category: power
Leak Patterns: ["invisibility", "disappear", "unseen"]
Reveal: Item interaction or Arcana DC 20
```

---

## 🎯 Typical Workflow

### Setup Phase
1. DM creates secrets for session
2. Secrets stored in database
3. AI receives context: "DO NOT REVEAL these secrets"

### Play Phase
1. **Before each AI response:**
   - Call `get_secrets_for_context`
   - Inject into system prompt

2. **After player actions:**
   - Call `check_reveal_conditions`
   - If match, call `reveal_secret`

3. **Before narration sent:**
   - Call `check_for_leaks`
   - If leaks detected, rephrase

### Reveal Phase
1. Condition met (skill check, quest, etc.)
2. Call `reveal_secret`
3. AI includes spoiler markdown in response
4. Player clicks to reveal dramatic truth

---

## 📝 Spoiler Markdown Format

**Input to AI:**
```
:::spoiler[🔮 Secret Name - Click to Reveal]
The hidden truth is revealed here...
:::
```

**Renders as:**
```
[🔮 Secret Name - Click to Reveal] ← Clickable
```

When clicked, shows secret content.

---

## 🎲 Reveal Condition Types

| Type | Example | Use Case |
|------|---------|----------|
| **skill_check** | Insight DC 15 | Detect lies, find clues |
| **quest_complete** | "Rescue Princess" done | Story progression |
| **item_interact** | Touch cursed sword | Item discovery |
| **dialogue** | Say "your past" | NPC interrogation |
| **location_enter** | Enter secret room | Exploration |
| **combat_end** | Defeat boss | Victory reveal |
| **time_passed** | 48 hours elapsed | Time-sensitive info |
| **manual** | DM decides | Freeform reveals |

---

## 🛡️ Sensitivity Levels

| Level | Meaning | Example |
|-------|---------|---------|
| **low** | Minor spoiler | Inn has a secret cellar |
| **medium** | Moderate impact | NPC has hidden agenda |
| **high** | Major twist | Quest giver is villain |
| **critical** | Campaign-defining | BBEG is actually the hero's father |

Higher sensitivity = stricter leak checking

---

## ⚠️ Leak Patterns

**Purpose:** Keywords AI should NEVER say

**Examples:**
- Vampire secret: `["vampire", "undead", "fangs", "blood"]`
- Trap secret: `["pressure plate", "trigger", "dart trap"]`
- Identity secret: `["real name", "disguised", "actually"]`

**How it works:**
- AI checks responses against patterns
- If match found, rephrases automatically
- DM gets warning if leak detected

---

## 🚀 Quick Start Commands

### In Quest Keeper AI Chat:

**List all tools:**
```
/secrets
```

**Create test secret:**
```
Create a secret that the innkeeper is secretly a dragon in disguise
```

**Check if text leaks secrets:**
```
Check if this reveals any secrets: "The innkeeper's scales glimmer in the firelight"
```

**Reveal a secret:**
```
Reveal the innkeeper secret because the player rolled Insight 25
```

---

## 📊 Status Commands

**See all secrets (DM view):**
```
List all secrets in this world
```

**See active secrets only:**
```
List unrevealed secrets
```

**Get context for AI:**
```
Get secrets formatted for LLM context
```

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| Secret not triggering | Check reveal conditions match event type |
| Leak not detected | Add more leak pattern keywords |
| Spoiler not rendering | Verify format: `:::spoiler[...]...\n:::` |
| Secret revealed twice | Check `revealed` status before revealing |
| Context too long | Use sensitivity filter, only inject relevant secrets |

---

## 📚 Full Documentation

- **Deployment:** `SECRET_KEEPER_DEPLOYMENT.md`
- **Full Test:** `SECRET_KEEPER_TEST_PROTOCOL.md`
- **Quick Test:** `TEST_PROMPT_READY.txt` or `SMOKE_TEST.txt`

---

## 🎯 Best Practices

1. **Create secrets early** - Before session starts
2. **Use specific leak patterns** - More is better
3. **Test reveals** - Verify conditions trigger correctly
4. **Partial reveals for suspense** - Build tension with hints
5. **Update as story evolves** - Secrets can change mid-campaign
6. **Delete resolved secrets** - Keep database clean

---

## 💬 Example Session Flow

```
DM: "Create secret: Merchant is royal spy, reveal on Insight DC 18"
   → Secret created with ID abc-123

Player: "I want to read the merchant's expression" (rolls Insight: 20)

DM: Check reveal conditions for Insight roll 20
   → Secret abc-123 matches! Can reveal now

DM: Reveal secret abc-123 triggered by "Insight check DC 20"
   → Returns spoiler markdown

AI: "You sense something off about the merchant..."
   :::spoiler[🔮 Merchant's True Identity - Click to Reveal]
   The merchant is actually a royal spy monitoring trade routes!
   :::

Player: *clicks spoiler*
   → Dramatic reveal! 🎭
```

---

**Ready to test? Open Quest Keeper AI and try the smoke test!**
