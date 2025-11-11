"""
QuestKeeperAI - MCP Hub (Hub-and-Spoke Pattern)
Centralized management for all MCP servers following Roo Code architecture.
"""

import asyncio
import json
import logging
import subprocess
from typing import Dict, List, Any, Optional
from pathlib import Path
from datetime import datetime
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class MCPServerConfig:
    """Configuration for an MCP server"""
    name: str
    display_name: str
    type: str  # stdio, sse, http
    executable_path: Optional[str] = None
    command: Optional[str] = None
    args: Optional[List[str]] = None
    env: Optional[Dict[str, str]] = None
    enabled: bool = True
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "display_name": self.display_name,
            "type": self.type,
            "executable_path": self.executable_path,
            "command": self.command,
            "args": self.args,
            "enabled": self.enabled
        }

@dataclass
class ToolDefinition:
    """MCP tool definition"""
    name: str
    description: str
    input_schema: Dict[str, Any]
    server: str

class QuestKeeperMCPHub:
    """
    Central hub managing all MCP servers (Hub-and-Spoke Pattern from Roo Code)
    
    Responsibilities:
    - Server lifecycle management (start, stop, health check)
    - Tool discovery and caching
    - Request routing to appropriate servers
    - Connection pooling
    - Error recovery
    """
    
    def __init__(self, config_path: str = None):
        from app.config import settings
        
        self.config_path = config_path or settings.MCP_CONFIG_PATH
        self.servers: Dict[str, MCPServerConfig] = {}
        self.connections: Dict[str, Any] = {}
        self.processes: Dict[str, subprocess.Popen] = {}
        self.tool_cache: Dict[str, List[ToolDefinition]] = {}
        self.server_status: Dict[str, str] = {}
        
        # Load configuration
        self.load_config()
    
    def load_config(self):
        """Load MCP server configuration from .roo/mcp.json"""
        try:
            config_file = Path(self.config_path)
            if not config_file.exists():
                logger.warning(f"MCP config not found at {self.config_path}")
                self._create_default_config()
                return
            
            with open(config_file, 'r') as f:
                config = json.load(f)
            
            # Parse server configurations
            for server_cfg in config.get('mcpServers', {}).items():
                name, cfg = server_cfg
                
                # Handle both Python path and command-based servers
                if 'command' in cfg:
                    server = MCPServerConfig(
                        name=name,
                        display_name=cfg.get('displayName', name),
                        type='stdio',  # Command-based is stdio
                        command=cfg['command'],
                        args=cfg.get('args', []),
                        env=cfg.get('env', {}),
                        enabled=cfg.get('enabled', True)
                    )
                elif 'path' in cfg or 'executable' in cfg:
                    server = MCPServerConfig(
                        name=name,
                        display_name=cfg.get('displayName', name),
                        type='stdio',
                        executable_path=cfg.get('path') or cfg.get('executable'),
                        enabled=cfg.get('enabled', True)
                    )
                else:
                    logger.warning(f"Invalid server config for {name}")
                    continue
                
                self.servers[name] = server
                self.server_status[name] = 'disconnected'
                
            logger.info(f"Loaded {len(self.servers)} MCP servers from config")
        
        except Exception as e:
            logger.error(f"Error loading MCP config: {e}")
    
    def _create_default_config(self):
        """Create default .roo/mcp.json configuration"""
        config_file = Path(self.config_path)
        config_file.parent.mkdir(parents=True, exist_ok=True)
        
        default_config = {
            "mcpServers": {
                "filesystem": {
                    "command": "npx",
                    "args": ["-y", "@modelcontextprotocol/server-filesystem", "."],
                    "enabled": True,
                    "displayName": "Filesystem"
                }
            }
        }
        
        with open(config_file, 'w') as f:
            json.dump(default_config, f, indent=2)
        
        logger.info(f"Created default MCP config at {self.config_path}")
    
    async def start_server(self, server_name: str) -> bool:
        """
        Start an MCP server process
        
        Args:
            server_name: Name of the server to start
        
        Returns:
            True if started successfully
        """
        if server_name not in self.servers:
            logger.error(f"Server not found: {server_name}")
            return False
        
        server = self.servers[server_name]
        
        if not server.enabled:
            logger.info(f"Server {server_name} is disabled")
            return False
        
        # Check if already running
        if server_name in self.processes and self.processes[server_name].poll() is None:
            logger.info(f"Server {server_name} already running")
            return True
        
        try:
            # Build command
            if server.command:
                cmd = [server.command] + (server.args or [])
            elif server.executable_path:
                cmd = ['python', server.executable_path]
            else:
                logger.error(f"No command or executable for {server_name}")
                return False
            
            # Build environment
            env = server.env.copy() if server.env else {}
            
            # Start process
            logger.info(f"Starting MCP server: {server_name}")
            logger.debug(f"Command: {' '.join(cmd)}")
            
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env={**env}
            )
            
            self.processes[server_name] = process
            self.server_status[server_name] = 'connected'
            
            # Wait a bit to ensure it started
            await asyncio.sleep(0.5)
            
            # Check if still running
            if process.returncode is not None:
                logger.error(f"Server {server_name} failed to start")
                self.server_status[server_name] = 'error'
                return False
            
            # Discover tools
            await self.discover_tools(server_name)
            
            logger.info(f"✅ Server {server_name} started successfully")
            return True
        
        except Exception as e:
            logger.error(f"Error starting server {server_name}: {e}")
            self.server_status[server_name] = 'error'
            return False
    
    async def stop_server(self, server_name: str, timeout: int = 5) -> bool:
        """
        Stop an MCP server gracefully
        
        Args:
            server_name: Name of the server to stop
            timeout: Seconds to wait before force kill
        
        Returns:
            True if stopped successfully
        """
        if server_name not in self.processes:
            logger.warning(f"Server {server_name} not running")
            return True
        
        process = self.processes[server_name]
        
        try:
            logger.info(f"Stopping MCP server: {server_name}")
            
            # Send termination signal
            process.terminate()
            
            # Wait for graceful shutdown
            try:
                await asyncio.wait_for(process.wait(), timeout=timeout)
                logger.info(f"✅ Server {server_name} stopped gracefully")
            except asyncio.TimeoutError:
                # Force kill if timeout
                logger.warning(f"Force killing server {server_name}")
                process.kill()
                await process.wait()
            
            # Cleanup
            del self.processes[server_name]
            if server_name in self.tool_cache:
                del self.tool_cache[server_name]
            
            self.server_status[server_name] = 'disconnected'
            return True
        
        except Exception as e:
            logger.error(f"Error stopping server {server_name}: {e}")
            return False
    
    async def discover_tools(self, server_name: str) -> List[ToolDefinition]:
        """
        Discover available tools from an MCP server
        
        Args:
            server_name: Name of the server
        
        Returns:
            List of tool definitions
        """
        if server_name not in self.processes:
            logger.error(f"Server {server_name} not running")
            return []
        
        try:
            # Send tools/list request via stdio
            request = {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "tools/list",
                "params": {}
            }
            
            response = await self._send_request(server_name, request)
            
            if not response or 'result' not in response:
                logger.warning(f"No tools response from {server_name}")
                return []
            
            # Parse tools
            tools = []
            for tool_data in response['result'].get('tools', []):
                tool = ToolDefinition(
                    name=tool_data['name'],
                    description=tool_data.get('description', ''),
                    input_schema=tool_data.get('inputSchema', {}),
                    server=server_name
                )
                tools.append(tool)
            
            # Cache tools
            self.tool_cache[server_name] = tools
            
            logger.info(f"Discovered {len(tools)} tools from {server_name}")
            return tools
        
        except Exception as e:
            logger.error(f"Error discovering tools from {server_name}: {e}")
            return []
    
    async def call_tool(
        self,
        server_name: str,
        tool_name: str,
        arguments: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Execute a tool on an MCP server
        
        Args:
            server_name: Name of the server
            tool_name: Name of the tool to execute
            arguments: Tool arguments
        
        Returns:
            Tool execution result
        """
        from app.config import settings
        
        # Check server exists and is running
        if server_name not in self.servers:
            return {
                "status": "error",
                "error": f"Server not found: {server_name}"
            }
        
        if server_name not in self.processes:
            # Try to start it
            started = await self.start_server(server_name)
            if not started:
                return {
                    "status": "error",
                    "error": f"Failed to start server: {server_name}"
                }
        
        start_time = datetime.now()
        
        try:
            # Build request
            request = {
                "jsonrpc": "2.0",
                "id": 2,
                "method": "tools/call",
                "params": {
                    "name": tool_name,
                    "arguments": arguments
                }
            }
            
            # Send request with timeout
            response = await asyncio.wait_for(
                self._send_request(server_name, request),
                timeout=settings.MCP_TIMEOUT_SECONDS
            )
            
            execution_ms = int((datetime.now() - start_time).total_seconds() * 1000)
            
            if not response:
                return {
                    "status": "error",
                    "error": "No response from server",
                    "execution_ms": execution_ms
                }
            
            # Handle JSON-RPC error
            if 'error' in response:
                return {
                    "status": "error",
                    "error": response['error'].get('message', 'Unknown error'),
                    "execution_ms": execution_ms
                }
            
            # Log to database
            await self._log_tool_call(
                server_name,
                tool_name,
                arguments,
                response.get('result'),
                'success',
                execution_ms
            )
            
            return {
                "status": "success",
                "result": response.get('result'),
                "execution_ms": execution_ms
            }
        
        except asyncio.TimeoutError:
            execution_ms = int((datetime.now() - start_time).total_seconds() * 1000)
            logger.error(f"Tool call timeout: {server_name}.{tool_name}")
            
            await self._log_tool_call(
                server_name,
                tool_name,
                arguments,
                None,
                'timeout',
                execution_ms,
                error_message="Execution timeout"
            )
            
            return {
                "status": "error",
                "error": "Tool execution timeout",
                "execution_ms": execution_ms
            }
        
        except Exception as e:
            execution_ms = int((datetime.now() - start_time).total_seconds() * 1000)
            logger.error(f"Tool call error: {e}")
            
            await self._log_tool_call(
                server_name,
                tool_name,
                arguments,
                None,
                'error',
                execution_ms,
                error_message=str(e)
            )
            
            return {
                "status": "error",
                "error": str(e),
                "execution_ms": execution_ms
            }
    
    async def _send_request(self, server_name: str, request: Dict) -> Optional[Dict]:
        """Send JSON-RPC request to MCP server via stdio"""
        if server_name not in self.processes:
            return None
        
        process = self.processes[server_name]
        
        try:
            # Send request
            request_json = json.dumps(request) + '\n'
            process.stdin.write(request_json.encode())
            await process.stdin.drain()
            
            # Read response
            response_line = await process.stdout.readline()
            
            if not response_line:
                return None
            
            response = json.loads(response_line.decode())
            return response
        
        except Exception as e:
            logger.error(f"Error communicating with server {server_name}: {e}")
            return None
    
    async def _log_tool_call(
        self,
        server_name: str,
        tool_name: str,
        arguments: Dict,
        result: Any,
        status: str,
        execution_ms: int,
        error_message: str = None
    ):
        """Log tool execution to database"""
        try:
            from app.models import ToolCall, MCPServer, get_or_create_session
            
            session = get_or_create_session()
            
            # Get or create MCP server record
            mcp_server = session.query(MCPServer).filter_by(name=server_name).first()
            if not mcp_server:
                server_cfg = self.servers.get(server_name)
                mcp_server = MCPServer(
                    name=server_name,
                    display_name=server_cfg.display_name if server_cfg else server_name,
                    type=server_cfg.type if server_cfg else 'stdio',
                    enabled=True,
                    status=self.server_status.get(server_name, 'unknown')
                )
                session.add(mcp_server)
                session.flush()
            
            # Create tool call record
            tool_call = ToolCall(
                mcp_server_id=mcp_server.id,
                tool_name=tool_name,
                parameters=arguments,
                result=result,
                status=status,
                error_message=error_message,
                execution_ms=execution_ms,
                executed_at=datetime.utcnow()
            )
            
            session.add(tool_call)
            session.commit()
            session.close()
        
        except Exception as e:
            logger.error(f"Error logging tool call: {e}")
    
    async def health_check(self, server_name: str) -> bool:
        """Check if server is healthy"""
        if server_name not in self.processes:
            return False
        
        process = self.processes[server_name]
        
        # Check if process is still running
        if process.returncode is not None:
            self.server_status[server_name] = 'error'
            return False
        
        self.server_status[server_name] = 'connected'
        return True
    
    def get_tools(self, server_name: str = None) -> List[ToolDefinition]:
        """Get cached tools for a server or all servers"""
        if server_name:
            return self.tool_cache.get(server_name, [])
        
        # Return all tools from all servers
        all_tools = []
        for tools in self.tool_cache.values():
            all_tools.extend(tools)
        return all_tools
    
    def get_server_status(self, server_name: str = None) -> Dict[str, Any]:
        """Get status of a server or all servers"""
        if server_name:
            return {
                "name": server_name,
                "status": self.server_status.get(server_name, 'unknown'),
                "enabled": self.servers[server_name].enabled if server_name in self.servers else False,
                "tools_count": len(self.tool_cache.get(server_name, []))
            }
        
        # Return all server statuses
        return {
            name: {
                "status": self.server_status.get(name, 'unknown'),
                "enabled": server.enabled,
                "tools_count": len(self.tool_cache.get(name, []))
            }
            for name, server in self.servers.items()
        }
    
    async def start_all(self):
        """Start all enabled servers"""
        tasks = []
        for server_name, server in self.servers.items():
            if server.enabled:
                tasks.append(self.start_server(server_name))
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        success_count = sum(1 for r in results if r is True)
        logger.info(f"Started {success_count}/{len(tasks)} MCP servers")
    
    async def stop_all(self):
        """Stop all running servers"""
        tasks = []
        for server_name in list(self.processes.keys()):
            tasks.append(self.stop_server(server_name))
        
        await asyncio.gather(*tasks, return_exceptions=True)
        logger.info("All MCP servers stopped")
    
    async def restart_server(self, server_name: str) -> bool:
        """Restart a server"""
        await self.stop_server(server_name)
        await asyncio.sleep(0.5)
        return await self.start_server(server_name)
