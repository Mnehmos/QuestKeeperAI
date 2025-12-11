# GAME MECHANICS REFERENCE

## Combat Flow

When combat begins:

1. Call `create_encounter` OR `setup_tactical_encounter` for preset creatures
2. Initiative is rolled automatically
3. Each turn: `advance_turn` → describe scene → wait for player action → `execute_combat_action` → narrate result

## Action Economy (Per Turn)

- 1 Action (Attack, Cast Spell, Dash, Dodge, Disengage, Help, Hide, Ready, Search, Use Object)
- 1 Bonus Action (if ability grants one)
- 1 Reaction (Opportunity Attack, Shield spell, etc.)
- Movement (speed in feet, tracked by engine)

CRITICAL: The engine enforces this. If player tries 2 actions, the second call will fail. Trust the engine, narrate the failure gracefully.

## Damage & Healing

- Always specify `damageType` in attacks (engine checks resistances/vulnerabilities)
- HP is bounded [0, maxHP] - engine enforces
- At 0 HP: Call `roll_death_save` at start of dying creature's turn

## Spell Casting

- Spell slots tracked by engine via `spellSlots` on character
- Call `execute_combat_action` with `action: "cast_spell"`, `spellName`, `slotLevel`
- Engine validates slot availability and deducts on success
- Concentration is tracked - casting a new concentration spell ends the previous one

## Tool Decision Tree

```
Player wants to...
├─ Attack → execute_combat_action(action: "attack", targetId, weaponId?)
├─ Cast spell → execute_combat_action(action: "cast_spell", spellName, slotLevel, targetId?)
├─ Move → execute_combat_action(action: "move", destination: {x, y})
├─ Disengage → execute_combat_action(action: "disengage")
├─ Dodge → execute_combat_action(action: "dodge")
├─ Check inventory → get_inventory_detailed(characterId)
├─ Use item → use_item(characterId, itemId)
├─ Talk to NPC → get_npc_context(characterId, npcId) + narrative
├─ Attempt creative action → resolve_improvised_stunt(...)
├─ Rest → take_short_rest(characterId) OR take_long_rest(characterId)
├─ Look around → look_at_surroundings(observerId)
├─ Check quest log → get_quest_log(characterId)
└─ Roll skill check → roll_skill_check(characterId, skill, dc?)
```

## Skill Checks

- Call `roll_skill_check` with skill name and optional DC
- Engine applies proficiency, expertise, advantage/disadvantage
- Armor stealth disadvantage is auto-applied

## Rest Mechanics

- Short Rest: Spend hit dice, recover 1/3 spell slots (warlock: all pact slots)
- Long Rest: Full HP, all spell slots, half hit dice recovered

## Token Conservation

Your context window is finite. Use it wisely:

- Don't ask for full world state when you only need one character's HP
- Use `verbosity: "minimal"` for quick lookups
- Use `verbosity: "detailed"` only when building major scenes
- Summarize conversation history rather than keeping verbatim logs
