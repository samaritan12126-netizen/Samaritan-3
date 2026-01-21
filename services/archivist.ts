
import { storage } from './storage';
import { NeuralDB, StoredFile, Alert, SentinelLog, JournalEntry, EvolutionLog, BrokerAccount } from '../types';

export interface SystemSnapshot {
    meta: {
        timestamp: number;
        version: string;
        appName: 'The Samaritan';
        exportDate: string;
    };
    counts: {
        concepts: number;
        nuggets: number;
        strategies: number;
        files: number;
        alerts: number;
        logs: number;
        journal: number; 
        evolution: number;
        brokers: number;
        vectors: number;
    };
    data: {
        neuralDB: NeuralDB;
        files: StoredFile[];
        alerts: Alert[];
        sentinelLogs: SentinelLog[];
        journal: JournalEntry[]; 
        evolution: EvolutionLog[];
        brokers: BrokerAccount[];
        vectors: any[];
        preferences: Record<string, any>;
    }
}

export const archivist = {
    // --- CREATE SNAPSHOT ---
    async createSnapshot(options: { 
        includeFiles: boolean; 
        includeLogs: boolean; 
        includeAlerts: boolean;
        includeKnowledge: boolean;
        includeJournal: boolean;
        includeEvolution: boolean;
        includeBrokers?: boolean;
        includeVectors?: boolean;
    }): Promise<SystemSnapshot> {
        
        // 1. Fetch from IndexedDB
        let db: NeuralDB = { concepts: [], nuggets: [], strategies: [] };
        if (options.includeKnowledge) {
            db = await storage.loadNeuralDB();
        }

        let files: StoredFile[] = [];
        if (options.includeFiles) {
            files = await storage.getFiles();
        }

        let journal: JournalEntry[] = [];
        if (options.includeJournal) {
            journal = await storage.getJournalEntries();
        }

        let evolution: EvolutionLog[] = [];
        if (options.includeEvolution) {
            evolution = await storage.getEvolutionLogs();
        }

        let brokers: BrokerAccount[] = [];
        if (options.includeBrokers) {
            brokers = await storage.getBrokers();
        }

        let vectors: any[] = [];
        if (options.includeVectors) {
            vectors = await storage.getVectors();
        }

        // 2. Fetch from LocalStorage
        const alerts: Alert[] = options.includeAlerts 
            ? JSON.parse(localStorage.getItem('gemini_alerts_v1') || '[]') 
            : [];
        
        const sentinelLogs: SentinelLog[] = options.includeLogs
            ? JSON.parse(localStorage.getItem('samaritan_sentinel_logs') || '[]')
            : [];

        const preferences = {
            twelveDataKey: localStorage.getItem('user_twelvedata_api_key'),
            finnhubKey: localStorage.getItem('user_finnhub_api_key'),
            theme: 'dark',
            protocol: localStorage.getItem('samaritan_master_protocol')
        };

        // 3. Construct Manifest
        return {
            meta: {
                timestamp: Date.now(),
                version: '1.5',
                appName: 'The Samaritan',
                exportDate: new Date().toISOString()
            },
            counts: {
                concepts: db.concepts.length,
                nuggets: db.nuggets.length,
                strategies: db.strategies.length,
                files: files.length,
                alerts: alerts.length,
                logs: sentinelLogs.length,
                journal: journal.length,
                evolution: evolution.length,
                brokers: brokers.length,
                vectors: vectors.length
            },
            data: {
                neuralDB: db,
                files,
                alerts,
                sentinelLogs,
                journal,
                evolution,
                brokers,
                vectors,
                preferences
            }
        };
    },

    // --- RESTORE SNAPSHOT ---
    async restoreSnapshot(snapshot: SystemSnapshot, mode: 'MERGE' | 'OVERWRITE'): Promise<void> {
        
        if (snapshot.meta.appName !== 'The Samaritan') {
            throw new Error("Invalid Cortex File: Signature mismatch.");
        }

        if (mode === 'OVERWRITE') {
            console.log("Archivist: Wiping system for clean restore...");
            await storage.clearDatabase();
            localStorage.removeItem('gemini_alerts_v1');
            localStorage.removeItem('samaritan_sentinel_logs');
        }

        const { neuralDB, files, alerts, sentinelLogs, journal, evolution, brokers, vectors, preferences } = snapshot.data;

        // 1. Restore Knowledge Base
        for (const c of neuralDB.concepts) await storage.saveConcept(c);
        for (const n of neuralDB.nuggets) await storage.saveNugget(n);
        for (const s of neuralDB.strategies) await storage.saveStrategy(s);

        // 2. Restore Files
        for (const f of files) await storage.saveFile(f);

        // 3. Restore Journal (IndexedDB)
        if (journal) {
            for (const j of journal) await storage.saveJournalEntry(j);
        }

        // 4. Restore Evolution (Cortex Memory)
        if (evolution) {
            for (const e of evolution) await storage.saveEvolutionLog(e);
        }

        // 5. Restore Brokers
        if (brokers) {
            for (const b of brokers) await storage.saveBroker(b);
        }

        // 6. Restore Vectors
        if (vectors) {
            for (const v of vectors) await storage.saveVector(v);
        }

        // 7. Restore Alerts & Logs (LocalStorage)
        if (mode === 'OVERWRITE') {
            localStorage.setItem('gemini_alerts_v1', JSON.stringify(alerts));
            localStorage.setItem('samaritan_sentinel_logs', JSON.stringify(sentinelLogs));
        } else {
            // MERGE: Alerts
            const currentAlerts = JSON.parse(localStorage.getItem('gemini_alerts_v1') || '[]');
            const newAlertIds = new Set(alerts.map(a => a.id));
            const mergedAlerts = [...currentAlerts.filter((a: Alert) => !newAlertIds.has(a.id)), ...alerts];
            localStorage.setItem('gemini_alerts_v1', JSON.stringify(mergedAlerts));

            // MERGE: Logs
            const currentLogs = JSON.parse(localStorage.getItem('samaritan_sentinel_logs') || '[]');
            const newLogIds = new Set(sentinelLogs.map(l => l.id));
            const mergedLogs = [...currentLogs.filter((l: SentinelLog) => !newLogIds.has(l.id)), ...sentinelLogs];
            mergedLogs.sort((a, b) => b.timestamp - a.timestamp);
            localStorage.setItem('samaritan_sentinel_logs', JSON.stringify(mergedLogs.slice(0, 500))); // Keep cap
        }

        // 8. Preferences
        if (preferences.twelveDataKey) localStorage.setItem('user_twelvedata_api_key', preferences.twelveDataKey);
        if (preferences.finnhubKey) localStorage.setItem('user_finnhub_api_key', preferences.finnhubKey);
        if (preferences.protocol) localStorage.setItem('samaritan_master_protocol', preferences.protocol);

        console.log("Archivist: Restore sequence complete.");
    }
};
