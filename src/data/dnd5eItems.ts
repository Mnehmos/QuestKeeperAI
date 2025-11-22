export interface ItemReference {
  name: string;
  type: string;
  weight: number;
  description: string;
  value?: string;
  properties?: string[];
  damage?: string;
  armorClass?: number;
  rarity?: string;
}

export const dnd5eItems: Record<string, ItemReference> = {
  // === SIMPLE MELEE WEAPONS ===
  "Club": {
    name: "Club",
    type: "Simple Melee Weapon",
    weight: 2,
    description: "A sturdy wooden stick, simple but effective.",
    value: "1 sp",
    properties: ["Light"],
    damage: "1d4 bludgeoning"
  },
  "Dagger": {
    name: "Dagger",
    type: "Simple Melee Weapon",
    weight: 1,
    description: "A small knife, easily concealed and quick to draw. Deadly in the right hands.",
    value: "2 gp",
    properties: ["Finesse", "Light", "Thrown (range 20/60)"],
    damage: "1d4 piercing"
  },
  "Greatclub": {
    name: "Greatclub",
    type: "Simple Melee Weapon",
    weight: 10,
    description: "A massive wooden club, requiring two hands to wield effectively.",
    value: "2 sp",
    properties: ["Two-handed"],
    damage: "1d8 bludgeoning"
  },
  "Handaxe": {
    name: "Handaxe",
    type: "Simple Melee Weapon",
    weight: 2,
    description: "A small, balanced axe suitable for melee combat or throwing. A versatile tool for any adventurer.",
    value: "5 gp",
    properties: ["Light", "Thrown (range 20/60)"],
    damage: "1d6 slashing"
  },
  "Javelin": {
    name: "Javelin",
    type: "Simple Melee Weapon",
    weight: 2,
    description: "A light spear designed primarily for throwing. It can be used in melee but excels at range.",
    value: "5 sp",
    properties: ["Thrown (range 30/120)"],
    damage: "1d6 piercing"
  },
  "Light Hammer": {
    name: "Light Hammer",
    type: "Simple Melee Weapon",
    weight: 2,
    description: "A small hammer, useful for both combat and utility.",
    value: "2 gp",
    properties: ["Light", "Thrown (range 20/60)"],
    damage: "1d4 bludgeoning"
  },
  "Mace": {
    name: "Mace",
    type: "Simple Melee Weapon",
    weight: 4,
    description: "A heavy metal head on a sturdy handle, designed to crush armor and bone.",
    value: "5 gp",
    damage: "1d6 bludgeoning"
  },
  "Quarterstaff": {
    name: "Quarterstaff",
    type: "Simple Melee Weapon",
    weight: 4,
    description: "A simple length of wood, often shod with iron. A favorite of travelers and monks.",
    value: "2 sp",
    properties: ["Versatile (1d8)"],
    damage: "1d6 bludgeoning"
  },
  "Sickle": {
    name: "Sickle",
    type: "Simple Melee Weapon",
    weight: 2,
    description: "A farming tool adapted for combat, with a curved blade.",
    value: "1 gp",
    properties: ["Light"],
    damage: "1d4 slashing"
  },
  "Spear": {
    name: "Spear",
    type: "Simple Melee Weapon",
    weight: 3,
    description: "A pole weapon with a sharp point, effective for thrusting or throwing.",
    value: "1 gp",
    properties: ["Thrown (range 20/60)", "Versatile (1d8)"],
    damage: "1d6 piercing"
  },

  // === SIMPLE RANGED WEAPONS ===
  "Light Crossbow": {
    name: "Light Crossbow",
    type: "Simple Ranged Weapon",
    weight: 5,
    description: "A mechanical weapon that fires bolts. Easier to use than a bow but slower to load.",
    value: "25 gp",
    properties: ["Ammunition (range 80/320)", "Loading", "Two-handed"],
    damage: "1d8 piercing"
  },
  "Dart": {
    name: "Dart",
    type: "Simple Ranged Weapon",
    weight: 0.25,
    description: "A small, weighted spike designed for throwing.",
    value: "5 cp",
    properties: ["Finesse", "Thrown (range 20/60)"],
    damage: "1d4 piercing"
  },
  "Shortbow": {
    name: "Shortbow",
    type: "Simple Ranged Weapon",
    weight: 2,
    description: "A small bow, easy to handle and quick to fire.",
    value: "25 gp",
    properties: ["Ammunition (range 80/320)", "Two-handed"],
    damage: "1d6 piercing"
  },
  "Sling": {
    name: "Sling",
    type: "Simple Ranged Weapon",
    weight: 0,
    description: "A simple leather strap used to hurl stones or bullets with surprising force.",
    value: "1 sp",
    properties: ["Ammunition (range 30/120)"],
    damage: "1d4 bludgeoning"
  },

  // === MARTIAL MELEE WEAPONS ===
  "Battleaxe": {
    name: "Battleaxe",
    type: "Martial Melee Weapon",
    weight: 4,
    description: "A heavy axe with a broad head, capable of delivering powerful chopping blows.",
    value: "10 gp",
    properties: ["Versatile (1d10)"],
    damage: "1d8 slashing"
  },
  "Flail": {
    name: "Flail",
    type: "Martial Melee Weapon",
    weight: 2,
    description: "A striking head attached to a handle by a chain, allowing it to swing around shields.",
    value: "10 gp",
    damage: "1d8 bludgeoning"
  },
  "Glaive": {
    name: "Glaive",
    type: "Martial Melee Weapon",
    weight: 6,
    description: "A heavy polearm with a large blade, allowing for reach attacks.",
    value: "20 gp",
    properties: ["Heavy", "Reach", "Two-handed"],
    damage: "1d10 slashing"
  },
  "Greataxe": {
    name: "Greataxe",
    type: "Martial Melee Weapon",
    weight: 7,
    description: "A massive two-handed axe capable of cleaving through armor and bone alike. Heavy and devastating.",
    value: "30 gp",
    properties: ["Heavy", "Two-handed"],
    damage: "1d12 slashing"
  },
  "Greatsword": {
    name: "Greatsword",
    type: "Martial Melee Weapon",
    weight: 6,
    description: "A massive two-handed sword, the pinnacle of heavy infantry weapons.",
    value: "50 gp",
    properties: ["Heavy", "Two-handed"],
    damage: "2d6 slashing"
  },
  "Halberd": {
    name: "Halberd",
    type: "Martial Melee Weapon",
    weight: 6,
    description: "A polearm combining an axe blade and a spike, offering versatility and reach.",
    value: "20 gp",
    properties: ["Heavy", "Reach", "Two-handed"],
    damage: "1d10 slashing"
  },
  "Lance": {
    name: "Lance",
    type: "Martial Melee Weapon",
    weight: 6,
    description: "A long spear designed for use while mounted.",
    value: "10 gp",
    properties: ["Reach", "Special"],
    damage: "1d12 piercing"
  },
  "Longsword": {
    name: "Longsword",
    type: "Martial Melee Weapon",
    weight: 3,
    description: "A versatile blade favored by knights and soldiers. Can be wielded with one hand or two.",
    value: "15 gp",
    properties: ["Versatile (1d10)"],
    damage: "1d8 slashing"
  },
  "Maul": {
    name: "Maul",
    type: "Martial Melee Weapon",
    weight: 10,
    description: "A massive two-handed hammer, capable of crushing armor.",
    value: "10 gp",
    properties: ["Heavy", "Two-handed"],
    damage: "2d6 bludgeoning"
  },
  "Morningstar": {
    name: "Morningstar",
    type: "Martial Melee Weapon",
    weight: 4,
    description: "A heavy club with a spiked metal head.",
    value: "15 gp",
    damage: "1d8 piercing"
  },
  "Pike": {
    name: "Pike",
    type: "Martial Melee Weapon",
    weight: 18,
    description: "An extremely long spear used by infantry formations.",
    value: "5 gp",
    properties: ["Heavy", "Reach", "Two-handed"],
    damage: "1d10 piercing"
  },
  "Rapier": {
    name: "Rapier",
    type: "Martial Melee Weapon",
    weight: 2,
    description: "A thin, light blade designed for thrusting and quick maneuvers.",
    value: "25 gp",
    properties: ["Finesse"],
    damage: "1d8 piercing"
  },
  "Scimitar": {
    name: "Scimitar",
    type: "Martial Melee Weapon",
    weight: 3,
    description: "A sword with a curved blade, designed for slashing.",
    value: "25 gp",
    properties: ["Finesse", "Light"],
    damage: "1d6 slashing"
  },
  "Shortsword": {
    name: "Shortsword",
    type: "Martial Melee Weapon",
    weight: 2,
    description: "A small sword, often used as a sidearm or in pairs.",
    value: "10 gp",
    properties: ["Finesse", "Light"],
    damage: "1d6 piercing"
  },
  "Trident": {
    name: "Trident",
    type: "Martial Melee Weapon",
    weight: 4,
    description: "A three-pronged spear, often associated with aquatic cultures.",
    value: "5 gp",
    properties: ["Thrown (range 20/60)", "Versatile (1d8)"],
    damage: "1d6 piercing"
  },
  "War Pick": {
    name: "War Pick",
    type: "Martial Melee Weapon",
    weight: 2,
    description: "A heavy pick designed to punch through armor.",
    value: "5 gp",
    damage: "1d8 piercing"
  },
  "Warhammer": {
    name: "Warhammer",
    type: "Martial Melee Weapon",
    weight: 2,
    description: "A versatile hammer with a heavy head.",
    value: "15 gp",
    properties: ["Versatile (1d10)"],
    damage: "1d8 bludgeoning"
  },
  "Whip": {
    name: "Whip",
    type: "Martial Melee Weapon",
    weight: 3,
    description: "A long cord or strip of leather, useful for tripping or disarming.",
    value: "2 gp",
    properties: ["Finesse", "Reach"],
    damage: "1d4 slashing"
  },

  // === MARTIAL RANGED WEAPONS ===
  "Blowgun": {
    name: "Blowgun",
    type: "Martial Ranged Weapon",
    weight: 1,
    description: "A simple tube for firing darts.",
    value: "10 gp",
    properties: ["Ammunition (range 25/100)", "Loading"],
    damage: "1 piercing"
  },
  "Hand Crossbow": {
    name: "Hand Crossbow",
    type: "Martial Ranged Weapon",
    weight: 3,
    description: "A small crossbow that can be fired with one hand.",
    value: "75 gp",
    properties: ["Ammunition (range 30/120)", "Light", "Loading"],
    damage: "1d6 piercing"
  },
  "Heavy Crossbow": {
    name: "Heavy Crossbow",
    type: "Martial Ranged Weapon",
    weight: 18,
    description: "A massive crossbow with immense power.",
    value: "50 gp",
    properties: ["Ammunition (range 100/400)", "Heavy", "Loading", "Two-handed"],
    damage: "1d10 piercing"
  },
  "Longbow": {
    name: "Longbow",
    type: "Martial Ranged Weapon",
    weight: 2,
    description: "A large bow with great range and power.",
    value: "50 gp",
    properties: ["Ammunition (range 150/600)", "Heavy", "Two-handed"],
    damage: "1d8 piercing"
  },
  "Net": {
    name: "Net",
    type: "Martial Ranged Weapon",
    weight: 3,
    description: "A weighted net used to entangle opponents.",
    value: "1 gp",
    properties: ["Special", "Thrown (range 5/15)"]
  },

  // === ARMOR ===
  "Padded Armor": {
    name: "Padded Armor",
    type: "Light Armor",
    weight: 8,
    description: "Quilted layers of cloth and batting.",
    value: "5 gp",
    armorClass: 11,
    properties: ["Stealth Disadvantage"]
  },
  "Leather Armor": {
    name: "Leather Armor",
    type: "Light Armor",
    weight: 10,
    description: "The breastplate and shoulder protectors of this armor are made of leather that has been stiffened by being boiled in oil.",
    value: "10 gp",
    armorClass: 11
  },
  "Studded Leather Armor": {
    name: "Studded Leather Armor",
    type: "Light Armor",
    weight: 13,
    description: "Made from tough but flexible leather, reinforced with close-set rivets or spikes.",
    value: "45 gp",
    armorClass: 12
  },
  "Hide Armor": {
    name: "Hide Armor",
    type: "Medium Armor",
    weight: 12,
    description: "Crude armor made from thick furs and pelts. Common among barbarian tribes.",
    value: "10 gp",
    armorClass: 12,
    properties: ["Max Dex +2"]
  },
  "Chain Shirt": {
    name: "Chain Shirt",
    type: "Medium Armor",
    weight: 20,
    description: "Made of interlocking metal rings, worn between layers of clothing or leather.",
    value: "50 gp",
    armorClass: 13,
    properties: ["Max Dex +2"]
  },
  "Scale Mail": {
    name: "Scale Mail",
    type: "Medium Armor",
    weight: 45,
    description: "Consists of a coat and leggings (and perhaps a separate skirt) of leather covered with overlapping pieces of metal.",
    value: "50 gp",
    armorClass: 14,
    properties: ["Max Dex +2", "Stealth Disadvantage"]
  },
  "Breastplate": {
    name: "Breastplate",
    type: "Medium Armor",
    weight: 20,
    description: "A fitted metal chest piece worn with supple leather.",
    value: "400 gp",
    armorClass: 14,
    properties: ["Max Dex +2"]
  },
  "Half Plate": {
    name: "Half Plate",
    type: "Medium Armor",
    weight: 40,
    description: "Consists of shaped metal plates that cover most of the wearer's body.",
    value: "750 gp",
    armorClass: 15,
    properties: ["Max Dex +2", "Stealth Disadvantage"]
  },
  "Ring Mail": {
    name: "Ring Mail",
    type: "Heavy Armor",
    weight: 40,
    description: "Leather armor with heavy rings sewn into it.",
    value: "30 gp",
    armorClass: 14,
    properties: ["Stealth Disadvantage"]
  },
  "Chain Mail": {
    name: "Chain Mail",
    type: "Heavy Armor",
    weight: 55,
    description: "Made of interlocking metal rings, chain mail includes a layer of quilted fabric underneath to prevent chafing.",
    value: "75 gp",
    armorClass: 16,
    properties: ["Str 13", "Stealth Disadvantage"]
  },
  "Splint Armor": {
    name: "Splint Armor",
    type: "Heavy Armor",
    weight: 60,
    description: "Made of narrow vertical strips of metal riveted to a backing of leather that is worn over cloth padding.",
    value: "200 gp",
    armorClass: 17,
    properties: ["Str 15", "Stealth Disadvantage"]
  },
  "Plate Armor": {
    name: "Plate Armor",
    type: "Heavy Armor",
    weight: 65,
    description: "Consists of shaped, interlocking metal plates to cover the entire body.",
    value: "1500 gp",
    armorClass: 18,
    properties: ["Str 15", "Stealth Disadvantage"]
  },
  "Shield": {
    name: "Shield",
    type: "Shield",
    weight: 6,
    description: "A shield is made from wood or metal and is carried in one hand.",
    value: "10 gp",
    armorClass: 2
  },

  // === ADVENTURING GEAR ===
  "Backpack": {
    name: "Backpack",
    type: "Adventuring Gear",
    weight: 5,
    description: "A leather pack carried on the back, capable of holding up to 30 pounds of gear.",
    value: "2 gp"
  },
  "Bedroll": {
    name: "Bedroll",
    type: "Adventuring Gear",
    weight: 7,
    description: "A thick quilt and blanket, rolled up for easy transport.",
    value: "1 gp"
  },
  "Torch": {
    name: "Torch",
    type: "Adventuring Gear",
    weight: 1,
    description: "A wooden stick wrapped in cloth and soaked in tallow. Burns for 1 hour, providing bright light in a 20-foot radius.",
    value: "1 cp"
  },
  "Rations": {
    name: "Rations",
    type: "Adventuring Gear",
    weight: 2,
    description: "Compact, dry food suitable for extended travel. Includes jerky, dried fruit, hardtack, and nuts.",
    value: "5 sp"
  },
  "Waterskin": {
    name: "Waterskin",
    type: "Adventuring Gear",
    weight: 5,
    description: "A leather pouch for holding water or wine.",
    value: "2 sp"
  },
  "Rope, Hempen (50 feet)": {
    name: "Rope, Hempen (50 feet)",
    type: "Adventuring Gear",
    weight: 10,
    description: "A coil of strong rope made from hemp fibers.",
    value: "1 gp"
  },
  "Rope, Silk (50 feet)": {
    name: "Rope, Silk (50 feet)",
    type: "Adventuring Gear",
    weight: 5,
    description: "A coil of strong, lightweight rope made from silk.",
    value: "10 gp"
  },
  "Potion of Healing": {
    name: "Potion of Healing",
    type: "Potion",
    weight: 0.5,
    description: "A magical red fluid that restores 2d4 + 2 hit points when consumed.",
    value: "50 gp",
    rarity: "Common"
  },
  "Healer's Kit": {
    name: "Healer's Kit",
    type: "Adventuring Gear",
    weight: 3,
    description: "A leather pouch containing bandages, salves, and splints. Has ten uses.",
    value: "5 gp"
  },
  "Crowbar": {
    name: "Crowbar",
    type: "Adventuring Gear",
    weight: 5,
    description: "A heavy iron bar with a flattened, angled end. Grants advantage on Strength checks where leverage can be applied.",
    value: "2 gp"
  },
  "Tinderbox": {
    name: "Tinderbox",
    type: "Adventuring Gear",
    weight: 1,
    description: "A small container holding flint, fire steel, and tinder (usually dry cloth soaked in light oil) used to kindle a fire.",
    value: "5 sp"
  },
  "Gold Pieces": {
    name: "Gold Pieces",
    type: "Currency",
    weight: 0.02,
    description: "Standard gold coins used for trade.",
    value: "1 gp"
  }
};
