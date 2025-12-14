import { Command, Child } from '@tauri-apps/plugin-shell';
import { v4 as uuidv4 } from 'uuid';
import { eventBus } from '../utils/eventBus';

interface JsonRpcRequest {
    jsonrpc: '2.0';
    id: string | number;
    method: string;
    params?: any;
}

interface JsonRpcResponse {
    jsonrpc: '2.0';
    id: string | number;
    result?: any;
    error?: {
        code: number;
        message: string;
        data?: any;
    };
}

// Timeout configurations for different operation types
const TIMEOUTS = {
    default: 30000,     // 30s for most operations
    initialize: 10000,  // 10s for init
    listTools: 10000,   // 10s for listing
    complex: 120000     // 120s for complex operations (increased for large world tiles)
};

// Operations that may take longer (world gen/restore, batch ops)
const COMPLEX_OPERATIONS = new Set([
    // World operations - can trigger full regeneration from seed
    'generate_world',
    'create_world',
    'get_world_tiles',      // Large response + may trigger world restore
    'get_world_state',      // May trigger world restore  
    'get_world_map_overview', // May trigger world restore
    'get_region_map',       // May trigger world restore
    // Strategy operations
    'resolve_turn',
    // Batch operations
    'batch_create_npcs',
    'batch_update_npcs',
    'batch_create_characters',
    'batch_distribute_items'
]);

export class McpClient {
    private process: Child | null = null;
    private pendingRequests: Map<string | number, {
        resolve: (response: JsonRpcResponse) => void;
        timeout: ReturnType<typeof setTimeout>;
        startTime: number;
    }> = new Map();
    private serverName: string;
    private _isConnected: boolean = false;
    private isInitialized: boolean = false;
    private messageBuffer: string = '';

    constructor(serverName: string) {
        this.serverName = serverName;
    }

    isConnected(): boolean {
        return this._isConnected && this.isInitialized;
    }

    async connect() {
        if (this._isConnected) {
            console.log(`[McpClient] ${this.serverName} already connected`);
            return;
        }

        try {
            console.log(`[McpClient] Spawning MCP server: ${this.serverName}`);
            
            // Prepare CWD (AppData) to ensure server can write database/logs
            let cwd = '';
            try {
                const { appDataDir } = await import('@tauri-apps/api/path');
                const { mkdir } = await import('@tauri-apps/plugin-fs');
                cwd = await appDataDir();
                // Ensure directory exists
                try {
                    await mkdir(cwd, { recursive: true });
                } catch (e) { /* ignore if exists */ }
                
                console.log(`[McpClient] Setting CWD to: ${cwd}`);

                // Copy better_sqlite3.node to CWD (Critical for pkg binaries)
                try {
                    const { resolveResource } = await import('@tauri-apps/api/path');
                    const { copyFile } = await import('@tauri-apps/plugin-fs');
                    const resourcePath = await resolveResource('binaries/better_sqlite3.node');
                    console.log(`[McpClient] Found native module at: ${resourcePath}`);
                    const destPath = `${cwd}/better_sqlite3.node`;
                    await copyFile(resourcePath, destPath);
                    console.log(`[McpClient] Copied native module to CWD`);
                } catch (e) {
                    console.warn('[McpClient] Failed to copy native module:', e);
                    await this.logToFile(`Failed to copy native module: ${e}`);
                }

            } catch (e) {
                console.warn('[McpClient] Failed to setup CWD:', e);
            }

            // Helper to set up command listeners
            const setupCommandListeners = (cmd: ReturnType<typeof Command.sidecar>) => {
                cmd.on('close', (data) => {
                    console.log(`[McpClient] ${this.serverName} closed with code ${data.code}`);
                    this.logToFile(`${this.serverName} closed with code ${data.code}`);
                    this.cleanup();
                });

                cmd.on('error', (error) => {
                    console.error(`[McpClient] ${this.serverName} error: "${error}"`);
                });

                cmd.stdout.on('data', (line) => {
                    this.handleOutput(line);
                });

                cmd.stderr.on('data', (line) => {
                    if (!line.includes('[SQLite]') && !line.includes('running on stdio')) {
                        console.warn(`[McpClient] ${this.serverName} stderr: ${line}`);
                        eventBus.emit('warn:log', {
                            message: line,
                            source: `McpClient:${this.serverName}`,
                            timestamp: Date.now()
                        });
                        this.logToFile(`STDERR: ${line}`);
                    } else {
                        console.log(`[McpClient] ${this.serverName}: ${line}`);
                    }
                });
            };

            const spawnOptions = cwd ? { cwd } : undefined;

            // Strategy 1: Try sidecar (Standard Dev Mode)
            try {
                await this.logToFile(`[Connect] Attempting Strategy 1: Sidecar`);
                console.log(`[McpClient] Strategy 1: Sidecar (${this.serverName})`);
                // Note: Command.sidecar args are 2nd param, options are 3rd. sidecar takes no args.
                const sidecarCmd = Command.sidecar(this.serverName, [], spawnOptions);
                setupCommandListeners(sidecarCmd);
                this.process = await sidecarCmd.spawn();
                this._isConnected = true;
                await this.logToFile(`[Connect] Strategy 1 SUCCESS. PID: ${this.process.pid}`);
                console.log(`[McpClient] Sidecar spawned successfully. PID: ${this.process.pid}`);
                return;
            } catch (sidecarError) {
                console.warn(`[McpClient] Strategy 1 failed: ${sidecarError}`);
                await this.logToFile(`Strategy 1 (Sidecar) failed: ${sidecarError}`);
            }

            // Strategy 2: Direct Execution (Production Fallback)
            try {
                await this.logToFile(`[Connect] Attempting Strategy 2: Direct Execution`);
                console.log(`[McpClient] Strategy 2: Direct Execution (rpg-mcp-server-direct)`);
                // Command.create(program, args, options)
                const directCmd = Command.create('rpg-mcp-server-direct', [], spawnOptions);
                setupCommandListeners(directCmd);
                this.process = await directCmd.spawn();
                this._isConnected = true;
                await this.logToFile(`[Connect] Strategy 2 SUCCESS. PID: ${this.process.pid}`);
                console.log(`[McpClient] Direct exe spawned successfully. PID: ${this.process.pid}`);
                return;

            } catch (directError) {
                console.warn(`[McpClient] Strategy 2 failed: ${directError}`);
                await this.logToFile(`Strategy 2 (Direct) failed: ${directError}`);
            }

             // Strategy 3: CMD wrapper (Last Resort)
             try {
                await this.logToFile(`[Connect] Attempting Strategy 3: CMD Wrapper`);
                console.log(`[McpClient] Strategy 3: CMD Wrapper`);
                // For CMD, we set CWD to the app data dir so 'cd /d' isn't needed, likely
                const cmdCmd = Command.create('run-cmd', ['/c', 'rpg-mcp-server.exe'], spawnOptions);
                setupCommandListeners(cmdCmd);
                this.process = await cmdCmd.spawn();
                this._isConnected = true;
                await this.logToFile(`[Connect] Strategy 3 SUCCESS. PID: ${this.process.pid}`);
                console.log(`[McpClient] CMD wrapper spawned successfully. PID: ${this.process.pid}`);
                return;
             } catch (cmdError) {
                 console.error(`[McpClient] Strategy 3 failed: ${cmdError}`);
                 await this.logToFile(`Strategy 3 (CMD) failed: ${cmdError}`);
                 throw cmdError; // Rethrow last error
             }

        } catch (error) {
            console.error(`[McpClient] All spawn strategies failed for ${this.serverName}:`, error);
            await this.logToFile(`FATAL: All strategies failed: ${error}`);
            throw error;
        }
    }

    private async logToFile(message: string) {
        try {
            const { appDataDir } = await import('@tauri-apps/api/path');
            const { mkdir, writeTextFile, readTextFile } = await import('@tauri-apps/plugin-fs');
            
            const dir = await appDataDir();
            
            // Ensure directory exists
            try {
                await mkdir(dir, { recursive: true });
            } catch (e) {
                // Ignore if exists, or verify with exists() check if preferred
                // But mkdir recursive usually succeeds if dir exists
            }

            const logPath = `${dir}/mcp-debug.log`;
            
            // Simple append simulation
            let content = '';
            try {
                content = await readTextFile(logPath);
            } catch {}
            
            const timestamp = new Date().toISOString();
            const newContent = `${content}\n[${timestamp}] ${message}`;
            
            await writeTextFile(logPath, newContent);
        } catch (e) {
            console.error('Failed to write to log file:', e);
        }
    }

    private cleanup() {
        // Clear all pending requests
        for (const [id, pending] of this.pendingRequests) {
            clearTimeout(pending.timeout);
            pending.resolve({
                jsonrpc: '2.0',
                id,
                error: { code: -1, message: 'Server disconnected' }
            });
        }
        this.pendingRequests.clear();
        this.process = null;
        this._isConnected = false;
        this.isInitialized = false;
    }

    private handleOutput(line: string) {
        // Accumulate data in buffer - messages are newline-delimited
        this.messageBuffer += line;
        
        // Try to extract and parse complete JSON-RPC messages
        let newlineIndex = this.messageBuffer.indexOf('\n');
        
        while (newlineIndex !== -1) {
            // Extract the complete message up to the newline
            const jsonLine = this.messageBuffer.substring(0, newlineIndex).trim();
            // Keep the rest in the buffer
            this.messageBuffer = this.messageBuffer.substring(newlineIndex + 1);
            
            if (jsonLine) {
                // Skip non-JSON log lines (MCP protocol requires only JSON-RPC on stdout)
                if (!jsonLine.startsWith('{')) {
                    // Log server output that leaked to stdout
                    if (jsonLine.startsWith('[')) {
                        console.log(`[McpClient] ${this.serverName}:`, jsonLine);
                    }
                    continue;
                }
                
                try {
                    const response = JSON.parse(jsonLine) as JsonRpcResponse;
                    
                    if (response.id && this.pendingRequests.has(response.id)) {
                        const pending = this.pendingRequests.get(response.id)!;
                        clearTimeout(pending.timeout);
                        
                        const duration = Date.now() - pending.startTime;
                        if (duration > 5000) {
                            const sizeKB = Math.round(jsonLine.length / 1024);
                            console.log(`[McpClient] Slow response for ${response.id}: ${duration}ms (${sizeKB}KB)`);
                        }
                        
                        pending.resolve(response);
                        this.pendingRequests.delete(response.id);
                    }
                    // Silently ignore responses for already-timed-out requests
                } catch (e) {
                    console.warn('[McpClient] Failed to parse JSON-RPC message:', e);
                    console.warn('[McpClient] Invalid JSON (first 500 chars):', jsonLine.substring(0, 500));
                }
            }
            
            // Look for the next complete message
            newlineIndex = this.messageBuffer.indexOf('\n');
        }
    }

    private getTimeout(method: string, toolName?: string): number {
        if (method === 'initialize') return TIMEOUTS.initialize;
        if (method === 'tools/list') return TIMEOUTS.listTools;
        if (toolName && COMPLEX_OPERATIONS.has(toolName)) {
            console.log(`[McpClient] Using extended timeout (120s) for ${toolName}`);
            return TIMEOUTS.complex;
        }
        return TIMEOUTS.default;
    }

    private async sendRequest(method: string, params?: any): Promise<any> {
        if (!this.process) {
            throw new Error('McpClient not connected');
        }

        const id = uuidv4();
        const request: JsonRpcRequest = {
            jsonrpc: '2.0',
            id,
            method,
            params,
        };

        const toolName = params?.name;
        const timeoutMs = this.getTimeout(method, toolName);

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                if (this.pendingRequests.has(id)) {
                    this.pendingRequests.delete(id);
                    console.warn(`[McpClient] Request timed out: ${method} ${toolName || ''} (${timeoutMs}ms)`);
                    console.warn(`[McpClient] Buffer size at timeout: ${this.messageBuffer.length} bytes`);
                    reject(new Error(`Request ${method} timed out after ${timeoutMs}ms`));
                }
            }, timeoutMs);

            this.pendingRequests.set(id, {
                resolve: (response) => {
                    if (response.error) {
                        reject(response.error);
                    } else {
                        resolve(response.result);
                    }
                },
                timeout,
                startTime: Date.now()
            });

            const jsonString = JSON.stringify(request) + '\n';
            this.process!.write(jsonString).catch((err) => {
                clearTimeout(timeout);
                this.pendingRequests.delete(id);
                reject(err);
            });
        });
    }

    async initialize() {
        if (this.isInitialized) {
            console.log(`[McpClient] ${this.serverName} already initialized`);
            return;
        }

        console.log(`[McpClient] Initializing ${this.serverName}...`);
        const result = await this.sendRequest('initialize', {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: {
                name: 'quest-keeper-client',
                version: '0.2.0',
            },
        });
        this.isInitialized = true;
        console.log(`[McpClient] ${this.serverName} initialized:`, result);
        return result;
    }

    async listTools() {
        return this.sendRequest('tools/list');
    }

    async callTool(name: string, args: any) {
        return this.sendRequest('tools/call', {
            name,
            arguments: args,
        });
    }

    /**
     * Execute multiple tool calls in parallel
     * More efficient than sequential calls for independent operations
     */
    async callToolsBatch(calls: Array<{ name: string; args: any }>): Promise<any[]> {
        const promises = calls.map(call => 
            this.callTool(call.name, call.args).catch(err => ({ error: err.message }))
        );
        return Promise.all(promises);
    }

    async disconnect() {
        if (this.process) {
            await this.process.kill();
            this.cleanup();
        }
    }

    /**
     * Get count of pending requests (for debugging)
     */
    getPendingCount(): number {
        return this.pendingRequests.size;
    }
}

/**
 * McpManager - Unified MCP Server Connection
 * 
 * Uses single rpg-mcp-server for all RPG functionality.
 * Provides aliases for backward compatibility.
 */
class McpManager {
    private static instance: McpManager;
    
    public unifiedClient: McpClient;
    
    // Aliases for backward compatibility
    public gameStateClient: McpClient;
    public combatClient: McpClient;
    
    private isInitializing: boolean = false;
    private initPromise: Promise<void> | null = null;

    private constructor() {
        this.unifiedClient = new McpClient('rpg-mcp-server');
        this.gameStateClient = this.unifiedClient;
        this.combatClient = this.unifiedClient;
    }

    public static getInstance(): McpManager {
        if (!McpManager.instance) {
            McpManager.instance = new McpManager();
        }
        return McpManager.instance;
    }

    async initializeAll() {
        if (this.isInitializing && this.initPromise) {
            console.log('[McpManager] Initialization in progress, waiting...');
            return this.initPromise;
        }

        this.isInitializing = true;
        
        this.initPromise = this.unifiedClient.connect()
            .then(() => this.unifiedClient.initialize())
            .then(() => {
                console.log('[McpManager] rpg-mcp-server initialized successfully');
                this.isInitializing = false;
            })
            .catch((error) => {
                console.error('[McpManager] Failed to initialize:', error);
                this.isInitializing = false;
                throw error;
            });

        return this.initPromise;
    }

    /**
     * Check if the MCP server is ready
     */
    isReady(): boolean {
        return this.unifiedClient.isConnected();
    }

    /**
     * Get pending request count (for debugging)
     */
    getPendingCount(): number {
        return this.unifiedClient.getPendingCount();
    }
}

export const mcpManager = McpManager.getInstance();
