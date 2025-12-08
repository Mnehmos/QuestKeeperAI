import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useGameStateStore } from '../../stores/gameStateStore';
import { usePartyStore } from '../../stores/partyStore';
import { mcpManager } from '../../services/mcpClient';
import { WorldEnvironmentOverlay } from './WorldEnvironmentOverlay';
import { POIDetailPanel } from './POIDetailPanel';

// Biome color mapping
const BIOME_COLORS: Record<string, string> = {
  ocean: '#1a5f7a',
  deep_ocean: '#0d3d54',
  lake: '#4169e1',
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
  city: '🏙️',
  town: '🏘️',
  village: '🏠',
  castle: '🏰',
  ruins: '🏛️',
  dungeon: '⚔️',
  temple: '⛪',
  camp: '⛺',
  landmark: '🗿',
  shrine: '⛩️',
  fortress: '🏰',
};

type VisualizationMode = 'biomes' | 'heightmap' | 'temperature' | 'moisture' | 'rivers';

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

const TILE_SIZE = 10;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 6;
const ZOOM_STEP = 0.15;

export const WorldMapCanvas: React.FC = () => {
  const activeWorldId = useGameStateStore((state) => state.activeWorldId);
  const setActiveWorldId = useGameStateStore((state) => state.setActiveWorldId);
  const worlds = useGameStateStore((state) => state.worlds);
  const world = useGameStateStore((state) => state.world);

  // Party store for position tracking
  const activePartyId = usePartyStore((state) => state.activePartyId);
  const getActivePartyPosition = usePartyStore((state) => state.getActivePartyPosition);
  const moveParty = usePartyStore((state) => state.moveParty);
  const isPartyLoading = usePartyStore((state) => state.isLoading);
  
  const [tileData, setTileData] = useState<TileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingTime, setLoadingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [selectedPOI, setSelectedPOI] = useState<{ type: string; name: string; x: number; y: number } | null>(null);
  const [hoveredPOI, setHoveredPOI] = useState<{ x: number; y: number } | null>(null);
  const [visualizationMode, setVisualizationMode] = useState<VisualizationMode>('biomes');
  const [isMovingParty, setIsMovingParty] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const loadingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fetchInProgressRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Pan & Zoom state
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  
  // Container size for minimap (updated on resize)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const activeWorld = worlds.find(w => w.id === activeWorldId);

  // Get party position - memoized to avoid unnecessary re-renders
  const partyPosition = getActivePartyPosition();

  // Track container size
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Get tile color based on visualization mode
  const getTileColor = useCallback((
    biomeName: string,
    elevation: number,
    hasRiver: boolean,
    mode: VisualizationMode
  ): string => {
    const isWater = biomeName === 'ocean' || biomeName === 'deep_ocean' || biomeName === 'lake';

    switch (mode) {
      case 'heightmap': {
        const gray = Math.floor((elevation / 100) * 255);
        return `rgb(${gray}, ${gray}, ${gray})`;
      }

      case 'temperature': {
        const temp = 100 - elevation * 0.3;
        const normalized = Math.max(0, Math.min(100, temp)) / 100;
        const r = Math.floor(normalized * 255);
        const b = Math.floor((1 - normalized) * 255);
        return `rgb(${r}, 0, ${b})`;
      }

      case 'moisture': {
        if (isWater) return '#1e90ff';
        if (hasRiver) return '#4682b4';
        
        const moisture = hasRiver ? 80 : elevation > 70 ? 20 : 50;
        const normalized = moisture / 100;
        const r = Math.floor(139 + (222 - 139) * (1 - normalized));
        const g = Math.floor(69 + (184 - 69) * (1 - normalized));
        const b = Math.floor(19 + (135 - 19) * normalized);
        return `rgb(${r}, ${g}, ${b})`;
      }

      case 'rivers': {
        if (hasRiver) return '#1e90ff';
        if (isWater) return '#0066cc';
        return '#1a1a1a';
      }

      case 'biomes':
      default: {
        if (hasRiver) return '#4682b4'; // Steel Blue for rivers
        
        const color = BIOME_COLORS[biomeName] || '#666666';
        if (isWater) return color;
        
        const elevMod = (elevation - 50) / 100;
        return adjustBrightness(color, elevMod * 30);
      }
    }
  }, []);

  // Reset view to center the map
  const resetView = useCallback(() => {
    if (!containerRef.current || !tileData) return;
    
    const container = containerRef.current;
    const canvasWidth = tileData.width * TILE_SIZE;
    const canvasHeight = tileData.height * TILE_SIZE;
    
    setZoom(1);
    setOffset({
      x: (container.clientWidth - canvasWidth) / 2,
      y: (container.clientHeight - canvasHeight) / 2,
    });
  }, [tileData]);

  // Fit map to container
  const fitToView = useCallback(() => {
    if (!containerRef.current || !tileData) return;
    
    const container = containerRef.current;
    const padding = 40;
    
    const scaleX = (container.clientWidth - padding * 2) / (tileData.width * TILE_SIZE);
    const scaleY = (container.clientHeight - padding * 2) / (tileData.height * TILE_SIZE);
    const newZoom = Math.max(MIN_ZOOM, Math.min(scaleX, scaleY, MAX_ZOOM));
    
    const canvasWidth = tileData.width * TILE_SIZE * newZoom;
    const canvasHeight = tileData.height * TILE_SIZE * newZoom;
    
    setZoom(newZoom);
    setOffset({
      x: (container.clientWidth - canvasWidth) / 2,
      y: (container.clientHeight - canvasHeight) / 2,
    });
  }, [tileData]);

  // Zoom at mouse position
  const zoomAtPoint = useCallback((newZoom: number, clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;
    
    const worldX = (mouseX - offset.x) / zoom;
    const worldY = (mouseY - offset.y) / zoom;
    
    const clampedZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, newZoom));
    
    const newOffsetX = mouseX - worldX * clampedZoom;
    const newOffsetY = mouseY - worldY * clampedZoom;
    
    setZoom(clampedZoom);
    setOffset({ x: newOffsetX, y: newOffsetY });
  }, [zoom, offset]);

  // Fetch tile data from MCP - no dependencies on callbacks that change
  const fetchTileData = useCallback(async (worldId: string) => {
    if (!worldId) {
      setError('No world selected');
      setLoading(false);
      return;
    }

    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    if (fetchInProgressRef.current) {
      console.log('[WorldMapCanvas] Fetch already in progress, skipping duplicate');
      return;
    }
    fetchInProgressRef.current = true;

    setLoading(true);
    setError(null);
    setLoadingTime(0);

    const startTime = Date.now();
    loadingTimerRef.current = setInterval(() => {
      setLoadingTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    try {
      if (!mcpManager.gameStateClient.isConnected()) {
        throw new Error('MCP client not available');
      }

      console.log('[WorldMapCanvas] Fetching tiles for world:', worldId);
      const result = await mcpManager.gameStateClient.callTool('get_world_tiles', { worldId });

      // Check if aborted
      if (abortControllerRef.current?.signal.aborted) {
        console.log('[WorldMapCanvas] Fetch aborted');
        return;
      }

      const content = result.content?.[0];
      if (content?.type === 'text') {
        const data = JSON.parse(content.text);
        console.log('[WorldMapCanvas] Received tile data:', data.width, 'x', data.height);
        setTileData(data);
        setError(null);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }
      console.error('[WorldMapCanvas] Failed to fetch tiles:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to load map';
      
      if (errorMsg.includes('timed out')) {
        setError('World generation timed out. Large worlds may take longer. Try again or select a smaller world.');
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
  }, []); // No dependencies - uses passed worldId

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (loadingTimerRef.current) {
        clearInterval(loadingTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Fetch when activeWorldId changes
  useEffect(() => {
    if (activeWorldId) {
      fetchTileData(activeWorldId);
    }
  }, [activeWorldId, fetchTileData]);

  // Fit to view when tile data is loaded
  useEffect(() => {
    if (tileData && containerRef.current) {
      // Small delay to ensure container is sized
      const timer = setTimeout(() => {
        fitToView();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [tileData]); // Intentionally not including fitToView to avoid loop

  // Draw the map on canvas
  useEffect(() => {
    if (!tileData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height, biomes, tiles, structures } = tileData;
    const tileSize = TILE_SIZE * zoom;

    canvas.width = width * tileSize;
    canvas.height = height * tileSize;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw tiles
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tileIdx = x * 5;
        const row = tiles[y];
        if (!row) continue;

        const biomeIdx = row[tileIdx];
        const elevation = row[tileIdx + 1];
        const hasRiver = row[tileIdx + 3] === 1;

        const biomeName = biomes[biomeIdx] || 'unknown';
        const color = getTileColor(biomeName, elevation, hasRiver, visualizationMode);

        ctx.fillStyle = color;
        ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
      }
    }

    // Draw structures
    structures.forEach((struct) => {
      const icon = STRUCTURE_ICONS[struct.type] || '📍';
      const x = struct.x * tileSize + tileSize / 2;
      const y = struct.y * tileSize + tileSize / 2;
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.beginPath();
      ctx.arc(x, y, tileSize * 0.8, 0, Math.PI * 2);
      ctx.fill();

      if (hoveredPOI && hoveredPOI.x === struct.x && hoveredPOI.y === struct.y) {
        ctx.shadowColor = '#00ff41';
        ctx.shadowBlur = 15;
      }

      ctx.font = `${Math.max(14, tileSize * 1.2)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(icon, x, y);
      ctx.shadowBlur = 0;
    });

    // Draw grid when zoomed in
    if (zoom >= 2) {
      ctx.strokeStyle = 'rgba(0, 255, 65, 0.15)';
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

    // Draw party marker
    if (partyPosition && partyPosition.x >= 0 && partyPosition.y >= 0 &&
        partyPosition.x < width && partyPosition.y < height) {
      const px = partyPosition.x * tileSize + tileSize / 2;
      const py = partyPosition.y * tileSize + tileSize / 2;
      const markerSize = Math.max(tileSize * 1.2, 20);

      // Outer glow/pulse effect
      ctx.save();
      ctx.shadowColor = '#ff6b00';
      ctx.shadowBlur = 20;
      ctx.fillStyle = 'rgba(255, 107, 0, 0.4)';
      ctx.beginPath();
      ctx.arc(px, py, markerSize * 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Inner circle background
      ctx.fillStyle = 'rgba(20, 20, 20, 0.9)';
      ctx.beginPath();
      ctx.arc(px, py, markerSize * 0.7, 0, Math.PI * 2);
      ctx.fill();

      // Border
      ctx.strokeStyle = '#ff6b00';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(px, py, markerSize * 0.7, 0, Math.PI * 2);
      ctx.stroke();

      // Party icon (sword crossed with shield style)
      ctx.font = `${Math.max(16, markerSize * 0.8)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚔️', px, py);
    }
  }, [tileData, zoom, visualizationMode, hoveredPOI, getTileColor, partyPosition]);

  // Handle mouse move - tooltip position relative to CONTAINER, not canvas
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!tileData || !canvasRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const tileSize = TILE_SIZE * zoom;

    // Mouse position relative to container
    const mouseX = e.clientX - containerRect.left;
    const mouseY = e.clientY - containerRect.top;

    // Calculate tile coordinates accounting for offset
    const tileX = Math.floor((mouseX - offset.x) / tileSize);
    const tileY = Math.floor((mouseY - offset.y) / tileSize);

    setLastMousePos({ x: e.clientX, y: e.clientY });

    if (tileX < 0 || tileX >= tileData.width || tileY < 0 || tileY >= tileData.height) {
      setTooltip(null);
      setHoveredPOI(null);
      return;
    }

    const structure = tileData.structures.find(s => s.x === tileX && s.y === tileY);
    setHoveredPOI(structure ? { x: tileX, y: tileY } : null);

    if (isDragging) return;

    const row = tileData.tiles[tileY];
    if (!row) return;

    const tileIdx = tileX * 5;
    const biomeIdx = row[tileIdx];
    const elevation = row[tileIdx + 1];
    const regionId = row[tileIdx + 2];
    const hasRiver = row[tileIdx + 3] === 1;

    const region = tileData.regions.find(r => r.id === regionId);

    setTooltip({
      x: tileX,
      y: tileY,
      biome: tileData.biomes[biomeIdx] || 'unknown',
      elevation,
      region: region?.name || null,
      structure: structure || null,
      hasRiver,
    });

    // Position tooltip relative to container (with bounds checking)
    const tooltipX = Math.min(mouseX + 15, containerRect.width - 180);
    const tooltipY = Math.min(mouseY + 15, containerRect.height - 120);
    
    setTooltipPos({ x: tooltipX, y: tooltipY });
  }, [tileData, zoom, offset, isDragging]);

  // Handle POI click
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!tileData || !containerRef.current || isDragging) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const tileSize = TILE_SIZE * zoom;

    const mouseX = e.clientX - containerRect.left;
    const mouseY = e.clientY - containerRect.top;

    const tileX = Math.floor((mouseX - offset.x) / tileSize);
    const tileY = Math.floor((mouseY - offset.y) / tileSize);

    const structure = tileData.structures.find(s => s.x === tileX && s.y === tileY);
    if (structure) {
      setSelectedPOI(structure);
    }
  }, [tileData, zoom, offset, isDragging]);

  // Handle wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    zoomAtPoint(zoom + delta, e.clientX, e.clientY);
  }, [zoom, zoomAtPoint]);

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

  // Handle world selection change
  const handleWorldChange = useCallback((worldId: string) => {
    if (worldId !== activeWorldId) {
      // Cancel current fetch first
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      fetchInProgressRef.current = false;
      
      setTileData(null);
      setOffset({ x: 0, y: 0 });
      setZoom(1);
      setActiveWorldId(worldId, true);
    }
  }, [activeWorldId, setActiveWorldId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedPOI) {
        setSelectedPOI(null);
        return;
      }
      
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case '+':
        case '=':
          zoomAtPoint(zoom + ZOOM_STEP, lastMousePos.x, lastMousePos.y);
          break;
        case '-':
        case '_':
          zoomAtPoint(zoom - ZOOM_STEP, lastMousePos.x, lastMousePos.y);
          break;
        case '0':
          resetView();
          break;
        case 'f':
        case 'F':
          fitToView();
          break;
        case 'p':
        case 'P':
          // Center on party
          if (containerRef.current && partyPosition) {
            const container = containerRef.current;
            const tileSize = TILE_SIZE * zoom;
            const partyX = partyPosition.x * tileSize + tileSize / 2;
            const partyY = partyPosition.y * tileSize + tileSize / 2;
            setOffset({
              x: container.clientWidth / 2 - partyX,
              y: container.clientHeight / 2 - partyY,
            });
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          setOffset(prev => ({ ...prev, y: prev.y + 50 }));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setOffset(prev => ({ ...prev, y: prev.y - 50 }));
          break;
        case 'ArrowLeft':
          e.preventDefault();
          setOffset(prev => ({ ...prev, x: prev.x + 50 }));
          break;
        case 'ArrowRight':
          e.preventDefault();
          setOffset(prev => ({ ...prev, x: prev.x - 50 }));
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPOI, zoom, lastMousePos, zoomAtPoint, resetView, fitToView, partyPosition]);

  // Calculate minimap viewport indicator
  const getMinimapViewport = useCallback(() => {
    if (!tileData || containerSize.width === 0) {
      return { left: 0, top: 0, width: 100, height: 100 };
    }
    
    const mapWidth = tileData.width * TILE_SIZE * zoom;
    const mapHeight = tileData.height * TILE_SIZE * zoom;
    
    return {
      left: Math.max(0, Math.min(100, (-offset.x / mapWidth) * 100)),
      top: Math.max(0, Math.min(100, (-offset.y / mapHeight) * 100)),
      width: Math.min(100, (containerSize.width / mapWidth) * 100),
      height: Math.min(100, (containerSize.height / mapHeight) * 100),
    };
  }, [tileData, zoom, offset, containerSize]);

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center font-mono text-terminal-green">
        <div className="text-center max-w-md">
          <div className="text-4xl mb-4 animate-pulse">🌍</div>
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
              <p className="text-yellow-500/70">Large worlds may take 30-60 seconds</p>
            )}
            {loadingTime > 30 && (
              <p className="text-orange-500/70">Still working... Complex terrain takes time</p>
            )}
          </div>
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
          <div className="text-4xl mb-4">⚠️</div>
          <div className="text-xl mb-4 text-red-500">Map Loading Failed</div>
          <div className="text-sm text-terminal-green/70 mb-4 whitespace-pre-wrap">{error}</div>
          <button
            onClick={() => activeWorldId && fetchTileData(activeWorldId)}
            className="px-4 py-2 bg-terminal-green text-terminal-black font-bold uppercase hover:bg-terminal-green-bright transition-colors"
          >
            🔄 Try Again
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

  const minimapViewport = getMinimapViewport();

  return (
    <div className="h-full w-full flex flex-col font-mono text-terminal-green overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-2 p-3 border-b border-terminal-green-dim flex-shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold uppercase tracking-wider text-glow">
            🗺️ World Map
          </h2>
          
          {/* World Selector */}
          {worlds.length > 0 && (
            <select
              value={activeWorldId || ''}
              onChange={(e) => handleWorldChange(e.target.value)}
              className="px-2 py-1 bg-terminal-black border border-terminal-green text-terminal-green text-sm max-w-[200px]"
              title="Select World"
            >
              {worlds.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name || w.id.slice(0, 8)}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Visualization Mode */}
          <select
            value={visualizationMode}
            onChange={(e) => setVisualizationMode(e.target.value as VisualizationMode)}
            className="px-2 py-1 bg-terminal-black border border-terminal-green text-terminal-green text-xs uppercase"
          >
            <option value="biomes">Biomes</option>
            <option value="heightmap">Heightmap</option>
            <option value="temperature">Temperature</option>
            <option value="moisture">Moisture</option>
            <option value="rivers">Rivers</option>
          </select>

          {/* Map Info */}
          <span className="text-xs text-terminal-green/70 hidden sm:inline">
            {tileData.width}×{tileData.height} | {tileData.structures.length} POIs
          </span>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-terminal-black/50 border border-terminal-green-dim rounded">
            <button
              onClick={() => zoomAtPoint(zoom - ZOOM_STEP * 2, window.innerWidth / 2, window.innerHeight / 2)}
              className="px-2 py-1 hover:bg-terminal-green/20 transition-colors"
              title="Zoom Out (-)"
            >
              −
            </button>
            <span className="text-xs w-14 text-center border-x border-terminal-green-dim">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => zoomAtPoint(zoom + ZOOM_STEP * 2, window.innerWidth / 2, window.innerHeight / 2)}
              className="px-2 py-1 hover:bg-terminal-green/20 transition-colors"
              title="Zoom In (+)"
            >
              +
            </button>
          </div>

          {/* View Controls */}
          <div className="flex items-center gap-1">
            {partyPosition && (
              <button
                onClick={() => {
                  if (!containerRef.current || !partyPosition) return;
                  const container = containerRef.current;
                  const tileSize = TILE_SIZE * zoom;
                  const partyX = partyPosition.x * tileSize + tileSize / 2;
                  const partyY = partyPosition.y * tileSize + tileSize / 2;
                  setOffset({
                    x: container.clientWidth / 2 - partyX,
                    y: container.clientHeight / 2 - partyY,
                  });
                }}
                className="px-2 py-1 text-xs bg-orange-500/20 border border-orange-500/50 hover:bg-orange-500/30 transition-colors text-orange-400"
                title="Center on Party (P)"
              >
                ⚔️
              </button>
            )}
            <button
              onClick={fitToView}
              className="px-2 py-1 text-xs bg-terminal-green/10 border border-terminal-green-dim hover:bg-terminal-green/20 transition-colors"
              title="Fit to View (F)"
            >
              ⊡
            </button>
            <button
              onClick={resetView}
              className="px-2 py-1 text-xs bg-terminal-green/10 border border-terminal-green-dim hover:bg-terminal-green/20 transition-colors"
              title="Reset View (0)"
            >
              ⌖
            </button>
            <button
              onClick={() => activeWorldId && fetchTileData(activeWorldId)}
              className="px-2 py-1 text-xs bg-terminal-green/10 border border-terminal-green-dim hover:bg-terminal-green/20 transition-colors"
              title="Refresh Map"
            >
              🔄
            </button>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden relative bg-terminal-black"
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          handleMouseUp();
          setTooltip(null);
          setHoveredPOI(null);
        }}
        onMouseMove={handleDrag}
      >
        <canvas
          ref={canvasRef}
          className="absolute"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px)`,
            imageRendering: 'pixelated',
            cursor: hoveredPOI ? 'pointer' : isDragging ? 'grabbing' : 'grab',
          }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => {
            setTooltip(null);
            setHoveredPOI(null);
          }}
          onClick={handleCanvasClick}
          onWheel={handleWheel}
        />

        {/* World Environment Overlay */}
        <WorldEnvironmentOverlay
          worldState={{
            name: activeWorld?.name,
            time: world?.time,
            date: world?.date,
            moonPhase: world?.environment?.moon_phase,
            weather: world?.weather,
            temperature: world?.environment?.temperature,
            season: world?.environment?.season,
            hazards: world?.environment?.hazards,
          }}
          position="top-right"
        />

        {/* Minimap */}
        <div className="absolute bottom-3 left-3 w-32 h-24 bg-terminal-black/80 border border-terminal-green-dim overflow-hidden">
          <div
            className="absolute bg-terminal-green/30 border border-terminal-green pointer-events-none"
            style={{
              left: `${minimapViewport.left}%`,
              top: `${minimapViewport.top}%`,
              width: `${minimapViewport.width}%`,
              height: `${minimapViewport.height}%`,
            }}
          />
          <div 
            className="w-full h-full opacity-50"
            style={{
              background: `linear-gradient(135deg, ${BIOME_COLORS.forest}, ${BIOME_COLORS.ocean})`,
            }}
          />
        </div>

        {/* Controls Help */}
        <div className="absolute bottom-3 right-3 text-xs text-terminal-green/50 bg-terminal-black/70 px-2 py-1 border border-terminal-green-dim/50">
          Drag to pan • Scroll to zoom • F to fit • 0 to reset
        </div>

        {/* Tooltip */}
        {tooltip && !selectedPOI && (
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
                <div className="text-blue-400">🌊 River</div>
              )}
              {tooltip.structure && (
                <div className="text-yellow-400 font-bold">
                  {STRUCTURE_ICONS[tooltip.structure.type]} {tooltip.structure.name}
                  <div className="text-xs text-terminal-green/60 mt-0.5">(click for details)</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* POI Detail Panel */}
        {selectedPOI && (
          <POIDetailPanel
            poi={selectedPOI}
            biome={tooltip?.biome}
            region={tooltip?.region || undefined}
            partyPosition={partyPosition || undefined}
            isMoving={isMovingParty || isPartyLoading}
            onClose={() => setSelectedPOI(null)}
            onEnter={async () => {
              if (!activePartyId) {
                console.warn('No active party to move');
                return;
              }

              setIsMovingParty(true);
              try {
                // Move party to the selected POI
                const success = await moveParty(
                  activePartyId,
                  selectedPOI.x,
                  selectedPOI.y,
                  selectedPOI.name,
                  undefined // POI ID - we could look this up from structures if needed
                );

                if (success) {
                  console.log('Party moved to:', selectedPOI.name);
                  setSelectedPOI(null);
                } else {
                  console.error('Failed to move party');
                }
              } catch (error) {
                console.error('Error moving party:', error);
              } finally {
                setIsMovingParty(false);
              }
            }}
          />
        )}
      </div>

      {/* Legend */}
      <div className="p-2 border-t border-terminal-green-dim flex-shrink-0">
        <div className="flex flex-wrap gap-3 text-xs">
          {visualizationMode === 'biomes' && (
            <>
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
            </>
          )}
          {visualizationMode === 'heightmap' && (
            <div className="flex items-center gap-2">
              <span className="text-terminal-green/70">Elevation:</span>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-black rounded-sm border border-terminal-green-dim" />
                <span className="text-terminal-green/70">Low</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-gray-500 rounded-sm" />
                <span className="text-terminal-green/70">Medium</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-white rounded-sm" />
                <span className="text-terminal-green/70">High</span>
              </div>
            </div>
          )}
          {visualizationMode === 'temperature' && (
            <div className="flex items-center gap-2">
              <span className="text-terminal-green/70">Temperature:</span>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-500 rounded-sm" />
                <span className="text-terminal-green/70">Cold</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-purple-500 rounded-sm" />
                <span className="text-terminal-green/70">Cool</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-500 rounded-sm" />
                <span className="text-terminal-green/70">Hot</span>
              </div>
            </div>
          )}
          {visualizationMode === 'moisture' && (
            <div className="flex items-center gap-2">
              <span className="text-terminal-green/70">Moisture:</span>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-yellow-700 rounded-sm" />
                <span className="text-terminal-green/70">Dry</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-700 rounded-sm" />
                <span className="text-terminal-green/70">Moderate</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-500 rounded-sm" />
                <span className="text-terminal-green/70">Wet</span>
              </div>
            </div>
          )}
          {visualizationMode === 'rivers' && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-400 rounded-sm" />
                <span className="text-terminal-green/70">Rivers</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-700 rounded-sm" />
                <span className="text-terminal-green/70">Lakes/Ocean</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function adjustBrightness(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + percent));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + percent));
  const b = Math.min(255, Math.max(0, (num & 0x0000FF) + percent));
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

export default WorldMapCanvas;
