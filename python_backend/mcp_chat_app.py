# python_backend/mcp_chat_app.py
import asyncio
import sys
import os
from dotenv import load_dotenv
from contextlib import AsyncExitStack
from typing import List, Dict, Any, Optional, Tuple, Set
import logging

from google import genai
from google.genai import types as genai_types
from google.genai import errors as genai_errors
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

load_dotenv()


class MCPChatApp:
    def __init__(self, gemini_model_name: str = "gemini-1.5-flash-latest"):
        self.gemini_model_name = gemini_model_name
        self.gemini_sync_client: Optional[genai.Client] = None
        self.gemini_client: Optional[genai.client.AsyncClient] = None
        self.mcp_tools: List[Any] = []
        self.tool_to_session: Dict[str, ClientSession] = {}
        self.chat_history: List[genai_types.Content] = []
        # self.connected_server_paths: Set[str] = set() # Replaced by keys of server_resources
        self.server_resources: Dict[str, Dict[str, Any]] = {} # Key is the identifier (path or name)
        self.cached_gemini_declarations: Optional[List[genai_types.FunctionDeclaration]] = None
        self.gemini_tools_dirty: bool = True
        self.status_check_task: Optional[asyncio.Task] = None
        self.api_key: Optional[str] = None
        # Add available models list
        self.available_models: List[str] = [
            "gemini-1.5-flash-latest",
            "gemini-1.5-pro-latest",
            # Add other desired models here, ensure they are valid for the API key/region
            "gemini-2.0-flash",
            "gemini-2.5-pro-exp-03-25",
        ]

    async def initialize_gemini(self):
        api_key_to_use = self.api_key or os.getenv("GEMINI_API_KEY")
        if not api_key_to_use:
            logger.error(
                "GEMINI_API_KEY not found in environment variables or instance.")
            raise ValueError("GEMINI_API_KEY is required.")
        try:
            self.gemini_sync_client = genai.Client(api_key=api_key_to_use)
            self.gemini_client = self.gemini_sync_client.aio
            logger.info("Gemini async client initialized successfully.")
            if not self.status_check_task or self.status_check_task.done():
                self.status_check_task = asyncio.create_task(
                    self._periodic_status_checker())
                logger.info("Started periodic server status checker.")
        except Exception as e:
            logger.error(f"Failed to initialize Gemini client: {e}")
            self.gemini_client = None  # Ensure client is None on failure
            self.gemini_sync_client = None
            raise

    async def set_api_key_and_reinitialize(self, new_key: str):
        logger.info("Received new API key, attempting to re-initialize Gemini.")
        self.api_key = new_key
        try:
            await self.initialize_gemini()
            logger.info(
                "Gemini client re-initialized successfully with new API key.")
        except Exception as e:
            logger.error(
                f"Failed to re-initialize Gemini with new API key: {e}")
            self.api_key = None  # Revert if initialization fails
            raise

    def set_gemini_model(self, model_name: str):
        """Sets the Gemini model name to be used for future queries."""
        if model_name not in self.available_models:
             # Or fetch available models dynamically if preferred/possible
            logger.warning(f"Attempted to set unsupported Gemini model: {model_name}")
            raise ValueError(f"Unsupported model name: {model_name}. Available: {', '.join(self.available_models)}")
        if model_name != self.gemini_model_name:
            logger.info(f"Switching Gemini model from {self.gemini_model_name} to {model_name}")
            self.gemini_model_name = model_name
            # Optionally, clear chat history when model changes?
            # self.chat_history = []
            # logger.info("Chat history cleared due to model change.")
        else:
            logger.info(f"Gemini model is already set to {model_name}")

    def get_gemini_model(self) -> str:
        """Returns the currently configured Gemini model name."""
        return self.gemini_model_name

    def get_available_models(self) -> List[str]:
        """Returns the list of available Gemini model names."""
        return self.available_models

    async def _check_server_status(self, identifier: str, session: ClientSession):
        # Use identifier (path or name) for logging and access
        server_display_name = os.path.basename(identifier) if '/' in identifier or '\\' in identifier else identifier
        try:
            await session.list_tools() # Ping the server
            if self.server_resources.get(identifier, {}).get('status') == 'error':
                logger.info(
                    f"Server '{server_display_name}' recovered, setting status to 'connected'.")
                self.server_resources[identifier]['status'] = 'connected'
        except Exception as e:
            if self.server_resources.get(identifier, {}).get('status') == 'connected':
                logger.warning(
                    f"Server '{server_display_name}' became unresponsive: {e}. Setting status to 'error'.")
                self.server_resources[identifier]['status'] = 'error'

    async def _periodic_status_checker(self, interval_seconds: int = 10):
        while True:
            await asyncio.sleep(interval_seconds)
            logger.debug("Running periodic server status check...")
            tasks = []
            # Use identifier instead of path
            active_servers = list(self.server_resources.items())
            for identifier, resources in active_servers:
                if 'session' in resources:
                    tasks.append(self._check_server_status(
                        identifier, resources['session']))
            if tasks:
                results = await asyncio.gather(*tasks, return_exceptions=True)
                for i, result in enumerate(results):
                    if isinstance(result, Exception):
                        try:
                            # Get the identifier corresponding to the failed task
                            failed_identifier = active_servers[i][0]
                            logger.error(
                                f"Error during periodic status check gather for {failed_identifier}: {result}", exc_info=result)
                        except IndexError:
                            logger.error(
                                f"Error during periodic status check gather (index {i}, result: {result}) - identifier mapping failed", exc_info=result)
            logger.debug("Periodic server status check finished.")

    async def connect_to_mcp_server(self, path: Optional[str] = None, name: Optional[str] = None, command: Optional[str] = None, args: Optional[List[str]] = None) -> List[str]:
        identifier = path if path else name
        if not identifier:
            raise ValueError("Either 'path' or 'name' must be provided.")

        if identifier in self.server_resources:
            server_display_name = os.path.basename(path) if path else name
            logger.warning(
                f"Server '{server_display_name}' ({identifier}) is already connected. Skipping.")
            raise ValueError(
                f"Server '{server_display_name}' is already connected.")

        command_list: List[str] = []
        if path:
            if not os.path.exists(path):
                logger.error(f"MCP server script not found: {path}")
                raise FileNotFoundError(f"Server script not found: {path}")
            # Assume python if path is given for now, could add more checks
            command_to_use = sys.executable
            command_list = [command_to_use, path]
            logger.info(f"Preparing to connect via path: {path} using '{command_to_use}'")
        elif name and command and args is not None:
            command_list = [command] + args
            logger.info(f"Preparing to connect via command: name='{name}', command='{command}', args={args}")
        else:
            raise ValueError("Invalid parameters. Provide either 'path' or ('name', 'command', 'args').")

        server_params = StdioServerParameters(
            command=command_list[0],
            args=command_list[1:],
            env=None # Consider allowing env vars later if needed
        )

        server_stack = AsyncExitStack()
        try:
            logger.info(f"Connecting to MCP server: {identifier}")
            stdio_transport = await server_stack.enter_async_context(stdio_client(server_params))
            stdio, write = stdio_transport
            session = await server_stack.enter_async_context(ClientSession(stdio, write))
            await session.initialize()
            logger.info(f"Connected to MCP server: {identifier}")

            # Add to resources immediately after successful connection
            self.server_resources[identifier] = {
                'session': session,
                'stack': server_stack,
                'tools': [], # Will be populated below
                'status': 'connected',
                'command_list': command_list # Store how it was launched
            }

            response = await session.list_tools()
            server_tools = response.tools
            logger.info(
                f"Server {identifier} provides tools: {[tool.name for tool in server_tools]}")

            added_tools_names = []
            for tool in server_tools:
                if tool.name in self.tool_to_session:
                    logger.warning(
                        f"Tool name conflict: '{tool.name}' already exists. Skipping tool from {identifier}.")
                else:
                    self.mcp_tools.append(tool)
                    self.tool_to_session[tool.name] = session
                    added_tools_names.append(tool.name)
                    self.gemini_tools_dirty = True

            # Update the tools list for the server
            self.server_resources[identifier]['tools'] = added_tools_names
            logger.info(f"Stored resources for server: {identifier}")
            return added_tools_names

        except Exception as e:
            logger.error(
                f"Failed to connect to or initialize MCP server {identifier}: {e}", exc_info=True)
            # Ensure resources are cleaned up if connection fails
            if identifier in self.server_resources:
                 # If it got added before the exception
                 res = self.server_resources.pop(identifier)
                 await res['stack'].aclose() # Close stack if it exists
            else:
                 # If exception happened before adding to resources, just close stack
                 await server_stack.aclose()
            raise

    async def disconnect_mcp_server(self, identifier: str) -> bool:
        if identifier not in self.server_resources:
            logger.warning(
                f"Attempted to disconnect non-existent server: {identifier}")
            return False

        logger.info(f"Disconnecting MCP server: {identifier}")
        resources = self.server_resources.pop(identifier)
        stack = resources['stack']
        tools_to_remove = resources['tools']

        try:
            await stack.aclose() # This should terminate the process via stdio closing
            logger.info(
                f"Successfully closed resources for server: {identifier}")
        except Exception as e:
            logger.error(
                f"Error closing resources for server {identifier}: {e}", exc_info=True)
        # No need to discard from connected_server_paths anymore

        self.mcp_tools = [
            tool for tool in self.mcp_tools if tool.name not in tools_to_remove]
        for tool_name in tools_to_remove:
            self.tool_to_session.pop(tool_name, None)

        if tools_to_remove:
            self.gemini_tools_dirty = True
            logger.info(
                f"Removed tools from disconnected server {identifier}: {tools_to_remove}")

        logger.info(f"Successfully disconnected server: {identifier}")
        return True

    def get_gemini_tool_declarations(self) -> List[genai_types.FunctionDeclaration]:
        if not self.gemini_tools_dirty and self.cached_gemini_declarations is not None:
            return self.cached_gemini_declarations

        logger.info("Generating Gemini tool declarations.")
        declarations = []

        for mcp_tool in self.mcp_tools:
            try:
                if hasattr(mcp_tool.inputSchema, 'model_dump'):
                    mcp_schema_dict = mcp_tool.inputSchema.model_dump(
                        exclude_none=True)
                elif isinstance(mcp_tool.inputSchema, dict):
                    mcp_schema_dict = mcp_tool.inputSchema
                else:
                    logger.warning(
                        f"MCP tool '{mcp_tool.name}' has unexpected inputSchema type: {type(mcp_tool.inputSchema)}. Skipping.")
                    continue

                if mcp_schema_dict.get('type', '').lower() != 'object':
                    logger.warning(
                        f"MCP tool '{mcp_tool.name}' has non-OBJECT inputSchema ('{mcp_schema_dict.get('type')}'). Skipping for Gemini.")
                    continue

                # Convert the entire parameter schema using the recursive helper
                gemini_params_schema = self._mcp_schema_to_gemini_schema(mcp_schema_dict, mcp_tool.name, "")

                if gemini_params_schema:
                    # Ensure the top-level schema passed to FunctionDeclaration is indeed an OBJECT type
                    if gemini_params_schema.type != genai_types.Type.OBJECT:
                        logger.error(f"Root schema for tool '{mcp_tool.name}' was not converted to OBJECT type by helper. Actual type: {gemini_params_schema.type}. Skipping.")
                        continue

                    declaration = genai_types.FunctionDeclaration(
                        name=mcp_tool.name,
                        description=mcp_tool.description,
                        parameters=gemini_params_schema,
                    )
                    declarations.append(declaration)
                else:
                    logger.warning(
                        f"Skipping tool '{mcp_tool.name}' for Gemini: No valid properties could be mapped from its OBJECT schema.")

            except Exception as e:
                logger.error(
                    f"Failed to convert MCP tool '{mcp_tool.name}' to Gemini declaration: {e}. Skipping this tool.", exc_info=True)
                continue

        self.cached_gemini_declarations = declarations
        self.gemini_tools_dirty = False
        logger.info(f"Cached {len(declarations)} Gemini tool declarations.")
        return declarations

    async def execute_mcp_tool(self, tool_name: str, args: Dict[str, Any]) -> Tuple[str, Optional[str]]:
        """Executes an MCP tool and returns a tuple: (status_string, result_content_or_none)."""
        if tool_name not in self.tool_to_session:
            logger.error(
                f"Attempted to call unknown or disconnected MCP tool: {tool_name}")
            error_msg = f"Error: Tool '{tool_name}' not found or its server is disconnected."
            return error_msg, None # Return error status and None content

        session = self.tool_to_session[tool_name]
        server_identifier = None
        for identifier, resources in self.server_resources.items():
            if resources['session'] == session:
                server_identifier = identifier
                break

        if not server_identifier:
            logger.error(
                f"Could not find server identifier for tool '{tool_name}' with session {session}. This shouldn't happen.")
            error_msg = f"Error: Internal error finding server for tool '{tool_name}'."
            return error_msg, None # Return error status and None content

        try:
            logger.info(f"Executing MCP tool '{tool_name}' with args: {args}")
            response = await session.call_tool(tool_name, args)
            logger.info(f"MCP tool '{tool_name}' executed successfully.")
            # Check if server recovered after successful call
            if self.server_resources[server_identifier]['status'] == 'error':
                 server_display_name = os.path.basename(server_identifier) if '/' in server_identifier or '\\' in server_identifier else server_identifier
                 logger.info(
                    f"Server '{server_display_name}' recovered, setting status to 'connected'.")
                 self.server_resources[server_identifier]['status'] = 'connected'
            # Assuming response.content is the string result or similar primitive
            result_content = str(response.content) if response.content is not None else ""
            # Return "Success" status and the actual content
            return "Success", result_content
        except Exception as e:
            logger.error(
                f"Error executing MCP tool '{tool_name}' on server '{server_identifier}': {e}", exc_info=True)
            if server_identifier: # Check if identifier exists before setting status
                self.server_resources[server_identifier]['status'] = 'error'
            # Return error status string and None content
            error_msg = f"Error executing tool '{tool_name}': {e}"
            return error_msg, None

    async def process_query(self, query: str) -> str:
        logger.info(f"Processing query: '{query}'") # Add logging
        if not self.gemini_client:
            logger.error("process_query called but Gemini client not initialized.")
            return "Error: Gemini client not initialized. Please set your API key via settings."

        # Append user message
        logger.debug("Appending user message to history.")
        self.chat_history.append(genai_types.Content(
            role="user", parts=[genai_types.Part(text=query)]))

        gemini_function_declarations = self.get_gemini_tool_declarations()
        gemini_tools = [genai_types.Tool(
            function_declarations=gemini_function_declarations)] if gemini_function_declarations else None
        config = genai_types.GenerateContentConfig(
            tools=gemini_tools) if gemini_tools else None

        try:
            # Ensure the currently set model name is used
            logger.debug(f"Generating content with model: {self.gemini_model_name}")
            logger.info(f"Sending request to Gemini model: {self.gemini_model_name}")
            logger.debug(f"Request contents: {self.chat_history}")
            logger.debug(f"Request config: {config}")
            response = await self.gemini_client.models.generate_content(
                model=self.gemini_model_name, # Uses the instance variable
                contents=self.chat_history,
                config=config,
            )

            logger.debug(f"Received Gemini response: {response}")
            if not response.candidates or not response.candidates[0].content:
                logger.warning("Gemini response missing candidates or content.")
                feedback = response.prompt_feedback if hasattr(
                    response, 'prompt_feedback') else None
                if feedback and feedback.block_reason:
                    logger.warning(
                        f"Gemini response blocked: {feedback.block_reason}")
                    if self.chat_history and self.chat_history[-1].role == "user":
                        self.chat_history.pop()
                    return f"Response blocked due to: {feedback.block_reason}. {getattr(feedback, 'block_reason_message', '')}"
                if self.chat_history and self.chat_history[-1].role == "user":
                    self.chat_history.pop()
                return "Error: No response content from Gemini."

            model_content = response.candidates[0].content

            if not model_content.parts:
                logger.warning("Received model content with empty parts.")
                if self.chat_history and self.chat_history[-1].role == "user":
                    self.chat_history.pop()
                return "Received an empty response from the AI."

            self.chat_history.append(model_content)

            function_calls_to_execute = [
                part.function_call for part in model_content.parts if hasattr(part, 'function_call') and part.function_call
            ]

            if function_calls_to_execute:
                logger.info(f"Gemini requested {len(function_calls_to_execute)} tool call(s).")
                tool_response_parts = []
                tool_status_messages = [] # Store status messages for prepending

                for function_call in function_calls_to_execute:
                    tool_name = function_call.name
                    tool_args = dict(function_call.args)
                    logger.info(f"Preparing tool call: {tool_name} with args: {tool_args}")
                    # Add start message
                    tool_status_messages.append(f"TOOL_CALL_START: {tool_name} args={tool_args}")

                    # Execute tool and get both status and content
                    tool_status_str, tool_content = await self.execute_mcp_tool(tool_name, tool_args)
                    logger.info(f"Tool '{tool_name}' execution finished with status: {tool_status_str}")

                    # Add end message using only the status string
                    tool_status_messages.append(f"TOOL_CALL_END: {tool_name} status={tool_status_str}")

                    # Prepare the result for Gemini. Use the actual content on success,
                    # or the error status string on failure.
                    gemini_tool_result_content = tool_content if tool_status_str == "Success" else tool_status_str

                    tool_response_parts.append(genai_types.Part.from_function_response(
                        name=tool_name,
                        response={"result": gemini_tool_result_content}, # Send actual content or error string
                    ))

                if tool_response_parts:
                    logger.debug("Appending tool responses to history.")
                    self.chat_history.append(genai_types.Content(
                        role="tool", parts=tool_response_parts))

                    # Ensure the currently set model name is used after tool call
                    logger.info(f"Sending tool results back to Gemini model: {self.gemini_model_name}")
                    logger.debug(f"Request contents (with tool results): {self.chat_history}")
                    response = await self.gemini_client.models.generate_content(
                        model=self.gemini_model_name, # Uses the instance variable
                        contents=self.chat_history,
                        config=config,
                    )

                    logger.debug(f"Received Gemini response after tool call: {response}")
                    if not response.candidates or not response.candidates[0].content:
                        logger.warning("Gemini response missing candidates or content after tool call.")
                        feedback = response.prompt_feedback if hasattr(
                            response, 'prompt_feedback') else None
                        if feedback and feedback.block_reason:
                            logger.warning(
                                f"Gemini response blocked after tool call: {feedback.block_reason}")
                            if len(self.chat_history) >= 2 and self.chat_history[-1].role == "tool" and self.chat_history[-2].role == "model":
                                self.chat_history.pop()
                                self.chat_history.pop()
                            return f"Response blocked after tool call: {feedback.block_reason}. {getattr(feedback, 'block_reason_message', '')}"
                        if len(self.chat_history) >= 2 and self.chat_history[-1].role == "tool" and self.chat_history[-2].role == "model":
                            self.chat_history.pop()
                            self.chat_history.pop()
                        return "Error: No response content from Gemini after tool execution."

                    final_model_content = response.candidates[0].content

                    if not final_model_content.parts:
                        logger.warning(
                            "Received final model content with empty parts after tool call.")
                        if len(self.chat_history) >= 2 and self.chat_history[-1].role == "tool" and self.chat_history[-2].role == "model":
                            self.chat_history.pop()
                            self.chat_history.pop()
                        return "Received empty response after tool call (no parts)."

                    self.chat_history.append(final_model_content)
                    if final_model_content.parts and hasattr(final_model_content.parts[0], 'text') and final_model_content.parts[0].text is not None:
                        final_reply_text = final_model_content.parts[0].text
                        logger.info("Received final text response from Gemini after tool call.")
                    else:
                        logger.warning("Final Gemini response after tool call has no text part.")
                        final_reply_text = "Received empty response after tool call (no text part)."

                    # Prepend status messages to the final reply
                    status_prefix = "\n".join(tool_status_messages) + "\n\n" if tool_status_messages else ""
                    return status_prefix + final_reply_text
                else:
                    logger.error(
                        "function_calls_to_execute was present, but tool_response_parts became empty.")
                    return "Error: Tool calls were requested but no responses could be generated."

            elif model_content.parts and hasattr(model_content.parts[0], 'text') and model_content.parts[0].text is not None:
                logger.info("Received standard text response from Gemini (no tool call).")
                return model_content.parts[0].text
            else:
                logger.warning("Received Gemini response with no text part and no tool call.")
                return "Received response with no text."

        except genai_errors.APIError as e:
            logger.error(f"Gemini API error: {e}")
            if self.chat_history and self.chat_history[-1].role == "user":
                self.chat_history.pop()
            return f"Gemini API Error: {e.message}"
        except Exception as e:
            logger.error(f"Error processing query: {e}", exc_info=True)
            if self.chat_history and self.chat_history[-1].role == "user":
                self.chat_history.pop()
            return f"An unexpected error occurred: {e}"


    def _mcp_schema_to_gemini_schema(self, mcp_schema_dict: Dict[str, Any], tool_name: str, property_path: str) -> Optional[genai_types.Schema]:
        """
        Recursively converts an MCP-style JSON schema dictionary to a Gemini types.Schema object.
        """

        type_mapping = {
            'string': genai_types.Type.STRING,
            'number': genai_types.Type.NUMBER,
            'integer': genai_types.Type.INTEGER,
            'boolean': genai_types.Type.BOOLEAN,
            'array': genai_types.Type.ARRAY,
            'object': genai_types.Type.OBJECT,
        }

        if not isinstance(mcp_schema_dict, dict):
            logger.warning(f"{tool_name}.{property_path} is not a dict ({type(mcp_schema_dict)}). Skipping.")
            return None
        
        mcp_type_lower = mcp_schema_dict.get('type', '').lower()
        gemini_enum_type = type_mapping.get(mcp_type_lower)
        if not gemini_enum_type:
            logger.warning(f"{tool_name}.{property_path} has unmappable MCP type '{mcp_type_lower}'. Skipping.")
            return None
        
        args_for_gemini_schema: Dict[str, Any] = {
            "type_": gemini_enum_type,
            "description": mcp_schema_dict.get('description', '').strip() or None,
        }
        
        if 'title' in mcp_schema_dict:
            args_for_gemini_schema['title'] = mcp_schema_dict['title']
        
        if gemini_enum_type == genai_types.Type.OBJECT:
            gemini_props_map = {}
            mcp_properties = mcp_schema_dict.get('properties', {})
            if isinstance(mcp_properties, dict):
                for prop_name, sub_mcp_schema_dict in mcp_properties.items():
                    sub_gemini_schema = self._mcp_schema_to_gemini_schema(
                        sub_mcp_schema_dict,
                        tool_name,
                        f"{property_path}.properties.{prop_name}"
                    )
                    if sub_gemini_schema:
                        gemini_props_map[prop_name] = sub_gemini_schema
            
                args_for_gemini_schema['properties'] = gemini_props_map
            elif mcp_properties :
                logger.warning(f"{tool_name}.{property_path} had properties defined, but not as an object.")
            mcp_required_list = mcp_schema_dict.get('required', [])
            if isinstance(mcp_required_list, list) and gemini_props_map:
                valid_required_list = [req_prop for req_prop in mcp_required_list if req_prop in gemini_props_map]
                if valid_required_list:
                    args_for_gemini_schema['required'] = valid_required_list
        elif gemini_enum_type == genai_types.Type.ARRAY:
            mcp_items_schema_dict = mcp_schema_dict.get('items')
            if isinstance(mcp_items_schema_dict, dict):
                gemini_items_schema = self._mcp_schema_to_gemini_schema(
                    mcp_items_schema_dict,
                    tool_name,
                    f"{property_path}.items"
                )
                if gemini_items_schema:
                    args_for_gemini_schema['items'] = gemini_items_schema
                else:
                    logger.warning(f"{tool_name}.{property_path}: failed to convert 'items' schema for ARRAY.")
            else:
                logger.warning(f"{tool_name}.{property_path}: 'items' field for ARRAY is missing or not a dict.")
        
        if gemini_enum_type == genai_types.Type.STRING and 'enum' in mcp_schema_dict and isinstance(mcp_schema_dict['enum'], list):
            args_for_gemini_schema['enum'] = mcp_schema_dict['enum']
        try:
            # Use type_ instead of type due to Python keyword conflict
            return genai_types.Schema(**{k if k != 'type_' else 'type': v for k, v in args_for_gemini_schema.items()})
        except Exception as e:
            logger.error(f"{tool_name}.{property_path}: Error creating genai_types.Schema with processed args {args_for_gemini_schema}: {e}", exc_info=True)
            return None


    async def cleanup(self):
        logger.info("Cleaning up MCPChatApp resources...")
        if self.status_check_task and not self.status_check_task.done():
            self.status_check_task.cancel()
            try:
                await self.status_check_task
            except asyncio.CancelledError:
                logger.info("Periodic status checker task cancelled.")
            except Exception as e:
                logger.error(
                    f"Error during status checker task cleanup: {e}", exc_info=True)
            self.status_check_task = None
        server_identifiers = list(self.server_resources.keys())
        for identifier in server_identifiers:
            await self.disconnect_mcp_server(identifier)
        logger.info("MCPChatApp cleanup complete.")
