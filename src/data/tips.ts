/**
 * Tips & Tricks for Quest Keeper AI
 * 
 * Displayed as placeholder text before the first message in a chat session.
 * 100 tips covering gameplay, features, and RPG knowledge.
 */

export const TIPS = [
  // === BASIC CONTROLS (1-10) ===
  "💡 Type naturally! Describe what your character does, and the DM will handle the rest.",
  "💡 Press Enter to send a message, Shift+Enter for a new line.",
  "💡 Click the 3D viewport to explore the battlefield during combat.",
  "💡 Your character sheet updates automatically when you gain items or take damage.",
  "💡 Use the sidebar tabs to switch between Chat, Inventory, and Character views.",
  "💡 The DM will ask you what you want to do on your turn—describe your action!",
  "💡 Combat happens in turns. Wait for the DM to announce it's your turn.",
  "💡 Click on tokens in the 3D view to select them and see their stats.",
  "💡 Drag to rotate the camera, scroll to zoom in the 3D viewport.",
  "💡 Check the Settings gear icon to customize your experience.",

  // === ROLEPLAY TIPS (11-25) ===
  "🎭 Stay in character! Speak as your character when talking to NPCs.",
  "🎭 Describe HOW you do things, not just what. \"I carefully pick the lock\" is better than \"I unlock it.\"",
  "🎭 Ask NPCs questions—they know things about the world!",
  "🎭 Your backstory matters. Mention it and the DM may weave it into the story.",
  "🎭 You can try anything! The DM will tell you if it's impossible.",
  "🎭 Remember NPC names—you might meet them again.",
  "🎭 Actions have consequences. Think before you offend the king.",
  "🎭 Describe your character's emotions and reactions to make scenes more vivid.",
  "🎭 Use phrases like 'I want to...' or 'My character says...' to be clear.",
  "🎭 You can ask the DM to describe a scene in more detail.",
  "🎭 Negotiate with enemies! Not every encounter needs to end in combat.",
  "🎭 Interact with the environment. Push things, climb, hide, investigate.",
  "🎭 Take notes on important information—the DM won't repeat everything.",
  "🎭 Your character's flaws make the story interesting. Embrace them!",
  "🎭 Ask 'What does my character know about this?' to get relevant lore.",

  // === COMBAT TIPS (26-45) ===
  "⚔️ Call out your target clearly: 'I attack the goblin on the left.'",
  "⚔️ Movement is free! You can move before or after your action.",
  "⚔️ Use cover! Being behind a wall gives you +2 to +5 AC.",
  "⚔️ Describe your attack for dramatic flair: 'I slash at its legs to knock it down!'",
  "⚔️ You can hold your action to react to something specific.",
  "⚔️ Flanking an enemy with an ally gives advantage on attacks.",
  "⚔️ Terrain matters. Difficult terrain costs double movement.",
  "⚔️ You can shove enemies off cliffs or into hazards.",
  "⚔️ Ask about enemy weaknesses—some creatures take extra damage from certain types.",
  "⚔️ Retreat is always an option. Live to fight another day!",
  "⚔️ Use environmental objects as improvised weapons.",
  "⚔️ Help action: Give an ally advantage on their next attack.",
  "⚔️ Ready an action: 'When the spider gets close, I swing.'",
  "⚔️ Grappling can stop enemies from escaping or attacking effectively.",
  "⚔️ Split your movement! Move, attack, then move again.",
  "⚔️ Opportunity attacks trigger when enemies leave your reach.",
  "⚔️ Dodge action: Enemies have disadvantage attacking you.",
  "⚔️ Disengage: Move without triggering opportunity attacks.",
  "⚔️ Dash: Double your movement for this turn.",
  "⚔️ Look for ledges, chandeliers, or barrels—creative tactics are rewarded!",

  // === SKILLS & CHECKS (46-60) ===
  "🎲 Athletics: Climbing, jumping, grappling, swimming.",
  "🎲 Acrobatics: Balance, flips, escaping grapples.",
  "🎲 Perception: Noticing hidden things, listening for sounds.",
  "🎲 Investigation: Searching for clues, deducing information.",
  "🎲 Stealth: Sneaking past enemies or hiding in shadows.",
  "🎲 Persuasion: Convincing NPCs through charm and logic.",
  "🎲 Intimidation: Scaring NPCs into compliance.",
  "🎲 Deception: Lying convincingly to NPCs.",
  "🎲 Insight: Reading body language, detecting lies.",
  "🎲 Sleight of Hand: Pickpocketing, hiding objects, magic tricks.",
  "🎲 Arcana: Knowledge about magic, spells, and magical creatures.",
  "🎲 History: Knowledge about past events, kingdoms, and legends.",
  "🎲 Nature: Knowledge about plants, animals, and the natural world.",
  "🎲 Religion: Knowledge about gods, rituals, and divine magic.",
  "🎲 Medicine: Stabilizing dying creatures, diagnosing ailments.",

  // === MAGIC & SPELLS (61-75) ===
  "✨ Concentration spells end if you cast another concentration spell.",
  "✨ Taking damage requires a Constitution save to maintain concentration.",
  "✨ Verbal components mean you must speak—silence stops most spells!",
  "✨ Somatic components need a free hand. Shield in one, staff in another.",
  "✨ Material components can be replaced by a focus or component pouch.",
  "✨ Cantrips don't use spell slots—cast them as often as you like!",
  "✨ Ritual spells take 10 extra minutes but don't use a slot.",
  "✨ Short Rest: Recover some abilities. Long Rest: Recover all spell slots.",
  "✨ Upcasting: Use a higher slot for more powerful effects.",
  "✨ Some spells scale with character level, not spell slot.",
  "✨ Read your spell descriptions! Many have creative non-combat uses.",
  "✨ Counterspell can stop enemy magic—save it for the big threats!",
  "✨ Dispel Magic removes ongoing magical effects.",
  "✨ Identify reveals magical item properties—or just try wearing it...",
  "✨ Detect Magic shows magical auras—great for finding hidden enchantments.",

  // === ITEMS & INVENTORY (76-85) ===
  "🎒 Healing potions restore 2d4+2 HP. Keep some handy!",
  "🎒 Attunement: Some magic items require bonding. Max 3 attuned items.",
  "🎒 Carrying capacity = Strength × 15 lbs.",
  "🎒 Ammunition is tracked. Count your arrows!",
  "🎒 Rations matter during long journeys. Buy food!",
  "🎒 Torches and lanterns are essential in dark dungeons.",
  "🎒 Rope has dozens of uses: climbing, tying up enemies, making traps.",
  "🎒 A 10-foot pole helps check for traps from a safe distance.",
  "🎒 Ball bearings and caltrops can hinder pursuing enemies.",
  "🎒 Crowbars give advantage on Strength checks to open things.",

  // === WORLD & EXPLORATION (86-95) ===
  "🗺️ Take notes on locations—you might need to return.",
  "🗺️ Ask about local rumors at taverns and inns.",
  "🗺️ Maps often have secret passages or hidden rooms.",
  "🗺️ Weather affects travel—storms slow you down.",
  "🗺️ Random encounters happen during travel. Stay alert!",
  "🗺️ Resting in dangerous areas might attract unwanted visitors.",
  "🗺️ Landmarks help you navigate. 'The old windmill' is easier than 'that one place.'",
  "🗺️ Some doors require keys, passwords, or solving puzzles.",
  "🗺️ Listen at doors before opening them!",
  "🗺️ Mark your path in dungeons. It's easy to get lost.",

  // === META & FUN (96-100) ===
  "🌟 The DM's job is to tell a great story—your job is to be the hero.",
  "🌟 There's no 'winning' D&D. The journey IS the game.",
  "🌟 Failure makes success sweeter. Embrace the chaos!",
  "🌟 The best moments come from unexpected player choices.",
  "🌟 Have fun! That's the only rule that truly matters.",
];

/**
 * Get a random tip for display
 */
export function getRandomTip(): string {
  return TIPS[Math.floor(Math.random() * TIPS.length)];
}

/**
 * Get a specific tip by index (0-99)
 */
export function getTipByIndex(index: number): string {
  return TIPS[index % TIPS.length];
}
