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

    // Poll for game state updates every 30 seconds (reduced from 5s)
    // Note: State is now synced automatically after LLM tool calls, 
    // so this is just a backup for any changes made outside the LLM flow
    const interval = setInterval(() => {
      syncState();
      syncCombatState();
    }, 30000);

    return () => clearInterval(interval);
  }, []); // Empty dependency array to run only once on mount

  return (
    <AppLayout />
  );
}

export default App;
