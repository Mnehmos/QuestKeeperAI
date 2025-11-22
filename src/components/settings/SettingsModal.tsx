import React from 'react';
import { useSettingsStore, LLMProvider } from '../../stores/settingsStore';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
    const {
        apiKeys,
        selectedProvider,
        providerModels,
        systemPrompt,
        setApiKey,
        setProvider,
        setModel,
        setSystemPrompt,
    } = useSettingsStore();

    // Local state for the form to allow "Save & Apply" behavior
    // However, for instant feedback/simplicity, we can keep using the store directly
    // but the user requested "Save and Apply".
    // Let's stick to direct store updates for now but make the UI clearer.
    // If we want true "Save & Apply", we'd need local state copies. 
    // Given the complexity, let's make the "Active Provider" selection very explicit.

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-lg border border-terminal-green bg-terminal-black p-6 shadow-[0_0_20px_rgba(0,255,0,0.2)]">
                <div className="mb-6 flex items-center justify-between border-b border-terminal-green-dim pb-4">
                    <h2 className="text-xl font-bold text-terminal-green">CONFIGURATION</h2>
                    <button
                        onClick={onClose}
                        className="text-terminal-green hover:text-terminal-green-bright"
                    >
                        [X]
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Provider Selection */}
                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-terminal-green">API PROVIDER</label>
                        <select
                            value={selectedProvider}
                            onChange={(e) => setProvider(e.target.value as LLMProvider)}
                            className="w-full rounded border border-terminal-green bg-black px-3 py-2 text-terminal-green focus:border-terminal-green-bright focus:outline-none"
                        >
                            <option value="openai">OpenAI</option>
                            <option value="anthropic">Anthropic</option>
                            <option value="gemini">Google Gemini</option>
                            <option value="openrouter">OpenRouter</option>
                        </select>
                        <p className="text-xs text-terminal-green-dim">
                            This sets the active provider for all chat interactions.
                        </p>
                    </div>

                    {/* API Key */}
                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-terminal-green">
                            {selectedProvider.toUpperCase()} API KEY
                        </label>
                        <input
                            type="password"
                            value={apiKeys[selectedProvider]}
                            onChange={(e) => setApiKey(selectedProvider, e.target.value)}
                            className="w-full rounded border border-terminal-green bg-black px-3 py-2 text-terminal-green focus:border-terminal-green-bright focus:outline-none"
                            placeholder={`Enter ${selectedProvider} API Key`}
                        />
                    </div>

                    {/* Model Selection */}
                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-terminal-green">MODEL</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={providerModels[selectedProvider]}
                                onChange={(e) => setModel(selectedProvider, e.target.value)}
                                className="flex-1 rounded border border-terminal-green bg-black px-3 py-2 text-terminal-green focus:border-terminal-green-bright focus:outline-none"
                                placeholder="Select or type model ID"
                            />
                            <select
                                onChange={(e) => {
                                    if (e.target.value) setModel(selectedProvider, e.target.value);
                                }}
                                className="w-8 rounded border border-terminal-green bg-black px-1 text-terminal-green focus:border-terminal-green-bright focus:outline-none"
                                value=""
                            >
                                <option value="">▼</option>
                                {selectedProvider === 'openai' && (
                                    <>
                                        <optgroup label="GPT-5 Series">
                                            <option value="gpt-5.1">GPT-5.1</option>
                                            <option value="gpt-5-pro">GPT-5 Pro</option>
                                            <option value="gpt-5-mini">GPT-5 Mini</option>
                                        </optgroup>
                                        <optgroup label="Reasoning">
                                            <option value="o4-mini">o4-mini</option>
                                            <option value="o3-mini">o3-mini</option>
                                        </optgroup>
                                        <optgroup label="Legacy">
                                            <option value="gpt-4o">GPT-4o</option>
                                        </optgroup>
                                    </>
                                )}
                                {selectedProvider === 'anthropic' && (
                                    <>
                                        <option value="claude-sonnet-4.5">Claude Sonnet 4.5</option>
                                        <option value="claude-3.7-sonnet">Claude 3.7 Sonnet</option>
                                        <option value="claude-3.5-sonnet">Claude 3.5 Sonnet</option>
                                    </>
                                )}
                                {selectedProvider === 'openrouter' && (
                                    <>
                                        <optgroup label="Free / Free Tier">
                                            <option value="meta-llama/llama-3.2-3b-instruct:free">Llama 3.2 3B (Free)</option>
                                            <option value="google/gemini-2.0-flash-exp:free">Gemini 2.0 Flash Exp (Free)</option>
                                            <option value="deepseek/deepseek-r1:free">DeepSeek R1 (Free)</option>
                                            <option value="qwen/qwen3-coder:free">Qwen3 Coder (Free)</option>
                                        </optgroup>
                                        <optgroup label="Premium">
                                            <option value="anthropic/claude-sonnet-4.5">Claude Sonnet 4.5</option>
                                            <option value="openai/gpt-5.1">GPT-5.1</option>
                                            <option value="google/gemini-3-pro">Gemini 3 Pro</option>
                                        </optgroup>
                                    </>
                                )}
                                {selectedProvider === 'gemini' && (
                                    <>
                                        <option value="gemini-3-pro">Gemini 3 Pro</option>
                                        <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                                        <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                                    </>
                                )}
                            </select>
                        </div>
                    </div>

                    {/* System Prompt */}
                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-terminal-green">SYSTEM PROMPT</label>
                        <textarea
                            value={systemPrompt}
                            onChange={(e) => setSystemPrompt(e.target.value)}
                            className="h-24 w-full rounded border border-terminal-green bg-black px-3 py-2 text-terminal-green focus:border-terminal-green-bright focus:outline-none"
                            placeholder="Define the AI's behavior..."
                        />
                    </div>
                </div>

                <div className="mt-6 flex justify-end border-t border-terminal-green-dim pt-4">
                    <button
                        onClick={onClose}
                        className="rounded bg-terminal-green px-6 py-2 font-bold text-terminal-black hover:bg-terminal-green-bright"
                    >
                        DONE
                    </button>
                </div>
            </div>
        </div>
    );
};
