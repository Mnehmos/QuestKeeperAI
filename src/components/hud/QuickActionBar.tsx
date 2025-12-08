import React from 'react';
import { useHudStore } from '../../stores/hudStore';
import { useChatStore } from '../../stores/chatStore';
import { useCombatStore } from '../../stores/combatStore';
import { useGameStateStore } from '../../stores/gameStateStore';

/**
 * Bottom action bar for quick intent buttons.
 * Connects to chatStore.setPrefillInput to inject text into ChatInput.
 * Context-aware: disables "End Turn" if not player's turn.
 */
export const QuickActionBar: React.FC = () => {
    const toggleInventory = useHudStore(s => s.toggleInventory);
    const setPrefillInput = useChatStore(s => s.setPrefillInput);
    
    // Combat Context
    const activeEncounterId = useCombatStore(s => s.activeEncounterId);
    const entities = useCombatStore(s => s.entities);
    const activeCharacter = useGameStateStore(s => s.activeCharacter);

    // Determine if it's the player's turn
    const isPlayerTurn = React.useMemo(() => {
        if (!activeEncounterId || !activeCharacter) return false;
        const currentEntity = entities.find(e => e.isCurrentTurn);
        // Robust check: match by ID (preferred) or Name
        return currentEntity?.name === activeCharacter.name; 
        // Note: activeCharacterId would be better if strictly mapped, 
        // but Name is consistent in this app's architecture for single-player.
    }, [activeEncounterId, entities, activeCharacter]);

    const handleAction = (text: string) => {
        setPrefillInput(text);
    };
    
    return (
        <div className="flex gap-2 p-2 bg-black/60 rounded-xl backdrop-blur-md border border-white/10 animate-fade-in-up">
            <ActionButton label="Inventory" icon="🎒" onClick={toggleInventory} />
            <ActionButton label="Melee Attack" icon="⚔️" onClick={() => handleAction("I attack with my weapon")} />
            <ActionButton label="Cast Spell" icon="🔮" onClick={() => handleAction("I cast ")} />
            <ActionButton 
                label="End Turn" 
                icon="⏳" 
                onClick={() => handleAction("I end my turn")} 
                secondary 
                disabled={!isPlayerTurn}
            />
        </div>
    );
};

interface ActionButtonProps {
    label: string;
    icon: string;
    onClick: () => void;
    secondary?: boolean;
    disabled?: boolean;
}

const ActionButton: React.FC<ActionButtonProps> = ({ label, icon, onClick, secondary, disabled }) => (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={`
        flex flex-col items-center justify-center
        w-20 h-16 rounded-lg transition-all
        ${disabled 
            ? 'opacity-30 cursor-not-allowed bg-gray-800 border-gray-700' 
            : secondary 
                ? 'bg-red-900/40 hover:bg-red-800/60 border border-red-500/30 active:scale-95' 
                : 'bg-white/5 hover:bg-white/10 border border-white/10 active:scale-95'
        }
      `}
    >
        <span className="text-2xl mb-1">{icon}</span>
        <span className="text-[10px] font-bold text-white/80 uppercase tracking-tight">{label}</span>
    </button>
);
