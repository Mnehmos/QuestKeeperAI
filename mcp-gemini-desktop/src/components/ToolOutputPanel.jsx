import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../stores/gameState';
import './ToolOutputPanel.css';

const STATUS_ICONS = {
  success: '✓',
  error: '✗',
  permission_denied: '🔒',
  pending: '⏳'
};

const STATUS_COLORS = {
  success: '#00ff88',
  error: '#ff006e',
  permission_denied: '#ff9500',
  pending: '#00ffff'
};

export function ToolOutputPanel() {
  const toolOutputs = useGameStore((state) => state.toolOutputs);
  const clearToolOutputs = useGameStore((state) => state.clearToolOutputs);
  const [expanded, setExpanded] = useState(true);
  const [selectedOutput, setSelectedOutput] = useState(null);
  const outputsEndRef = useRef(null);

  useEffect(() => {
    if (outputsEndRef.current) {
      outputsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [toolOutputs]);

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const formatDuration = (ms) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className={`tool-output-panel ${expanded ? 'expanded' : 'collapsed'}`}>
      <div className="panel-header" onClick={() => setExpanded(!expanded)}>
        <div className="header-left">
          <h3>Tool Outputs</h3>
          <span className="output-count">{toolOutputs.length} executions</span>
        </div>
        <div className="header-right">
          <button
            className="clear-btn"
            onClick={(e) => {
              e.stopPropagation();
              clearToolOutputs();
            }}
            disabled={toolOutputs.length === 0}
          >
            Clear
          </button>
          <button className="toggle-btn">
            {expanded ? '▼' : '▶'}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="panel-body">
          {toolOutputs.length === 0 ? (
            <div className="empty-outputs">
              <p>No tool executions yet</p>
              <span className="empty-hint">Tool outputs will appear here when MCP tools are called</span>
            </div>
          ) : (
            <div className="outputs-list">
              {toolOutputs.map((output, idx) => (
                <div
                  key={idx}
                  className="output-item"
                  style={{ borderLeftColor: STATUS_COLORS[output.status] }}
                  onClick={() => setSelectedOutput(output)}
                >
                  <div className="output-header">
                    <span
                      className="status-icon"
                      style={{ color: STATUS_COLORS[output.status] }}
                    >
                      {STATUS_ICONS[output.status]}
                    </span>
                    <span className="tool-name">{output.tool}</span>
                    <span className="timestamp">{formatTimestamp(output.timestamp)}</span>
                  </div>
                  <div className="output-preview">
                    {output.status === 'success' && output.result && (
                      <span className="result-preview">
                        {typeof output.result === 'string'
                          ? output.result.substring(0, 100)
                          : JSON.stringify(output.result).substring(0, 100)}
                        {(typeof output.result === 'string' ? output.result.length : JSON.stringify(output.result).length) > 100 ? '...' : ''}
                      </span>
                    )}
                    {output.status === 'error' && (
                      <span className="error-preview">{output.error}</span>
                    )}
                    {output.status === 'permission_denied' && (
                      <span className="permission-preview">
                        {output.reason || 'Permission denied'}
                      </span>
                    )}
                  </div>
                  {output.execution_ms && (
                    <div className="execution-time">
                      {formatDuration(output.execution_ms)}
                    </div>
                  )}
                </div>
              ))}
              <div ref={outputsEndRef} />
            </div>
          )}
        </div>
      )}

      {selectedOutput && (
        <div className="output-detail-modal" onClick={() => setSelectedOutput(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setSelectedOutput(null)}>×</button>
            <h3 style={{ color: STATUS_COLORS[selectedOutput.status] }}>
              {selectedOutput.tool}
            </h3>

            <div className="output-meta">
              <div className="meta-row">
                <span className="meta-label">Status:</span>
                <span
                  className="meta-value"
                  style={{ color: STATUS_COLORS[selectedOutput.status] }}
                >
                  {STATUS_ICONS[selectedOutput.status]} {selectedOutput.status}
                </span>
              </div>
              <div className="meta-row">
                <span className="meta-label">Timestamp:</span>
                <span className="meta-value">{new Date(selectedOutput.timestamp).toLocaleString()}</span>
              </div>
              {selectedOutput.execution_ms && (
                <div className="meta-row">
                  <span className="meta-label">Duration:</span>
                  <span className="meta-value">{formatDuration(selectedOutput.execution_ms)}</span>
                </div>
              )}
            </div>

            {selectedOutput.arguments && Object.keys(selectedOutput.arguments).length > 0 && (
              <div className="section">
                <h4>Arguments</h4>
                <pre className="code-block">
                  {JSON.stringify(selectedOutput.arguments, null, 2)}
                </pre>
              </div>
            )}

            {selectedOutput.status === 'success' && selectedOutput.result && (
              <div className="section">
                <h4>Result</h4>
                <pre className="code-block success">
                  {typeof selectedOutput.result === 'string'
                    ? selectedOutput.result
                    : JSON.stringify(selectedOutput.result, null, 2)}
                </pre>
              </div>
            )}

            {selectedOutput.status === 'error' && selectedOutput.error && (
              <div className="section">
                <h4>Error</h4>
                <pre className="code-block error">
                  {selectedOutput.error}
                </pre>
              </div>
            )}

            {selectedOutput.status === 'permission_denied' && (
              <div className="section">
                <h4>Permission Denied</h4>
                <div className="permission-details">
                  <p className="reason">{selectedOutput.reason}</p>
                  {selectedOutput.requires_approval && (
                    <p className="approval-notice">
                      This tool requires user approval before execution.
                    </p>
                  )}
                  {selectedOutput.failed_conditions && selectedOutput.failed_conditions.length > 0 && (
                    <div className="failed-conditions">
                      <strong>Failed Conditions:</strong>
                      <ul>
                        {selectedOutput.failed_conditions.map((condition, idx) => (
                          <li key={idx}>{condition}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
