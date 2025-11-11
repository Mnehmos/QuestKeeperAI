# QUICK REFERENCE: ROO CODE → QUESTKEEPER IMPLEMENTATION

## 1-PAGE ARCHITECTURE COMPARISON

### Roo Code Stack
```
VS Code Extension
├── McpHub (MCP orchestration)
├── Cline (AI conversation)
├── PermissionValidator (tool access control)
├── ToolExecutor (execution pipeline)
└── React Webview (UI)
```

### QuestKeeperAI Stack (With Roo Patterns)
```
Electron App (Desktop)
├── QuestKeeperMCPHub (MCP orchestration) ← ROO PATTERN
├── LLMProvider (AI coordination)
├── PermissionValidator (tool access) ← ROO PATTERN
├── ToolOutputPanel (execution visibility) ← ROO PATTERN
└── React App (UI)
```

---

## CRITICAL ROO CODE PATTERNS TO ADOPT

### Pattern 1: Hub-and-Spoke MCP Architecture

**WHY IT MATTERS:** Central coordinator manages all MCP servers, avoiding scattered tool logic

**Roo Code Implementation:**
```typescript
class McpHub {
  private servers: Map<string, MCPServer>
  async callTool(server: string, tool: string, args: object): Promise<any>
  async getTools(server: string): Promise<Tool[]>
  async healthCheck(server: string): Promise<HealthStatus>
}
```

**QuestKeeperAI Implementation:**
```python
class QuestKeeperMCPHub:
    def __init__(self, config_path: str):
        self.servers: Dict[str, MCPServerConfig] = {}
        self.connections: Dict[str, Any] = {}
        self.tool_cache: Dict[str, List[Dict]] = {}
    
    async def call_tool(
        self,
        server_name: str,
        tool_name: str,
        arguments: Dict
    ) -> Dict:
        """Central routing for all tool calls"""
        # 1. Check server exists
        # 2. Route to correct MCP server
        # 3. Execute tool
        # 4. Log to database
        # 5. Return result
```

**Where to Use:**
- Main Flask route: `POST /chat` detects tool needs
- Routes through `QuestKeeperMCPHub.call_tool()`
- Supports rpg-tools, inventory, quest, filesystem, world MCPs

---

### Pattern 2: Permission Levels (3-Tier System)

**WHY IT MATTERS:** Granular control over tool access prevents accidental game state corruption

**Roo Code Permission Levels:**
```typescript
enum PermissionLevel {
  DENY = 0,              // Never
  REQUIRE_APPROVAL = 1,  // Ask each time
  AUTO_APPROVE = 2       // Always (with conditions optional)
}
```

**QuestKeeperAI Permission Examples:**

```python
# config: .roo/mcp.json
PERMISSIONS = {
    "roll_dice": {
        "level": "AUTO_APPROVE",
        "reason": "Non-state-modifying"
    },
    "add_item": {
        "level": "AUTO_APPROVE",
        "conditions": {
            "max_quantity": 100,
            "allowed_rarities": ["common", "uncommon", "rare"]
        }
    },
    "create_quest": {
        "level": "REQUIRE_APPROVAL",
        "reason": "Significant gameplay impact"
    },
    "delete_character": {
        "level": "DENY",
        "reason": "Too destructive"
    }
}
```

**Implementation:**
```python
class PermissionValidator:
    def validate(
        self,
        tool: str,
        arguments: Dict,
        user_approved: bool = False
    ) -> bool:
        perm = self.get_permission(tool)
        
        if perm.level == "DENY":
            return False
        
        if perm.level == "AUTO_APPROVE":
            if perm.conditions:
                return self.check_conditions(arguments, perm.conditions)
            return True
        
        if perm.level == "REQUIRE_APPROVAL":
            return user_approved
        
        return False
```

---

### Pattern 3: Real-Time Tool Output Visibility

**WHY IT MATTERS:** User sees exactly what tools are doing (transparency + debugging)

**Roo Code Pattern: ToolOutputPanel**
- Expandable blocks for each tool execution
- Shows: tool name, status, parameters, result, execution time
- Filters: all, pending, success, error
- Persistent audit trail

**QuestKeeperAI Implementation:**

```jsx
// frontend/src/components/ToolOutputPanel.jsx
<ToolOutputPanel>
  {toolCalls.map(call => (
    <div key={call.id} className={`tool-call status-${call.status}`}>
      <div className="header">
        {call.toolName} {call.status.icon} {call.executionMs}ms
      </div>
      {expanded && (
        <>
          <div className="parameters">
            {JSON.stringify(call.parameters)}
          </div>
          <div className="result">
            {formatResult(call.result)}
          </div>
        </>
      )}
    </div>
  ))}
</ToolOutputPanel>
```

**Database Logging:**
```python
@dataclass
class ToolCall:
    id: str
    server_name: str
    tool_name: str
    parameters: Dict
    result: Dict
    status: str  # 'pending', 'success', 'error'
    execution_ms: int
    timestamp: datetime
    
    # Store in: ToolCall table
    # Access via: /api/tool-calls (audit trail)
```

---

### Pattern 4: Mode-Based Workflows

**WHY IT MATTERS:** Different personas have different tool access (Game Master vs Player)

**Roo Code Modes:**
```
Code Mode:      Full execution (write files, run commands, use tools)
Architect Mode: Planning only (read-only)
Debug Mode:     Problem-solving with focus on diagnostics
Ask Mode:       Answer questions (read-only)
```

**QuestKeeperAI Modes:**
```
Game Master Mode:
  - All MCP tools enabled
  - Can modify character stats directly
  - Can create/delete quests
  - Can spawn enemies, set loot
  - Full game state control

Player Mode:
  - Limited MCP tools
  - Can't directly modify own stats
  - Can't modify other players' characters
  - Can request actions from GM
  - Read-only access to world state

Debug Mode:
  - Diagnose combat calculations
  - Roll resolution with logs
  - Verify loot generation fairness
  - Check quest reward scaling
  - Full audit trail visibility

Custom Modes:
  - QA Engineer: Game balance testing
  - Content Creator: Quest generation
  - Lore Keeper: World state management
```

**Implementation:**
```python
class Mode:
    id: str
    name: str
    permissions: List[PermissionLevel]
    
    # Example: Game Master
    GM_MODE = Mode(
        id="gm",
        name="Game Master",
        permissions={
            "roll_dice": "AUTO_APPROVE",
            "add_item": "AUTO_APPROVE",
            "create_quest": "AUTO_APPROVE",
            "modify_character": "AUTO_APPROVE",
            "delete_quest": "REQUIRE_APPROVAL"
        }
    )
    
    # Example: Player
    PLAYER_MODE = Mode(
        id="player",
        name="Player",
        permissions={
            "roll_dice": "AUTO_APPROVE",
            "add_item": "DENY",
            "create_quest": "DENY",
            "modify_character": "DENY"
        }
    )
```

---

## WEEK-BY-WEEK IMPLEMENTATION (WITH ROO PATTERNS)

### Week 1: Foundation + MCP Hub Setup

```
✓ Backend structure
✓ LLM provider abstraction
✓ Database schema
✓ QuestKeeperMCPHub (from McpHub.ts)
✓ .roo/mcp.json configuration
```

**Key File:** `python_backend/app/mcp/quest_keeper_hub.py`
- 200 lines of code (adapted from Roo's McpHub.ts)
- Server lifecycle management
- Tool discovery caching
- Connection pooling

---

### Week 2: Permission System + Tool Routing

```
✓ PermissionValidator implementation
✓ Tool call routing pipeline
✓ Audit trail database logging
✓ Permission storage (JSON in database)
```

**Key File:** `python_backend/app/security/permission_validator.py`
- 150 lines of code (adapted from Roo pattern)
- Three-tier permission checking
- Condition evaluation logic
- Rate limiting

---

### Week 3: Electron Modernization

```
✓ Window management (minimize, maximize)
✓ Menu bar (File, Edit, View, Help)
✓ Keyboard shortcuts (Ctrl+N, Ctrl+O, Ctrl+,)
✓ IPC handler standardization
✓ Python backend integration
```

**Key File:** `mcp-gemini-desktop/main-modern.js`
- 350 lines of code
- QuestKeeperApp class
- Backend startup/shutdown
- Standardized IPC handlers

---

### Week 4: Frontend Refactoring + Tool Panel

```
✓ Component modularization
✓ Zustand state management
✓ ToolOutputPanel (from Roo pattern)
✓ CSS design system
```

**Key Files:**
- `frontend/src/components/ToolOutputPanel.jsx` (250 lines)
- `frontend/src/stores/gameState.js` (100 lines)
- `frontend/src/styles/variables.css` (80 lines)

---

### Week 5-8: Game Features

```
Week 5: Character Sheet UI
Week 6: Inventory System
Week 7: Quest Log
Week 8: Combat UI
```

Each phase integrates corresponding MCP servers:
```
rpg-tools-mcp:
  ├─ roll_dice
  ├─ get_ability_modifier
  └─ resolve_combat

inventory-mcp:
  ├─ add_item
  ├─ remove_item
  └─ equip_item

quest-mcp:
  ├─ create_quest
  ├─ complete_objective
  └─ complete_quest

world-mcp:
  ├─ generate_npc
  └─ query_world_state
```

---

## CODE TEMPLATES (COPY-PASTE READY)

### Template 1: MCP Hub Initialization

```python
# python_backend/app/mcp/hub.py

from typing import Dict, List, Any
import json
import uuid
import asyncio

class QuestKeeperMCPHub:
    """Central hub managing all MCP servers"""
    
    def __init__(self, config_path: str = ".roo/mcp.json"):
        self.config_path = config_path
        self.servers: Dict[str, Dict] = {}
        self.connections: Dict[str, Any] = {}
        self.tool_cache: Dict[str, List] = {}
        self.load_config()
    
    def load_config(self):
        """Load MCP server configuration from .roo/mcp.json"""
        try:
            with open(self.config_path, 'r') as f:
                config = json.load(f)
            
            for server_cfg in config.get('servers', []):
                if server_cfg.get('enabled', True):
                    self.servers[server_cfg['name']] = server_cfg
        except FileNotFoundError:
            logger.warning(f"MCP config not found at {self.config_path}")
    
    async def call_tool(
        self,
        server_name: str,
        tool_name: str,
        arguments: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute tool on MCP server"""
        
        # 1. Check server exists
        if server_name not in self.servers:
            return {
                "status": "error",
                "error": f"Server not found: {server_name}"
            }
        
        # 2. Check server is enabled
        server_cfg = self.servers[server_name]
        if not server_cfg.get('enabled', True):
            return {
                "status": "error",
                "error": f"Server disabled: {server_name}"
            }
        
        # 3. Connect if needed
        if server_name not in self.connections:
            await self.connect_server(server_name)
        
        # 4. Execute tool (with timeout)
        try:
            result = await asyncio.wait_for(
                self.execute_tool_on_server(server_name, tool_name, arguments),
                timeout=30.0
            )
            
            # 5. Log to database
            await self.log_tool_execution(server_name, tool_name, arguments, result)
            
            return result
        
        except asyncio.TimeoutError:
            return {
                "status": "error",
                "error": f"Tool execution timeout: {tool_name}"
            }
        except Exception as e:
            logger.error(f"Tool execution error: {e}")
            return {
                "status": "error",
                "error": str(e)
            }
    
    async def connect_server(self, server_name: str):
        """Establish connection to MCP server"""
        server_cfg = self.servers[server_name]
        
        if server_cfg['type'] == 'stdio':
            # Spawn subprocess
            process = await asyncio.create_subprocess_exec(
                'python',
                server_cfg['executablePath'],
                stdout=asyncio.subprocess.PIPE,
                stdin=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            self.connections[server_name] = process
    
    async def execute_tool_on_server(
        self,
        server_name: str,
        tool_name: str,
        arguments: Dict
    ) -> Dict:
        """Route tool call to server"""
        # Implementation: Send JSON-RPC request via stdio/HTTP/SSE
        pass
    
    async def log_tool_execution(
        self,
        server_name: str,
        tool_name: str,
        arguments: Dict,
        result: Dict
    ):
        """Log tool execution for audit trail"""
        from app.models.database import ToolCall
        
        tool_call = ToolCall(
            id=str(uuid.uuid4()),
            mcp_server_id=server_name,
            tool_name=tool_name,
            parameters=arguments,
            result=result,
            status=result.get('status', 'unknown'),
            executed_at=datetime.utcnow()
        )
        
        db_session.add(tool_call)
        db_session.commit()
```

### Template 2: Permission Validator

```python
# python_backend/app/security/permission_validator.py

from enum import Enum
from typing import Dict, Any, Optional

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
        conditions: Optional[Dict[str, Any]] = None
    ):
        self.tool_name = tool_name
        self.server_name = server_name
        self.level = level
        self.conditions = conditions or {}

class PermissionValidator:
    def __init__(self):
        self.permissions: Dict[str, ToolPermission] = {}
    
    def validate(
        self,
        tool_name: str,
        server_name: str,
        arguments: Dict[str, Any],
        user_approved: bool = False
    ) -> Dict[str, Any]:
        """
        Validate if tool can be executed
        Returns: {"allowed": bool, "reason": str, "requires_approval": bool}
        """
        
        permission = self.get_permission(tool_name, server_name)
        
        if permission.level == PermissionLevel.DENY:
            return {"allowed": False, "reason": "Tool access denied"}
        
        if permission.level == PermissionLevel.AUTO_APPROVE:
            if permission.conditions:
                valid = self.check_conditions(arguments, permission.conditions)
                if not valid:
                    return {
                        "allowed": False,
                        "reason": "Arguments don't meet conditions"
                    }
            return {"allowed": True}
        
        if permission.level == PermissionLevel.REQUIRE_APPROVAL:
            if not user_approved:
                return {
                    "allowed": False,
                    "requires_approval": True,
                    "reason": "User approval required"
                }
            return {"allowed": True}
        
        return {"allowed": False, "reason": "Invalid permission level"}
    
    def check_conditions(
        self,
        arguments: Dict[str, Any],
        conditions: Dict[str, Any]
    ) -> bool:
        """Validate arguments against permission conditions"""
        
        for condition_type, condition_value in conditions.items():
            if condition_type == "parameter_ranges":
                for param, (min_val, max_val) in condition_value.items():
                    if param in arguments:
                        if not (min_val <= arguments[param] <= max_val):
                            return False
            
            elif condition_type == "allowed_values":
                for param, allowed in condition_value.items():
                    if param in arguments:
                        if arguments[param] not in allowed:
                            return False
        
        return True
    
    def get_permission(
        self,
        tool_name: str,
        server_name: str
    ) -> ToolPermission:
        """Get permission for tool"""
        key = f"{server_name}/{tool_name}"
        if key not in self.permissions:
            # Load from database or config
            # Default to REQUIRE_APPROVAL for safety
            self.permissions[key] = ToolPermission(
                tool_name,
                server_name,
                PermissionLevel.REQUIRE_APPROVAL
            )
        return self.permissions[key]
```

### Template 3: ToolOutputPanel (React)

```jsx
// frontend/src/components/ToolOutputPanel.jsx

import React, { useState, useEffect } from 'react'
import './ToolOutputPanel.css'

export function ToolOutputPanel() {
  const [expanded, setExpanded] = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  const [filter, setFilter] = useState('all')
  const [toolCalls, setToolCalls] = useState([])
  
  useEffect(() => {
    const handler = (event) => {
      if (event.data.type === 'tool_executed') {
        setToolCalls(prev => [event.data.data, ...prev])
      }
    }
    
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])
  
  const filtered = toolCalls.filter(call => 
    filter === 'all' || call.status === filter
  )
  
  return (
    <div className={`tool-panel ${expanded ? 'expanded' : 'collapsed'}`}>
      <div className="panel-header">
        <h3>Tool Log ({filtered.length})</h3>
        <select value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">All</option>
          <option value="success">✓ Success</option>
          <option value="error">✗ Error</option>
          <option value="pending">⏳ Pending</option>
        </select>
        <button onClick={() => setExpanded(!expanded)}>
          {expanded ? '▼' : '▶'}
        </button>
      </div>
      
      {expanded && (
        <div className="panel-content">
          {filtered.map(call => (
            <ToolCallRow
              key={call.id}
              call={call}
              isSelected={call.id === selectedId}
              onToggle={() => setSelectedId(
                selectedId === call.id ? null : call.id
              )}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ToolCallRow({ call, isSelected, onToggle }) {
  return (
    <div className={`tool-row status-${call.status}`} onClick={onToggle}>
      <div className="row-header">
        <span className="icon">{getStatusIcon(call.status)}</span>
        <span className="name">{call.toolName}</span>
        <span className="time">{call.executionMs}ms</span>
      </div>
      
      {isSelected && (
        <div className="row-details">
          <div className="section">
            <h4>Parameters</h4>
            <pre>{JSON.stringify(call.parameters, null, 2)}</pre>
          </div>
          {call.result && (
            <div className="section">
              <h4>Result</h4>
              <pre>{JSON.stringify(call.result, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function getStatusIcon(status) {
  return {
    'success': '✓',
    'error': '✗',
    'pending': '⏳'
  }[status] || '?'
}
```

---

## CRITICAL SUCCESS FACTORS

### 1. Permission Validation (Week 2)
- [ ] PermissionValidator working for all 3 levels
- [ ] Conditions properly evaluated
- [ ] Rate limiting enforced
- [ ] Audit trail logging

### 2. MCP Hub (Week 1)
- [ ] Server startup/shutdown working
- [ ] Tool discovery functional
- [ ] Connection pooling stable
- [ ] Error handling robust

### 3. Tool Visibility (Week 4)
- [ ] ToolOutputPanel displays all executions
- [ ] Real-time status updates
- [ ] Audit trail queryable
- [ ] UI responsive and fast

### 4. Mode System (Post-MVP)
- [ ] Game Master Mode has full access
- [ ] Player Mode restricted appropriately
- [ ] Mode switching works smoothly
- [ ] Permissions enforced per-mode

---

## DEBUGGING CHECKLIST

**Tool not executing?**
1. Check .roo/mcp.json has server configured
2. Verify server executable path correct
3. Check PermissionValidator allows tool
4. Look at audit trail: tool call logged?

**UI not updating?**
1. Check IPC message format matches WebviewMessage interface
2. Verify window.addEventListener listening for 'message'
3. Check DevTools console for errors
4. Trace message flow: Backend → postMessageToWebview → React state

**Permissions not working?**
1. Verify permission stored in database
2. Check PermissionValidator.validate() logic
3. Test condition evaluation separately
4. Check user_approved flag is being set

---

## REFERENCES

**Roo Code Files (Reference Implementation):**
- `src/services/mcp/McpHub.ts` - Hub pattern
- `src/services/security/PermissionManager.ts` - Permission system
- `webview-ui/src/components/mcp/McpView.tsx` - UI pattern
- `src/core/Cline.ts` - Agent orchestration

**QuestKeeperAI Modernization Documents:**
- QuestKeeperAI_Modernization_Plan.md
- QuestKeeperAI_Implementation_Guide.md
- QuestKeeperAI_Strategic_Roadmap.md
- RooCode_DeepDive_Analysis.md
- RooCode_Integration_Synthesis.md

---

**Version:** 1.0 Quick Reference
**Status:** Ready for Implementation
**Last Updated:** 2025-11-11
