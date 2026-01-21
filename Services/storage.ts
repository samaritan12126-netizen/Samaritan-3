import { NeuralDB, StoredFile, Strategy, Concept, Nugget, JournalEntry, EvolutionLog, BrokerAccount } from '../types';

const DB_NAME = 'TheSamaritanDB';
const DB_VERSION = 5; 

const compressImage = async (base64: string, quality: number = 0.7): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) { resolve(base64); return; }
            const MAX_WIDTH = 1280;
            let width = img.width;
            let height = img.height;
            if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => resolve(base64);
    });
};

export class StorageService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.db) return Promise.resolve();
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) { reject("IndexedDB not supported"); return; }
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = (event) => { this.initPromise = null; reject("Failed to open database"); };
      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        this.db.onversionchange = () => { this.db?.close(); this.db = null; this.initPromise = null; };
        resolve();
      };
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const createStore = (name: string) => { if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: 'id' }); };
        createStore('files'); createStore('concepts'); createStore('nuggets'); createStore('strategies'); createStore('journal'); createStore('evolution'); createStore('brokers'); createStore('vectors');
      };
    });
    return this.initPromise;
  }

  private async ensureInit() { if (!this.db) await this.init(); }

  getWatchlist(): string[] {
      const saved = localStorage.getItem('samaritan_watchlist');
      if (saved) return JSON.parse(saved);
      return ['BTCUSD', 'ETHUSD', 'EURUSD', 'GBPUSD', 'XAUUSD'];
  }

  saveWatchlist(symbols: string[]): void { localStorage.setItem('samaritan_watchlist', JSON.stringify(symbols)); }

  async saveFile(file: StoredFile): Promise<void> { return this.put('files', file); }
  async getFiles(): Promise<StoredFile[]> { return this.getAll('files'); }
  
  async loadNeuralDB(): Promise<NeuralDB> {
      const concepts = await this.getAll('concepts');
      const nuggets = await this.getAll('nuggets');
      const strategies = await this.getAll('strategies');
      return { concepts: concepts || [], nuggets: nuggets || [], strategies: strategies || [] } as NeuralDB;
  }

  async saveConcept(item: Concept): Promise<void> { return this.put('concepts', item); }
  async deleteConcept(id: string): Promise<void> { return this.delete('concepts', id); }
  async saveNugget(item: Nugget): Promise<void> { 
      if (item.imageData && item.imageData.startsWith('data:image')) item.imageData = await compressImage(item.imageData);
      return this.put('nuggets', item); 
  }
  async deleteNugget(id: string): Promise<void> { return this.delete('nuggets', id); }
  async saveStrategy(item: Strategy): Promise<void> { return this.put('strategies', item); }
  async deleteStrategy(id: string): Promise<void> { return this.delete('strategies', id); }

  async saveJournalEntry(entry: JournalEntry): Promise<void> { 
      if (entry.images && entry.images.length > 0) {
          for (let i = 0; i < entry.images.length; i++) {
              if (entry.images[i].data.startsWith('data:image')) entry.images[i].data = await compressImage(entry.images[i].data);
          }
      }
      return this.put('journal', entry); 
  }
  async getJournalEntries(): Promise<JournalEntry[]> { return this.getAll('journal'); }
  async saveEvolutionLog(log: EvolutionLog): Promise<void> { return this.put('evolution', log); }
  async getEvolutionLogs(): Promise<EvolutionLog[]> { return this.getAll('evolution'); }
  async deleteEvolutionLog(id: string): Promise<void> { return this.delete('evolution', id); }
  async saveBroker(broker: BrokerAccount): Promise<void> { return this.put('brokers', broker); }
  async getBrokers(): Promise<BrokerAccount[]> { return this.getAll('brokers'); }
  async deleteBroker(id: string): Promise<void> { return this.delete('brokers', id); }
  async saveVector(item: any): Promise<void> { return this.put('vectors', item); }
  async getVectors(): Promise<any[]> { return this.getAll('vectors'); }

  async purgeSystemData(retentionDays: number, options: { alerts: boolean, logs: boolean, journal: boolean, files: boolean, evolution: boolean }): Promise<any> {
      const cutoff = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
      const report = { alerts: 0, logs: 0, journal: 0, files: 0, evolution: 0 };
      if (options.alerts) {
          const alerts: any[] = JSON.parse(localStorage.getItem('gemini_alerts_v1') || '[]');
          const freshAlerts = alerts.filter(a => a.timestamp > cutoff);
          localStorage.setItem('gemini_alerts_v1', JSON.stringify(freshAlerts));
      }
      if (options.logs) {
          const logs: any[] = JSON.parse(localStorage.getItem('samaritan_sentinel_logs') || '[]');
          const freshLogs = logs.filter(l => l.timestamp > cutoff);
          localStorage.setItem('samaritan_sentinel_logs', JSON.stringify(freshLogs));
      }
      await this.ensureInit();
      return report;
  }

  async clearDatabase(): Promise<void> {
      await this.ensureInit();
      const stores = ['files', 'concepts', 'nuggets', 'strategies', 'journal', 'evolution', 'brokers', 'vectors'];
      const tx = this.db!.transaction(stores, 'readwrite');
      stores.forEach(storeName => { if (this.db!.objectStoreNames.contains(storeName)) tx.objectStore(storeName).clear(); });
      return new Promise((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
  }

  async mergeConcepts(c1: string, c2: string, newConcept: Concept): Promise<void> {
      await this.ensureInit();
      await this.saveConcept(newConcept);
      const nuggets = await this.getAll('nuggets');
      for (const nugget of nuggets) {
          let modified = false;
          let newIds = [...(nugget.conceptIds || [])];
          if (newIds.includes(c1)) { newIds = newIds.filter(id => id !== c1); modified = true; }
          if (newIds.includes(c2)) { newIds = newIds.filter(id => id !== c2); modified = true; }
          if (modified) { newIds.push(newConcept.id); newIds = [...new Set(newIds)]; await this.saveNugget({ ...nugget, conceptIds: newIds }); }
      }
      await this.deleteConcept(c1); await this.deleteConcept(c2);
  }

  private async put(storeName: string, item: any): Promise<void> {
     await this.ensureInit();
     return new Promise((resolve, reject) => {
        if (!this.db) return reject("DB not initialized");
        const tx = this.db.transaction(storeName, 'readwrite');
        const req = tx.objectStore(storeName).put(item);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
     });
  }

  private async getAll(storeName: string): Promise<any[]> {
    await this.ensureInit();
    return new Promise((resolve, reject) => {
        if (!this.db) return reject("DB not initialized");
        const tx = this.db.transaction(storeName, 'readonly');
        const req = tx.objectStore(storeName).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
    });
  }

  private async delete(storeName: string, id: string): Promise<void> {
    await this.ensureInit();
    return new Promise((resolve, reject) => {
        if (!this.db) return reject("DB not initialized");
        const tx = this.db.transaction(storeName, 'readwrite');
        const req = tx.objectStore(storeName).delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
  }
}

export const storage = new StorageService();