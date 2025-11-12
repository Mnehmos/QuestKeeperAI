"""
QuestKeeperAI - Chat Routes
LLM chat with MCP tool integration
"""

from flask import Blueprint, request, jsonify
from typing import Dict, Any, List
import logging
import asyncio

# Import Tool type for type hints
from app.llm import Tool

logger = logging.getLogger(__name__)

bp = Blueprint('chat', __name__, url_prefix='/api/chat')

# Global instances (initialized in app factory)
llm_provider = None
mcp_hub = None
permission_validator = None

def init_chat_services(llm, hub, validator):
    """Initialize chat services (called from app factory)"""
    global llm_provider, mcp_hub, permission_validator
    llm_provider = llm
    mcp_hub = hub
    permission_validator = validator

@bp.route('', methods=['POST'])
def chat():
    """
    Send a message to LLM with MCP tool support and conversation history

    Request:
        {
            "message": "str",
            "conversation_id": "uuid" (optional, creates new if not provided),
            "character_id": "uuid" (optional),
            "enable_tools": bool (default: true),
            "temperature": float (optional),
            "max_tokens": int (optional),
            "provider": "str" (optional, e.g., "anthropic", "openai", "gemini", "openrouter", "local"),
            "model": "str" (optional, specific model name to use)
        }

    Response:
        {
            "status": "success|error",
            "conversation_id": "uuid",
            "message_id": "uuid",
            "reply": "str",
            "tool_calls": [{tool execution results}],
            "execution_ms": int,
            "total_tokens": int
        }
    """
    try:
        from datetime import datetime
        from app.llm import Message, Tool
        from app.models.database import Conversation, Message as DBMessage, get_or_create_session
        from app.services.token_counter import token_counter

        data = request.get_json()

        if not data or 'message' not in data:
            return jsonify({
                "status": "error",
                "error": "No message provided"
            }), 400

        message_content = data['message']
        conversation_id = data.get('conversation_id')
        character_id = data.get('character_id')
        enable_tools = data.get('enable_tools', True)
        temperature = data.get('temperature', 0.7)
        max_tokens = data.get('max_tokens', 2048)
        provider = data.get('provider')
        model = data.get('model')

        start_time = datetime.now()

        # Get database session
        db_session = get_or_create_session()

        try:
            # Load or create conversation
            if conversation_id:
                conversation = db_session.query(Conversation).filter_by(
                    id=conversation_id
                ).first()
                if not conversation:
                    return jsonify({
                        "status": "error",
                        "error": f"Conversation {conversation_id} not found"
                    }), 404
            else:
                # Create new conversation
                conversation = Conversation(
                    title=_generate_conversation_title(message_content),
                    character_id=character_id
                )
                db_session.add(conversation)
                db_session.flush()  # Get ID for message reference
                logger.info(f"Created new conversation {conversation.id}")

            # Add user message to database
            user_msg = DBMessage(
                conversation_id=conversation.id,
                role="user",
                content=message_content,
                provider=provider,
                model=model
            )
            db_session.add(user_msg)
            db_session.flush()

            # Build message history for LLM (FULL CONVERSATION CONTEXT)
            messages = []
            for db_msg in conversation.messages:
                messages.append(Message(
                    role=db_msg.role,
                    content=db_msg.content
                ))
        
            # Get available tools if enabled
            tools = None
            if enable_tools and mcp_hub:
                tools = _get_available_tools()

            # Build system prompt
            system_prompt = _build_system_prompt(character_id)

            # Get LLM provider (use specified provider/model or fall back to global)
            current_provider = llm_provider
            if provider:
                from app.llm.provider import create_llm_provider
                from app.config import settings

                # Get appropriate API key
                api_key = None
                if provider == 'anthropic':
                    api_key = settings.ANTHROPIC_API_KEY
                elif provider == 'openai':
                    api_key = settings.OPENAI_API_KEY
                elif provider == 'gemini':
                    api_key = settings.GEMINI_API_KEY
                elif provider == 'openrouter':
                    api_key = settings.OPENROUTER_API_KEY

                try:
                    # Convert empty string to None for default model
                    model_to_use = model if model else None
                    current_provider = create_llm_provider(provider, api_key, model_to_use)
                except Exception as e:
                    logger.warning(f"Failed to create provider {provider}: {e}. Using default provider.")
                    current_provider = llm_provider

            # Call LLM with full conversation history
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

            try:
                response = loop.run_until_complete(
                    current_provider.chat(
                        messages=messages,
                        system_prompt=system_prompt,
                        tools=tools,
                        temperature=temperature,
                        max_tokens=max_tokens
                    )
                )
            finally:
                loop.close()

            # Process tool calls if any
            tool_results = []
            if response.get('tool_calls'):
                tool_results = _execute_tool_calls(
                    response['tool_calls'],
                    character_id
                )

            execution_ms = int((datetime.now() - start_time).total_seconds() * 1000)

            # Save assistant response to database
            assistant_msg = DBMessage(
                conversation_id=conversation.id,
                role="assistant",
                content=response.get('content', ''),
                tool_calls=response.get('tool_calls'),
                execution_ms=execution_ms,
                provider=provider,
                model=model
            )
            db_session.add(assistant_msg)

            # Update conversation metadata
            conversation.last_modified = datetime.utcnow()

            # Calculate and update token counts
            try:
                # Count tokens for all messages
                message_dicts = [
                    {"role": msg.role, "content": msg.content}
                    for msg in conversation.messages
                ]
                conversation.total_tokens = token_counter.count_messages(
                    message_dicts,
                    model=model or "claude-sonnet-4"
                )
            except Exception as token_error:
                logger.warning(f"Token counting failed: {token_error}")
                # Estimate based on message count
                conversation.total_tokens = len(conversation.messages) * 100

            db_session.commit()

            logger.info(
                f"Chat complete: conversation {conversation.id}, "
                f"{len(conversation.messages)} messages, "
                f"{conversation.total_tokens} tokens"
            )

            return jsonify({
                "status": "success",
                "conversation_id": conversation.id,
                "message_id": assistant_msg.id,
                "reply": response.get('content', ''),
                "tool_calls": tool_results,
                "stop_reason": response.get('stop_reason'),
                "execution_ms": execution_ms,
                "total_tokens": conversation.total_tokens
            }), 200

        except Exception as e:
            db_session.rollback()
            raise

        finally:
            db_session.close()
    
    except Exception as e:
        logger.error(f"Chat error: {e}", exc_info=True)
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

def _get_available_tools() -> List[Tool]:
    """Get all available tools from MCP servers"""
    tools = []
    
    try:
        # Get tools from all connected servers
        mcp_tools = mcp_hub.get_tools()
        
        for mcp_tool in mcp_tools:
            tool = Tool(
                name=f"{mcp_tool.server}_{mcp_tool.name}",
                description=mcp_tool.description,
                input_schema=mcp_tool.input_schema
            )
            tools.append(tool)
        
        logger.info(f"Loaded {len(tools)} tools for LLM")
    
    except Exception as e:
        logger.error(f"Error getting tools: {e}")
    
    return tools

def _build_system_prompt(character_id: str = None) -> str:
    """Build system prompt for D&D game master"""
    
    base_prompt = """You are an expert Dungeon Master for Dungeons & Dragons 5th Edition.
You help players create characters, manage inventory, track quests, and run engaging adventures.

When players need to roll dice, modify their character, add items, or perform game actions, 
use the available MCP tools to interact with the game state.

Be creative, descriptive, and follow D&D 5e rules. Make the game fun and engaging."""
    
    # Add character context if active
    if character_id:
        try:
            from app.models import Character, get_or_create_session
            
            session = get_or_create_session()
            character = session.query(Character).filter_by(id=character_id).first()
            session.close()
            
            if character:
                base_prompt += f"\n\nACTIVE CHARACTER:\n"
                base_prompt += f"Name: {character.name}\n"
                base_prompt += f"Class: {character.character_class}, Level {character.level}\n"
                base_prompt += f"Race: {character.race}\n"
                base_prompt += f"HP: {character.hit_points_current}/{character.hit_points_max}\n"
                base_prompt += f"AC: {character.armor_class}\n"
                
                if character.ability_scores:
                    base_prompt += f"\nAbility Scores:\n"
                    scores = character.ability_scores
                    base_prompt += f"STR {scores.strength} ({scores.get_modifier('strength'):+d}), "
                    base_prompt += f"DEX {scores.dexterity} ({scores.get_modifier('dexterity'):+d}), "
                    base_prompt += f"CON {scores.constitution} ({scores.get_modifier('constitution'):+d})\n"
                    base_prompt += f"INT {scores.intelligence} ({scores.get_modifier('intelligence'):+d}), "
                    base_prompt += f"WIS {scores.wisdom} ({scores.get_modifier('wisdom'):+d}), "
                    base_prompt += f"CHA {scores.charisma} ({scores.get_modifier('charisma'):+d})\n"
        
        except Exception as e:
            logger.error(f"Error loading character context: {e}")
    
    return base_prompt

def _execute_tool_calls(tool_calls: List, character_id: str = None) -> List[Dict]:
    """Execute MCP tool calls with permission checking"""
    results = []
    
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    try:
        for tool_call in tool_calls:
            result = loop.run_until_complete(
                _execute_single_tool(tool_call, character_id)
            )
            results.append(result)
    finally:
        loop.close()
    
    return results

async def _execute_single_tool(tool_call, character_id: str = None) -> Dict:
    """Execute a single tool call with permission checking"""
    try:
        # Parse tool name (format: server_toolname)
        tool_full_name = tool_call.name
        
        if '_' not in tool_full_name:
            return {
                "tool": tool_full_name,
                "status": "error",
                "error": "Invalid tool name format"
            }
        
        parts = tool_full_name.split('_', 1)
        server_name = parts[0]
        tool_name = parts[1]
        arguments = tool_call.args
        
        # Check permissions
        validation = permission_validator.validate(
            server_name=server_name,
            tool_name=tool_name,
            arguments=arguments,
            character_id=character_id,
            user_approved=False  # TODO: Support user approval flow
        )
        
        if not validation.allowed:
            return {
                "tool": tool_full_name,
                "status": "permission_denied",
                "reason": validation.reason,
                "requires_approval": validation.requires_approval,
                "failed_conditions": validation.failed_conditions
            }
        
        # Execute tool
        result = await mcp_hub.call_tool(
            server_name=server_name,
            tool_name=tool_name,
            arguments=arguments
        )
        
        return {
            "tool": tool_full_name,
            "status": result.get('status'),
            "result": result.get('result'),
            "execution_ms": result.get('execution_ms')
        }
    
    except Exception as e:
        logger.error(f"Tool execution error: {e}")
        return {
            "tool": tool_call.name,
            "status": "error",
            "error": str(e)
        }

@bp.route('/providers', methods=['GET'])
def get_providers():
    """Get available LLM providers"""
    from app.config import settings, LLMProvider
    
    return jsonify({
        "status": "success",
        "providers": [p.value for p in LLMProvider],
        "current": settings.LLM_PROVIDER.value
    }), 200

def _generate_conversation_title(message: str, max_length: int = 50) -> str:
    """
    Generate conversation title from first message

    Args:
        message: First user message
        max_length: Maximum title length

    Returns:
        Generated title
    """
    # Remove extra whitespace
    title = ' '.join(message.split())

    # Truncate if too long
    if len(title) > max_length:
        title = title[:max_length - 3] + "..."

    # Fallback to timestamp if empty
    if not title.strip():
        from datetime import datetime
        title = f"Chat {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}"

    return title


@bp.route('/providers', methods=['POST'])
def set_provider():
    """
    Switch LLM provider
    
    Request:
        {
            "provider": "anthropic|openai|gemini|local",
            "api_key": "optional_key",
            "model": "optional_model"
        }
    """
    try:
        global llm_provider
        from app.llm import create_llm_provider
        
        data = request.get_json()
        provider = data.get('provider')
        api_key = data.get('api_key')
        model = data.get('model')
        
        if not provider:
            return jsonify({
                "status": "error",
                "error": "No provider specified"
            }), 400
        
        # Create new provider
        llm_provider = create_llm_provider(
            provider=provider,
            api_key=api_key,
            model=model
        )
        
        return jsonify({
            "status": "success",
            "provider": llm_provider.provider_name,
            "message": f"Switched to {llm_provider.provider_name}"
        }), 200
    
    except Exception as e:
        logger.error(f"Error switching provider: {e}")
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500
