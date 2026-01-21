
import { IExecutionAdapter, ExecutionOrder, ExecutionPosition, JournalEntry, BrokerAccount, BrokerType, TradeRouting, PreMortemData } from '../types';
import { storage } from './storage';
import { performanceService } from './performance';

// --- ADAPTER IMPLEMENTATIONS ---

export class PaperTradingAdapter implements IExecutionAdapter {
    id: string;
    name: string;
    type: BrokerType = 'PAPER';
    isConnected = false;
    private balance = 100000;
    private positions: ExecutionPosition[] = [];
    public isShadow = false; // Flag for Shadow Challenger account
    
    constructor(id: string = 'paper-default', name: string = 'Paper Main', initialBalance: number = 100000, isShadow: boolean = false) {
        this.id = id;
        this.name = name;
        this.balance = initialBalance;
        this.isShadow = isShadow;
    }

    private delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    async connect(): Promise<boolean> {
        await this.delay(500);
        this.isConnected = true;
        return true;
    }

    async disconnect(): Promise<void> {
        this.isConnected = false;
    }

    async getBalance(): Promise<number> {
        return this.balance;
    }

    async getPositions(): Promise<ExecutionPosition[]> {
        return [...this.positions];
    }

    async placeOrder(order: ExecutionOrder): Promise<ExecutionPosition> {
        await this.delay(200); 
        
        const newPos: ExecutionPosition = {
            id: Math.random().toString(36).substr(2, 9),
            symbol: order.symbol,
            type: order.type.includes('BUY') ? 'LONG' : 'SHORT',
            entryPrice: 0, // Placeholder, updated by price tick
            volume: order.volume,
            sl: order.sl || 0,
            tp: order.tp || 0,
            currentPrice: 0,
            pnl: 0,
            openTime: Date.now(),
            setupType: order.setupType || 'Auto-Execution', // Carry over setup info
            snapshot: order.snapshot,
            isShadow: this.isShadow
        };

        this.positions.push(newPos);
        return newPos;
    }

    async closePosition(id: string): Promise<boolean> {
        await this.delay(200);
        const idx = this.positions.findIndex(p => p.id === id);
        if (idx !== -1) {
            const p = this.positions[idx];
            this.balance += p.pnl;
            
            // PERSIST TO JOURNAL
            const entry: JournalEntry = {
                id: p.id,
                date: p.openTime,
                pair: p.symbol,
                direction: p.type,
                status: p.pnl > 0 ? 'WIN' : 'LOSS',
                origin: this.isShadow ? 'SHADOW_CHALLENGER' : 'SAMARITAN_AUTO',
                entryPrice: p.entryPrice,
                exitPrice: p.currentPrice,
                stopLoss: p.sl,
                takeProfit: p.tp,
                size: p.volume,
                pnl: p.pnl,
                rMultiple: p.sl !== 0 ? Math.abs(p.currentPrice - p.entryPrice) / Math.abs(p.entryPrice - p.sl) * (p.pnl > 0 ? 1 : -1) : 0,
                strategyName: p.setupType || 'Auto-Execution (Paper)',
                setupType: p.setupType,
                timeframe: '15m', 
                session: 'NY', 
                confidence: 10,
                emotion: 'ZEN',
                images: p.snapshot ? [{ id: 'snap', data: p.snapshot, context: 'Entry' }] : [],
                tags: this.isShadow ? ['SHADOW_MODE'] : ['AUTO', 'PAPER'],
                leverage: 1
            };
            
            await storage.saveJournalEntry(entry);
            this.positions.splice(idx, 1);
            return true;
        }
        return false;
    }

    async closeAllPositions(): Promise<number> {
        const count = this.positions.length;
        const toClose = [...this.positions];
        for (const p of toClose) {
            await this.closePosition(p.id);
        }
        return count;
    }

    async modifyPosition(id: string, sl: number, tp: number): Promise<boolean> {
        const p = this.positions.find(pos => pos.id === id);
        if (p) {
            p.sl = sl;
            p.tp = tp;
            return true;
        }
        return false;
    }
    
    public updatePnL(currentPrices: Record<string, number>) {
        this.positions.forEach(p => {
            const price = currentPrices[p.symbol];
            if (price) {
                if (p.entryPrice === 0) p.entryPrice = price;
                p.currentPrice = price;
                const diff = p.type === 'LONG' ? price - p.entryPrice : p.entryPrice - price;
                p.pnl = diff * p.volume; 
            }
        });
    }
}

export class BinanceAdapter implements IExecutionAdapter {
    id: string;
    name: string;
    type: BrokerType = 'BINANCE';
    isConnected = false;
    private apiKey: string;
    private apiSecret: string;
    private proxyUrl: string;

    constructor(id: string, name: string, apiKey: string, apiSecret: string, proxyUrl?: string) {
        this.id = id;
        this.name = name;
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
        this.proxyUrl = proxyUrl || '';
    }

    async connect(): Promise<boolean> {
        if (this.proxyUrl) {
            try {
                await fetch(`${this.proxyUrl}/api/v3/ping`);
                this.isConnected = true;
                return true;
            } catch(e) {
                console.error("Proxy connection failed", e);
                return false;
            }
        }
        this.isConnected = true;
        return true;
    }

    async disconnect(): Promise<void> {
        this.isConnected = false;
    }

    async getBalance(): Promise<number> {
        return 0; 
    }

    async getPositions(): Promise<ExecutionPosition[]> {
        return []; 
    }

    async placeOrder(order: ExecutionOrder): Promise<ExecutionPosition> {
        console.log("BINANCE EXECUTION (VIA PROXY):", order);
        return {} as ExecutionPosition;
    }

    async closePosition(id: string): Promise<boolean> {
        return true;
    }

    async closeAllPositions(): Promise<number> {
        return 0; 
    }

    async modifyPosition(id: string, sl: number, tp: number): Promise<boolean> {
        return true;
    }
}

// NEW: WEB3 ADAPTER (DeFi)
export class Web3Adapter implements IExecutionAdapter {
    id: string = 'web3-wallet';
    name: string = 'DeFi Wallet (Injected)';
    type: BrokerType = 'PAPER'; // Re-using PAPER type for now as 'WEB3' isn't in core types yet
    isConnected = false;
    
    async connect(): Promise<boolean> {
        if ((window as any).ethereum) {
            try {
                await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
                this.isConnected = true;
                return true;
            } catch (error) {
                console.error("User denied Web3 access");
                return false;
            }
        } else {
            console.error("No Web3 Provider found (Metamask)");
            return false;
        }
    }

    async disconnect() { this.isConnected = false; }
    
    async getBalance(): Promise<number> {
        // Stub: Would use eth_getBalance
        return 0;
    }

    async getPositions(): Promise<ExecutionPosition[]> { return []; }

    async placeOrder(order: ExecutionOrder): Promise<ExecutionPosition> {
        // Stub: Would construct Uniswap transaction data here
        console.log("WEB3 EXECUTION:", order);
        alert(`Samaritan sent Web3 Transaction for ${order.symbol}. Check Wallet.`);
        return {} as ExecutionPosition;
    }

    async closePosition(id: string): Promise<boolean> { return true; }
    async modifyPosition(id: string, sl: number, tp: number): Promise<boolean> { return true; }
}

// --- BROKER SERVICE MANAGER ---

class BrokerService {
    private adapters: Map<string, IExecutionAdapter> = new Map();
    private routing: TradeRouting[] = [];
    public shadowEnabled: boolean = false;
    public web3Enabled: boolean = false; // New Toggle
    private initialized: boolean = false;

    constructor() {
        // Init happens via method call now to support Async Loading
    }

    public async init() {
        if (this.initialized) return;
        
        try {
            await storage.init();
            
            // Legacy Migration: Check LocalStorage
            const legacyAccounts = localStorage.getItem('samaritan_broker_accounts');
            if (legacyAccounts) {
                const accounts: BrokerAccount[] = JSON.parse(legacyAccounts);
                for (const acc of accounts) {
                    await storage.saveBroker(acc);
                }
                localStorage.removeItem('samaritan_broker_accounts'); // Clear legacy
            }

            const savedRouting = localStorage.getItem('samaritan_trade_routing');
            if (savedRouting) this.routing = JSON.parse(savedRouting);

            // Load from IDB
            const brokers = await storage.getBrokers();
            
            // Ensure Default Paper
            if (!this.adapters.has('paper-default')) {
                this.adapters.set('paper-default', new PaperTradingAdapter('paper-default', 'Paper Main'));
            }
            
            if (!this.adapters.has('shadow-account')) {
                this.adapters.set('shadow-account', new PaperTradingAdapter('shadow-account', 'Shadow Challenger', 100000, true));
            }

            brokers.forEach(acc => {
                if (acc.type === 'PAPER' && acc.id !== 'paper-default') {
                    this.adapters.set(acc.id, new PaperTradingAdapter(acc.id, acc.name));
                } else if (acc.type === 'BINANCE') {
                    this.adapters.set(acc.id, new BinanceAdapter(acc.id, acc.name, acc.apiKey || '', acc.apiSecret || '', acc.proxyUrl));
                }
            });

            this.initialized = true;
            console.log("Broker Service Initialized via Cortex Storage");

        } catch (e) {
            console.error("Failed to load broker config", e);
        }
    }

    public toggleShadowMode(enabled: boolean) {
        this.shadowEnabled = enabled;
    }

    public toggleWeb3(enabled: boolean) {
        this.web3Enabled = enabled;
        if (enabled && !this.adapters.has('web3-wallet')) {
            this.adapters.set('web3-wallet', new Web3Adapter());
        }
    }

    public getAccounts(): BrokerAccount[] {
        const accounts: BrokerAccount[] = [];
        this.adapters.forEach(adapter => {
            if (adapter.id === 'shadow-account') return;
            if (adapter.id === 'web3-wallet' && !this.web3Enabled) return;
            
            accounts.push({
                id: adapter.id,
                name: adapter.name,
                type: adapter.type,
                isLive: adapter.type !== 'PAPER'
            });
        });
        return accounts;
    }

    public async addAccount(account: BrokerAccount) {
        await storage.saveBroker(account);
        // Reload into memory
        if (account.type === 'PAPER') {
            this.adapters.set(account.id, new PaperTradingAdapter(account.id, account.name));
        } else if (account.type === 'BINANCE') {
            this.adapters.set(account.id, new BinanceAdapter(account.id, account.name, account.apiKey || '', account.apiSecret || ''));
        }
    }

    public async removeAccount(id: string) {
        await storage.deleteBroker(id);
        this.adapters.delete(id);
    }

    public setRouting(symbol: string, accountId: string) {
        this.routing = this.routing.filter(r => r.asset !== symbol);
        this.routing.push({ asset: symbol, accountId });
        localStorage.setItem('samaritan_trade_routing', JSON.stringify(this.routing));
    }

    public getRouting(symbol: string): string {
        const route = this.routing.find(r => r.asset === symbol);
        return route ? route.accountId : 'paper-default'; 
    }

    public getAdapterForAsset(symbol: string): IExecutionAdapter {
        // If Web3 is enabled and symbol looks like a contract address or special tag, route to web3
        if (this.web3Enabled && symbol.startsWith('0x')) {
            return this.adapters.get('web3-wallet')!;
        }

        const accountId = this.getRouting(symbol);
        const adapter = this.adapters.get(accountId) || this.adapters.get('paper-default')!;
        
        // --- SHADOW INTERCEPTION ---
        const originalPlaceOrder = adapter.placeOrder.bind(adapter);
        adapter.placeOrder = async (order: ExecutionOrder): Promise<ExecutionPosition> => {
            const result = await originalPlaceOrder(order);
            
            if (this.shadowEnabled && !order.isShadow) {
                const shadowAdapter = this.adapters.get('shadow-account');
                if (shadowAdapter) {
                    const reverseType = order.type.includes('BUY') 
                        ? order.type.replace('BUY', 'SELL') 
                        : order.type.replace('SELL', 'BUY');
                    
                    await shadowAdapter.placeOrder({
                        ...order,
                        type: reverseType as any,
                        setupType: `Shadow vs ${order.setupType || 'Manual'}`,
                        isShadow: true
                    });
                    console.log("Shadow Challenger: Reverse order placed.");
                }
            }
            return result;
        };

        return adapter;
    }

    public updatePaperPnL(prices: Record<string, number>) {
        this.adapters.forEach(adapter => {
            if (adapter instanceof PaperTradingAdapter) {
                adapter.updatePnL(prices);
            }
        });
    }

    public async closeAll(): Promise<number> {
        let total = 0;
        for (const adapter of this.adapters.values()) {
            if (adapter.closeAllPositions) {
                total += await adapter.closeAllPositions();
            }
        }
        return total;
    }

    public async getPreMortemAnalysis(symbol: string, riskAmount: number): Promise<PreMortemData> {
        const adapter = this.getAdapterForAsset(symbol);
        const balance = await adapter.getBalance();
        const riskPct = balance > 0 ? (riskAmount / balance) * 100 : 0;
        
        const entries = await storage.getJournalEntries();
        const recent = entries.sort((a,b) => b.date - a.date).slice(0, 10);
        
        let winStreak = 0;
        let lossStreak = 0;
        for (const e of recent) {
            if (e.status === 'WIN') {
                if (lossStreak > 0) break;
                winStreak++;
            } else if (e.status === 'LOSS') {
                if (winStreak > 0) break;
                lossStreak++;
            }
        }

        let sentiment: 'ZEN' | 'TILT' | 'FOMO' = 'ZEN';
        if (lossStreak >= 2) sentiment = 'TILT';
        if (winStreak >= 3) sentiment = 'FOMO';

        return {
            pair: symbol,
            type: 'BUY', 
            riskAmount,
            riskPercent: riskPct,
            accountBalance: balance,
            winStreak,
            lossStreak,
            dailyLoss: 0,
            maxDailyLoss: balance * 0.05,
            sentiment,
            isHighImpactNews: false 
        };
    }
}

export const brokerService = new BrokerService();
