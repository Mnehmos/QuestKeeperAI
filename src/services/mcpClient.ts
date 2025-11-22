import { Command, Child } from '@tauri-apps/plugin-shell';
import { v4 as uuidv4 } from 'uuid';

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

export class McpClient {
    private process: Child | null = null;
    private pendingRequests: Map<string | number, (response: JsonRpcResponse) => void> = new Map();
    private serverName: string;

    constructor(serverName: string) {
        this.serverName = serverName;
    }

    async connect() {
        try {
            console.log(`[McpClient] Spawning sidecar: ${this.serverName}`);
            // Tauri sidecar command expects the name configured in tauri.conf.json
            // tauri.conf.json has "binaries/rpg-game-state-server"
            // So we MUST pass "binaries/rpg-game-state-server".
            // The serverName passed in constructor is just "rpg-game-state-server".
            const command = Command.sidecar(`binaries/${this.serverName}`);

            // Set up event listeners before spawning
            command.on('close', (data) => {
                console.log(`[McpClient] ${this.serverName} finished with code ${data.code} and signal ${data.signal}`);
                this.process = null;
            });

            command.on('error', (error) => {
                console.error(`[McpClient] ${this.serverName} error: "${error}"`);
            });

            command.stdout.on('data', (line) => {
                this.handleOutput(line);
            });

            command.stderr.on('data', (line) => {
                console.error(`[McpClient] ${this.serverName} stderr: ${line}`);
            });

            this.process = await command.spawn();
            console.log(`[McpClient] ${this.serverName} spawned successfully. Pid: ${this.process.pid}`);

        } catch (error) {
            console.error(`[McpClient] Failed to spawn ${this.serverName}:`, error);
            throw error;
        }
    }

    private handleOutput(line: string) {
        try {
            // Attempt to parse line as JSON-RPC response
            const response = JSON.parse(line) as JsonRpcResponse;
            if (response.id && this.pendingRequests.has(response.id)) {
                const resolve = this.pendingRequests.get(response.id);
                if (resolve) {
                    resolve(response);
                    this.pendingRequests.delete(response.id);
                }
            } else {
                console.log(`[McpClient] ${this.serverName} received notification or unknown response:`, response);
            }
        } catch (e) {
            // If not JSON, just log it
            console.log(`[McpClient] ${this.serverName} stdout: ${line}`);
        }
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

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                if (this.pendingRequests.has(id)) {
                    this.pendingRequests.delete(id);
                    reject(new Error(`Request ${method} timed out`));
                }
            }, 10000); // 10s timeout

            this.pendingRequests.set(id, (response) => {
                clearTimeout(timeout);
                if (response.error) {
                    reject(response.error);
                } else {
                    resolve(response.result);
                }
            });

            // Send to stdin
            const jsonString = JSON.stringify(request) + '\n';
            this.process!.write(jsonString).catch((err) => {
                clearTimeout(timeout);
                this.pendingRequests.delete(id);
                reject(err);
            });
        });
    }

    async initialize() {
        console.log(`[McpClient] Initializing ${this.serverName}...`);
        // MCP Initialize request
        const result = await this.sendRequest('initialize', {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: {
                name: 'quest-keeper-client',
                version: '0.1.0',
            },
        });
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

    async disconnect() {
        if (this.process) {
            await this.process.kill();
            this.process = null;
        }
    }
}

class McpManager {
    private static instance: McpManager;
    public gameStateClient: McpClient;
    public combatClient: McpClient;

    private constructor() {
        // tauri.conf.json has "binaries/rpg-game-state-server"
        // We pass "rpg-game-state-server" here.
        // McpClient prepends "binaries/" in connect().
        this.gameStateClient = new McpClient('rpg-game-state-server');
        this.combatClient = new McpClient('rpg-combat-engine-server');
    }

    public static getInstance(): McpManager {
        if (!McpManager.instance) {
            McpManager.instance = new McpManager();
        }
        return McpManager.instance;
    }

    async initializeAll() {
        await Promise.all([
            this.gameStateClient.connect().then(() => this.gameStateClient.initialize()),
            this.combatClient.connect().then(() => this.combatClient.initialize()),
        ]);
    }
}

export const mcpManager = McpManager.getInstance();