import React, { useCallback, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { formatToolResponseWithVisualization } from '../../utils/toolResponseFormatter';
import { CensorBlock } from './CensorBlock';
import { WorldVisualization } from '../visualizers/WorldVisualization';
import { NationCard } from '../visualizers/NationCard';
import { RegionCard } from '../visualizers/RegionCard';

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
    const remarkPlugins = useMemo(() => [remarkGfm], []);
    const rehypePlugins = useMemo(() => [rehypeHighlight], []);

    // Parse response and get both markdown and visualization data
    const formattedResult = useMemo(() => {
        if (!response) return { markdown: '', visualization: undefined };

        try {
            // Use the enhanced formatter that returns both markdown and visualization data
            return formatToolResponseWithVisualization(toolName, response);
        } catch (e) {
            // Fallback to original parsing
            try {
                const parsed = JSON.parse(response);
                let content = '';

                if (parsed.content && Array.isArray(parsed.content)) {
                    content = parsed.content
                        .map((c: any) => c.type === 'text' ? c.text : '')
                        .join('\n');
                } else {
                    content = JSON.stringify(parsed, null, 2);
                }

                return { markdown: content.replace(/\uFFFD/g, '='), visualization: undefined };
            } catch (e2) {
                return { markdown: response.replace(/\uFFFD/g, '='), visualization: undefined };
            }
        }
    }, [response, toolName]);

    const formattedResponse = formattedResult.markdown;
    const visualization = formattedResult.visualization;

    // Render visualization component based on type
    const renderVisualization = useCallback(() => {
        if (!visualization) return null;

        switch (visualization.type) {
            case 'world':
            case 'world_overview':
                return <WorldVisualization data={visualization.data} variant="full" />;
            case 'nation':
                return <NationCard data={visualization.data} variant="full" />;
            case 'region':
            case 'region_detail':
                return <RegionCard data={visualization.data} variant="full" />;
            case 'strategy_state':
                // Strategy state has both nations and regions
                return (
                    <div className="space-y-4">
                        {visualization.data.nations?.length > 0 && (
                            <div className="grid grid-cols-1 gap-3">
                                {visualization.data.nations.map((nation: any, idx: number) => (
                                    <NationCard key={nation.id || idx} data={nation} variant="compact" />
                                ))}
                            </div>
                        )}
                    </div>
                );
            default:
                return null;
        }
    }, [visualization]);

    const segments = useMemo(() => {
        if (!formattedResponse) return [];

        const matches = [...formattedResponse.matchAll(/\[censor\]([\s\S]*?)\[\/censor\]/gi)];
        if (matches.length === 0) return [{ type: 'text', value: formattedResponse }];

        const parts: Array<{ type: 'text' | 'censor'; value: string }> = [];
        let lastIndex = 0;

        matches.forEach((match) => {
            const matchText = match[0];
            const spoilerContent = match[1];
            const startIndex = match.index ?? 0;

            if (startIndex > lastIndex) {
                parts.push({ type: 'text', value: formattedResponse.slice(lastIndex, startIndex) });
            }

            parts.push({ type: 'censor', value: spoilerContent });
            lastIndex = startIndex + matchText.length;
        });

        if (lastIndex < formattedResponse.length) {
            parts.push({ type: 'text', value: formattedResponse.slice(lastIndex) });
        }

        return parts.filter(part => part.value.trim() !== '' || part.type === 'censor');
    }, [formattedResponse]);

    const renderMarkdown = useCallback(
        (content: string) => (
            <ReactMarkdown
                remarkPlugins={remarkPlugins}
                rehypePlugins={rehypePlugins}
            >
                {content}
            </ReactMarkdown>
        ),
        [remarkPlugins, rehypePlugins]
    );

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
                                    {visualization && (
                                        <span className="ml-2 text-xs text-terminal-cyan font-normal">
                                            [Rich View]
                                        </span>
                                    )}
                                </span>
                            </div>
                            {showResponse && (
                                <div className="ml-4 mt-2 space-y-3">
                                    {/* Rich Visualization Component (if available) */}
                                    {visualization && (
                                        <div className="mb-4">
                                            {renderVisualization()}
                                        </div>
                                    )}

                                    {/* Markdown Content */}
                                    {segments.map((segment, index) =>
                                        segment.type === 'censor' ? (
                                            <CensorBlock
                                                key={`censor-${index}`}
                                                content={segment.value}
                                                renderMarkdown={renderMarkdown}
                                            />
                                        ) : (
                                            <div
                                                key={`md-${index}`}
                                                className="markdown-content prose prose-invert prose-sm max-w-none"
                                            >
                                                {renderMarkdown(segment.value)}
                                            </div>
                                        )
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
