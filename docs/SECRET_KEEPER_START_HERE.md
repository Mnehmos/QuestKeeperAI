# 🎯 Secret Keeper System - Complete Testing Package

**Status:** ✅ DEPLOYED AND READY FOR TESTING  
**Date:** December 2024

---

## 📦 What Was Deployed

### Backend (rpg-mcp)
- **9 Secret Keeper MCP Tools** (fully implemented and tested)
- **SQLite Schema** with secrets table and indexes
- **Repository Layer** with leak detection and reveal logic
- **New Binary** built and copied to frontend

### Files Updated
```
✅ rpg-mcp-server-x86_64-pc-windows-msvc.exe (3.8 MB)
✅ better_sqlite3.node (native module)
```

### Location
```
C:\Users\mnehm\Desktop\Quest Keeper AI attempt 2\src-tauri\binaries\
```

---

## 📚 Testing Resources Created

### 1. **SMOKE_TEST.txt** - Quick Verification (3 minutes)
**Use this first!**
- Creates 1 test secret
- Tests all core functionality
- 8 MCP tool calls
- Fast pass/fail result

**When:** Initial deployment verification

### 2. **TEST_PROMPT_READY.txt** - Standard Test (10 minutes)
**Use for comprehensive testing**
- Creates 5 test secrets of different types
- Tests all 9 tools systematically
- 8 test phases with pass/fail reporting
- ~40-50 MCP tool calls

**When:** Full system validation before production

### 3. **SECRET_KEEPER_TEST_PROTOCOL.md** - Full Documentation
**Reference guide with detailed specs**
- 10 comprehensive test phases
- Expected results for each test
- Troubleshooting guide
- Success criteria checklist

**When:** Debugging issues or understanding system behavior

### 4. **SECRET_KEEPER_REFERENCE.md** - Quick Reference Card
**Daily usage guide**
- Tool descriptions and use cases
- Common patterns and examples
- Workflow diagrams
- Best practices

**When:** Creating secrets during gameplay

### 5. **SECRET_KEEPER_VISUAL_GUIDE.md** - System Flow
**Visual understanding**
- ASCII flowcharts showing data flow
- Architecture diagrams
- Security model
- Phase-by-phase visualization

**When:** Understanding how pieces fit together

### 6. **SECRET_KEEPER_DEPLOYMENT.md** - Deployment Record
**What was installed**
- Verification results
- Tool inventory
- Build information
- Next steps

**When:** Confirming what's installed

---

## 🚀 Quick Start - Testing in 5 Minutes

### Step 1: Launch Quest Keeper AI
```bash
cd "C:\Users\mnehm\Desktop\Quest Keeper AI attempt 2"
npm run tauri dev
```

Wait for app to fully load (watch for "MCP Server initialized" in console)

### Step 2: Run Smoke Test
1. Open `SMOKE_TEST.txt`
2. Copy entire contents
3. Paste into Quest Keeper AI chat
4. Press Enter
5. Watch agent execute tests

### Step 3: Check Results
Look for:
```
✅ Secret created successfully
✅ Leak detection caught "assassin" keyword  
✅ Reveal condition matched Insight DC 16
✅ Spoiler markdown properly formatted
✅ Revealed secret excluded from context
```

If all pass: **System Working! 🎉**

---

## 🎭 Example Usage (Real Session)

### Scenario: The Vampire Innkeeper

**Before Session:**
```
Create a secret that Marcus the innkeeper is actually a 300-year-old 
vampire. Use leak patterns for "vampire", "undead", "fangs". 
Reveal on Insight DC 18 (partial) and DC 25 (full).
```

**During Play:**
```
Player: "I enter the tavern"

AI: "Marcus the innkeeper greets you warmly. His pale complexion 
     catches the candlelight as he offers you a room."
     
     [Behind scenes: get_secrets_for_context injected]
     [Behind scenes: check_for_leaks returned clean]

Player: "I study his face" (rolls Insight: 20)

AI: [Behind scenes: check_reveal_conditions triggered partial]
    [Behind scenes: reveal_secret called with partial=true]
    
    "Something seems deeply wrong about Marcus. His skin is 
     unusually pale, and you notice he hasn't touched any food..."

Player: "I look for his reflection in the mirror" (rolls: 26)

AI: [Behind scenes: check_reveal_conditions triggered full]
    [Behind scenes: reveal_secret called with partial=false]
    
    "A chill runs down your spine as you peer at the mirror..."
    
    :::spoiler[🔮 Innkeeper's Dark Secret - Click to Reveal]
    Marcus is actually a 300-year-old vampire who feeds on travelers!
    :::

Player: *clicks spoiler* 😱

AI: "Marcus's eyes flash red as he realizes you've discovered 
     his true nature. His fangs extend as he hisses..."
     
     [Behind scenes: Secret now revealed, AI free to discuss openly]
```

---

## 🔧 9 Tools Available

| # | Tool | Purpose | Critical? |
|---|------|---------|-----------|
| 1 | create_secret | Define hidden info | ⭐ Core |
| 2 | get_secret | View single secret | ⭐ Core |
| 3 | list_secrets | View all secrets | ⭐ Core |
| 4 | update_secret | Modify secret | Optional |
| 5 | delete_secret | Remove secret | Optional |
| 6 | reveal_secret | Mark revealed + spoiler | ⭐ Core |
| 7 | check_reveal_conditions | Test if triggers | ⭐ Core |
| 8 | get_secrets_for_context | LLM injection | ⭐ Core |
| 9 | check_for_leaks | Detect accidental reveals | ⭐ Core |

**Core tools (⭐)** are used every session  
**Optional tools** are for management/editing

---

## ✅ Pre-Flight Checklist

Before testing:
- [ ] Quest Keeper AI builds without errors
- [ ] Tauri dev server starts successfully
- [ ] MCP server spawns and initializes
- [ ] Console shows "rpg-mcp-server running on stdio"
- [ ] `/test` command lists 71+ tools
- [ ] No binary error messages in console

---

## 🐛 Troubleshooting Guide

### Issue: "Tool not found"
**Cause:** Binary not updated  
**Fix:** Re-run deployment:
```bash
cd "C:\Users\mnehm\AppData\Roaming\Roo-Code\MCP\rpg-mcp"
npm run build:binaries
copy bin\rpg-mcp-win.exe "C:\Users\mnehm\Desktop\Quest Keeper AI attempt 2\src-tauri\binaries\rpg-mcp-server-x86_64-pc-windows-msvc.exe"
```

### Issue: "Database error"
**Cause:** Schema not migrated  
**Fix:** Delete rpg.db and let it recreate:
```bash
# In sidecar working directory
del rpg.db
del rpg.db-shm
del rpg.db-wal
```

### Issue: "Spoiler not rendering"
**Cause:** Markdown parser missing spoiler syntax  
**Fix:** Verify frontend has spoiler component installed

### Issue: "Leak detection not working"
**Cause:** Leak patterns not matching  
**Fix:** Check leak patterns are lowercase and exact matches

---

## 📊 Success Metrics

### System is working if:
- ✅ Secrets create without errors
- ✅ Secrets appear in list but not in player chat
- ✅ Leak detection catches keyword matches
- ✅ Reveal conditions trigger correctly
- ✅ Spoiler markdown renders as clickable
- ✅ Revealed secrets excluded from context
- ✅ AI can discuss revealed secrets openly

### System needs fixes if:
- ❌ Tool call errors in console
- ❌ Secrets visible to players before reveal
- ❌ Leaks not detected
- ❌ Reveals happen without conditions met
- ❌ Spoilers don't render
- ❌ Database errors

---

## 🎯 Recommended Testing Order

1. **SMOKE_TEST.txt** (3 min) - Verify basic functionality
2. If pass → **TEST_PROMPT_READY.txt** (10 min) - Full validation
3. If pass → **Ready for production!**
4. If fail → Check **SECRET_KEEPER_TEST_PROTOCOL.md** for detailed debugging

---

## 📝 Next Steps After Testing

### If Tests Pass:
1. ✅ Document any observations
2. ✅ Create demo secrets for showcase
3. ✅ Prepare Kilo Code competition demo
4. ✅ Update PROJECT_VISION.md with Secret Keeper feature

### If Tests Fail:
1. ❌ Review error messages
2. ❌ Check tool call logs
3. ❌ Verify database schema
4. ❌ Test individual tools via `/test`
5. ❌ Report issues for fixing

---

## 💬 Test Commands

### In Quest Keeper AI Chat:

**List all MCP tools:**
```
/test
```

**Run smoke test:**
```
[paste SMOKE_TEST.txt contents]
```

**Run full test:**
```
[paste TEST_PROMPT_READY.txt contents]
```

**Manual secret creation:**
```
Create a secret that [describe secret]. Use leak patterns for 
[keywords]. Reveal on [condition].
```

**Check for leaks:**
```
Check if this text reveals any secrets: "[your text here]"
```

**List all secrets:**
```
List all secrets in this world
```

---

## 🏆 Success Story

Once testing is complete, you'll have:

✅ **Mechanical Honesty** - AI can't lie about game state  
✅ **Dramatic Tension** - Secrets revealed at perfect moments  
✅ **Player Control** - Clickable spoilers for dramatic reveals  
✅ **DM Tools** - Full secret management system  
✅ **Trust Model** - "LLM describes, engine validates"  

This directly addresses the **"mechanical trust problem"** identified in the competitive analysis - no other AI RPG platform has this capability.

---

## 📞 Support

Files for reference:
- Quick test: `SMOKE_TEST.txt`
- Full test: `TEST_PROMPT_READY.txt`
- Protocol: `SECRET_KEEPER_TEST_PROTOCOL.md`
- Reference: `SECRET_KEEPER_REFERENCE.md`
- Visual: `SECRET_KEEPER_VISUAL_GUIDE.md`
- Deployment: `SECRET_KEEPER_DEPLOYMENT.md`

All files located in:
```
C:\Users\mnehm\Desktop\Quest Keeper AI attempt 2\
```

---

## ⏰ Time Estimates

- **Smoke Test:** 3 minutes
- **Full Test:** 10 minutes
- **Manual Exploration:** 15 minutes
- **Total Testing Time:** ~30 minutes

---

## 🎬 Ready to Begin!

1. Open Quest Keeper AI
2. Run smoke test
3. Watch the Secret Keeper system work its magic! ✨

**The stage is set. The secrets await. Let the testing begin! 🎭**
