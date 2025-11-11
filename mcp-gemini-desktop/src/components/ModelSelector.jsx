import React, { useState, useEffect } from 'react';
import './ModelSelector.css';

export function ModelSelector({ onModelChange }) {
  const [provider, setProvider] = useState('gemini');
  const [model, setModel] = useState('');
  const [availableModels, setAvailableModels] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  // Load available models when provider changes
  useEffect(() => {
    if (provider) {
      loadAvailableModels(provider);
    }
  }, [provider]);

  const loadSettings = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/settings');
      const data = await response.json();

      if (data.status === 'success') {
        const currentProvider = data.settings.provider || 'gemini';
        const currentModel = data.settings.model;

        setProvider(currentProvider);
        setModel(currentModel || '');
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const loadAvailableModels = async (selectedProvider) => {
    setIsLoading(true);
    try {
      const response = await fetch(`http://localhost:5001/api/settings/models?provider=${selectedProvider}`);
      const data = await response.json();

      if (data.status === 'success') {
        setAvailableModels(data.models);

        // If no model is selected, use the first one as default
        if (!model && data.models.length > 0) {
          const defaultModel = data.models[0];
          setModel(defaultModel);
          onModelChange?.(selectedProvider, defaultModel);
        }
      }
    } catch (error) {
      console.error('Failed to load models:', error);
      setAvailableModels([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleModelChange = (newModel) => {
    setModel(newModel);
    setIsOpen(false);
    onModelChange?.(provider, newModel);
  };

  const getProviderIcon = (providerName) => {
    switch (providerName) {
      case 'anthropic':
        return '🤖';
      case 'openai':
        return '🔷';
      case 'gemini':
        return '✨';
      case 'openrouter':
        return '🌐';
      case 'local':
        return '🏠';
      default:
        return '⚙️';
    }
  };

  const getProviderName = (providerName) => {
    switch (providerName) {
      case 'anthropic':
        return 'Claude';
      case 'openai':
        return 'OpenAI';
      case 'gemini':
        return 'Gemini';
      case 'openrouter':
        return 'OpenRouter';
      case 'local':
        return 'Local';
      default:
        return providerName;
    }
  };

  const formatModelName = (modelName) => {
    // Shorten long model names for display
    if (modelName.length > 30) {
      return modelName.substring(0, 27) + '...';
    }
    return modelName;
  };

  return (
    <div className="model-selector">
      <button
        className="model-selector-button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading || availableModels.length === 0}
      >
        <span className="provider-icon">{getProviderIcon(provider)}</span>
        <span className="model-info">
          <span className="provider-name">{getProviderName(provider)}</span>
          {model && (
            <span className="model-name">{formatModelName(model)}</span>
          )}
        </span>
        <span className="dropdown-arrow">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <>
          <div className="model-selector-overlay" onClick={() => setIsOpen(false)} />
          <div className="model-selector-dropdown">
            <div className="dropdown-header">
              <span>Select Model</span>
              <span className="provider-badge">{getProviderName(provider)}</span>
            </div>
            <div className="dropdown-list">
              {availableModels.length === 0 ? (
                <div className="dropdown-empty">No models available</div>
              ) : (
                availableModels.map((modelName) => (
                  <button
                    key={modelName}
                    className={`dropdown-item ${modelName === model ? 'active' : ''}`}
                    onClick={() => handleModelChange(modelName)}
                  >
                    <span className="model-full-name">{modelName}</span>
                    {modelName === model && <span className="check-icon">✓</span>}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
