/**
 * Player Guide - How to Play Quest Keeper AI
 * 
 * Shown as the first message for new players (first 100 chat sessions).
 */

export const PLAYER_GUIDE = `# 🎮 Welcome to Quest Keeper AI!

You're about to embark on an epic adventure with your personal AI **Dungeon Master**.

---

## 🎭 How It Works

| You (Player) | The DM (AI) |
|-------------|-------------|
| Describe what your character does | Narrates the world and story |
| Make decisions | Controls all NPCs and enemies |
| Ask questions | Handles dice rolls and rules |
| Have fun! | Creates challenges and rewards |

---

## ⌨️ Quick Controls

| Action | How |
|--------|-----|
| Send message | **Enter** |
| New line | **Shift + Enter** |
| New chat | Click **+** in sidebar |
| View character | **Character** tab |
| Explore map | Click **3D Viewport** |

---

## 💬 What to Say

**Good examples:**
- "I search the room for hidden doors"
- "I ask the bartender about the rumors"
- "I attack the goblin with my sword"
- "I try to sneak past the guards"

**The DM handles everything else:**
- Rolling dice
- Calculating damage
- Tracking inventory
- Managing combat turns

---

## ⚔️ During Combat

1. **Wait** for the DM to say it's your turn
2. **Describe** your action: "I swing at the orc!"
3. **The DM** rolls dice and narrates the result
4. **Repeat** until combat ends

> 💡 The DM controls all enemies automatically—you just focus on YOUR character!

---

## 🎯 Pro Tips

- **Stay in character** for more immersive roleplay
- **Ask questions** about anything you don't understand
- **Try creative solutions**—the DM rewards clever thinking
- **Take notes** on NPC names and important info
- **Experiment** with skills, spells, and items

---

## 🚀 Ready?

Just type something like:

> "I introduce myself to the group and ask where we're headed."

*Your adventure begins now. What do you do?*
`;

/**
 * Get the storage key for tracking session count
 */
const SESSION_COUNT_KEY = 'quest-keeper-session-count';
const MAX_TUTORIAL_SESSIONS = 100;

/**
 * Check if the player guide should be shown
 */
export function shouldShowPlayerGuide(): boolean {
  const countStr = localStorage.getItem(SESSION_COUNT_KEY);
  const count = countStr ? parseInt(countStr, 10) : 0;
  return count < MAX_TUTORIAL_SESSIONS;
}

/**
 * Increment the session count (call when starting a new chat)
 */
export function incrementSessionCount(): number {
  const countStr = localStorage.getItem(SESSION_COUNT_KEY);
  const count = (countStr ? parseInt(countStr, 10) : 0) + 1;
  localStorage.setItem(SESSION_COUNT_KEY, count.toString());
  return count;
}

/**
 * Get the current session count
 */
export function getSessionCount(): number {
  const countStr = localStorage.getItem(SESSION_COUNT_KEY);
  return countStr ? parseInt(countStr, 10) : 0;
}

/**
 * Reset the session counter (for testing)
 */
export function resetSessionCount(): void {
  localStorage.removeItem(SESSION_COUNT_KEY);
}
