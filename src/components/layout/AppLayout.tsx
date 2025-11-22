import React from 'react';
import { TerminalPanel } from './TerminalPanel';
import { MainViewport } from './MainViewport';

export const AppLayout: React.FC = () => {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-terminal-black relative selection:bg-terminal-green selection:text-terminal-black">
      <div className="scanline" />
      {/* Left Panel: Terminal/Chat Interface (40%) */}
      <TerminalPanel className="w-[40%] h-full shrink-0" />
      
      {/* Right Panel: Main Content Viewport (60%) */}
      <MainViewport className="w-[60%] h-full shrink-0" />
    </div>
  );
};