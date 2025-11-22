import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type LLMProvider = 'openai' | 'anthropic' | 'gemini' | 'openrouter';

interface SettingsState {
    apiKeys: {
        openai: string;
        anthropic: string;
        gemini: string;
        openrouter: string;
    };
    providerModels: {
        openai: string;
        anthropic: string;
        gemini: string;
        openrouter: string;
    };
    selectedProvider: LLMProvider;
    systemPrompt: string;
    setApiKey: (provider: LLMProvider, key: string) => void;
    setProvider: (provider: LLMProvider) => void;
    setModel: (provider: LLMProvider, model: string) => void;
    setSystemPrompt: (prompt: string) => void;
    // Helper to get current model
    getSelectedModel: () => string;
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set, get) => ({
            apiKeys: {
                openai: '',
                anthropic: '',
                gemini: '',
                openrouter: '',
            },
            providerModels: {
                openai: 'gpt-5.1',
                anthropic: 'claude-sonnet-4.5',
                gemini: 'gemini-3-pro',
                openrouter: 'meta-llama/llama-3.2-3b-instruct:free',
            },
            selectedProvider: 'openrouter',
            systemPrompt: 'You are a helpful RPG assistant.',
            setApiKey: (provider, key) =>
                set((state) => ({
                    apiKeys: { ...state.apiKeys, [provider]: key },
                })),
            setProvider: (provider) => set({ selectedProvider: provider }),
            setModel: (provider, model) =>
                set((state) => ({
                    providerModels: { ...state.providerModels, [provider]: model },
                })),
            setSystemPrompt: (prompt) => set({ systemPrompt: prompt }),
            getSelectedModel: () => {
                const state = get();
                return state.providerModels[state.selectedProvider];
            },
        }),
        {
            name: 'quest-keeper-settings',
        }
    )
);
