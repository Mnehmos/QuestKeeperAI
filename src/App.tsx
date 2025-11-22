import { useEffect } from "react";
import { AppLayout } from "./components/layout/AppLayout";
import { mcpManager } from "./services/mcpClient";
import { useGameStateStore } from "./stores/gameStateStore";
import { useCombatStore } from "./stores/combatStore";
import "./App.css";

function App() {
  const syncState = useGameStateStore((state) => state.syncState);
  const syncCombatState = useCombatStore((state) => state.syncCombatState);

  useEffect(() => {
    const initMcp = async () => {
      try {
        await mcpManager.initializeAll();
        console.log("[App] MCP Initialized successfully");
        
        // Initial sync
        console.log("[App] Starting initial state sync...");
        syncState();
        syncCombatState();
      } catch (error) {
        console.error("[App] Failed to initialize MCP:", error);
      }
    };
    initMcp();

    // Poll for game state updates every 5 seconds
    const interval = setInterval(() => {
      syncState();
      syncCombatState();
    }, 5000);

    return () => clearInterval(interval);
  }, [syncState, syncCombatState]);

  return (
    <AppLayout />
  );
}

export default App;
