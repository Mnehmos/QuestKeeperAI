import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useGameStateStore } from '../../stores/gameStateStore';
import { mcpManager } from '../../services/mcpClient';

// Biome color mapping
const BIOME_COLORS: Record<string, string> = {
  ocean: '#1a5f7a',
  deep_ocean: '#0d3d54',
  lake: '#4169e1',  // Royal blue for lakes
  hot_desert: '#c2b280',
  savanna: '#bdb76b',
  tropical_rainforest: '#228b22',
  grassland: '#7cba3d',
  temperate_deciduous_forest: '#2d5a27',
  wetland: '#556b2f',
  taiga: '#2e8b57',
  tundra: '#b0c4de',
  glacier: '#e0ffff',
  mountain: '#8b8b8b',
  desert: '#d4a574',
  forest: '#228b22',
  plains: '#90b060',
  swamp: '#4a5d23',
  beach: '#f0e68c',
  snow: '#fffafa',
};

// Structure icons
const STRUCTURE_ICONS: Record<string, string> = {
  city: '\u{1F3D9}',
  town: '\u{1F3D8}',
  village: '\u{1F3E0}',
  castle: '\u{1F3F0}',
  ruins: '\u{1F3DA}',
  dungeon: '\u{2694}',
  temple: '\u{26EA}',
};

interface TileData {
  width: number;
  height: number;
  biomes: string[];
  tiles: number[][];
  regions: Array<{
    id: number;
    name: string;
    biome: string;
    capitalX: number;
    capitalY: number;
  }>;
  structures: Array<{
    type: string;
    name: string;
    x: number;
    y: number;
  }>;
}

interface TooltipData {
  x: number;
  y: number;
  biome: string;
  elevation: number;
  region: string | null;
  structure: { type: string; name: string } | null;
  hasRiver: boolean;
}

export const WorldMapCanvas: React.FC = () => {
  const activeWorldId = useGameStateStore((state) => state.activeWorldId);
  const worlds = useGameStateStore((state) => state.worlds);
  const [tileData, setTileData] = useState<TileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingTime, setLoadingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const loadingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fetchInProgressRef = useRef(false); // Prevent double-fetch in StrictMode
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const TILE_SIZE = 10; // Base tile size in pixels

  // Get active world info for display
  const activeWorld = worlds.find(w => w.id === activeWorldId);

  // Fetch tile data from MCP
  const fetchTileData = useCallback(async () => {
    if (!activeWorldId) {
      setError('No world selected');
      setLoading(false);
      return;
    }

    // Prevent duplicate fetches (StrictMode causes double effect invocation)
    if (fetchInProgressRef.current) {
      console.log('[WorldMapCanvas] Fetch already in progress, skipping duplicate');
      return;
    }
    fetchInProgressRef.current = true;

    setLoading(true);
    setError(null);
    setLoadingTime(0);

    // Start loading timer
    const startTime = Date.now();
    loadingTimerRef.current = setInterval(() => {
      setLoadingTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    try {
      if (!mcpManager.gameStateClient.isConnected()) {
        throw new Error('MCP client not available');
      }

      console.log('[WorldMapCanvas] Fetching tiles for world:', activeWorldId);
      const result = await mcpManager.gameStateClient.callTool('get_world_tiles', { worldId: activeWorldId });

      // Parse the response
      const content = result.content?.[0];
      if (content?.type === 'text') {
        const data = JSON.parse(content.text);
        console.log('[WorldMapCanvas] Received tile data:', data.width, 'x', data.height);
        setTileData(data);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('[WorldMapCanvas] Failed to fetch tiles:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to load map';
      
      // Provide more helpful error messages
      if (errorMsg.includes('timed out')) {
        setError('World generation timed out. Large worlds with complex terrain (lakes, rivers) may take longer to generate. Try again or select a smaller world.');
      } else {
        setError(errorMsg);
      }
    } finally {
      setLoading(false);
      fetchInProgressRef.current = false;
      if (loadingTimerRef.current) {
        clearInterval(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }
    }
  }, [activeWorldId]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (loadingTimerRef.current) {
        clearInterval(loadingTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    fetchTileData();
  }, [fetchTileData]);

  // Draw the map on canvas
  useEffect(() => {
    if (!tileData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height, biomes, tiles, structures } = tileData;
    const tileSize = TILE_SIZE * zoom;

    // Set canvas size
    canvas.width = width * tileSize;
    canvas.height = height * tileSize;

    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw tiles
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tileIdx = x * 5; // Each tile has 5 values
        const row = tiles[y];
        if (!row) continue;

        const biomeIdx = row[tileIdx];
        const elevation = row[tileIdx + 1];
        // regionId at row[tileIdx + 2], hasStructure at row[tileIdx + 4] - used for tooltips
        const hasRiver = row[tileIdx + 3] === 1;

        const biomeName = biomes[biomeIdx] || 'unknown';
        const color = BIOME_COLORS[biomeName] || '#666666';

        // Adjust color based on elevation (skip for water biomes - keep uniform)
        const isWater = biomeName === 'ocean' || biomeName === 'deep_ocean' || biomeName === 'lake';
        if (isWater) {
          ctx.fillStyle = color;
        } else {
          const elevMod = (elevation - 50) / 100;
          ctx.fillStyle = adjustBrightness(color, elevMod * 30);
        }
        ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);

        // Draw river overlay (full tile with transparency)
        if (hasRiver && !isWater) {
          ctx.fillStyle = 'rgba(30, 144, 255, 0.5)';
          ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
        }
      }
    }

    // Draw structures
    ctx.font = `${Math.max(12, tileSize)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    structures.forEach((struct) => {
      const icon = STRUCTURE_ICONS[struct.type] || '\u{1F3DB}';
      ctx.fillText(icon, struct.x * tileSize + tileSize / 2, struct.y * tileSize + tileSize / 2);
    });

    // Draw grid lines if zoomed in enough
    if (zoom >= 1.5) {
      ctx.strokeStyle = 'rgba(0, 255, 65, 0.2)';
      ctx.lineWidth = 0.5;
      for (let x = 0; x <= width; x++) {
        ctx.beginPath();
        ctx.moveTo(x * tileSize, 0);
        ctx.lineTo(x * tileSize, height * tileSize);
        ctx.stroke();
      }
      for (let y = 0; y <= height; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * tileSize);
        ctx.lineTo(width * tileSize, y * tileSize);
        ctx.stroke();
      }
    }
  }, [tileData, zoom]);

  // Handle mouse move for tooltips
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!tileData || !canvasRef.current || isDragging) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const tileSize = TILE_SIZE * zoom;

    // getBoundingClientRect already accounts for CSS transform, so don't add offset
    const x = Math.floor((e.clientX - rect.left) / tileSize);
    const y = Math.floor((e.clientY - rect.top) / tileSize);

    if (x < 0 || x >= tileData.width || y < 0 || y >= tileData.height) {
      setTooltip(null);
      return;
    }

    const row = tileData.tiles[y];
    if (!row) return;

    const tileIdx = x * 5;
    const biomeIdx = row[tileIdx];
    const elevation = row[tileIdx + 1];
    const regionId = row[tileIdx + 2];
    const hasRiver = row[tileIdx + 3] === 1;

    const region = tileData.regions.find(r => r.id === regionId);
    const structure = tileData.structures.find(s => s.x === x && s.y === y);

    setTooltip({
      x,
      y,
      biome: tileData.biomes[biomeIdx] || 'unknown',
      elevation,
      region: region?.name || null,
      structure: structure || null,
      hasRiver,
    });

    setTooltipPos({
      x: e.clientX - rect.left + 15,
      y: e.clientY - rect.top + 15,
    });
  }, [tileData, zoom, isDragging]);

  // Handle zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(prev => Math.min(4, Math.max(0.5, prev + delta)));
  }, []);

  // Handle pan
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    }
  }, [offset]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrag = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  }, [isDragging, dragStart]);

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center font-mono text-terminal-green">
        <div className="text-center max-w-md">
          <div className="text-4xl mb-4 animate-pulse">{'🌍'}</div>
          <div className="text-xl mb-2">Generating World Map...</div>
          {activeWorld && (
            <div className="text-sm text-terminal-green/70 mb-4">
              {activeWorld.name} ({activeWorld.width}×{activeWorld.height} tiles)
            </div>
          )}
          <div className="text-lg text-terminal-green-bright mb-2">
            {loadingTime}s elapsed
          </div>
          <div className="text-xs text-terminal-green/50 space-y-1">
            <p>Generating terrain, rivers, and lakes...</p>
            {loadingTime > 10 && (
              <p className="text-yellow-500/70">Large worlds with complex hydrology may take 30-60 seconds</p>
            )}
            {loadingTime > 30 && (
              <p className="text-orange-500/70">Still working... The lake/river algorithms are computationally intensive</p>
            )}
          </div>
          {/* Progress bar animation */}
          <div className="mt-4 w-64 mx-auto h-2 bg-terminal-green/20 rounded overflow-hidden">
            <div 
              className="h-full bg-terminal-green animate-pulse"
              style={{ 
                width: `${Math.min(95, loadingTime * 1.5)}%`,
                transition: 'width 1s ease-out'
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full w-full flex items-center justify-center font-mono text-terminal-green">
        <div className="text-center max-w-md">
          <div className="text-4xl mb-4">{'⚠️'}</div>
          <div className="text-xl mb-4 text-red-500">Map Loading Failed</div>
          <div className="text-sm text-terminal-green/70 mb-4 whitespace-pre-wrap">{error}</div>
          <button
            onClick={fetchTileData}
            className="px-4 py-2 bg-terminal-green text-terminal-black font-bold uppercase hover:bg-terminal-green-bright transition-colors"
          >
            {'🔄'} Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!tileData) {
    return (
      <div className="h-full w-full flex items-center justify-center font-mono text-terminal-green">
        <div className="text-center text-terminal-green/60">
          No world map data available
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col font-mono text-terminal-green overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center p-3 border-b border-terminal-green-dim flex-shrink-0">
        <h2 className="text-xl font-bold uppercase tracking-wider text-glow">
          {'🗺️'} World Map
        </h2>
        <div className="flex items-center gap-4">
          <span className="text-sm text-terminal-green/70">
            {tileData.width}×{tileData.height} tiles | {tileData.structures.length} structures | {tileData.regions.length} regions
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setZoom(prev => Math.max(0.5, prev - 0.25))}
              className="px-2 py-1 bg-terminal-green/10 border border-terminal-green hover:bg-terminal-green/20"
            >
              -
            </button>
            <span className="text-sm w-16 text-center">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom(prev => Math.min(4, prev + 0.25))}
              className="px-2 py-1 bg-terminal-green/10 border border-terminal-green hover:bg-terminal-green/20"
            >
              +
            </button>
          </div>
          <button
            onClick={fetchTileData}
            className="px-3 py-1 text-xs bg-terminal-green/10 border border-terminal-green hover:bg-terminal-green/20 transition-colors uppercase tracking-wider"
          >
            {'🔄'} Refresh
          </button>
        </div>
      </div>

      {/* Map Container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden relative bg-terminal-black cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onMouseMove={handleDrag}
      >
        <canvas
          ref={canvasRef}
          className="absolute"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px)`,
            imageRendering: 'pixelated',
          }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setTooltip(null)}
          onWheel={handleWheel}
        />

        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute pointer-events-none bg-terminal-black/90 border border-terminal-green p-2 text-xs z-50"
            style={{ left: tooltipPos.x, top: tooltipPos.y }}
          >
            <div className="font-bold text-terminal-green-bright mb-1">
              ({tooltip.x}, {tooltip.y})
            </div>
            <div className="space-y-0.5">
              <div><span className="text-terminal-green/60">Biome:</span> {tooltip.biome.replace(/_/g, ' ')}</div>
              <div><span className="text-terminal-green/60">Elevation:</span> {tooltip.elevation}</div>
              {tooltip.region && (
                <div><span className="text-terminal-green/60">Region:</span> {tooltip.region}</div>
              )}
              {tooltip.hasRiver && (
                <div className="text-blue-400">{'🌊'} River</div>
              )}
              {tooltip.structure && (
                <div className="text-yellow-400 font-bold">
                  {STRUCTURE_ICONS[tooltip.structure.type]} {tooltip.structure.name}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="p-2 border-t border-terminal-green-dim flex-shrink-0">
        <div className="flex flex-wrap gap-3 text-xs">
          {Object.entries(BIOME_COLORS).slice(0, 8).map(([biome, color]) => (
            <div key={biome} className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
              <span className="text-terminal-green/70 capitalize">{biome.replace(/_/g, ' ')}</span>
            </div>
          ))}
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-500 rounded-sm" />
            <span className="text-terminal-green/70">River</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper to adjust color brightness
function adjustBrightness(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + percent));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + percent));
  const b = Math.min(255, Math.max(0, (num & 0x0000FF) + percent));
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

export default WorldMapCanvas;
