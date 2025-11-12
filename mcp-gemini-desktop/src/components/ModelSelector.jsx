import React, { useState, useEffect } from 'react';
import './ModelSelector.css';

export function ModelSelector({ onModelChange }) {
  const [provider, setProvider] = useState('gemini');
  const [model, setModel] = useState('');
  const [availableProviders, setAvailableProviders] = useState([]);
  const [availableModels, setAvailableModels] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('models'); // 'models' or 'providers'

  // Load settings and providers on mount
  useEffect(() => {
    loadSettings();
    loadAvailableProviders();
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

  const loadAvailableProviders = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/settings/providers');
      const data = await response.json();

      if (data.status === 'success') {
        setAvailableProviders(data.providers);
      }
    } catch (error) {
      console.error('Failed to load providers:', error);
    }
  };

  const loadAvailableModels = async (selectedProvider) => {
    setIsLoading(true);
    try {
      const response = await fetch(`http://localhost:5001/api/settings/models?provider=${selectedProvider}`);
      const data = await response.json();

      if (data.status === 'success') {
        setAvailableModels(data.models);

        // If no model is selected or model not in list, use the first one as default
        const modelIds = data.models.map(m => m.id);
        if (!model || !modelIds.includes(model)) {
          const defaultModel = data.models[0]?.id;
          if (defaultModel) {
            setModel(defaultModel);
            await saveSettings(selectedProvider, defaultModel);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load models:', error);
      setAvailableModels([]);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async (newProvider, newModel) => {
    try {
      await fetch('http://localhost:5001/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: newProvider,
          model: newModel,
        }),
      });
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const handleProviderChange = async (newProvider) => {
    setProvider(newProvider);
    setActiveTab('models');
    
    // Load models for new provider
    await loadAvailableModels(newProvider);
  };

  const handleModelChange = async (newModelId) => {
    setModel(newModelId);
    setIsOpen(false);
    await saveSettings(provider, newModelId);
    onModelChange?.(provider, newModelId);
  };

  const getCurrentProviderInfo = () => {
    return availableProviders.find(p => p.id === provider) || {
      icon: '⚙️',
      name: provider
    };
  };

  const getCurrentModelInfo = () => {
    return availableModels.find(m => m.id === model) || {
      name: model,
      description: ''
    };
  };

  const getCostDisplay = (cost) => {
    if (cost === 'Free') return <span className="cost-badge free">Free</span>;
    if (cost === '$') return <span className="cost-badge cheap">$</span>;
    if (cost === '$$') return <span className="cost-badge moderate">$$</span>;
    if (cost === '$$$') return <span className="cost-badge expensive">$$$</span>;
    return null;
  };

  const getTierBadge = (tier) => {
    const tierColors = {
      premium: 'tier-premium',
      balanced: 'tier-balanced',
      fast: 'tier-fast',
      custom: 'tier-custom'
    };
    return <span className={`tier-badge ${tierColors[tier] || ''}`}>{tier}</span>;
  };

  const providerInfo = getCurrentProviderInfo();
  const modelInfo = getCurrentModelInfo();

  return (
    <div className="model-selector">
      <button
        className="model-selector-button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
      >
        <span className="provider-icon">{providerInfo.icon}</span>
        <div className="model-info">
          <div className="provider-line">
            <span className="provider-label">{providerInfo.name.toUpperCase()}</span>
          </div>
          {model && (
            <div className="model-line">
              <span className="model-name">{modelInfo.name}</span>
            </div>
          )}
        </div>
        <span className="dropdown-arrow">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <>
          <div className="model-selector-overlay" onClick={() => setIsOpen(false)} />
          <div className="model-selector-dropdown">
            {/* Tabs */}
            <div className="dropdown-tabs">
              <button
                className={`tab ${activeTab === 'models' ? 'active' : ''}`}
                onClick={() => setActiveTab('models')}
              >
                SELECT MODEL
              </button>
              <button
                className={`tab ${activeTab === 'providers' ? 'active' : ''}`}
                onClick={() => setActiveTab('providers')}
              >
                PROVIDERS
              </button>
            </div>

            {/* Models Tab */}
            {activeTab === 'models' && (
              <div className="dropdown-content">
                <div className="dropdown-header">
                  <span className="provider-badge">
                    {providerInfo.icon} {providerInfo.name}
                  </span>
                </div>
                <div className="dropdown-list">
                  {availableModels.length === 0 ? (
                    <div className="dropdown-empty">No models available</div>
                  ) : (
                    availableModels.map((modelOption) => (
                      <button
                        key={modelOption.id}
                        className={`dropdown-item ${modelOption.id === model ? 'active' : ''}`}
                        onClick={() => handleModelChange(modelOption.id)}
                      >
                        <div className="model-item-content">
                          <div className="model-item-header">
                            <span className="model-item-name">{modelOption.name}</span>
                            {modelOption.id === model && <span className="check-icon">✓</span>}
                          </div>
                          <div className="model-item-details">
                            <span className="model-item-description">{modelOption.description}</span>
                            <div className="model-item-badges">
                              {getTierBadge(modelOption.tier)}
                              {getCostDisplay(modelOption.cost)}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Providers Tab */}
            {activeTab === 'providers' && (
              <div className="dropdown-content">
                <div className="dropdown-header">
                  <span>Change Provider</span>
                </div>
                <div className="dropdown-list">
                  {availableProviders.map((providerOption) => (
                    <button
                      key={providerOption.id}
                      className={`dropdown-item ${providerOption.id === provider ? 'active' : ''} ${!providerOption.configured ? 'disabled' : ''}`}
                      onClick={() => providerOption.configured && handleProviderChange(providerOption.id)}
                      disabled={!providerOption.configured}
                    >
                      <div className="provider-item-content">
                        <div className="provider-item-header">
                          <span className="provider-icon-large">{providerOption.icon}</span>
                          <span className="provider-item-name">{providerOption.name}</span>
                          {providerOption.id === provider && <span className="check-icon">✓</span>}
                        </div>
                        <div className="provider-item-details">
                          <span className="provider-item-description">{providerOption.description}</span>
                          {!providerOption.configured && providerOption.requires_api_key && (
                            <span className="provider-status-badge not-configured">
                              ⚠️ API key required
                            </span>
                          )}
                          {providerOption.configured && (
                            <span className="provider-status-badge configured">
                              ✓ Configured
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
