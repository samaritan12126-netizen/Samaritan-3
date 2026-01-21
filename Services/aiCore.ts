
import { GoogleGenAI } from "@google/genai";
import { NeuralConfig, Message, Role } from '../types';

// --- CONSTANTS ---
export const GEMINI_MODEL_FAST = 'gemini-3-flash-preview';
export const GEMINI_MODEL_REASONING = 'gemini-3-pro-preview';

const DEFAULT_CONFIG: NeuralConfig = {
    activeProvider: 'GEMINI',
    apiKeys: {
        gemini: process.env.API_KEY,
    },
    models: {
        gemini: GEMINI_MODEL_REASONING,
        openai: 'gpt-4-turbo',
        anthropic: 'claude-3-opus',
        groq: 'llama3-70b-8192',
        xai: 'grok-beta',
        deepseek: 'deepseek-chat'
    }
};

// --- CONFIG MANAGEMENT ---
export const loadNeuralConfig = (): NeuralConfig => {
    try {
        const saved = localStorage.getItem('samaritan_neural_config');
        if (saved) {
            const parsed = JSON.parse(saved);
            return { 
                ...DEFAULT_CONFIG, 
                ...parsed, 
                apiKeys: { ...DEFAULT_CONFIG.apiKeys, ...parsed.apiKeys } 
            };
        }
    } catch (e) {
        console.warn("Failed to load config, using default.");
    }
    return DEFAULT_CONFIG;
};

export const updateNeuralConfig = (config: Partial<NeuralConfig>) => {
    const current = loadNeuralConfig();
    const updated = { ...current, ...config };
    localStorage.setItem('samaritan_neural_config', JSON.stringify(updated));
};

// --- CORE GENERATION ---
const callGemini = async (config: NeuralConfig, prompt: string, history: Message[], image?: string, isJson: boolean = false): Promise<string> => {
    const apiKey = config.apiKeys.gemini || process.env.API_KEY;
    if (!apiKey) throw new Error("Gemini API Key missing");

    const ai = new GoogleGenAI({ apiKey });
    const model = isJson ? GEMINI_MODEL_REASONING : GEMINI_MODEL_FAST; 

    // Convert History
    const contents = history.map(msg => ({
        role: msg.role === Role.USER ? 'user' : 'model',
        parts: [{ text: msg.text }]
    }));

    // Add Current Prompt
    const currentParts: any[] = [{ text: prompt }];
    if (image) {
        const base64Data = image.includes('base64,') ? image.split('base64,')[1] : image;
        currentParts.unshift({ inlineData: { mimeType: 'image/png', data: base64Data } });
    }
    contents.push({ role: 'user', parts: currentParts });

    const response = await ai.models.generateContent({
        model: model,
        contents,
        config: { 
            responseMimeType: isJson ? 'application/json' : 'text/plain',
            tools: isJson ? undefined : [{ googleSearch: {} }] 
        }
    });

    return response.text || "";
};

export const hydraRoute = async (prompt: string, history: Message[], image?: string, isJson: boolean = false): Promise<string> => {
    const config = loadNeuralConfig();
    const provider = config.activeProvider;

    try {
        switch (provider) {
            case 'GEMINI': return await callGemini(config, prompt, history, image, isJson);
            default: return await callGemini(config, prompt, history, image, isJson);
        }
    } catch (e: any) {
        console.error(`[HYDRA FAILURE: ${provider}]`, e);
        if (provider !== 'GEMINI') {
            // Fallback
            return await callGemini(config, prompt, history, image, isJson);
        }
        throw e;
    }
};

export const generateEmbedding = async (text: string): Promise<number[]> => {
    const config = loadNeuralConfig();
    const apiKey = config.apiKeys.gemini || process.env.API_KEY;
    
    if (!apiKey) return [];
    if (!text || typeof text !== 'string' || !text.trim()) return [];

    try {
        const ai = new GoogleGenAI({ apiKey });
        const result = await ai.models.embedContent({
            model: "text-embedding-004",
            contents: [
                {
                    parts: [
                        {
                            text: text.substring(0, 20000) // Truncate to avoid payload limits
                        }
                    ]
                }
            ],
        });
        // Safe access to embedding property
        const values = (result as any).embedding?.values || (result as any).embeddings?.values;
        return values || [];
    } catch (e: any) {
        // Log as warning to avoid clutter for non-critical failures
        console.warn("Embedding Gen Failed (Non-Fatal):", e.message || e);
        return [];
    }
};

// --- HELPERS ---
export const extractJson = (text: string): string => {
    let cleanText = text.trim();
    const markdownMatch = cleanText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (markdownMatch) {
        cleanText = markdownMatch[1];
    }
    const firstOpen = cleanText.indexOf('{');
    const lastClose = cleanText.lastIndexOf('}');
    if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
        return cleanText.substring(firstOpen, lastClose + 1);
    }
    return cleanText;
};

export const extractJsonArray = (text: string): string => {
    let cleanText = text.trim();
    const markdownMatch = cleanText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (markdownMatch) cleanText = markdownMatch[1];
    
    const firstOpen = cleanText.indexOf('[');
    const lastClose = cleanText.lastIndexOf(']');
    if (firstOpen !== -1 && lastClose !== -1) {
        return cleanText.substring(firstOpen, lastClose + 1);
    }
    return "[]";
};

export const formatError = (e: any): string => {
    const msg = e.message || e.toString();
    if (msg.includes("429")) return "⚠️ **NEURAL LINK UNSTABLE:** Cognitive Overload (Rate Limit). Please stand by.";
    if (msg.includes("500") || msg.includes("503")) return "⚠️ **CORTEX MAINTENANCE:** The neural hive is re-calibrating (Service Unavailable).";
    if (msg.includes("API Key")) return "⚠️ **ACCESS DENIED:** API Key Invalid or Missing in System Core.";
    return `⚠️ **SYSTEM ANOMALY:** ${msg}`;
};
