
import { CurrencyPair } from '../types';

type DataCallback = (price: number, time: number) => void;
type DepthCallback = (bids: [string, string][], asks: [string, string][]) => void;

interface StreamState {
    url: string;
    ws: WebSocket | null;
    subscribers: Set<DataCallback>;
    depthSubscribers: Set<DepthCallback>;
    lastHeartbeat: number;
    reconnectTimer: any;
    pingInterval: any;
    type: 'BINANCE' | 'TWELVE';
}

const BINANCE_WS_BASE = 'wss://stream.binance.com:9443/ws';
const TWELVE_WS_BASE = 'wss://ws.twelvedata.com/v1/quotes/price';

class DataHubService {
    private streams: Map<string, StreamState> = new Map();
    private apiKeyTwelve: string = 'demo';

    constructor() {
        if (typeof window !== 'undefined') {
            this.apiKeyTwelve = localStorage.getItem('user_twelvedata_api_key') || 'demo';
        }
        // Global heartbeat monitor
        setInterval(() => this.checkHeartbeats(), 5000);
    }

    // --- PUBLIC API ---

    public subscribe(pair: string, callback: DataCallback) {
        const stream = this.getOrCreateStream(pair);
        stream.subscribers.add(callback);
    }

    public unsubscribe(pair: string, callback: DataCallback) {
        const stream = this.streams.get(pair);
        if (stream) {
            stream.subscribers.delete(callback);
            this.cleanup(pair);
        }
    }

    public subscribeDepth(pair: string, callback: DepthCallback) {
        // Only Binance supports free L2 stream
        if (!this.isCrypto(pair)) {
            console.warn("L2 Data unavailable for non-crypto assets in free tier.");
            return;
        }
        const stream = this.getOrCreateStream(pair);
        
        // If this is the first depth subscriber, we might need to upgrade the connection 
        // or open a secondary one. For simplicity in Binance, we can use combined streams 
        // or just ensure the socket handles both. 
        // NOTE: Binance raw streams are single purpose per connection URL usually, 
        // unless using combined stream endpoint.
        // To keep it robust without refactoring the whole trade stream, we'll attach L2 logic 
        // to the existing socket management if possible, OR re-connect with combined params.
        
        // Strategy: Upgrade connection if needed.
        if (stream.depthSubscribers.size === 0 && stream.ws?.readyState === WebSocket.OPEN) {
            // Re-connect with depth params added is complex. 
            // EASIER: Open a dedicated L2 socket for depth if requested, attached to the same key.
            // Actually, for Binance, let's just use a separate property or combined stream URL logic.
            // Let's modify the connection logic to support combined streams.
            
            stream.ws?.close(); // Force reconnect with new params
        }
        
        stream.depthSubscribers.add(callback);
    }

    public unsubscribeDepth(pair: string, callback: DepthCallback) {
        const stream = this.streams.get(pair);
        if (stream) {
            stream.depthSubscribers.delete(callback);
            if (stream.depthSubscribers.size === 0) {
               // Potentially downgrade connection, but keeping it open is fine
            }
        }
    }

    // --- INTERNAL LOGIC ---

    private isCrypto(pair: string): boolean {
        const commonCrypto = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'MATIC', 'LTC', 'DOT', 'AVAX', 'LINK', 'UNI', 'SHIB', 'PEPE', 'WIF'];
        return commonCrypto.some(c => pair.startsWith(c));
    }

    private getOrCreateStream(pair: string): StreamState {
        if (this.streams.has(pair)) return this.streams.get(pair)!;

        const isCrypto = this.isCrypto(pair);
        
        const state: StreamState = {
            url: '',
            ws: null,
            subscribers: new Set(),
            depthSubscribers: new Set(),
            lastHeartbeat: Date.now(),
            reconnectTimer: null,
            pingInterval: null,
            type: isCrypto ? 'BINANCE' : 'TWELVE'
        };

        this.streams.set(pair, state);
        this.connect(pair);
        return state;
    }

    private connect(pair: string) {
        const state = this.streams.get(pair);
        if (!state) return;

        if (state.type === 'BINANCE') {
            const symbol = pair.replace('/', '').toLowerCase();
            // Combined stream: kline for price, depth for L2
            // Note: Binance Single Stream: <symbol>@kline_1m
            // We need to determine if we want depth. 
            // Ideally, we always connect to kline. If depth is needed later, we handle it.
            // For robust shared bus, let's use combined streams format:
            // wss://stream.binance.com:9443/stream?streams=<symbol>@kline_1m/<symbol>@depth10@100ms
            
            const hasDepth = state.depthSubscribers.size > 0;
            const streams = [`${symbol}@kline_1m`];
            if (hasDepth) streams.push(`${symbol}@depth10@100ms`); // 10 levels, 100ms update
            
            state.url = `${BINANCE_WS_BASE}/stream?streams=${streams.join('/')}`;
        } else {
            state.url = `${TWELVE_WS_BASE}?apikey=${this.apiKeyTwelve}`;
        }

        try {
            state.ws = new WebSocket(state.url);
            state.ws.onopen = () => this.onOpen(pair);
            state.ws.onmessage = (e) => this.onMessage(pair, e);
            state.ws.onerror = (e) => console.warn(`DataHub Error (${pair})`, e);
            state.ws.onclose = () => console.log(`DataHub Closed (${pair})`);
        } catch (e) {
            console.error("Socket creation failed", e);
            this.scheduleReconnect(pair);
        }
    }

    private onOpen(pair: string) {
        const state = this.streams.get(pair);
        if (!state) return;
        state.lastHeartbeat = Date.now();

        if (state.type === 'TWELVE') {
            const symbol = pair.includes('/') ? pair : `${pair.substring(0, 3)}/${pair.substring(3)}`;
            state.ws?.send(JSON.stringify({ action: 'subscribe', params: { symbols: symbol } }));
            // TwelveData needs explicit heartbeat
            state.pingInterval = setInterval(() => {
                if(state.ws?.readyState === WebSocket.OPEN) state.ws.send(JSON.stringify({ action: 'heartbeat' }));
            }, 10000);
        }
    }

    private onMessage(pair: string, event: MessageEvent) {
        const state = this.streams.get(pair);
        if (!state) return;

        state.lastHeartbeat = Date.now();
        
        try {
            const data = JSON.parse(event.data);

            // BINANCE HANDLER
            if (state.type === 'BINANCE') {
                // Combined stream structure: { stream: "...", data: {...} }
                const payload = data.data;
                const streamName = data.stream;

                if (payload && payload.e === 'kline') {
                    const price = parseFloat(payload.k.c);
                    const time = Math.floor(payload.k.t / 1000);
                    state.subscribers.forEach(cb => cb(price, time));
                }
                
                if (payload && streamName.includes('depth')) {
                    // payload.bids, payload.asks
                    state.depthSubscribers.forEach(cb => cb(payload.bids, payload.asks));
                }
            } 
            // TWELVE DATA HANDLER
            else if (state.type === 'TWELVE') {
                if (data.event === 'price') {
                    state.subscribers.forEach(cb => cb(data.price, data.timestamp));
                }
            }

        } catch (e) {
            console.error("Parse Error", e);
        }
    }

    private cleanup(pair: string) {
        const state = this.streams.get(pair);
        if (!state) return;

        if (state.subscribers.size === 0 && state.depthSubscribers.size === 0) {
            if (state.ws) state.ws.close();
            if (state.reconnectTimer) clearTimeout(state.reconnectTimer);
            if (state.pingInterval) clearInterval(state.pingInterval);
            this.streams.delete(pair);
        }
    }

    private scheduleReconnect(pair: string) {
        const state = this.streams.get(pair);
        if (!state || state.reconnectTimer) return;

        state.reconnectTimer = setTimeout(() => {
            state.reconnectTimer = null;
            this.connect(pair);
        }, 5000); // 5s backoff
    }

    private checkHeartbeats() {
        const now = Date.now();
        this.streams.forEach((state, pair) => {
            // If no data for 15s, kill and reconnect (Defibrillator)
            if (now - state.lastHeartbeat > 15000) {
                if (state.ws && state.ws.readyState === WebSocket.OPEN) {
                    console.warn(`[DataHub] Pulse lost on ${pair}. Defibrillating...`);
                    state.ws.close(); // This will trigger close event -> reconnect logic if needed, 
                                      // but simpler to just force reconnect here
                    this.connect(pair);
                } else if (!state.ws || state.ws.readyState === WebSocket.CLOSED) {
                    this.connect(pair);
                }
            }
        });
    }
}

export const dataHub = new DataHubService();
