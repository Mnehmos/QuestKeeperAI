import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

interface ToolCallDisplayProps {
    toolName: string;
    serverName?: string;
    arguments: Record<string, any>;
    response?: string;
    status: 'pending' | 'completed' | 'error';
}

export const ToolCallDisplay: React.FC<ToolCallDisplayProps> = ({
    toolName,
    serverName,
    arguments: args,
    response,
    status,
}) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [showArgs, setShowArgs] = useState(false);
    const [showResponse, setShowResponse] = useState(true);

    const statusColors = {
        pending: 'text-terminal-amber',
        completed: 'text-terminal-green',
        error: 'text-red-500',
    };

    const statusIcons = {
        pending: '⏳',
        completed: '✓',
        error: '✗',
    };

    return (
        <div className="border border-terminal-green-dim rounded bg-terminal-black/50 mb-2">
            {/* Header */}
            <div
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-terminal-green/5 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-3">
                    <span className="codicon codicon-server text-terminal-green" />
                    <span className="text-terminal-green font-bold">
                        {serverName || 'MCP Tool'}
                    </span>
                    <span className="text-terminal-green/70 text-sm">→ {toolName}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`text-xs uppercase tracking-wider ${statusColors[status]}`}>
                        {statusIcons[status]} {status}
                    </span>
                    <span className={`codicon codicon-chevron-${isExpanded ? 'down' : 'right'} text-terminal-green/50`} />
                </div>
            </div>

            {/* Expandable Content */}
            {isExpanded && (
                <div className="border-t border-terminal-green-dim">
                    {/* Tool Call Arguments */}
                    <div className="p-3 border-b border-terminal-green-dim/50">
                        <div
                            className="flex items-center gap-2 cursor-pointer hover:text-terminal-amber transition-colors mb-2"
                            onClick={() => setShowArgs(!showArgs)}
                        >
                            <span className={`codicon codicon-chevron-${showArgs ? 'down' : 'right'} text-xs`} />
                            <span className="text-sm font-bold uppercase tracking-wider text-terminal-cyan">
                                Call Arguments
                            </span>
                        </div>
                        {showArgs && (
                            <div className="ml-4 mt-2">
                                <pre className="bg-terminal-black border border-terminal-green-dim rounded p-2 text-xs overflow-x-auto">
                                    <code className="text-terminal-green">
                                        {JSON.stringify(args, null, 2)}
                                    </code>
                                </pre>
                            </div>
                        )}
                    </div>

                    {/* Tool Response */}
                    {response && (
                        <div className="p-3">
                            <div
                                className="flex items-center gap-2 cursor-pointer hover:text-terminal-amber transition-colors mb-2"
                                onClick={() => setShowResponse(!showResponse)}
                            >
                                <span className={`codicon codicon-chevron-${showResponse ? 'down' : 'right'} text-xs`} />
                                <span className="text-sm font-bold uppercase tracking-wider text-terminal-green">
                                    Response
                                </span>
                            </div>
                            {showResponse && (
                                <div className="ml-4 mt-2 markdown-content prose prose-invert prose-sm max-w-none">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        rehypePlugins={[rehypeHighlight]}
                                    >
                                        {(() => {
                                            try {
                                                // Try to parse as MCP response
                                                const parsed = JSON.parse(response);
                                                let content = '';
                                                
                                                if (parsed.content && Array.isArray(parsed.content)) {
                                                    content = parsed.content
                                                        .map((c: any) => c.type === 'text' ? c.text : '')
                                                        .join('\n');
                                                } else {
                                                    // If it's valid JSON but not MCP format, pretty print it
                                                    content = JSON.stringify(parsed, null, 2);
                                                }

                                                // Sanitize content to fix encoding issues
                                                // Replace the replacement character (U+FFFD) with an equals sign or arrow
                                                return content.replace(/\uFFFD/g, '=');
                                            } catch (e) {
                                                // Fallback to raw string if not JSON
                                                return response.replace(/\uFFFD/g, '=');
                                            }
                                        })()}
                                    </ReactMarkdown>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
