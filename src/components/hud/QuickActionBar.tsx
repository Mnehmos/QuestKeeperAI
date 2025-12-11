import React from 'react';
import { useHudStore } from '../../stores/hudStore';
import { useCombatStore } from '../../stores/combatStore';
import { mcpManager } from '../../services/mcpClient';

/**
 * Bottom action bar for map visualization tools.
 * Theme-aware styling.
 */
export const QuickActionBar: React.FC = () => {
    const toggleInventory = useHudStore(s => s.toggleInventory);
    const toggleSpellbook = useHudStore(s => s.toggleSpellbook);
    
    // Visualization tools from combat store
    const showLineOfSight = useCombatStore(s => s.showLineOfSight);
    const measureMode = useCombatStore(s => s.measureMode);
    const setShowLineOfSight = useCombatStore(s => s.setShowLineOfSight);
    const setMeasureMode = useCombatStore(s => s.setMeasureMode);
    const activeEncounterId = useCombatStore(s => s.activeEncounterId);

    // Clear scene handler
    const clearCombat = useCombatStore(s => s.clearCombat);
    
    const handleClearScene = () => {
        if (window.confirm('Clear the local scene? Visuals will be reset, but will re-sync with active encounter.')) {
            clearCombat(true);
        }
    };

    // End encounter handler - calls backend and clears local state
    const handleEndEncounter = async () => {
        if (!activeEncounterId) {
            alert('No active encounter to end.');
            return;
        }
        
        if (window.confirm('End this encounter? This will finalize combat and clear the battlefield.')) {
            try {
                await mcpManager.gameStateClient.callTool('end_encounter', { 
                    encounterId: activeEncounterId 
                });
                clearCombat(false); // Full clear including encounter ID
                console.log('[QuickActionBar] Encounter ended:', activeEncounterId);
            } catch (e) {
                console.error('[QuickActionBar] Failed to end encounter:', e);
                alert('Failed to end encounter. Check console for details.');
            }
        }
    };

    return (
        <div className="flex gap-2 p-2 bg-terminal-dim/95 rounded-sm border border-terminal-green-dim shadow-2xl animate-fade-in-up">
            <ActionButton 
                label="Inventory" 
                icon="🎒" 
                onClick={toggleInventory} 
            />
            <ActionButton 
                label="Spellbook" 
                icon="📖" 
                onClick={toggleSpellbook}
            />
            <ActionButton 
                label="Line of Sight" 
                icon="👁️" 
                onClick={() => setShowLineOfSight(!showLineOfSight)}
                active={showLineOfSight}
            />
            <ActionButton 
                label="Distance" 
                icon="📏" 
                onClick={() => setMeasureMode(!measureMode)}
                active={measureMode}
            />
            <ActionButton 
                label="Clear Scene" 
                icon="🗑️" 
                onClick={handleClearScene}
            />
            <ActionButton 
                label="End Combat" 
                icon="⚔️" 
                onClick={handleEndEncounter}
                disabled={!activeEncounterId}
            />
        </div>
    );
};

interface ActionButtonProps {
    label: string;
    icon: string;
    onClick: () => void;
    active?: boolean;
    disabled?: boolean;
}

const ActionButton: React.FC<ActionButtonProps> = ({ label, icon, onClick, active, disabled }) => (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={`
        flex flex-col items-center justify-center
        w-20 h-14 rounded-sm transition-all border font-mono
        ${disabled 
            ? 'opacity-30 cursor-not-allowed bg-terminal-dim border-terminal-green-dim text-terminal-green-dim' 
            : active
                ? 'bg-terminal-green/20 border-terminal-green text-terminal-green-bright shadow-[0_0_10px_rgba(0,255,65,0.2)]'
                : 'bg-terminal-green/10 hover:bg-terminal-green/20 border-terminal-green-dim text-terminal-green hover:text-terminal-green-bright'
        }
        active:scale-95
      `}
    >
        <span className="text-xl mb-1 filter drop-shadow-md">{icon}</span>
        <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
    </button>
);
