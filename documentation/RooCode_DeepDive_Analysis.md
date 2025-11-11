# ROO CODE DEEP DIVE: STRATEGIC ARCHITECTURE & LEARNINGS

## EXECUTIVE SUMMARY

Roo Code represents a production-grade implementation of an AI agent that manages complex tool ecosystems and multi-modal interactions. Key architectural decisions are highly applicable to QuestKeeperAI, particularly around MCP integration, mode-based persona switching, and tool permission management.

---

## PART 1: CORE ARCHITECTURE PATTERNS

### 1.1 Layered Architecture Overview

Roo Code follows a **layered separation of concerns** pattern:

```
┌─────────────────────────────────────────┐
│     VS Code Extension API              │ (Platform Layer)
├─────────────────────────────────────────┤
│  ClineProvider (Central Orchestrator)  │ (Coordination Layer)
├──────────────────┬──────────────────────┤
│  Core AI Layer   │  Tools System        │ (Logic Layer)
│  (Cline Class)   │  (Execution)         │
├──────────────────┼──────────────────────┤
│ MCP Integration  │ Terminal Registry    │ (Service Layer)
│ (McpHub)         │ Provider Manager     │
├──────────────────┴──────────────────────┤
│  React Webview UI (Frontend)            │ (Presentation Layer)
└─────────────────────────────────────────┘
```

**Key Components:**

1. **extension.ts (Entry Point)**
   - Activation lifecycle management
   - Command registration
   - Extension API initialization
   - Component bootstrap sequence

2. **ClineProvider (Central Orchestrator)**
   - Manages webview UI
   - Routes messages between extension and UI
   - Maintains stack of Cline instances (allows nested subtasks)
   - Handles task execution lifecycle

3. **Cline Class (AI Agent Core)**
   - Conversation state management
   - Message history tracking
   - Tool invocation logic
   - Model interaction coordination

4. **McpHub (MCP Orchestrator)**
   - Server connection management
   - Tool discovery and caching
   - Permission management
   - Server lifecycle (start/stop/restart)

5. **TerminalRegistry**
   - Command execution isolation
   - Output capture and streaming
   - Terminal state tracking

### 1.2 Communication Flow Architecture

```typescript
// High-level message flow

User Input (Webview)
    ↓
vscode.postMessage() → WebviewMessage
    ↓
Extension IPC Handler
    ↓
ClineProvider.handleMessage()
    ↓
Cline.chat() [with context]
    ↓
AI Model API Call
    ↓
Tool Decision Logic
    ↓
Tool Execution (ReadFile, Terminal, MCP, Browser)
    ↓
Result Processing
    ↓
postMessageToWebview() → ExtensionMessage
    ↓
Webview Renderer
    ↓
UI Update
```

**Message Format Pattern:**

```typescript
// WebviewMessage (UI → Extension)
interface WebviewMessage {
  type: 'userMessage' | 'toolApproval' | 'stopTask' | 'modeSwitch'
  data: unknown
  timestamp: number
}

// ExtensionMessage (Extension → UI)
interface ExtensionMessage {
  type: 'assistantMessage' | 'toolUseBlock' | 'taskUpdate'
  data: unknown
  toolUse?: {
    id: string
    name: string
    input: object
    status: 'pending' | 'success' | 'error'
  }
}
```

---

## PART 2: MCP INTEGRATION ARCHITECTURE

### 2.1 Hub-and-Spoke Pattern (McpHub)

Roo Code implements MCP through a **hub-and-spoke architecture**:

```
                    ┌─────────────────┐
                    │   Cline (AI)    │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │    McpHub       │
                    │  (Central Hub)  │
                    └────────┬────────┘
                    ┌────────┴──────────────────┬─────────┐
                    │                          │         │
            ┌───────▼────────┐    ┌───────────▼─┐ ┌────▼──────┐
            │ rpg-tools      │    │ filesystem  │ │ database  │
            │ (Stdio)        │    │ (Stdio)     │ │ (HTTP)    │
            └────────────────┘    └─────────────┘ └───────────┘
```

**McpHub Responsibilities:**

```typescript
class McpHub {
  // Server management
  async startServer(config: MCPServerConfig): Promise<void>
  async stopServer(serverId: string): Promise<void>
  async restartServer(serverId: string): Promise<void>
  
  // Tool discovery and interaction
  async getTools(serverId: string): Promise<Tool[]>
  async callTool(serverId: string, toolName: string, args: object): Promise<ToolResult>
  
  // Resource handling
  async getResources(serverId: string): Promise<Resource[]>
  async readResource(resourceUri: string): Promise<ResourceData>
  
  // Lifecycle management
  async healthCheck(serverId: string): Promise<HealthStatus>
  async monitor(): Promise<void>  // Continuous monitoring
  
  // Configuration
  loadConfiguration(configPath: string): MCPConfig
  validateServer(config: MCPServerConfig): ValidationResult
}
```

### 2.2 Transport Layer Abstraction

Roo Code supports multiple transport mechanisms:

```typescript
// Transport abstraction allows flexibility
interface MCPTransport {
  connect(): Promise<void>
  disconnect(): Promise<void>
  request(method: string, params?: object): Promise<any>
  onNotification(handler: (notification: any) => void): void
}

// Implementations
class StdioClientTransport implements MCPTransport {
  // For subprocess-based servers
  // Uses JSON-RPC over stdin/stdout
}

class SSEClientTransport implements MCPTransport {
  // For Server-Sent Events
  // Long-lived HTTP connections
}

class StreamableHTTPClientTransport implements MCPTransport {
  // For HTTP-based servers
  // Request/response pattern
}
```

**Transport Selection Logic:**

```typescript
function selectTransport(config: MCPServerConfig): MCPTransport {
  switch(config.type) {
    case 'stdio':
      return new StdioClientTransport(config.executablePath)
    case 'sse':
      return new SSEClientTransport(config.url)
    case 'http':
      return new StreamableHTTPClientTransport(config.url)
    default:
      throw new Error(`Unknown transport: ${config.type}`)
  }
}
```

### 2.3 Configuration Management (Two-Tier System)

**Tier 1: Global Configuration (VS Code Settings)**
```json
{
  "roocode.mcp.servers": [
    {
      "name": "system-monitor",
      "type": "stdio",
      "executablePath": "/usr/local/bin/system-monitor",
      "enabled": true,
      "autoApprove": false,
      "timeout": 60000
    }
  ],
  "roocode.mcp.enabled": true,
  "roocode.mcp.networkTimeout": 60
}
```

**Tier 2: Project-Level Configuration (.roo/mcp.json)**
```json
{
  "servers": [
    {
      "name": "rpg-tools",
      "type": "stdio",
      "executablePath": "./servers/rpg-tools.py",
      "enabled": true,
      "config": {
        "module": "game_state",
        "loglevel": "debug"
      }
    },
    {
      "name": "filesystem-safe",
      "type": "stdio",
      "executablePath": "./servers/filesystem.py",
      "permissions": {
        "allowedPaths": ["./game", "./saves"],
        "readOnly": false
      }
    }
  ]
}
```

**Precedence Logic:**
```typescript
function resolveServerConfig(globalConfig: Config, projectConfig: Config, serverName: string): Config {
  // Project-level config takes precedence
  // Global config acts as fallback
  // Merge tool permissions
  
  return {
    ...globalConfig.find(s => s.name === serverName),
    ...projectConfig.find(s => s.name === serverName),
    // Project overrides preserve while merging
  }
}
```

### 2.4 Tool Discovery and Schema Validation

**Tool Definition Pattern:**

```typescript
interface ToolDefinition {
  name: string                    // Unique identifier
  description: string             // Clear, descriptive (critical for LLM understanding)
  inputSchema: JSONSchema         // Zod validation schema
  outputSchema?: JSONSchema       // Expected output format
}

// Example: inventory management tool
{
  "name": "add_inventory_item",
  "description": "Add an item to the character's inventory. Specify quantity, rarity (common/uncommon/rare/very_rare/legendary), and item description.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "character_id": {
        "type": "string",
        "description": "UUID of the character"
      },
      "item_name": {
        "type": "string",
        "description": "Name of the item to add"
      },
      "quantity": {
        "type": "integer",
        "minimum": 1,
        "description": "Number of items"
      },
      "rarity": {
        "type": "string",
        "enum": ["common", "uncommon", "rare", "very_rare", "legendary"],
        "description": "Item rarity classification"
      },
      "weight": {
        "type": "number",
        "description": "Weight per item in pounds"
      },
      "description": {
        "type": "string",
        "description": "Item description and flavor text"
      }
    },
    "required": ["character_id", "item_name", "quantity", "rarity"]
  }
}
```

**Tool Discovery Caching:**
```typescript
class ToolDiscoveryCache {
  private cache: Map<string, Tool[]> = new Map()
  private refreshIntervals: Map<string, number> = new Map()
  
  async getTools(serverId: string): Promise<Tool[]> {
    // Check cache validity
    if (this.isValid(serverId)) {
      return this.cache.get(serverId)!
    }
    
    // Fetch fresh tools from server
    const tools = await this.mcpHub.callTool(serverId, 'list_tools')
    this.cache.set(serverId, tools)
    this.scheduleRefresh(serverId, 3600000) // 1 hour
    return tools
  }
}
```

### 2.5 Permission Management System

**Permission Levels:**

```typescript
enum PermissionLevel {
  ALWAYS_DENY = 'always_deny',      // Never execute
  REQUIRE_APPROVAL = 'require_approval', // Ask each time
  AUTO_APPROVE = 'auto_approve',    // Always execute
}

interface ToolPermission {
  serverId: string
  toolName: string
  level: PermissionLevel
  conditions?: {
    maxExecutionsPerSession?: number
    allowedParameters?: Record<string, unknown>
    timeoutMs?: number
  }
}
```

**Permission Validation Flow:**

```typescript
async function validateToolPermission(tool: Tool, args: object): Promise<boolean> {
  // 1. Check if tool is blacklisted
  if (tool.permission.level === PermissionLevel.ALWAYS_DENY) {
    return false
  }
  
  // 2. Check if auto-approved
  if (tool.permission.level === PermissionLevel.AUTO_APPROVE) {
    // Optionally validate conditions
    if (tool.permission.conditions?.allowedParameters) {
      return validateParameters(args, tool.permission.conditions.allowedParameters)
    }
    return true
  }
  
  // 3. Require user approval
  const approved = await promptUserApproval(tool, args)
  return approved
}
```

**UI for Permission Management:**

```jsx
// McpView component displays
<ToolPermissionPanel>
  {tools.map(tool => (
    <ToolPermissionRow key={tool.id}>
      <ToolName>{tool.name}</ToolName>
      <ToolDescription>{tool.description}</ToolDescription>
      <PermissionSelector
        value={tool.permission.level}
        onChange={(newLevel) => updatePermission(tool.id, newLevel)}
      >
        <option value="ALWAYS_DENY">Always Deny</option>
        <option value="REQUIRE_APPROVAL">Ask Each Time</option>
        <option value="AUTO_APPROVE">Always Allow</option>
      </PermissionSelector>
    </ToolPermissionRow>
  ))}
</ToolPermissionPanel>
```

---

## PART 3: MODE SYSTEM ARCHITECTURE

### 3.1 Mode-Based Persona System

**Mode Definitions:**

```typescript
interface Mode {
  id: string
  name: string
  description: string
  systemPrompt: string              // Core persona
  customInstructions: string        // User-specific rules
  capabilities: ToolCapability[]    // Available tools
  model?: string                    // Sticky model assignment
  autoApproveTools: boolean         // Skip approval prompts
  readOnly: boolean                 // Cannot modify files
}

// Built-in modes
const BUILT_IN_MODES = {
  CODE: {
    id: 'code',
    name: 'Code Mode',
    description: 'Full execution capabilities - write code, run commands, use tools',
    capabilities: ['file_edit', 'terminal', 'mcp_tools', 'browser'],
    readOnly: false,
    autoApproveTools: false
  },
  
  ARCHITECT: {
    id: 'architect',
    name: 'Architect Mode',
    description: 'Planning and analysis only - no execution',
    capabilities: ['file_read', 'mcp_tools_read_only'],
    readOnly: true,
    autoApproveTools: false,
    systemPrompt: `You are a software architect. Focus on planning, design, and high-level decisions.
      Only read files. Do not modify code. Provide detailed analysis and recommendations.`
  },
  
  DEBUG: {
    id: 'debug',
    name: 'Debug Mode',
    description: 'Systematic problem diagnosis',
    capabilities: ['file_read', 'file_edit', 'terminal', 'mcp_tools'],
    readOnly: false,
    customInstructions: `Use a mathematical approach to narrow down bug possibilities.
      Always add logging before fixing. Ask for confirmation before major changes.`
  },
  
  ASK: {
    id: 'ask',
    name: 'Ask Mode',
    description: 'Answer questions about the codebase',
    capabilities: ['file_read', 'mcp_tools_read_only'],
    readOnly: true
  }
}
```

### 3.2 Mode Switching Logic

**Context-Aware Mode Switching:**

```typescript
class ModeManager {
  async determineOptimalMode(task: string, context: TaskContext): Promise<Mode> {
    // Analyze task to determine optimal mode
    if (task.includes('debug') || task.includes('fix')) {
      return this.modes.DEBUG
    }
    if (task.includes('plan') || task.includes('design')) {
      return this.modes.ARCHITECT
    }
    if (task.includes('question') || task.includes('explain')) {
      return this.modes.ASK
    }
    return this.modes.CODE
  }
  
  async canSwitchMode(fromMode: Mode, toMode: Mode): Promise<boolean> {
    // Some switches are automatic, others require approval
    const incompatibleSwitch = fromMode.readOnly && !toMode.readOnly
    
    if (incompatibleSwitch) {
      return await this.promptModeSwitch(fromMode, toMode)
    }
    return true
  }
  
  async switchMode(newMode: Mode): Promise<void> {
    // Mode switch includes:
    // 1. Clearing task state
    // 2. Loading mode-specific system prompt
    // 3. Resetting tool permissions
    // 4. Notifying UI
    
    this.currentMode = newMode
    this.loadModePrompt(newMode)
    this.updateAvailableTools(newMode)
    this.postMessageToWebview({
      type: 'modeChanged',
      mode: newMode
    })
  }
}
```

### 3.3 Custom Mode Creation

**User-Defined Custom Modes:**

```typescript
// Users can create .clinerules-[mode-name] files
// File: .clinerules-qa
`
You are a QA Engineer specializing in D&D game balance testing.

Your role:
- Test character creation for balance issues
- Verify combat calculations
- Check loot generation fairness
- Validate quest reward scaling

When testing:
1. Always create multiple character archetypes
2. Run combat simulations with various enemy combinations
3. Verify loot drop rates match expectations
4. Check for edge cases in ability calculations

Tools you can use:
- execute_test_suite (required approval)
- query_database (no approval needed)
- create_test_character (required approval)

When you find an issue:
1. Document it with exact reproduction steps
2. Suggest a fix if possible
3. Ask for confirmation before applying changes
`

// Programmatic creation
interface CustomMode extends Mode {
  rulesFile: string
  createdAt: Date
  lastModified: Date
}

function createCustomMode(
  name: string,
  rulesContent: string,
  capabilities: string[]
): CustomMode {
  return {
    id: `custom_${name.toLowerCase()}`,
    name: name,
    description: `Custom mode: ${name}`,
    capabilities: capabilities,
    rulesFile: `.clinerules-${name.toLowerCase()}`,
    systemPrompt: rulesContent,
    customInstructions: '',
    readOnly: false,
    autoApproveTools: false,
    createdAt: new Date(),
    lastModified: new Date()
  }
}
```

### 3.4 Sticky Model Assignment

**Per-Mode Model Configuration:**

```typescript
interface ModeModelConfig {
  modeId: string
  modelId: string
  provider: 'anthropic' | 'openai' | 'gemini' | 'local'
  temperature?: number
  maxTokens?: number
  topP?: number
}

class StickyModelManager {
  private modeModelMap: Map<string, ModeModelConfig> = new Map()
  
  async setModelForMode(mode: Mode, modelId: string): Promise<void> {
    // Model assignment persists across:
    // - Mode switches
    // - VS Code restarts
    // - Project changes
    
    this.modeModelMap.set(mode.id, {
      modeId: mode.id,
      modelId: modelId,
      provider: this.getProviderForModel(modelId)
    })
    
    // Persist to settings
    await this.saveToSettings(this.modeModelMap)
  }
  
  async getModelForMode(mode: Mode): Promise<string> {
    return this.modeModelMap.get(mode.id)?.modelId || this.defaultModel
  }
}

// Example configuration
// When in Architect mode: Use o3 (reasoning model)
// When in Code mode: Use Claude Sonnet 4 (speed + quality)
// When in Debug mode: Use Claude Opus (most capable)
```

---

## PART 4: TOOL SYSTEM ARCHITECTURE

### 4.1 Unified Tool Interface

**Abstract Tool Base:**

```typescript
interface ToolInput {
  [key: string]: unknown
}

interface ToolResult {
  status: 'success' | 'error'
  output?: unknown
  error?: string
  metadata?: {
    executionTimeMs: number
    toolId: string
    toolVersion: string
  }
}

interface Tool {
  id: string
  name: string
  description: string
  execute(input: ToolInput): Promise<ToolResult>
  validate(input: ToolInput): ValidationResult
  getSchema(): JSONSchema
}

// Base implementation
abstract class AbstractTool implements Tool {
  abstract id: string
  abstract name: string
  abstract description: string
  
  abstract async execute(input: ToolInput): Promise<ToolResult>
  
  validate(input: ToolInput): ValidationResult {
    // Zod schema validation
    const schema = this.getSchema()
    return validateAgainstSchema(input, schema)
  }
  
  abstract getSchema(): JSONSchema
  
  protected async logExecution(
    input: ToolInput,
    result: ToolResult,
    executionTimeMs: number
  ): Promise<void> {
    // Audit trail for all tool executions
    logger.info({
      tool: this.name,
      input,
      result,
      executionTimeMs,
      timestamp: new Date().toISOString()
    })
  }
}
```

### 4.2 Built-in Tools

**Core Tool Categories:**

```typescript
// File System Tools
class ReadFileTool extends AbstractTool {
  id = 'read_file'
  name = 'Read File'
  description = 'Read the complete contents of a file in the workspace'
  
  async execute(input: { path: string }): Promise<ToolResult> {
    try {
      const content = await fs.readFile(input.path, 'utf-8')
      return {
        status: 'success',
        output: { content, path: input.path }
      }
    } catch (error) {
      return {
        status: 'error',
        error: `Failed to read ${input.path}: ${error.message}`
      }
    }
  }
}

class WriteFileTool extends AbstractTool {
  id = 'write_file'
  name = 'Write File'
  description = 'Create or overwrite a file in the workspace'
  
  async execute(input: { path: string; content: string }): Promise<ToolResult> {
    // Includes safety checks, backup creation
    // Requires mode capability validation
  }
}

// Terminal Tools
class ExecuteCommandTool extends AbstractTool {
  id = 'execute_command'
  name = 'Execute Terminal Command'
  description = 'Run shell commands in the project directory'
  
  async execute(input: { command: string }): Promise<ToolResult> {
    // Captures stdout/stderr
    // Supports long-running processes
    // Stream output to UI
  }
}

// Browser Tools
class BrowserActionTool extends AbstractTool {
  id = 'browser_action'
  name = 'Browser Automation'
  description = 'Control browser for web automation tasks'
  
  async execute(input: {
    action: 'navigate' | 'click' | 'fill' | 'screenshot'
    target?: string
    value?: string
  }): Promise<ToolResult> {
    // Uses Playwright or similar
  }
}

// MCP Tools
class UseMcpToolTool extends AbstractTool {
  id = 'use_mcp_tool'
  name = 'Use MCP Tool'
  description = 'Execute a tool provided by an MCP server'
  
  async execute(input: {
    server_name: string
    tool_name: string
    arguments: object
  }): Promise<ToolResult> {
    // Routes to McpHub for execution
    // Handles permission validation
  }
}
```

### 4.3 Tool Execution Flow

```typescript
class ToolExecutor {
  async executeTool(toolName: string, input: ToolInput): Promise<ToolResult> {
    // 1. Validate tool exists
    const tool = this.getTool(toolName)
    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`)
    }
    
    // 2. Validate input against schema
    const validation = tool.validate(input)
    if (!validation.valid) {
      return {
        status: 'error',
        error: `Invalid input: ${validation.errors.join(', ')}`
      }
    }
    
    // 3. Check permissions (based on mode + tool permissions)
    if (!this.hasPermission(tool, this.currentMode)) {
      return {
        status: 'error',
        error: `No permission to execute ${tool.name} in ${this.currentMode.name}`
      }
    }
    
    // 4. Execute tool with timeout
    const startTime = Date.now()
    try {
      const result = await this.withTimeout(
        tool.execute(input),
        tool.timeout || 30000
      )
      
      // 5. Log execution for audit trail
      await this.logExecution(tool, input, result, Date.now() - startTime)
      
      return result
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        metadata: {
          executionTimeMs: Date.now() - startTime,
          toolId: tool.id,
          toolVersion: tool.version
        }
      }
    }
  }
}
```

---

## PART 5: UI/UX PATTERNS

### 5.1 React Webview Architecture

**Component Hierarchy:**

```
App
├── SettingsView
│   ├── ModelSelector
│   ├── ModeSelector
│   ├── MCPServerConfig
│   └── PermissionManager
├── ChatView
│   ├── MessageList
│   │   └── Message (with ToolUseBlock)
│   ├── ToolOutput (collapsible)
│   └── InputArea
├── McpView
│   ├── ServerStatus
│   └── ToolExplorer
└── TaskView
    ├── TaskProgress
    └── ActionQueue
```

**Key UI State Management:**

```typescript
interface UIState {
  // Current interaction state
  currentMode: Mode
  currentModel: string
  
  // Message/task state
  messages: Message[]
  activeTask: Task | null
  toolOutputs: ToolOutput[]
  
  // UI visibility
  showSettings: boolean
  showMcpPanel: boolean
  expandedTools: Set<string>
  
  // User preferences
  theme: 'dark' | 'light'
  fontSize: number
  autoApprovePermissionLevel: PermissionLevel
}

// Redux-like reducer pattern
function uiReducer(state: UIState, action: UIAction): UIState {
  switch(action.type) {
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] }
    case 'SWITCH_MODE':
      return { ...state, currentMode: action.payload }
    case 'ADD_TOOL_OUTPUT':
      return { ...state, toolOutputs: [...state.toolOutputs, action.payload] }
    default:
      return state
  }
}
```

### 5.2 Message and Tool Output Display

**Message Component with Tool Integration:**

```jsx
function MessageBlock({ message, onToolApproval }) {
  return (
    <div className={`message message-${message.role}`}>
      <div className="message-content">
        {message.content}
      </div>
      
      {message.toolUseBlocks?.map(block => (
        <ToolUseBlock
          key={block.id}
          block={block}
          onApproval={() => onToolApproval(block.id, true)}
          onDeny={() => onToolApproval(block.id, false)}
        />
      ))}
    </div>
  )
}

function ToolUseBlock({ block, onApproval, onDeny }) {
  const [expanded, setExpanded] = useState(false)
  
  return (
    <div className={`tool-block tool-block-${block.status}`}>
      <div className="tool-header" onClick={() => setExpanded(!expanded)}>
        <span className="tool-name">{block.toolName}</span>
        <StatusIndicator status={block.status} />
      </div>
      
      {expanded && (
        <>
          <div className="tool-input">
            <pre>{JSON.stringify(block.input, null, 2)}</pre>
          </div>
          
          {block.status === 'pending' && (
            <div className="tool-actions">
              <button onClick={onApproval}>Approve</button>
              <button onClick={onDeny}>Deny</button>
            </div>
          )}
          
          {block.output && (
            <div className="tool-output">
              <ToolOutputFormatter output={block.output} />
            </div>
          )}
        </>
      )}
    </div>
  )
}
```

---

## PART 6: CONTEXT MANAGEMENT & CONDENSING

### 6.1 Token Budget System

**Context Window Management:**

```typescript
interface TokenBudget {
  total: number              // Model's max context window
  reserved: number           // Reserved for output
  available: number          // Available for input
  used: number              // Currently used
  remaining: number         // Remaining capacity
}

class ContextManager {
  private tokenBudget: TokenBudget
  private messageHistory: Message[] = []
  private condensingEnabled: boolean = true
  
  async addMessage(message: Message): Promise<void> {
    const tokens = this.estimateTokens(message)
    
    if (this.used + tokens > this.available) {
      // Context pressure - condense history
      await this.condenseContext()
    }
    
    this.messageHistory.push(message)
    this.used += tokens
  }
  
  private async condenseContext(): Promise<void> {
    if (!this.condensingEnabled) return
    
    // Intelligently summarize older messages
    // Preserve recent messages and important context
    const summary = await this.generateContextSummary(
      this.messageHistory.slice(0, -5)  // All but last 5
    )
    
    this.messageHistory = [
      { role: 'system', content: summary },
      ...this.messageHistory.slice(-5)  // Keep recent
    ]
    
    this.recalculateTokens()
  }
  
  private async generateContextSummary(messages: Message[]): Promise<string> {
    // Use LLM to create concise summary of conversation history
    // Focuses on decisions made, code written, issues resolved
    return `Previous conversation summary: ...`
  }
}
```

### 6.2 Boomerang Tasks (Complex Multi-Mode Workflows)

**Orchestrated Task Coordination:**

```typescript
interface BoomerangTask {
  id: string
  name: string
  steps: TaskStep[]
  currentStepIndex: number
}

interface TaskStep {
  mode: Mode
  instruction: string
  expectedResult: string
  nextStepCondition?: string  // When to proceed to next
  fallbackStep?: number       // On failure, go to step N
}

// Example: "Design, implement, and test a new feature"
const designImplementTestTask: BoomerangTask = {
  steps: [
    {
      mode: ARCHITECT,
      instruction: "Design the feature architecture",
      expectedResult: "Technical design document with API contracts"
    },
    {
      mode: CODE,
      instruction: "Implement the feature based on the design",
      expectedResult: "Feature implementation with tests",
      fallbackStep: 0  // If implementation fails, redesign
    },
    {
      mode: DEBUG,
      instruction: "Test and debug the implementation",
      expectedResult: "All tests passing, no critical issues"
    },
    {
      mode: CODE,
      instruction: "Apply any fixes from debugging",
      expectedResult: "Final, polished implementation"
    }
  ]
}

class BoomerangTaskExecutor {
  async executeBoomerangTask(task: BoomerangTask): Promise<void> {
    while (task.currentStepIndex < task.steps.length) {
      const step = task.steps[task.currentStepIndex]
      
      // Switch mode
      await this.modeManager.switchMode(step.mode)
      
      // Execute step instruction
      const result = await this.cline.chat({
        userMessage: step.instruction,
        expectedResult: step.expectedResult
      })
      
      // Check if result met expectations
      const metExpectations = await this.evaluateResult(result, step.expectedResult)
      
      if (metExpectations) {
        task.currentStepIndex++
      } else if (step.fallbackStep) {
        task.currentStepIndex = step.fallbackStep
      } else {
        throw new Error(`Step failed and no fallback: ${step.instruction}`)
      }
    }
  }
}
```

---

## PART 7: SECURITY & ISOLATION PATTERNS

### 7.1 Permission Model

**Fine-Grained Permission Hierarchy:**

```typescript
// Permission levels from least to most permissive
enum PermissionLevel {
  DENY = 0,              // Always deny execution
  APPROVE_ONCE = 1,      // Ask each time
  APPROVE_WITH_CONDITIONS = 2,  // Auto-approve if conditions met
  AUTO_APPROVE = 3       // Always approve
}

interface PermissionCondition {
  type: 'parameter_range' | 'path_allowed' | 'rate_limit'
  parameters: {
    [key: string]: unknown
  }
}

class PermissionValidator {
  validateToolPermission(
    tool: Tool,
    mode: Mode,
    input: ToolInput
  ): Promise<boolean> {
    // 1. Check mode has tool capability
    if (!mode.capabilities.includes(tool.capability)) {
      return false
    }
    
    // 2. Check tool permission level
    const permission = this.getToolPermission(tool, mode)
    
    if (permission.level === PermissionLevel.DENY) {
      return false
    }
    
    if (permission.level === PermissionLevel.AUTO_APPROVE) {
      // Check conditions if present
      if (permission.conditions) {
        return this.validateConditions(input, permission.conditions)
      }
      return true
    }
    
    if (permission.level === PermissionLevel.APPROVE_ONCE) {
      return this.promptUserApproval(tool, input)
    }
    
    return false
  }
}
```

### 7.2 File Access Isolation

**Path-Based Access Control:**

```typescript
interface FileAccessPolicy {
  allowedRoots: string[]      // Allowed directory roots
  deniedPaths: string[]       // Explicitly denied paths
  readOnly?: boolean          // Restrict to read-only
  excludePatterns?: string[]  // Glob patterns to exclude
}

class FileAccessValidator {
  constructor(private policy: FileAccessPolicy) {}
  
  validateFilePath(filePath: string, operation: 'read' | 'write'): boolean {
    // Normalize and resolve path
    const resolved = path.resolve(filePath)
    
    // Check if in denied paths
    if (this.policy.deniedPaths.some(p => resolved.startsWith(p))) {
      return false
    }
    
    // Check if in allowed roots
    const inAllowedRoot = this.policy.allowedRoots.some(
      root => resolved.startsWith(path.resolve(root))
    )
    
    if (!inAllowedRoot) {
      return false
    }
    
    // Check write permission
    if (operation === 'write' && this.policy.readOnly) {
      return false
    }
    
    // Check exclude patterns
    if (this.policy.excludePatterns?.some(pattern => 
      minimatch(filePath, pattern)
    )) {
      return false
    }
    
    return true
  }
}

// Example: QuestKeeperAI usage
const questKeeperPolicy: FileAccessPolicy = {
  allowedRoots: [
    './game_data',
    './saves',
    './characters'
  ],
  deniedPaths: [
    './secrets',
    './api_keys'
  ],
  excludePatterns: ['**/*.key', '**/*.secret']
}
```

### 7.3 Resource Quotas

**Rate Limiting and Execution Control:**

```typescript
interface ResourceQuota {
  maxConcurrentTools: number
  maxToolExecutionsPerMinute: number
  maxOutputSize: number           // Max response size
  timeoutMs: number
  memoryLimitMb: number
}

class ResourceQuotaManager {
  private executionHistory: ExecutionRecord[] = []
  private activeExecutions: Set<string> = new Set()
  
  async checkQuota(tool: Tool): Promise<{ allowed: boolean; reason?: string }> {
    // Check concurrent executions
    if (this.activeExecutions.size >= this.quota.maxConcurrentTools) {
      return {
        allowed: false,
        reason: 'Max concurrent tools reached'
      }
    }
    
    // Check rate limit
    const recentExecutions = this.executionHistory.filter(
      record => Date.now() - record.timestamp < 60000
    )
    
    if (recentExecutions.length >= this.quota.maxToolExecutionsPerMinute) {
      return {
        allowed: false,
        reason: 'Rate limit exceeded'
      }
    }
    
    return { allowed: true }
  }
  
  recordExecution(tool: Tool, executionTimeMs: number): void {
    this.executionHistory.push({
      toolId: tool.id,
      timestamp: Date.now(),
      executionTimeMs
    })
  }
}
```

---

## PART 8: CRITICAL LEARNINGS FOR QUEST KEEPER AI

### 8.1 Architecture Patterns to Adopt

**1. Hub-and-Spoke for Tool Management**
```
McpHub (Central coordinator)
├── rpg-tools-mcp (character, combat, loot)
├── inventory-mcp (item management)
├── quest-mcp (quest tracking)
├── filesystem-mcp (save/load game state)
└── world-mcp (NPC interaction, world state)
```

**2. Mode-Based Persona System**
```
Code Mode → Direct game state manipulation
Architect Mode → Campaign planning, balanced design
Debug Mode → Combat resolution debugging
Quest Mode → Quest generation and validation
```

**3. Unified Message/Tool Output Display**
- Real-time tool execution visibility
- Audit trail of all tool calls
- Player-friendly output formatting

### 8.2 Implementation Priorities

**HIGH PRIORITY (Apply immediately):**

1. **MCP Hub Architecture**
   - Central McpHub class managing all MCP servers
   - Standardized transport layer abstraction
   - Two-tier configuration (global + project)

2. **Permission System**
   - Per-tool permission levels (deny, approve, auto-approve)
   - File access policies with path validation
   - Resource quotas with rate limiting

3. **Tool Visibility**
   - Tool call panel showing real-time execution
   - Collapsible tool output display
   - Audit trail database logging

**MEDIUM PRIORITY (Implement in Phase 2-3):**

4. **Mode System**
   - Game Master Mode (orchestration)
   - Player Mode (limited capabilities)
   - Custom modes for specialized gameplay

5. **Context Management**
   - Token budget tracking
   - Context condensing for long campaigns
   - Boomerang tasks for complex quests

**LOWER PRIORITY (Post-MVP):**

6. **Advanced Customization**
   - Custom mode creation via rules files
   - Per-mode model assignment (sticky models)
   - Extended tool schema validation

### 8.3 Code Quality Patterns

**Standard Message Format (Adopt from Roo):**
```typescript
interface ToolCall {
  id: string                    // Unique identifier
  toolName: string              // MCP tool name
  parameters: object            // Validated parameters
  status: 'pending' | 'success' | 'error'
  result?: unknown
  error?: string
  executionMs: number
  timestamp: Date
}
```

**Permission Validation Template:**
```typescript
async function validateToolCall(
  tool: Tool,
  input: ToolInput,
  gameState: GameState
): Promise<ValidationResult> {
  // 1. Schema validation (Zod)
  // 2. Permission check (PermissionValidator)
  // 3. Resource quota check (ResourceQuotaManager)
  // 4. Context validation (game state consistency)
  // 5. User approval (if needed)
}
```

**Error Handling Pattern:**
```typescript
try {
  const result = await tool.execute(input)
  return {
    status: 'success',
    result,
    metadata: { executionMs, toolId: tool.id }
  }
} catch (error) {
  logger.error({ tool: tool.name, error, input })
  return {
    status: 'error',
    error: error.message,
    metadata: { executionMs, toolId: tool.id }
  }
}
```

### 8.4 UI/UX Learnings

**Tool Output Panel (Apply Roo's pattern):**
- Expandable tool blocks with header showing tool name + status
- Input parameters displayed in collapsible section
- Real-time output streaming as tool executes
- Error messages with context and suggestions

**Message Formatting:**
- Different colors/styles for player text vs LLM responses
- Tool blocks integrated within message flow
- Audit trail with timestamps and execution metrics
- Copy/export button for tool output

**Settings/Configuration:**
- Hierarchical settings: global → project → tool-specific
- Visual permission manager with radio button selectors
- MCP server status indicator (connected/disconnected)
- Model sticky assignment per mode

---

## PART 9: SPECIFIC CODE SNIPPETS FOR QUESTKEEPER

### 9.1 MCP Hub Implementation (Adapted for QuestKeeper)

```python
# python_backend/app/mcp/quest_mcp_hub.py

from typing import Dict, List, Any
import asyncio
import json
from dataclasses import dataclass

@dataclass
class MCPServerConfig:
    name: str
    type: str  # 'stdio', 'sse', 'http'
    executable_path: str = None
    url: str = None
    enabled: bool = True
    auto_approve: bool = False
    config: Dict[str, Any] = None

class QuestKeeperMCPHub:
    """Central hub for managing MCP servers (rpg-tools, inventory, quests, etc)"""
    
    def __init__(self, config_path: str):
        self.servers: Dict[str, MCPServerConfig] = {}
        self.connections: Dict[str, Any] = {}
        self.tool_cache: Dict[str, List[Dict]] = {}
        self.load_config(config_path)
    
    def load_config(self, config_path: str):
        """Load from .roo/mcp.json"""
        with open(config_path) as f:
            config = json.load(f)
        
        for server_cfg in config.get('servers', []):
            server = MCPServerConfig(**server_cfg)
            self.servers[server.name] = server
    
    async def start_server(self, server_name: str):
        """Start MCP server process"""
        if server_name not in self.servers:
            raise ValueError(f"Server not found: {server_name}")
        
        server = self.servers[server_name]
        if not server.enabled:
            return
        
        if server.type == 'stdio':
            # Spawn subprocess
            process = await asyncio.create_subprocess_exec(
                'python', server.executable_path,
                stdout=asyncio.subprocess.PIPE,
                stdin=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            self.connections[server_name] = process
            
            # Start communication loop
            asyncio.create_task(self.communicate_with_server(server_name, process))
    
    async def call_tool(
        self,
        server_name: str,
        tool_name: str,
        arguments: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute tool on MCP server"""
        if server_name not in self.connections:
            await self.start_server(server_name)
        
        # Send tool request via JSON-RPC
        request = {
            "jsonrpc": "2.0",
            "method": "tools/call",
            "params": {
                "name": tool_name,
                "arguments": arguments
            },
            "id": str(uuid.uuid4())
        }
        
        process = self.connections[server_name]
        process.stdin.write((json.dumps(request) + '\n').encode())
        
        # Wait for response
        response_line = await process.stdout.readline()
        response = json.loads(response_line)
        
        # Log tool execution for audit trail
        await self.log_tool_call(server_name, tool_name, arguments, response)
        
        return response.get('result')
    
    async def log_tool_call(
        self,
        server_name: str,
        tool_name: str,
        arguments: Dict,
        result: Dict
    ):
        """Audit trail for all tool calls"""
        tool_log = {
            "timestamp": datetime.utcnow().isoformat(),
            "server": server_name,
            "tool": tool_name,
            "arguments": arguments,
            "result": result,
            "status": "success" if result.get("status") == "success" else "error"
        }
        
        # Store in database
        db_session.add(ToolCallLog(**tool_log))
        db_session.commit()
        
        # Notify frontend via WebSocket/IPC
        await self.notify_frontend({
            "type": "tool_executed",
            "data": tool_log
        })
```

### 9.2 Permission Validator (Adapted Pattern)

```python
# python_backend/app/security/permission_validator.py

from enum import Enum
from typing import List, Dict, Any

class PermissionLevel(Enum):
    DENY = 0
    REQUIRE_APPROVAL = 1
    AUTO_APPROVE = 2

class ToolPermission:
    def __init__(
        self,
        tool_name: str,
        server_name: str,
        level: PermissionLevel,
        conditions: Dict[str, Any] = None
    ):
        self.tool_name = tool_name
        self.server_name = server_name
        self.level = level
        self.conditions = conditions or {}

class PermissionValidator:
    def __init__(self):
        self.permissions: Dict[str, ToolPermission] = {}
        self.permission_history: List[Dict] = []
    
    def validate(
        self,
        tool_name: str,
        server_name: str,
        arguments: Dict[str, Any],
        user_approved: bool = False
    ) -> bool:
        """Check if tool can be executed"""
        permission = self.get_permission(tool_name, server_name)
        
        if permission.level == PermissionLevel.DENY:
            return False
        
        if permission.level == PermissionLevel.AUTO_APPROVE:
            # Check conditions if any
            if permission.conditions:
                return self.check_conditions(arguments, permission.conditions)
            return True
        
        if permission.level == PermissionLevel.REQUIRE_APPROVAL:
            return user_approved
        
        return False
    
    def check_conditions(
        self,
        arguments: Dict[str, Any],
        conditions: Dict[str, Any]
    ) -> bool:
        """Validate arguments against permission conditions"""
        for condition_key, condition_value in conditions.items():
            if condition_key not in arguments:
                return False
            
            arg_value = arguments[condition_key]
            
            # Range check
            if isinstance(condition_value, dict) and 'min' in condition_value:
                if not (condition_value['min'] <= arg_value <= condition_value['max']):
                    return False
            
            # Enum check
            if isinstance(condition_value, list):
                if arg_value not in condition_value:
                    return False
        
        return True
```

### 9.3 Frontend Tool Output Display (React)

```jsx
// frontend/src/components/ToolOutputPanel.jsx

import React, { useState } from 'react'
import './ToolOutputPanel.css'

export function ToolOutputPanel({ toolCalls, onClear }) {
  const [expanded, setExpanded] = useState(true)
  const [selectedTool, setSelectedTool] = useState(null)
  const [filter, setFilter] = useState('all') // all, pending, success, error
  
  const filteredCalls = toolCalls.filter(call => {
    if (filter === 'all') return true
    return call.status === filter
  })
  
  return (
    <div className="tool-output-panel" data-expanded={expanded}>
      <div className="panel-header">
        <h3>Tool Execution Log</h3>
        <div className="header-controls">
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All Calls</option>
            <option value="pending">Pending</option>
            <option value="success">Success</option>
            <option value="error">Errors</option>
          </select>
          <button onClick={onClear}>Clear</button>
          <button onClick={() => setExpanded(!expanded)}>
            {expanded ? '▼' : '▶'}
          </button>
        </div>
      </div>
      
      {expanded && (
        <div className="panel-content">
          <div className="tool-list">
            {filteredCalls.map((call, idx) => (
              <div
                key={call.id}
                className={`tool-call-item status-${call.status}`}
                onClick={() => setSelectedTool(call.id === selectedTool ? null : call.id)}
              >
                <div className="tool-header">
                  <span className="tool-name">{call.toolName}</span>
                  <span className={`status-badge status-${call.status}`}>
                    {call.status.toUpperCase()}
                  </span>
                  <span className="timestamp">{formatTime(call.timestamp)}</span>
                </div>
                
                {call.id === selectedTool && (
                  <div className="tool-details">
                    <div className="parameters">
                      <h4>Parameters:</h4>
                      <pre>{JSON.stringify(call.parameters, null, 2)}</pre>
                    </div>
                    
                    {call.result && (
                      <div className="result">
                        <h4>Result:</h4>
                        <ToolOutputFormatter output={call.result} />
                      </div>
                    )}
                    
                    {call.error && (
                      <div className="error">
                        <h4>Error:</h4>
                        <pre>{call.error}</pre>
                      </div>
                    )}
                    
                    <div className="metadata">
                      <span>{call.executionMs}ms</span>
                      <button onClick={() => copyToClipboard(call.result)}>
                        Copy Output
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Formatter for different tool outputs
function ToolOutputFormatter({ output }) {
  if (typeof output === 'string') {
    return <pre>{output}</pre>
  }
  
  if (output.type === 'inventory_updated') {
    return (
      <div className="formatted-output">
        <strong>✓ Inventory Updated</strong>
        <p>Added: {output.item_name} (×{output.quantity})</p>
      </div>
    )
  }
  
  if (output.type === 'dice_roll') {
    return (
      <div className="formatted-output dice-roll">
        <strong>🎲 Dice Roll: {output.total}</strong>
        <p>Rolls: {output.rolls.join(', ')}</p>
      </div>
    )
  }
  
  // Fallback to JSON
  return <pre>{JSON.stringify(output, null, 2)}</pre>
}
```

---

## CONCLUSION: APPLICATION TO QUESTKEEPER

**Immediate Actions:**

1. **Implement McpHub** (Week 2, Backend)
   - Central coordinator for rpg-tools, inventory, quest, filesystem MCPs
   - Standardized transport layer (stdio primary)
   - Permission validation before tool execution

2. **Add Permission Layer** (Week 3, Backend)
   - Per-tool permission levels stored in database
   - User-facing permission manager in settings
   - Audit trail logging to ToolCall table

3. **Build Tool Output Panel** (Week 5, Frontend)
   - Expandable tool execution log
   - Filter by status (pending/success/error)
   - Real-time updates via WebSocket/IPC

4. **Implement Mode System** (Post-MVP, Phase 4)
   - Game Master Mode (orchestration)
   - Player Mode (limited tool access)
   - Custom modes for specialized gameplay

**Files to Create (Directly Adapted from Roo Code):**
- `quest_mcp_hub.py` (MCP orchestration)
- `permission_validator.py` (Permission checks)
- `ToolOutputPanel.jsx` (Frontend display)
- `.roo/mcp.json` (Server configuration)

**Key Files from Roo Code to Reference:**
- `src/services/mcp/McpHub.ts` (Hub implementation)
- `src/core/Cline.ts` (Agent orchestration)
- `webview-ui/src/components/mcp/McpView.tsx` (UI component)
- `src/extension.ts` (Extension lifecycle)

---

**Document Version:** 2.0
**Status:** Ready for Implementation
**Integration Level:** 85% Applicability to QuestKeeperAI
