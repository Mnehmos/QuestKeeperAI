"""
QuestKeeperAI - MCP Management Routes
Server and tool management endpoints
"""

from flask import Blueprint, request, jsonify
import logging
import asyncio

logger = logging.getLogger(__name__)

bp = Blueprint('mcp', __name__, url_prefix='/api/mcp')

# Global instances (initialized in app factory)
mcp_hub = None
permission_validator = None

def init_mcp_services(hub, validator):
    """Initialize MCP services (called from app factory)"""
    global mcp_hub, permission_validator
    mcp_hub = hub
    permission_validator = validator

@bp.route('/servers', methods=['GET'])
def list_servers():
    """Get all MCP servers and their status"""
    try:
        if not mcp_hub:
            return jsonify({
                "status": "error",
                "error": "MCP Hub not initialized"
            }), 500
        
        status = mcp_hub.get_server_status()
        
        servers = []
        for name, info in status.items():
            server_cfg = mcp_hub.servers.get(name)
            if server_cfg:
                servers.append({
                    "name": name,
                    "display_name": server_cfg.display_name,
                    "type": server_cfg.type,
                    "enabled": server_cfg.enabled,
                    "status": info['status'],
                    "tools_count": info['tools_count']
                })
        
        return jsonify({
            "status": "success",
            "servers": servers,
            "count": len(servers)
        }), 200
    
    except Exception as e:
        logger.error(f"Error listing servers: {e}")
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

@bp.route('/servers/<server_name>', methods=['GET'])
def get_server(server_name: str):
    """Get detailed server information"""
    try:
        if not mcp_hub:
            return jsonify({
                "status": "error",
                "error": "MCP Hub not initialized"
            }), 500
        
        if server_name not in mcp_hub.servers:
            return jsonify({
                "status": "error",
                "error": f"Server not found: {server_name}"
            }), 404
        
        server_cfg = mcp_hub.servers[server_name]
        status = mcp_hub.get_server_status(server_name)
        tools = mcp_hub.get_tools(server_name)
        
        return jsonify({
            "status": "success",
            "server": {
                **server_cfg.to_dict(),
                **status,
                "tools": [
                    {
                        "name": tool.name,
                        "description": tool.description,
                        "input_schema": tool.input_schema
                    }
                    for tool in tools
                ]
            }
        }), 200
    
    except Exception as e:
        logger.error(f"Error getting server: {e}")
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

@bp.route('/servers/<server_name>/start', methods=['POST'])
def start_server(server_name: str):
    """Start an MCP server"""
    try:
        if not mcp_hub:
            return jsonify({
                "status": "error",
                "error": "MCP Hub not initialized"
            }), 500
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            success = loop.run_until_complete(mcp_hub.start_server(server_name))
        finally:
            loop.close()
        
        if success:
            tools = mcp_hub.get_tools(server_name)
            return jsonify({
                "status": "success",
                "message": f"Server {server_name} started",
                "tools_count": len(tools)
            }), 200
        else:
            return jsonify({
                "status": "error",
                "error": f"Failed to start server {server_name}"
            }), 500
    
    except Exception as e:
        logger.error(f"Error starting server: {e}")
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

@bp.route('/servers/<server_name>/stop', methods=['POST'])
def stop_server(server_name: str):
    """Stop an MCP server"""
    try:
        if not mcp_hub:
            return jsonify({
                "status": "error",
                "error": "MCP Hub not initialized"
            }), 500
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            success = loop.run_until_complete(mcp_hub.stop_server(server_name))
        finally:
            loop.close()
        
        if success:
            return jsonify({
                "status": "success",
                "message": f"Server {server_name} stopped"
            }), 200
        else:
            return jsonify({
                "status": "error",
                "error": f"Failed to stop server {server_name}"
            }), 500
    
    except Exception as e:
        logger.error(f"Error stopping server: {e}")
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

@bp.route('/servers/<server_name>/restart', methods=['POST'])
def restart_server(server_name: str):
    """Restart an MCP server"""
    try:
        if not mcp_hub:
            return jsonify({
                "status": "error",
                "error": "MCP Hub not initialized"
            }), 500
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            success = loop.run_until_complete(mcp_hub.restart_server(server_name))
        finally:
            loop.close()
        
        if success:
            return jsonify({
                "status": "success",
                "message": f"Server {server_name} restarted"
            }), 200
        else:
            return jsonify({
                "status": "error",
                "error": f"Failed to restart server {server_name}"
            }), 500
    
    except Exception as e:
        logger.error(f"Error restarting server: {e}")
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

@bp.route('/tools', methods=['GET'])
def list_tools():
    """Get all available tools from all servers"""
    try:
        if not mcp_hub:
            return jsonify({
                "status": "error",
                "error": "MCP Hub not initialized"
            }), 500
        
        all_tools = mcp_hub.get_tools()
        
        tools = [
            {
                "name": tool.name,
                "server": tool.server,
                "description": tool.description,
                "input_schema": tool.input_schema
            }
            for tool in all_tools
        ]
        
        return jsonify({
            "status": "success",
            "tools": tools,
            "count": len(tools)
        }), 200
    
    except Exception as e:
        logger.error(f"Error listing tools: {e}")
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

@bp.route('/tools/execute', methods=['POST'])
def execute_tool():
    """
    Manually execute a tool (for testing/debugging)
    
    Request:
        {
            "server": "server_name",
            "tool": "tool_name",
            "arguments": {...},
            "character_id": "uuid" (optional)
        }
    """
    try:
        if not mcp_hub:
            return jsonify({
                "status": "error",
                "error": "MCP Hub not initialized"
            }), 500
        
        data = request.get_json()
        
        server_name = data.get('server')
        tool_name = data.get('tool')
        arguments = data.get('arguments', {})
        character_id = data.get('character_id')
        
        if not server_name or not tool_name:
            return jsonify({
                "status": "error",
                "error": "Missing server or tool name"
            }), 400
        
        # Check permissions
        validation = permission_validator.validate(
            server_name=server_name,
            tool_name=tool_name,
            arguments=arguments,
            character_id=character_id,
            user_approved=True  # Manual execution counts as approved
        )
        
        if not validation.allowed:
            return jsonify({
                "status": "permission_denied",
                "reason": validation.reason,
                "requires_approval": validation.requires_approval,
                "failed_conditions": validation.failed_conditions
            }), 403
        
        # Execute tool
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(
                mcp_hub.call_tool(server_name, tool_name, arguments)
            )
        finally:
            loop.close()
        
        return jsonify(result), 200
    
    except Exception as e:
        logger.error(f"Error executing tool: {e}")
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

@bp.route('/tools/calls', methods=['GET'])
def get_tool_calls():
    """Get tool execution history"""
    try:
        from app.models import ToolCall, get_or_create_session
        
        # Query parameters
        limit = request.args.get('limit', 50, type=int)
        character_id = request.args.get('character_id')
        server_name = request.args.get('server')
        tool_name = request.args.get('tool')
        status = request.args.get('status')
        
        session = get_or_create_session()
        query = session.query(ToolCall)
        
        # Apply filters
        if character_id:
            query = query.filter_by(character_id=character_id)
        if tool_name:
            query = query.filter_by(tool_name=tool_name)
        if status:
            query = query.filter_by(status=status)
        
        # Order by most recent
        query = query.order_by(ToolCall.executed_at.desc())
        
        # Limit
        tool_calls = query.limit(limit).all()
        
        result = [call.to_dict() for call in tool_calls]
        session.close()
        
        return jsonify({
            "status": "success",
            "tool_calls": result,
            "count": len(result)
        }), 200
    
    except Exception as e:
        logger.error(f"Error getting tool calls: {e}")
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

@bp.route('/permissions', methods=['GET'])
def list_permissions():
    """Get all configured permissions"""
    try:
        if not permission_validator:
            return jsonify({
                "status": "error",
                "error": "Permission validator not initialized"
            }), 500
        
        permissions = permission_validator.get_all_permissions()
        
        result = [perm.to_dict() for perm in permissions]
        
        return jsonify({
            "status": "success",
            "permissions": result,
            "count": len(result)
        }), 200
    
    except Exception as e:
        logger.error(f"Error listing permissions: {e}")
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

@bp.route('/permissions', methods=['POST'])
def set_permission():
    """
    Set or update a tool permission
    
    Request:
        {
            "server": "server_name",
            "tool": "tool_name",
            "level": "deny|require_approval|auto_approve",
            "reason": "optional explanation",
            "conditions": {optional conditions object}
        }
    """
    try:
        from app.security import PermissionLevel, PermissionCondition
        
        if not permission_validator:
            return jsonify({
                "status": "error",
                "error": "Permission validator not initialized"
            }), 500
        
        data = request.get_json()
        
        server_name = data.get('server')
        tool_name = data.get('tool')
        level = data.get('level')
        reason = data.get('reason', '')
        conditions_data = data.get('conditions')
        
        if not server_name or not tool_name or not level:
            return jsonify({
                "status": "error",
                "error": "Missing required fields"
            }), 400
        
        # Parse level
        try:
            perm_level = PermissionLevel(level)
        except ValueError:
            return jsonify({
                "status": "error",
                "error": f"Invalid permission level: {level}"
            }), 400
        
        # Parse conditions if provided
        conditions = None
        if conditions_data:
            conditions = PermissionCondition.from_dict(conditions_data)
        
        # Set permission
        permission = permission_validator.set_permission(
            server_name=server_name,
            tool_name=tool_name,
            level=perm_level,
            reason=reason,
            conditions=conditions
        )
        
        return jsonify({
            "status": "success",
            "permission": permission.to_dict(),
            "message": f"Permission set for {server_name}/{tool_name}"
        }), 200
    
    except Exception as e:
        logger.error(f"Error setting permission: {e}")
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500
