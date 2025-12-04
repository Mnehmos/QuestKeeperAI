/**
 * AI Background Story Generator
 * Uses the configured LLM provider to generate contextual character backstories
 */

import { useSettingsStore } from '../stores/settingsStore';

interface CharacterContext {
    name: string;
    race: string;
    characterClass: string;
    level: number;
    existingBackground?: string;
    traits?: string[];
}

/**
 * Generate an AI-enhanced background story for a character
 */
export async function generateBackgroundStory(context: CharacterContext): Promise<string> {
    const { apiKeys, selectedProvider, providerModels } = useSettingsStore.getState();
    const apiKey = apiKeys[selectedProvider];
    const model = providerModels[selectedProvider];

    if (!apiKey) {
        throw new Error(`No API key configured for ${selectedProvider}. Please set it in Settings.`);
    }

    const prompt = buildPrompt(context);
    
    // Route to appropriate provider
    switch (selectedProvider) {
        case 'openai':
            return callOpenAI(apiKey, model, prompt);
        case 'openrouter':
            return callOpenRouter(apiKey, model, prompt);
        case 'anthropic':
            return callAnthropic(apiKey, model, prompt);
        case 'gemini':
            return callGemini(apiKey, model, prompt);
        default:
            throw new Error(`Unsupported provider: ${selectedProvider}`);
    }
}

function buildPrompt(context: CharacterContext): string {
    const parts = [
        `Generate a compelling 2-3 paragraph backstory for a fantasy RPG character with these details:`,
        ``,
        `Name: ${context.name || 'Unknown'}`,
        `Race: ${context.race}`,
        `Class: ${context.characterClass}`,
        `Level: ${context.level}`,
    ];

    if (context.traits && context.traits.length > 0) {
        parts.push(`Racial Traits: ${context.traits.join(', ')}`);
    }

    if (context.existingBackground && context.existingBackground.trim()) {
        parts.push(``, `The player has provided these notes to incorporate: "${context.existingBackground}"`);
    }

    parts.push(
        ``,
        `Guidelines:`,
        `- Write in third person`,
        `- Include a formative event that explains why they became a ${context.characterClass}`,
        `- Reference their ${context.race} heritage naturally`,
        `- Add a personal motivation or goal`,
        `- Keep it under 500 characters`,
        `- Be evocative but not cliché`,
        ``,
        `Respond ONLY with the backstory text, no headers or explanations.`
    );

    return parts.join('\n');
}

async function callOpenAI(apiKey: string, model: string, prompt: string): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model,
            messages: [
                { role: 'system', content: 'You are a creative writing assistant specializing in fantasy RPG character backstories.' },
                { role: 'user', content: prompt }
            ],
            max_tokens: 300,
            temperature: 0.8,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI error: ${error}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content?.trim() || '';
}

async function callOpenRouter(apiKey: string, model: string, prompt: string): Promise<string> {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://questkeeper.ai',
            'X-Title': 'Quest Keeper AI',
        },
        body: JSON.stringify({
            model,
            messages: [
                { role: 'system', content: 'You are a creative writing assistant specializing in fantasy RPG character backstories.' },
                { role: 'user', content: prompt }
            ],
            max_tokens: 300,
            temperature: 0.8,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenRouter error: ${error}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content?.trim() || '';
}

async function callAnthropic(apiKey: string, model: string, prompt: string): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model,
            max_tokens: 300,
            messages: [
                { role: 'user', content: prompt }
            ],
            system: 'You are a creative writing assistant specializing in fantasy RPG character backstories.',
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Anthropic error: ${error}`);
    }

    const data = await response.json();
    return data.content[0]?.text?.trim() || '';
}

async function callGemini(apiKey: string, model: string, prompt: string): Promise<string> {
    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            { text: `System: You are a creative writing assistant specializing in fantasy RPG character backstories.\n\n${prompt}` }
                        ]
                    }
                ],
                generationConfig: {
                    maxOutputTokens: 300,
                    temperature: 0.8,
                },
            }),
        }
    );

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Gemini error: ${error}`);
    }

    const data = await response.json();
    return data.candidates[0]?.content?.parts[0]?.text?.trim() || '';
}
