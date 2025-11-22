# Phase 2 UI Design: Terminal & Split Screen

**Status:** Draft
**Date:** 2025-11-19
**Based on:** `docs/architecture/master_spec.md`

## 1. Executive Summary

Phase 2 focuses on establishing the core visual interface of Quest Keeper AI. The goal is a "Retro-Futuristic" terminal aesthetic that splits the screen between a conversational interface (the "Terminal") and a visual workspace (the "Viewport").

## 2. Visual Style (Tailwind Theme)

We will use a custom Tailwind configuration to enforce the CRT/Terminal aesthetic.

### 2.1 Color Palette
*   **Backgrounds:**
    *   `bg-terminal-black`: `#0a0a0a` (Deep CRT black)
    *   `bg-terminal-dim`: `#1a1a1a` (Panel backgrounds)
*   **Foregrounds:**
    *   `text-terminal-green`: `#00ff41` (Standard output)
    *   `text-terminal-amber`: `#ffb000` (Warnings/Highlights)
    *   `text-terminal-cyan`: `#00f0ff` (System notices)
*   **Borders:**
    *   `border-terminal-green-dim`: `#003300`

### 2.2 Typography
*   **Font Family:** `font-mono` (Defaulting to 'Fira Code', 'Courier New', monospace).
*   **Sizing:** Text should be slightly larger than standard web apps to mimic console readouts (e.g., `text-lg`).

### 2.3 Utility Classes Strategy
We will define custom `@layer components` in `index.css` (or `App.css`) for reusable patterns:
*   `.scanline`: CSS overlay for CRT scanline effect.
*   `.text-glow`: Text-shadow effect for active terminal output.

## 3. Component Hierarchy

The application will follow a strict split-screen layout.

```tsx
<App>
  <AppLayout>
    {/* Left Panel: 40% width */}
    <TerminalPanel>
      <MessageHistory>
        <MessageItem variant="user" />
        <MessageItem variant="ai" />
        <MessageItem variant="system" /> {/* Dice rolls, hidden logic */}
      </MessageHistory>
      <InputArea />
    </TerminalPanel>

    {/* Right Panel: 60% width */}
    <MainViewport>
      <TabBar>
        <TabTrigger value="3d">Visualizer</TabTrigger>
        <TabTrigger value="sheet">Character</TabTrigger>
        <TabTrigger value="world">World State</TabTrigger>
      </TabBar>
      
      <TabContent value="3d">
        <ThreeCanvas /> {/* Phase 3 */}
      </TabContent>
      <TabContent value="sheet">
        <CharacterSheet /> {/* Future Phase */}
      </TabContent>
    </MainViewport>
  </AppLayout>
</App>
```

### 3.1 Core Components Breakdown

1.  **`AppLayout`**:
    *   **Responsibility**: CSS Grid or Flex container managing the 40/60 split.
    *   **Props**: `children`.
    *   **Responsive**: Collapses to stacked on very small screens (though Desktop is primary target).

2.  **`TerminalPanel`**:
    *   **Responsibility**: Hosts the chat experience.
    *   **State**: Auto-scroll logic.

3.  **`MessageItem`**:
    *   **Props**: `content` (string), `sender` ('user' | 'ai' | 'system'), `timestamp`.
    *   **Rendering**: Supports Markdown rendering for AI responses.

4.  **`MainViewport`**:
    *   **Responsibility**: Switchable context container.
    *   **State**: Tracks `activeTab`.

## 4. State Management Strategy

We will use **Zustand** for global client state management due to its simplicity and small footprint.

### 4.1 Stores

**`useUIStore`**:
*   `activeTab`: '3d' | 'sheet' | 'world'
*   `isSidebarOpen`: boolean (if we add a settings sidebar)
*   `theme`: 'green' | 'amber' (optional color switching)

**`useChatStore`**:
*   `messages`: Array<{ id, sender, content, timestamp, metadata? }>
*   `isTyping`: boolean
*   `addMessage(msg)`: Action
*   `clearHistory()`: Action

**`useGameStateStore` (Future Phase)**:
*   Syncs data from the `rpg-game-state-server` sidecar.

## 5. File Structure for Phase 2

```text
src/
  components/
    layout/
      AppLayout.tsx
      SplitPane.tsx
    terminal/
      TerminalPanel.tsx
      MessageList.tsx
      MessageItem.tsx
      InputArea.tsx
    viewport/
      MainViewport.tsx
      TabBar.tsx
  stores/
    useUIStore.ts
    useChatStore.ts
  types/
    chat.ts
  App.tsx
```

## 6. Implementation Steps (Phase 2)

1.  **Install Dependencies**: `zustand`, `clsx`, `tailwind-merge` (for styling).
2.  **Setup Tailwind**: Configure `tailwind.config.js` with the "Retro" theme colors.
3.  **Create Stores**: Implement `useUIStore` and `useChatStore`.
4.  **Scaffold Layout**: Build `AppLayout` with the 40/60 split.
5.  **Build Terminal**: Implement the chat interface with dummy data.
6.  **Build Viewport**: Implement the tab switching logic (with placeholder tabs).