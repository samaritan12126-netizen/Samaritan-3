
import { generateEmbedding } from './aiCore';
import { storage } from './storage';

interface VectorItem {
    id: string;
    text: string;
    embedding: number[];
    metadata: any;
}

// Vector store backed by IndexedDB
export class VectorDbService {
    private items: VectorItem[] = [];
    private isLoaded: boolean = false;

    constructor() {
        this.init();
    }

    private async init() {
        try {
            // Load from IndexedDB to memory on startup
            this.items = await storage.getVectors();
            this.isLoaded = true;
            console.log(`[VectorDB] Loaded ${this.items.length} vectors into memory.`);
        } catch (e) {
            console.error("VectorDB Init Failed", e);
        }
    }

    // Cosine Similarity
    private similarity(a: number[], b: number[]): number {
        let dot = 0;
        let magA = 0;
        let magB = 0;
        for (let i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            magA += a[i] * a[i];
            magB += b[i] * b[i];
        }
        return dot / (Math.sqrt(magA) * Math.sqrt(magB));
    }

    async addMemory(id: string, text: string, metadata: any) {
        if (!this.isLoaded) await this.init();

        // Check if exists to update
        const existingIdx = this.items.findIndex(i => i.id === id);
        
        // Generate Embedding via Hydra
        const embedding = await generateEmbedding(text);
        if (embedding.length === 0) return; // Failed to generate

        const item: VectorItem = { id, text, embedding, metadata };

        if (existingIdx !== -1) {
            this.items[existingIdx] = item;
        } else {
            this.items.push(item);
        }
        
        // Persist to IDB
        await storage.saveVector(item);
    }

    async search(query: string, limit: number = 3): Promise<{ item: VectorItem, score: number }[]> {
        if (!this.isLoaded) await this.init();

        const queryEmbedding = await generateEmbedding(query);
        if (queryEmbedding.length === 0) return [];

        const results = this.items.map(item => ({
            item,
            score: this.similarity(queryEmbedding, item.embedding)
        }));

        // Sort by score desc
        return results
            .sort((a, b) => b.score - a.score)
            .filter(r => r.score > 0.6) // Threshold for relevance
            .slice(0, limit);
    }
    
    async clear() {
        this.items = [];
        // Note: storage.clearDatabase() handles the IDB clear usually, 
        // but if we need to clear specifically vectors, we should add a method.
        // For now, we assume this is called during a full wipe.
    }
}

export const vectorDb = new VectorDbService();
