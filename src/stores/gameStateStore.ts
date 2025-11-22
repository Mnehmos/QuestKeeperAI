import { create } from 'zustand';
import { dnd5eItems } from '../data/dnd5eItems';

export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  type: string;
  weight?: number;
  value?: number;
  equipped?: boolean;
}

export interface EnvironmentState {
  time_of_day?: string | any;
  weather?: string | any;
  temperature?: string | any;
  season?: string | any;
  date?: string | any;
  moon_phase?: string | any;
  lighting?: string | any;
  sunrise?: string | any;
  sunset?: string | any;
  forecast?: string | any;
  wind?: string | any;
  visibility?: string | any;
  atmospheric_pressure?: string | any;
  hazards?: string[];
  [key: string]: any; // Allow additional custom fields
}

export interface WorldState {
  location: string;
  // Legacy flat fields for backward compatibility
  time: string;
  weather: string;
  date: string;
  // Enhanced structured data
  environment?: EnvironmentState;
  npcs?: { [key: string]: any };
  events?: { [key: string]: any };
  lastUpdated?: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  author: 'player' | 'ai';
  timestamp: number;
}

export interface CharacterStats {
  id?: string;
  name: string;
  level: number;
  class: string;
  hp: { current: number; max: number };
  xp: { current: number; max: number };
  stats: {
    str: number;
    dex: number;
    con: number;
    int: number;
    wis: number;
    cha: number;
  };
  equipment: {
    armor: string;
    weapons: string[];
    other: string[];
  };
}

interface GameState {
  inventory: InventoryItem[];
  world: WorldState;
  notes: Note[];
  activeCharacter: CharacterStats | null;
  
  setInventory: (items: InventoryItem[]) => void;
  setWorldState: (state: WorldState) => void;
  setNotes: (notes: Note[]) => void;
  addNote: (note: Note) => void;
  updateNote: (id: string, content: string) => void;
  deleteNote: (id: string) => void;
  setActiveCharacter: (char: CharacterStats | null) => void;
  syncState: () => Promise<void>;
}

// Helper to strip ANSI codes
function stripAnsi(str: string): string {
  return str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
}

// Helper function to parse character sheet text
function parseCharacterSheet(rawText: string): CharacterStats | null {
  try {
    const text = stripAnsi(rawText);
    console.log('[GameStateStore] Parsing character sheet text:', JSON.stringify(text));

    // Extract ID - Flexible matching for "ID: 12" with optional icons
    const idMatch = text.match(/(?:🆔|ID)\s*:?\s*(\d+)/i);
    const id = idMatch ? idMatch[1] : undefined;

    // Extract name - Look for name after icon or "Name:", stop at next icon or newline
    // Matches: 👤 Name ... or Name: Name ...
    const nameMatch = text.match(/(?:👤|Name:?)\s*([^\n🆔🏛️📊]+?)(?=\s*(?:🆔|🏛️|📊|🧬|⚖️|📚|$))/i);
    const name = nameMatch ? nameMatch[1].trim() : 'Unknown';

    // Extract level
    const levelMatch = text.match(/(?:📊|Level:?)\s*(\d+)/i);
    const level = levelMatch ? parseInt(levelMatch[1]) : 1;

    // Extract class - Match multiple words (e.g., "Eldritch Knight")
    const classMatch = text.match(/(?:🏛️|Class:?)\s*([A-Za-z\s]+?)(?=\s*(?:🆔|📊|🧬|⚖️|📚|❤️|💪|$))/i);
    const charClass = classMatch ? classMatch[1].trim() : 'Unknown';

    // Extract HP
    const hpMatch = text.match(/(?:❤️|Hit Points:?|HP:?)\s*(\d+)\s*\/\s*(\d+)/i);
    const hp = hpMatch 
      ? { current: parseInt(hpMatch[1]), max: parseInt(hpMatch[2]) }
      : { current: 0, max: 0 };

    // Extract XP
    const xpMatch = text.match(/(?:⭐|Experience:?|XP:?)\s*(\d+)/i);
    const currentXp = xpMatch ? parseInt(xpMatch[1]) : 0;
    
    // Calculate XP needed for next level (simplified)
    const xpForNextLevel = level * 1000;

    // Extract ability scores - Flexible matching
    const strMatch = text.match(/(?:💪|STR:?)\s*(\d+)/i);
    const dexMatch = text.match(/(?:🏃|DEX:?)\s*(\d+)/i);
    const conMatch = text.match(/(?:❤️|CON:?)\s*(\d+)/i);
    const intMatch = text.match(/(?:🧠|INT:?)\s*(\d+)/i);
    const wisMatch = text.match(/(?:🧙|WIS:?)\s*(\d+)/i);
    const chaMatch = text.match(/(?:✨|CHA:?)\s*(\d+)/i);

    const stats = {
      str: strMatch ? parseInt(strMatch[1]) : 10,
      dex: dexMatch ? parseInt(dexMatch[1]) : 10,
      con: conMatch ? parseInt(conMatch[1]) : 10,
      int: intMatch ? parseInt(intMatch[1]) : 10,
      wis: wisMatch ? parseInt(wisMatch[1]) : 10,
      cha: chaMatch ? parseInt(chaMatch[1]) : 10,
    };

    // Extract Equipment
    // Matches: 🛡️ Armor: Leather Armor
    // Negative lookahead to avoid matching "Armor Class"
    const armorMatch = text.match(/(?:🛡️|Armor:?)\s*(?!Class)([^\n🆔🏛️📊]+)/i);
    let armor = armorMatch ? armorMatch[1].trim() : 'None';
    
    // Clean up armor if it accidentally matched "Class: 10" or similar
    if (armor.toLowerCase().includes('class') || armor.includes('|')) {
      armor = 'None';
    }

    // Matches: ⚔️ Weapons: Longsword, Dagger
    const weaponsMatch = text.match(/(?:⚔️|Weapons:?)\s*([^\n🆔🏛️📊]+)/i);
    let weapons = weaponsMatch ? weaponsMatch[1].split(',').map(w => w.trim()) : [];
    
    // Filter out known bad matches like "COMBAT STATS" or empty strings
    weapons = weapons.filter(w => 
      w && 
      !w.toUpperCase().includes('COMBAT STATS') && 
      !w.toUpperCase().includes('SKILLS') &&
      w.length > 2
    );

    return {
      id,
      name,
      level,
      class: charClass,
      hp,
      xp: { current: currentXp, max: xpForNextLevel },
      stats,
      equipment: {
        armor,
        weapons,
        other: [] // Placeholder for now
      }
    };
  } catch (error) {
    console.error('Failed to parse character sheet:', error);
    return null;
  }
}

export const useGameStateStore = create<GameState>((set) => ({
  inventory: [],
  world: {
    time: 'Unknown',
    location: 'Unknown',
    weather: 'Unknown',
    date: 'Unknown',
    environment: {},
    npcs: {},
    events: {}
  },
  notes: [],
  activeCharacter: null,

  setInventory: (items) => set({ inventory: items }),
  setWorldState: (state) => set({ world: state }),
  setNotes: (notes) => set({ notes }),
  setActiveCharacter: (char) => set({ activeCharacter: char }),
  
  addNote: (note) => set((state) => ({ 
    notes: [note, ...state.notes] 
  })),
  
  updateNote: (id, content) => set((state) => ({
    notes: state.notes.map(n => n.id === id ? { ...n, content, timestamp: Date.now() } : n)
  })),
  
  deleteNote: (id) => set((state) => ({
    notes: state.notes.filter(n => n.id !== id)
  })),

  syncState: async () => {
    try {
      const { mcpManager } = await import('../services/mcpClient');
      
      // 1. Fetch Active Character from Game State Server
      // Strategy: list_characters -> get first character ID -> get_character(id)
      let activeCharId: number | null = null;
      try {
        console.log('[GameStateStore] Listing characters...');
        
        const listResult = await mcpManager.gameStateClient.callTool('list_characters', {});
        console.log('[GameStateStore] List characters result:', listResult);
        
        if (listResult && listResult.content && listResult.content[0]?.text) {
          const rawText = stripAnsi(listResult.content[0].text);
          console.log('[GameStateStore] List characters raw text:', JSON.stringify(rawText));
          
          try {
            // Try JSON parse first
            const characters = JSON.parse(rawText);
            console.log('[GameStateStore] Parsed characters as JSON:', characters);
            
            if (characters && characters.length > 0) {
              activeCharId = characters[0].id;
              console.log('[GameStateStore] Selected active character ID:', activeCharId);
            }
          } catch (jsonError) {
            // Fallback: Parse formatted text
            // Expected format: "📋 CHARACTER LIST\n🆔 ID: 1 | 👤 Name: Again Test | ..."
            console.log('[GameStateStore] JSON parse failed, trying text parsing...');
            const idMatch = rawText.match(/ID:\s*(\d+)/);
            if (idMatch) {
              activeCharId = parseInt(idMatch[1]);
              console.log('[GameStateStore] Extracted character ID from text:', activeCharId);
            } else {
              console.warn('[GameStateStore] Could not extract character ID from text');
            }
          }
          
          if (activeCharId) {
            // Now fetch the full character sheet
            const charResult = await mcpManager.gameStateClient.callTool('get_character', {
              character_id: activeCharId
            });
            console.log('[GameStateStore] Character result:', charResult);
            
            if (charResult && charResult.content && charResult.content[0]?.text) {
              const charText = charResult.content[0].text;
              const charData = parseCharacterSheet(charText);
              console.log('[GameStateStore] Parsed character data:', charData);
              if (charData) {
                set({ activeCharacter: charData });
              } else {
                console.warn('[GameStateStore] Failed to parse character data');
              }
            }
          } else {
            console.log('[GameStateStore] No characters found in database');
          }
        }
      } catch (e) {
        console.warn('Failed to fetch character list:', e);
      }

      // If we don't have an active character ID, we can't fetch inventory or world state
      if (!activeCharId) {
        console.log('[GameStateStore] No active character ID found, skipping inventory/world sync');
        return;
      }

      console.log('[GameStateStore] Starting inventory/world/quest sync with character ID:', activeCharId);

      // 2. Fetch Inventory (Game State Server)
      try {
        console.log('[GameStateStore] Fetching inventory for ID:', activeCharId);
        const inventoryResult = await mcpManager.gameStateClient.callTool('get_inventory', {
          character_id: activeCharId
        });
        console.log('[GameStateStore] Inventory result:', inventoryResult);

        if (inventoryResult && inventoryResult.content && inventoryResult.content[0].text) {
             const text = stripAnsi(inventoryResult.content[0].text);
             console.log('[GameStateStore] Inventory raw text:', JSON.stringify(text));
             
             let items: InventoryItem[] = [];
             
             // Try JSON parse first
             try {
               items = JSON.parse(text);
             } catch {
               // Fallback to regex parsing for formatted text
               // Format:
               // 1. 📦 Hide Armor
               //     📋 Type: armor
               // 2. 📦 Gold Pieces x50
               //     📋 Type: currency
               
               const lines = text.split('\n');
               let currentItem: Partial<InventoryItem> | null = null;

               lines.forEach((line) => {
                 const trimmedLine = line.trim();
                 
                 // Match Item Line: "1. 📦 Item Name x5" or "📦 Item Name"
                 // Regex: Optional number prefix, then box icon, then name, optional quantity
                 const itemMatch = trimmedLine.match(/^(?:\d+\.\s*)?(?:📦|-|\*)\s+(.+?)(?:\s+(?:x|Qty:)\s*(\d+)|\s*\(x(\d+)\))?$/i);
                 
                 if (itemMatch) {
                   // If we were parsing an item, push it
                   if (currentItem && (currentItem as any).name) {
                     items.push(currentItem as InventoryItem);
                   }

                   const rawName = itemMatch[1].trim();
                   const quantity = parseInt(itemMatch[2] || itemMatch[3] || '1');
                   
                   // Look up item in reference database
                   const refItemKey = Object.keys(dnd5eItems).find(k => k.toLowerCase() === rawName.toLowerCase());
                   const refItem = refItemKey ? dnd5eItems[refItemKey] : null;

                   currentItem = {
                     id: `item-${items.length}`,
                     name: refItem ? refItem.name : rawName, // Use canonical name if found
                     description: refItem ? refItem.description : rawName,
                     quantity: quantity,
                     type: refItem ? refItem.type : 'item',
                     weight: refItem ? refItem.weight : undefined,
                     value: refItem ? parseFloat(refItem.value?.replace(/[^0-9.]/g, '') || '0') : undefined,
                     equipped: false
                   };
                 } 
                 // Match Type Line: "📋 Type: armor"
                 else if (currentItem && trimmedLine.match(/^(?:📋|Type:|\[Type:)/i)) {
                   const typeMatch = trimmedLine.match(/(?:📋|Type:|\[Type:)\s*([^\]]+)/i);
                   if (typeMatch) {
                     // Only overwrite type if we didn't find it in the reference DB, or if the DB type is generic
                     if (!currentItem.type || currentItem.type === 'item') {
                        currentItem.type = typeMatch[1].trim().replace(']', '');
                     }
                   }
                 }
               });

               // Push the last item
               if (currentItem && (currentItem as any).name) {
                 items.push(currentItem as InventoryItem);
               }
             }
             
             console.log('[GameStateStore] Parsed inventory items:', items);
             if (items.length > 0) {
               set((state) => {
                 // Update active character equipment if it was empty (fallback)
                 let newActiveCharacter = state.activeCharacter;
                 
                 if (newActiveCharacter) {
                   const hasParsedEquipment = newActiveCharacter.equipment.armor !== 'None' || newActiveCharacter.equipment.weapons.length > 0;
                   
                   // Also check if the parsed equipment looks valid (not "COMBAT STATS" or "Armor Class")
                   const isEquipmentValid = hasParsedEquipment && 
                     !newActiveCharacter.equipment.armor.includes('Armor Class') &&
                     !newActiveCharacter.equipment.weapons.some(w => w.includes('COMBAT STATS'));

                   if (!isEquipmentValid) {
                     console.log('[GameStateStore] Equipment missing or invalid, populating from inventory...');
                     const armor = items.find(i => i.type.toLowerCase().includes('armor'))?.name || 'None';
                     const weapons = items.filter(i => i.type.toLowerCase().includes('weapon')).map(i => i.name);
                     
                     newActiveCharacter = {
                       ...newActiveCharacter,
                       equipment: {
                         armor,
                         weapons,
                         other: []
                       }
                     };
                   }
                 }
                 
                 return { 
                   inventory: items,
                   activeCharacter: newActiveCharacter
                 };
               });
             }
        }
      } catch (e) {
        console.warn('Failed to sync inventory:', e);
      }

      // 3. Fetch World State (Game State Server)
      try {
        const worldResult = await mcpManager.gameStateClient.callTool('get_world_state', {
          character_id: activeCharId
        });
        if (worldResult && worldResult.content && worldResult.content[0].text) {
            const text = stripAnsi(worldResult.content[0].text);
            console.log('[GameStateStore] World State raw text:', JSON.stringify(text));
            
            let rawWorld: any = null;

            // Try extracting JSON block if present (e.g. "RAW DATA: { ... }" or with code fences)
            // Pattern handles: RAW DATA:\n```json\n{...}\n``` or RAW DATA: {...}
            const jsonMatch = text.match(/RAW DATA:\s*```json\s*\n([\s\S]*?)\n```|RAW DATA:\s*({[\s\S]*})/);
            if (jsonMatch) {
              try {
                // Group 1 is for code fence format, group 2 is for inline format
                const jsonString = jsonMatch[1] || jsonMatch[2];
                rawWorld = JSON.parse(jsonString);
                console.log('[GameStateStore] Parsed world state from RAW DATA:', rawWorld);
              } catch (e) {
                console.warn('Failed to parse extracted World JSON', e);
              }
            } else {
              // Try direct JSON parse
              try {
                rawWorld = JSON.parse(text);
              } catch {
                // Fallback: Parse Text Key-Values
                // 📍 Location: Tavern
                // ☁️ Weather: Sunny
                // 🕒 Time: Morning
                const locationMatch = text.match(/(?:📍|Location:)\s*(.+)/i);
                const weatherMatch = text.match(/(?:☁️|Weather:)\s*(.+)/i);
                const timeMatch = text.match(/(?:🕒|Time:)\s*(.+)/i);
                const dateMatch = text.match(/(?:📅|Date:)\s*(.+)/i);
                
                if (locationMatch || weatherMatch || timeMatch) {
                    rawWorld = {
                        location: locationMatch ? locationMatch[1].trim() : undefined,
                        environment: {
                            weather: weatherMatch ? weatherMatch[1].trim() : undefined,
                            time: timeMatch ? timeMatch[1].trim() : undefined,
                            date: dateMatch ? dateMatch[1].trim() : undefined
                        }
                    };
                }
              }
            }


            if (rawWorld) {
              // Extract environment data
              const env = rawWorld.environment || {};
              
              // Map nested structure to enhanced WorldState interface
              const worldState: WorldState = {
                location: rawWorld.location || 'Unknown',
                // Legacy flat fields (backward compatibility)
                time: env.time_of_day || env.time || 'Unknown',
                weather: env.weather || 'Unknown',
                date: env.date || env.season || 'Unknown',
                // Enhanced structured data
                environment: env,
                npcs: rawWorld.npcs || {},
                events: rawWorld.events || {},
                lastUpdated: rawWorld.updated_at || new Date().toISOString()
              };
              set({ world: worldState });
            }
        }
      } catch (e) {
        console.warn('Failed to sync world state:', e);
      }
      
      // 4. Fetch Quests/Notes (Game State Server)
      try {
        const questsResult = await mcpManager.gameStateClient.callTool('get_active_quests', {
          character_id: activeCharId
        });
        if (questsResult && questsResult.content && questsResult.content[0].text) {
            const text = questsResult.content[0].text;
            
            // Check for "NO ACTIVE QUESTS"
            if (text.includes('NO ACTIVE QUESTS')) {
              set({ notes: [] });
            } else {
              // Try JSON parse
              try {
                const quests = JSON.parse(text);
                const questNotes: Note[] = quests.map((q: any) => ({
                  id: `quest-${q.id}`,
                  title: q.title || 'Quest',
                  content: `${q.description}\n\nStatus: ${q.status}`,
                  author: 'ai',
                  timestamp: Date.now()
                }));
                set({ notes: questNotes });
              } catch {
                // Fallback: If text but not "NO ACTIVE QUESTS", maybe treat whole text as a note?
                // For now, just ignore if not JSON
              }
            }
        }
      } catch (e) {
        console.warn('Failed to sync quests:', e);
      }

    } catch (error) {
      console.error('Error syncing game state:', error);
    }
  }
}));
