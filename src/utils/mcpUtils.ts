/**
 * MCP Response Utilities
 *
 * Handles parsing of MCP tool responses which can come in two formats:
 * 1. MCP content wrapper: { content: [{ type: 'text', text: '...' }] }
 * 2. Direct JSON: { characters: [...], count: 1 }
 *
 * Also provides batch execution utilities for parallel tool calls.
 */

// Debug logging flag - set to true only during development
const DEBUG_MCP_PARSING = true;

/**
 * Extract data from MCP tool response
 * Handles both MCP content wrapper format and direct JSON format
 */
export function parseMcpResponse<T>(result: any, fallback: T): T {
  if (result === null || result === undefined) {
    if (DEBUG_MCP_PARSING) console.log('[parseMcpResponse] Result is null/undefined, using fallback');
    return fallback;
  }

  if (DEBUG_MCP_PARSING) {
    console.log('[parseMcpResponse] Input type:', typeof result);
    console.log('[parseMcpResponse] Input keys:', typeof result === 'object' ? Object.keys(result) : 'N/A');

    // Safe stringify for logging - avoid logging full payloads in production
    try {
      const logStr = JSON.stringify(result);
      console.log('[parseMcpResponse] Full input:', logStr.slice(0, 500));
    } catch {
      console.log('[parseMcpResponse] Could not stringify input');
    }
  }

  // Case 1: Direct JSON response (no content wrapper)
  // This happens when the response is already parsed JSON
  if (typeof result === 'object' && !('content' in result)) {
    if (DEBUG_MCP_PARSING) console.log('[parseMcpResponse] Case 1: Direct JSON (no content wrapper)');
    return result as T;
  }

  // Case 2: MCP content wrapper format
  // { content: [{ type: 'text', text: '...' }] }
  if (result?.content && Array.isArray(result.content)) {
    if (DEBUG_MCP_PARSING) {
      console.log('[parseMcpResponse] Case 2: MCP content wrapper, items:', result.content.length);

      if (result.content[0]) {
        console.log('[parseMcpResponse] Content[0] type:', result.content[0].type);
        console.log('[parseMcpResponse] Content[0] keys:', Object.keys(result.content[0]));
      }
    }

    const textContent = result.content.find((c: any) => c.type === 'text');
    if (DEBUG_MCP_PARSING) console.log('[parseMcpResponse] Found text content:', !!textContent);

    if (textContent?.text) {
      if (DEBUG_MCP_PARSING) console.log('[parseMcpResponse] Text value (first 300 chars):', String(textContent.text).slice(0, 300));
      // Try to parse as JSON
      try {
        const parsed = JSON.parse(textContent.text);
        if (DEBUG_MCP_PARSING) {
          console.log('[parseMcpResponse] Successfully parsed JSON');
          console.log('[parseMcpResponse] Parsed keys:', Object.keys(parsed));
        }
        return parsed as T;
      } catch {
        if (DEBUG_MCP_PARSING) console.log('[parseMcpResponse] JSON parse failed, returning raw text');
        // If not JSON, return the text as-is (for simple responses like dice rolls)
        return textContent.text as unknown as T;
      }
    } else if (DEBUG_MCP_PARSING) {
      console.log('[parseMcpResponse] No text property found in content item');
      if (result.content[0]) {
        console.log('[parseMcpResponse] Content[0] full:', JSON.stringify(result.content[0]).slice(0, 200));
      }
    }
  }

  // Case 3: Simple value (number, string, etc.)
  if (typeof result === 'number' || typeof result === 'string' || typeof result === 'boolean') {
    if (DEBUG_MCP_PARSING) console.log('[parseMcpResponse] Case 3: Simple value:', result);
    return result as unknown as T;
  }

  if (DEBUG_MCP_PARSING) console.warn('[parseMcpResponse] Could not parse response, using fallback');
  return fallback;
}

/**
 * Check if a response indicates an error
 */
export function isErrorResponse(result: any): boolean {
  if (!result) return false;
  
  // Direct error object
  if (result.error) return true;
  
  // Error in content
  if (result?.content?.[0]?.text) {
    try {
      const parsed = JSON.parse(result.content[0].text);
      return !!parsed.error;
    } catch {
      return false;
    }
  }
  
  return false;
}

/**
 * Extract error message from MCP response
 */
export function getErrorMessage(result: any): string | null {
  if (!result) return null;
  
  // Direct error object
  if (result.error) {
    return typeof result.error === 'string' ? result.error : result.error.message || 'Unknown error';
  }
  
  // Error in content
  if (result?.content?.[0]?.text) {
    try {
      const parsed = JSON.parse(result.content[0].text);
      if (parsed.error) {
        return typeof parsed.error === 'string' ? parsed.error : parsed.error.message || 'Unknown error';
      }
    } catch {
      return null;
    }
  }
  
  return null;
}

/**
 * Batch tool call configuration
 */
export interface BatchToolCall {
  name: string;
  args: any;
}

export interface BatchToolResult {
  name: string;
  args: any;
  result: any;
  error?: string;
  duration: number;
}

/**
 * Execute multiple tool calls in parallel with proper error handling
 * Returns results in the same order as input
 */
export async function executeBatchToolCalls(
  mcpClient: { callTool: (name: string, args: any) => Promise<any> },
  calls: BatchToolCall[]
): Promise<BatchToolResult[]> {
  const startTime = Date.now();
  
  const promises = calls.map(async (call, _index) => {
    const callStart = Date.now();
    try {
      const result = await mcpClient.callTool(call.name, call.args);
      return {
        name: call.name,
        args: call.args,
        result,
        duration: Date.now() - callStart
      };
    } catch (error: any) {
      return {
        name: call.name,
        args: call.args,
        result: null,
        error: error.message || 'Unknown error',
        duration: Date.now() - callStart
      };
    }
  });

  const results = await Promise.all(promises);
  
  console.log(`[BatchToolCalls] Executed ${calls.length} calls in ${Date.now() - startTime}ms`);
  
  return results;
}

/**
 * Debounce function for reducing sync frequency
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

/**
 * Throttle function for rate limiting
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}
/**
 * Extract embedded JSON from tool response text
 * Looks for <!-- STATE_JSON ... STATE_JSON --> markers
 */
export function extractEmbeddedStateJson(text: string): any | null {
  // DEBUG: Log what we're receiving
  console.log('[extractEmbeddedStateJson] Input length:', text?.length);
  console.log('[extractEmbeddedStateJson] Has STATE_JSON marker:', text?.includes('STATE_JSON'));
  
  const match = text.match(/<!-- STATE_JSON\n([\s\S]*?)\nSTATE_JSON -->/);
  console.log('[extractEmbeddedStateJson] Regex match result:', !!match);
  
  if (match && match[1]) {
    try {
      const parsed = JSON.parse(match[1]);
      console.log('[extractEmbeddedStateJson] Successfully parsed JSON with keys:', Object.keys(parsed));
      return parsed;
    } catch (e) {
      console.warn('[extractEmbeddedStateJson] Failed to parse embedded JSON:', e);
      return null;
    }
  }
  return null;
}
