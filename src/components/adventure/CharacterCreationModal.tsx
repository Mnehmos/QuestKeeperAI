import React, { useState, useMemo, useCallback } from 'react';
import { mcpManager } from '../../services/mcpClient';
import { useGameStateStore } from '../../stores/gameStateStore';

interface CharacterCreationModalProps {
    isOpen: boolean;
    onClose: () => void;
}

// D&D 5e Race data
const RACES = {
    human: { name: 'Human', bonuses: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 }, speed: 30, traits: ['Versatile', 'Extra Language', 'Extra Skill'], description: 'Versatile and ambitious, humans are the most adaptable of all races.' },
    elf: { name: 'Elf', bonuses: { dex: 2 }, speed: 30, traits: ['Darkvision', 'Fey Ancestry', 'Trance'], description: 'Graceful and long-lived, elves are masters of magic and art.' },
    dwarf: { name: 'Dwarf', bonuses: { con: 2 }, speed: 25, traits: ['Darkvision', 'Dwarven Resilience', 'Stonecunning'], description: 'Hardy and steadfast, dwarves are renowned smiths and warriors.' },
    halfling: { name: 'Halfling', bonuses: { dex: 2 }, speed: 25, traits: ['Lucky', 'Brave', 'Nimbleness'], description: 'Small but brave, halflings are cheerful and resourceful.' },
    dragonborn: { name: 'Dragonborn', bonuses: { str: 2, cha: 1 }, speed: 30, traits: ['Breath Weapon', 'Damage Resistance'], description: 'Proud dragon descendants with elemental breath attacks.' },
    gnome: { name: 'Gnome', bonuses: { int: 2 }, speed: 25, traits: ['Darkvision', 'Gnome Cunning'], description: 'Curious inventors with a natural resistance to magic.' },
    halfElf: { name: 'Half-Elf', bonuses: { cha: 2 }, speed: 30, traits: ['Darkvision', 'Fey Ancestry', 'Skill Versatility'], extraStats: 2, description: 'Combining human ambition with elven grace.' },
    halfOrc: { name: 'Half-Orc', bonuses: { str: 2, con: 1 }, speed: 30, traits: ['Darkvision', 'Relentless Endurance', 'Savage Attacks'], description: 'Powerful warriors with orcish strength and human cunning.' },
    tiefling: { name: 'Tiefling', bonuses: { cha: 2, int: 1 }, speed: 30, traits: ['Darkvision', 'Hellish Resistance', 'Infernal Legacy'], description: 'Touched by infernal heritage, tieflings face prejudice with defiance.' },
    hobbit: { name: 'Hobbit', bonuses: { dex: 2, cha: 1 }, speed: 25, traits: ['Lucky', 'Brave', 'Halfling Nimbleness', 'Second Breakfast'], description: 'Peaceful folk who love comfort, good food, and unexpected adventures.' },
} as const;

// D&D 5e Class data
const CLASSES = {
    fighter: { name: 'Fighter', hitDie: 10, primaryStat: 'str', saves: ['str', 'con'], icon: '⚔️', description: 'Masters of martial combat and battlefield tactics.' },
    wizard: { name: 'Wizard', hitDie: 6, primaryStat: 'int', saves: ['int', 'wis'], icon: '🔮', description: 'Scholarly spellcasters who bend reality through arcane study.' },
    rogue: { name: 'Rogue', hitDie: 8, primaryStat: 'dex', saves: ['dex', 'int'], icon: '🗡️', description: 'Stealthy experts in deception, traps, and deadly precision.' },
    cleric: { name: 'Cleric', hitDie: 8, primaryStat: 'wis', saves: ['wis', 'cha'], icon: '✝️', description: 'Divine agents who channel the power of their gods.' },
    ranger: { name: 'Ranger', hitDie: 10, primaryStat: 'dex', saves: ['str', 'dex'], icon: '🏹', description: 'Wilderness warriors skilled in tracking and survival.' },
    paladin: { name: 'Paladin', hitDie: 10, primaryStat: 'str', saves: ['wis', 'cha'], icon: '🛡️', description: 'Holy warriors bound by sacred oaths.' },
    barbarian: { name: 'Barbarian', hitDie: 12, primaryStat: 'str', saves: ['str', 'con'], icon: '🪓', description: 'Fierce warriors who channel primal rage in battle.' },
    druid: { name: 'Druid', hitDie: 8, primaryStat: 'wis', saves: ['int', 'wis'], icon: '🌿', description: 'Nature priests who shapeshift and command the elements.' },
    bard: { name: 'Bard', hitDie: 8, primaryStat: 'cha', saves: ['dex', 'cha'], icon: '🎵', description: 'Magical performers who inspire allies with song and story.' },
    monk: { name: 'Monk', hitDie: 8, primaryStat: 'dex', saves: ['str', 'dex'], icon: '👊', description: 'Martial artists who harness ki for supernatural feats.' },
    sorcerer: { name: 'Sorcerer', hitDie: 6, primaryStat: 'cha', saves: ['con', 'cha'], icon: '⚡', description: 'Innate spellcasters with magic in their blood.' },
    warlock: { name: 'Warlock', hitDie: 8, primaryStat: 'cha', saves: ['wis', 'cha'], icon: '👁️', description: 'Occultists who bargain with otherworldly patrons for power.' },
} as const;

// Portrait colors for character tokens
const PORTRAIT_COLORS = [
    { name: 'Emerald', bg: '#065f46', border: '#10b981' },
    { name: 'Ruby', bg: '#7f1d1d', border: '#ef4444' },
    { name: 'Sapphire', bg: '#1e3a8a', border: '#3b82f6' },
    { name: 'Amethyst', bg: '#581c87', border: '#a855f7' },
    { name: 'Gold', bg: '#78350f', border: '#f59e0b' },
    { name: 'Silver', bg: '#374151', border: '#9ca3af' },
    { name: 'Copper', bg: '#7c2d12', border: '#ea580c' },
    { name: 'Jade', bg: '#064e3b', border: '#34d399' },
];

type StatName = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';
type AbilityMethod = 'pointBuy' | 'standardArray' | 'manual';

const STAT_NAMES: StatName[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const STAT_LABELS: Record<StatName, string> = {
    str: 'Strength',
    dex: 'Dexterity', 
    con: 'Constitution',
    int: 'Intelligence',
    wis: 'Wisdom',
    cha: 'Charisma'
};
const STAT_ICONS: Record<StatName, string> = {
    str: '💪',
    dex: '🏃',
    con: '❤️',
    int: '🧠',
    wis: '🦉',
    cha: '💬'
};

const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];
const POINT_BUY_COSTS: Record<number, number> = {
    8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9
};
const POINT_BUY_TOTAL = 27;

function calculateModifier(score: number): number {
    return Math.floor((score - 10) / 2);
}

function formatModifier(mod: number): string {
    return mod >= 0 ? `+${mod}` : `${mod}`;
}

export const CharacterCreationModal: React.FC<CharacterCreationModalProps> = ({ isOpen, onClose }) => {
    // Basic info
    const [name, setName] = useState('');
    const [race, setRace] = useState<keyof typeof RACES>('human');
    const [charClass, setCharClass] = useState<keyof typeof CLASSES>('fighter');
    const [level, setLevel] = useState(1);
    const [portraitColor, setPortraitColor] = useState(PORTRAIT_COLORS[0]);
    const [background, setBackground] = useState('');
    
    // Ability scores
    const [abilityMethod, setAbilityMethod] = useState<AbilityMethod>('pointBuy');
    const [baseStats, setBaseStats] = useState<Record<StatName, number>>({
        str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10
    });
    const [standardArrayAssignment, setStandardArrayAssignment] = useState<Record<StatName, number | null>>({
        str: null, dex: null, con: null, int: null, wis: null, cha: null
    });
    
    // Half-Elf bonus stats
    const [halfElfBonuses, setHalfElfBonuses] = useState<StatName[]>([]);
    
    // UI state
    const [step, setStep] = useState<'basics' | 'abilities' | 'details' | 'review'>('basics');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const syncState = useGameStateStore((state) => state.syncState);

    // Calculate racial bonuses
    const racialBonuses = useMemo(() => {
        const raceData = RACES[race];
        const bonuses: Record<StatName, number> = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
        
        if (raceData.bonuses) {
            for (const [stat, bonus] of Object.entries(raceData.bonuses)) {
                bonuses[stat as StatName] = bonus;
            }
        }
        
        if (race === 'halfElf') {
            halfElfBonuses.forEach(stat => {
                bonuses[stat] += 1;
            });
        }
        
        return bonuses;
    }, [race, halfElfBonuses]);

    // Calculate base stats based on method
    const effectiveBaseStats = useMemo(() => {
        if (abilityMethod === 'standardArray') {
            const stats: Record<StatName, number> = { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 };
            for (const [stat, value] of Object.entries(standardArrayAssignment)) {
                if (value !== null) {
                    stats[stat as StatName] = value;
                }
            }
            return stats;
        }
        return baseStats;
    }, [abilityMethod, baseStats, standardArrayAssignment]);

    // Calculate final stats with racial bonuses
    const finalStats = useMemo(() => {
        const stats: Record<StatName, number> = { ...effectiveBaseStats };
        for (const stat of STAT_NAMES) {
            stats[stat] += racialBonuses[stat];
        }
        return stats;
    }, [effectiveBaseStats, racialBonuses]);

    // Point buy calculations
    const pointsSpent = useMemo(() => {
        if (abilityMethod !== 'pointBuy') return 0;
        return STAT_NAMES.reduce((total, stat) => {
            return total + (POINT_BUY_COSTS[baseStats[stat]] || 0);
        }, 0);
    }, [abilityMethod, baseStats]);

    const pointsRemaining = POINT_BUY_TOTAL - pointsSpent;

    // Standard array tracking
    const usedArrayValues = useMemo(() => {
        return Object.values(standardArrayAssignment).filter(v => v !== null) as number[];
    }, [standardArrayAssignment]);

    const availableArrayValues = useMemo(() => {
        return STANDARD_ARRAY.filter(v => !usedArrayValues.includes(v));
    }, [usedArrayValues]);

    // HP calculation
    const maxHp = useMemo(() => {
        const classData = CLASSES[charClass];
        const conMod = calculateModifier(finalStats.con);
        const level1Hp = classData.hitDie + conMod;
        const avgRoll = Math.floor(classData.hitDie / 2) + 1;
        const higherLevelHp = (level - 1) * (avgRoll + conMod);
        return Math.max(1, level1Hp + higherLevelHp);
    }, [charClass, finalStats.con, level]);

    // AC calculation
    const baseAc = 10 + calculateModifier(finalStats.dex);

    // Validation
    const isBasicsValid = name.trim().length >= 2;
    const isHalfElfValid = race !== 'halfElf' || halfElfBonuses.length === 2;
    
    const isAbilitiesValid = useMemo(() => {
        if (abilityMethod === 'pointBuy') {
            return pointsRemaining >= 0 && pointsRemaining <= POINT_BUY_TOTAL;
        }
        if (abilityMethod === 'standardArray') {
            return usedArrayValues.length === 6;
        }
        return STAT_NAMES.every(stat => baseStats[stat] >= 3 && baseStats[stat] <= 18);
    }, [abilityMethod, pointsRemaining, usedArrayValues, baseStats]);

    const resetForm = useCallback(() => {
        setName('');
        setRace('human');
        setCharClass('fighter');
        setLevel(1);
        setPortraitColor(PORTRAIT_COLORS[0]);
        setBackground('');
        setBaseStats({ str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 });
        setStandardArrayAssignment({ str: null, dex: null, con: null, int: null, wis: null, cha: null });
        setHalfElfBonuses([]);
        setAbilityMethod('pointBuy');
        setStep('basics');
        setError(null);
    }, []);

    if (!isOpen) return null;

    const handlePointBuyChange = (stat: StatName, delta: number) => {
        const newValue = baseStats[stat] + delta;
        if (newValue < 8 || newValue > 15) return;
        
        const newStats = { ...baseStats, [stat]: newValue };
        const newCost = STAT_NAMES.reduce((total, s) => total + (POINT_BUY_COSTS[newStats[s]] || 0), 0);
        
        if (newCost <= POINT_BUY_TOTAL) {
            setBaseStats(newStats);
        }
    };

    const handleStandardArrayAssign = (stat: StatName, value: number | null) => {
        if (value !== null) {
            const newAssignment = { ...standardArrayAssignment };
            for (const s of STAT_NAMES) {
                if (newAssignment[s] === value) {
                    newAssignment[s] = null;
                }
            }
            newAssignment[stat] = value;
            setStandardArrayAssignment(newAssignment);
        } else {
            setStandardArrayAssignment({ ...standardArrayAssignment, [stat]: null });
        }
    };

    const handleHalfElfBonus = (stat: StatName) => {
        if (halfElfBonuses.includes(stat)) {
            setHalfElfBonuses(halfElfBonuses.filter(s => s !== stat));
        } else if (halfElfBonuses.length < 2 && stat !== 'cha') {
            setHalfElfBonuses([...halfElfBonuses, stat]);
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        setError(null);

        try {
            const raceData = RACES[race];
            const classData = CLASSES[charClass];
            
            // Build behavior string with all extra info
            const behaviorParts = [
                `${raceData.name} ${classData.name}`,
                `Speed: ${raceData.speed}ft`,
            ];
            if (raceData.traits) {
                behaviorParts.push(`Traits: ${raceData.traits.join(', ')}`);
            }
            if (background.trim()) {
                behaviorParts.push(`Background: ${background.trim()}`);
            }
            behaviorParts.push(`Portrait: ${portraitColor.name}`);

            console.log('[CharacterCreation] Creating character:', {
                name, race: raceData.name, class: classData.name, level,
                stats: finalStats, hp: maxHp, ac: baseAc
            });

            const result = await mcpManager.gameStateClient.callTool('create_character', {
                name,
                hp: maxHp,
                maxHp: maxHp,
                ac: baseAc,
                level,
                stats: finalStats,
                behavior: behaviorParts.join('. ')
            });

            console.log('[CharacterCreation] Success:', result);
            await syncState(true);
            resetForm();
            onClose();
        } catch (err) {
            console.error('[CharacterCreation] Error:', err);
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    const steps = ['basics', 'abilities', 'details', 'review'] as const;
    const currentStepIndex = steps.indexOf(step);

    // Step content renderers
    const renderBasicsStep = () => (
        <div className="space-y-5 animate-fadeIn">
            {/* Name Input */}
            <div>
                <label className="block text-sm font-bold text-terminal-green mb-2">
                    CHARACTER NAME <span className="text-red-400">*</span>
                </label>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-black border-2 border-terminal-green/50 text-terminal-green px-4 py-3 rounded-lg focus:outline-none focus:border-terminal-green-bright focus:shadow-[0_0_10px_rgba(0,255,0,0.3)] transition-all"
                    placeholder="Enter your hero's name..."
                    autoFocus
                />
                {name.length > 0 && name.length < 2 && (
                    <p className="text-red-400 text-xs mt-1">Name must be at least 2 characters</p>
                )}
            </div>

            {/* Race Selection */}
            <div>
                <label className="block text-sm font-bold text-terminal-green mb-2">RACE</label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-2">
                    {Object.entries(RACES).map(([key, data]) => (
                        <button
                            key={key}
                            onClick={() => { setRace(key as keyof typeof RACES); setHalfElfBonuses([]); }}
                            className={`p-3 rounded-lg text-left transition-all ${
                                race === key
                                    ? 'bg-terminal-green/20 border-2 border-terminal-green shadow-[0_0_10px_rgba(0,255,0,0.2)]'
                                    : 'border border-terminal-green/30 hover:border-terminal-green/60 hover:bg-terminal-green/5'
                            }`}
                        >
                            <div className="font-bold text-sm">{data.name}</div>
                            <div className="text-xs text-terminal-green/60 mt-1">
                                {Object.entries(data.bonuses || {}).map(([stat, bonus]) => 
                                    `+${bonus} ${stat.toUpperCase()}`
                                ).join(', ') || '+1 All'}
                            </div>
                        </button>
                    ))}
                </div>
                <p className="text-xs text-terminal-green/50 mt-2 italic">{RACES[race].description}</p>
            </div>

            {/* Half-Elf Bonus Selection */}
            {race === 'halfElf' && (
                <div className="border border-amber-500/50 rounded-lg p-4 bg-amber-500/10 animate-fadeIn">
                    <label className="block text-sm font-bold text-amber-400 mb-3">
                        🌟 HALF-ELF BONUS STATS <span className="text-xs font-normal">(Choose 2)</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {STAT_NAMES.filter(s => s !== 'cha').map(stat => (
                            <button
                                key={stat}
                                onClick={() => handleHalfElfBonus(stat)}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                                    halfElfBonuses.includes(stat)
                                        ? 'bg-amber-500 text-black shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                                        : 'border border-amber-500/50 text-amber-400 hover:bg-amber-500/20'
                                }`}
                            >
                                {STAT_ICONS[stat]} +1 {stat.toUpperCase()}
                            </button>
                        ))}
                    </div>
                    {halfElfBonuses.length < 2 && (
                        <p className="mt-2 text-xs text-amber-400">Select {2 - halfElfBonuses.length} more</p>
                    )}
                </div>
            )}

            {/* Class Selection */}
            <div>
                <label className="block text-sm font-bold text-terminal-green mb-2">CLASS</label>
                <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-2">
                    {Object.entries(CLASSES).map(([key, data]) => (
                        <button
                            key={key}
                            onClick={() => setCharClass(key as keyof typeof CLASSES)}
                            className={`p-2 rounded-lg text-center transition-all ${
                                charClass === key
                                    ? 'bg-terminal-green/20 border-2 border-terminal-green shadow-[0_0_10px_rgba(0,255,0,0.2)]'
                                    : 'border border-terminal-green/30 hover:border-terminal-green/60 hover:bg-terminal-green/5'
                            }`}
                        >
                            <div className="text-xl">{data.icon}</div>
                            <div className="font-bold text-xs mt-1">{data.name}</div>
                        </button>
                    ))}
                </div>
                <div className="flex justify-between text-xs text-terminal-green/60 mt-2 px-1">
                    <span>Hit Die: d{CLASSES[charClass].hitDie}</span>
                    <span>Primary: {CLASSES[charClass].primaryStat.toUpperCase()}</span>
                    <span>Saves: {CLASSES[charClass].saves.map(s => s.toUpperCase()).join(', ')}</span>
                </div>
            </div>

            {/* Level Slider */}
            <div>
                <label className="block text-sm font-bold text-terminal-green mb-2">
                    STARTING LEVEL: <span className="text-terminal-green-bright text-lg">{level}</span>
                </label>
                <input
                    type="range"
                    value={level}
                    onChange={(e) => setLevel(parseInt(e.target.value))}
                    min="1"
                    max="20"
                    className="w-full h-2 bg-terminal-green/20 rounded-lg appearance-none cursor-pointer accent-terminal-green"
                />
                <div className="flex justify-between text-xs text-terminal-green/40 mt-1 px-1">
                    {[1, 5, 10, 15, 20].map(l => (
                        <span key={l} className={level === l ? 'text-terminal-green font-bold' : ''}>{l}</span>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderAbilitiesStep = () => (
        <div className="space-y-4 animate-fadeIn">
            {/* Method Selection */}
            <div>
                <label className="block text-sm font-bold text-terminal-green mb-2">ABILITY SCORE METHOD</label>
                <div className="flex gap-2">
                    {([
                        { key: 'pointBuy', label: 'Point Buy', desc: '27 points to spend' },
                        { key: 'standardArray', label: 'Standard', desc: '15,14,13,12,10,8' },
                        { key: 'manual', label: 'Manual', desc: 'Enter directly' }
                    ] as const).map(({ key, label, desc }) => (
                        <button
                            key={key}
                            onClick={() => setAbilityMethod(key)}
                            className={`flex-1 py-3 px-2 rounded-lg text-sm transition-all ${
                                abilityMethod === key
                                    ? 'bg-terminal-green text-black font-bold shadow-[0_0_15px_rgba(0,255,0,0.4)]'
                                    : 'border border-terminal-green/50 text-terminal-green hover:bg-terminal-green/10'
                            }`}
                        >
                            <div className="font-bold">{label}</div>
                            <div className={`text-xs mt-1 ${abilityMethod === key ? 'text-black/60' : 'text-terminal-green/50'}`}>{desc}</div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Point Buy Interface */}
            {abilityMethod === 'pointBuy' && (
                <div className="border border-terminal-green/30 rounded-lg p-4 bg-terminal-green/5">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-sm text-terminal-green/80">Points Remaining:</span>
                        <span className={`text-2xl font-bold ${
                            pointsRemaining < 0 ? 'text-red-500' : 
                            pointsRemaining === 0 ? 'text-terminal-green-bright' : 'text-amber-400'
                        }`}>
                            {pointsRemaining}
                            <span className="text-sm text-terminal-green/50">/{POINT_BUY_TOTAL}</span>
                        </span>
                    </div>
                    <div className="space-y-3">
                        {STAT_NAMES.map(stat => (
                            <div key={stat} className="flex items-center gap-3">
                                <span className="text-xl w-8">{STAT_ICONS[stat]}</span>
                                <span className="w-20 text-sm font-medium">{STAT_LABELS[stat]}</span>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => handlePointBuyChange(stat, -1)}
                                        disabled={baseStats[stat] <= 8}
                                        className="w-8 h-8 rounded bg-terminal-green/20 text-terminal-green font-bold disabled:opacity-30 hover:bg-terminal-green/40 transition-colors"
                                    >−</button>
                                    <span className="w-10 text-center font-mono text-xl font-bold">{baseStats[stat]}</span>
                                    <button
                                        onClick={() => handlePointBuyChange(stat, 1)}
                                        disabled={baseStats[stat] >= 15 || pointsRemaining <= 0}
                                        className="w-8 h-8 rounded bg-terminal-green/20 text-terminal-green font-bold disabled:opacity-30 hover:bg-terminal-green/40 transition-colors"
                                    >+</button>
                                </div>
                                <span className="text-xs text-terminal-green/50 w-12">({POINT_BUY_COSTS[baseStats[stat]]} pts)</span>
                                {racialBonuses[stat] > 0 && (
                                    <span className="text-cyan-400 text-sm font-bold">+{racialBonuses[stat]}</span>
                                )}
                                <span className="ml-auto font-bold text-terminal-green-bright">
                                    = {finalStats[stat]} <span className="text-xs">({formatModifier(calculateModifier(finalStats[stat]))})</span>
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Standard Array Interface */}
            {abilityMethod === 'standardArray' && (
                <div className="border border-terminal-green/30 rounded-lg p-4 bg-terminal-green/5">
                    <div className="mb-3 text-sm text-terminal-green/80">
                        Assign each value: <span className="font-mono text-terminal-green-bright">{STANDARD_ARRAY.join(' • ')}</span>
                    </div>
                    <div className="space-y-3">
                        {STAT_NAMES.map(stat => (
                            <div key={stat} className="flex items-center gap-3">
                                <span className="text-xl w-8">{STAT_ICONS[stat]}</span>
                                <span className="w-20 text-sm font-medium">{STAT_LABELS[stat]}</span>
                                <select
                                    value={standardArrayAssignment[stat] ?? ''}
                                    onChange={(e) => handleStandardArrayAssign(stat, e.target.value ? parseInt(e.target.value) : null)}
                                    className="w-20 bg-black border border-terminal-green text-terminal-green px-2 py-2 rounded font-mono"
                                >
                                    <option value="">--</option>
                                    {standardArrayAssignment[stat] !== null && (
                                        <option value={standardArrayAssignment[stat]!}>{standardArrayAssignment[stat]}</option>
                                    )}
                                    {availableArrayValues.map(v => (
                                        <option key={v} value={v}>{v}</option>
                                    ))}
                                </select>
                                {racialBonuses[stat] > 0 && (
                                    <span className="text-cyan-400 text-sm font-bold">+{racialBonuses[stat]}</span>
                                )}
                                <span className="ml-auto font-bold text-terminal-green-bright">
                                    = {finalStats[stat]} <span className="text-xs">({formatModifier(calculateModifier(finalStats[stat]))})</span>
                                </span>
                            </div>
                        ))}
                    </div>
                    {usedArrayValues.length < 6 && (
                        <p className="text-amber-400 text-xs mt-3">Assign all 6 values to continue</p>
                    )}
                </div>
            )}

            {/* Manual Entry Interface */}
            {abilityMethod === 'manual' && (
                <div className="border border-terminal-green/30 rounded-lg p-4 bg-terminal-green/5">
                    <div className="mb-3 text-sm text-terminal-green/80">Enter scores (3-18)</div>
                    <div className="space-y-3">
                        {STAT_NAMES.map(stat => (
                            <div key={stat} className="flex items-center gap-3">
                                <span className="text-xl w-8">{STAT_ICONS[stat]}</span>
                                <span className="w-20 text-sm font-medium">{STAT_LABELS[stat]}</span>
                                <input
                                    type="number"
                                    min="3"
                                    max="18"
                                    value={baseStats[stat]}
                                    onChange={(e) => setBaseStats({ ...baseStats, [stat]: Math.max(3, Math.min(18, parseInt(e.target.value) || 10)) })}
                                    className="w-16 bg-black border border-terminal-green text-terminal-green px-2 py-2 rounded text-center font-mono"
                                />
                                {racialBonuses[stat] > 0 && (
                                    <span className="text-cyan-400 text-sm font-bold">+{racialBonuses[stat]}</span>
                                )}
                                <span className="ml-auto font-bold text-terminal-green-bright">
                                    = {finalStats[stat]} <span className="text-xs">({formatModifier(calculateModifier(finalStats[stat]))})</span>
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Computed Stats Preview */}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-terminal-green/20">
                <div className="bg-red-900/20 rounded-lg p-3 text-center border border-red-500/30">
                    <div className="text-xs text-red-400 mb-1">HIT POINTS</div>
                    <div className="text-3xl font-bold text-red-300">{maxHp}</div>
                </div>
                <div className="bg-blue-900/20 rounded-lg p-3 text-center border border-blue-500/30">
                    <div className="text-xs text-blue-400 mb-1">ARMOR CLASS</div>
                    <div className="text-3xl font-bold text-blue-300">{baseAc}</div>
                    <div className="text-xs text-blue-400/60">unarmored</div>
                </div>
            </div>
        </div>
    );

    const renderDetailsStep = () => (
        <div className="space-y-5 animate-fadeIn">
            {/* Portrait Color Selection */}
            <div>
                <label className="block text-sm font-bold text-terminal-green mb-3">
                    CHARACTER COLOR <span className="text-xs font-normal text-terminal-green/60">(for tokens & UI)</span>
                </label>
                <div className="flex flex-wrap gap-3">
                    {PORTRAIT_COLORS.map((color) => (
                        <button
                            key={color.name}
                            onClick={() => setPortraitColor(color)}
                            className={`w-12 h-12 rounded-lg transition-all ${
                                portraitColor.name === color.name
                                    ? 'ring-2 ring-white ring-offset-2 ring-offset-black scale-110'
                                    : 'hover:scale-105'
                            }`}
                            style={{ 
                                backgroundColor: color.bg, 
                                border: `3px solid ${color.border}`,
                                boxShadow: portraitColor.name === color.name ? `0 0 20px ${color.border}` : 'none'
                            }}
                            title={color.name}
                        />
                    ))}
                </div>
                <p className="text-xs text-terminal-green/50 mt-2">Selected: {portraitColor.name}</p>
            </div>

            {/* Character Portrait Preview */}
            <div className="flex justify-center">
                <div 
                    className="w-32 h-32 rounded-full flex items-center justify-center text-5xl shadow-lg"
                    style={{ 
                        backgroundColor: portraitColor.bg, 
                        border: `4px solid ${portraitColor.border}`,
                        boxShadow: `0 0 30px ${portraitColor.border}40`
                    }}
                >
                    {CLASSES[charClass].icon}
                </div>
            </div>

            {/* Background Story */}
            <div>
                <label className="block text-sm font-bold text-terminal-green mb-2">
                    BACKGROUND STORY <span className="text-xs font-normal text-terminal-green/60">(optional)</span>
                </label>
                <textarea
                    value={background}
                    onChange={(e) => setBackground(e.target.value)}
                    placeholder="Describe your character's history, motivations, and personality..."
                    className="w-full h-32 bg-black border border-terminal-green/50 text-terminal-green px-4 py-3 rounded-lg focus:outline-none focus:border-terminal-green-bright resize-none"
                    maxLength={500}
                />
                <div className="text-xs text-terminal-green/50 text-right mt-1">
                    {background.length}/500
                </div>
            </div>

            {/* Racial Traits Summary */}
            {RACES[race].traits && (
                <div className="border border-terminal-green/30 rounded-lg p-4 bg-terminal-green/5">
                    <h4 className="font-bold text-sm text-terminal-green mb-2">🧬 Racial Traits</h4>
                    <div className="flex flex-wrap gap-2">
                        {RACES[race].traits?.map(trait => (
                            <span key={trait} className="px-3 py-1 bg-terminal-green/10 border border-terminal-green/30 rounded-full text-xs">
                                {trait}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    const renderReviewStep = () => (
        <div className="space-y-4 animate-fadeIn">
            {/* Character Card */}
            <div 
                className="rounded-xl p-5 border-2"
                style={{ 
                    backgroundColor: `${portraitColor.bg}20`,
                    borderColor: portraitColor.border 
                }}
            >
                <div className="flex items-start gap-4">
                    {/* Portrait */}
                    <div 
                        className="w-20 h-20 rounded-full flex items-center justify-center text-3xl flex-shrink-0"
                        style={{ 
                            backgroundColor: portraitColor.bg, 
                            border: `3px solid ${portraitColor.border}`,
                            boxShadow: `0 0 15px ${portraitColor.border}40`
                        }}
                    >
                        {CLASSES[charClass].icon}
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1">
                        <h3 className="text-2xl font-bold text-white">{name || 'Unnamed Hero'}</h3>
                        <p className="text-terminal-green/80">
                            Level {level} {RACES[race].name} {CLASSES[charClass].name}
                        </p>
                        <p className="text-xs text-terminal-green/50 mt-1">
                            Speed: {RACES[race].speed}ft
                        </p>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="bg-red-900/30 rounded-lg p-3 text-center">
                        <div className="text-xs text-red-400">HP</div>
                        <div className="text-2xl font-bold text-red-300">{maxHp}</div>
                    </div>
                    <div className="bg-blue-900/30 rounded-lg p-3 text-center">
                        <div className="text-xs text-blue-400">AC</div>
                        <div className="text-2xl font-bold text-blue-300">{baseAc}</div>
                    </div>
                </div>

                {/* Ability Scores */}
                <div className="grid grid-cols-6 gap-2 mt-4">
                    {STAT_NAMES.map(stat => (
                        <div key={stat} className="bg-black/40 rounded-lg p-2 text-center">
                            <div className="text-xs text-terminal-green/60">{stat.toUpperCase()}</div>
                            <div className="text-lg font-bold">{finalStats[stat]}</div>
                            <div className="text-xs text-cyan-400">{formatModifier(calculateModifier(finalStats[stat]))}</div>
                        </div>
                    ))}
                </div>

                {/* Traits */}
                {RACES[race].traits && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                        <div className="text-xs text-terminal-green/60 mb-2">Racial Traits</div>
                        <div className="flex flex-wrap gap-1">
                            {RACES[race].traits?.map(trait => (
                                <span key={trait} className="px-2 py-0.5 bg-terminal-green/10 rounded text-xs">
                                    {trait}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Background */}
                {background && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                        <div className="text-xs text-terminal-green/60 mb-1">Background</div>
                        <p className="text-sm text-terminal-green/80 italic">"{background}"</p>
                    </div>
                )}
            </div>

            {error && (
                <div className="bg-red-900/30 border border-red-500 rounded-lg p-3 text-red-300 text-sm">
                    ⚠️ {error}
                </div>
            )}
        </div>
    );

    const canProceed = () => {
        if (step === 'basics') return isBasicsValid && isHalfElfValid;
        if (step === 'abilities') return isAbilitiesValid;
        if (step === 'details') return true;
        return true;
    };

    const goNext = () => {
        const idx = steps.indexOf(step);
        if (idx < steps.length - 1) setStep(steps[idx + 1]);
    };

    const goBack = () => {
        const idx = steps.indexOf(step);
        if (idx > 0) setStep(steps[idx - 1]);
    };

    return (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-terminal-black border-2 border-terminal-green rounded-xl w-full max-w-xl max-h-[90vh] overflow-hidden shadow-[0_0_50px_rgba(0,255,0,0.3)] flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-terminal-green/30 bg-terminal-green/5">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-xl font-bold text-terminal-green flex items-center gap-2">
                            ⚔️ CREATE CHARACTER
                        </h2>
                        <button
                            onClick={() => { resetForm(); onClose(); }}
                            className="w-8 h-8 rounded-full border border-terminal-green/50 text-terminal-green hover:bg-terminal-green/20 transition-colors flex items-center justify-center"
                        >
                            ✕
                        </button>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="flex gap-1">
                        {steps.map((s, i) => (
                            <div key={s} className="flex-1 flex items-center">
                                <div
                                    className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                                        i <= currentStepIndex ? 'bg-terminal-green' : 'bg-terminal-green/20'
                                    }`}
                                />
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between mt-2">
                        {steps.map((s, i) => (
                            <span key={s} className={`text-xs uppercase ${i === currentStepIndex ? 'text-terminal-green font-bold' : 'text-terminal-green/40'}`}>
                                {s}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5">
                    {step === 'basics' && renderBasicsStep()}
                    {step === 'abilities' && renderAbilitiesStep()}
                    {step === 'details' && renderDetailsStep()}
                    {step === 'review' && renderReviewStep()}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-terminal-green/30 bg-terminal-green/5 flex gap-3">
                    <button
                        onClick={() => { resetForm(); onClose(); }}
                        className="px-4 py-2 border border-terminal-green/50 text-terminal-green rounded-lg hover:bg-terminal-green/10 transition-colors"
                    >
                        Cancel
                    </button>
                    
                    <div className="flex-1" />
                    
                    {currentStepIndex > 0 && (
                        <button
                            onClick={goBack}
                            className="px-4 py-2 border border-terminal-green/50 text-terminal-green rounded-lg hover:bg-terminal-green/10 transition-colors"
                        >
                            ← Back
                        </button>
                    )}
                    
                    {step !== 'review' ? (
                        <button
                            onClick={goNext}
                            disabled={!canProceed()}
                            className="px-6 py-2 bg-terminal-green text-black font-bold rounded-lg hover:bg-terminal-green-bright transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(0,255,0,0.3)] hover:shadow-[0_0_20px_rgba(0,255,0,0.5)]"
                        >
                            Next →
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="px-6 py-2 bg-terminal-green text-black font-bold rounded-lg hover:bg-terminal-green-bright transition-all disabled:opacity-50 shadow-[0_0_15px_rgba(0,255,0,0.3)] hover:shadow-[0_0_20px_rgba(0,255,0,0.5)] flex items-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <span className="animate-spin">⚙️</span>
                                    Creating...
                                </>
                            ) : (
                                <>✓ Create Character</>
                            )}
                        </button>
                    )}
                </div>
            </div>
            
            {/* CSS for animations */}
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.3s ease-out;
                }
            `}</style>
        </div>
    );
};
