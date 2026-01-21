
import { CandleData, Timeframe, CurrencyPair } from '../types';

// --- API CONFIGURATION ---
const API_KEYS = {
    twelveData: localStorage.getItem('user_twelvedata_api_key') || 'demo',
    finnhub: localStorage.getItem('user_finnhub_api_key') || 'cp0693pr01qj928503igcp0693pr01qj928503j0', 
};

const ENDPOINTS = {
    binance: {
        rest: 'https://api.binance.com/api/v3',
        ws: 'wss://stream.binance.com:9443/ws'
    },
    twelveData: {
        rest: 'https://api.twelvedata.com',
        ws: 'wss://ws.twelvedata.com/v1/quotes/price'
    },
    finnhub: {
        rest: 'https://finnhub.io/api/v1'
    }
};

// --- CACHE LAYER ---
// Prevents 429 Errors by serving recent data for 60 seconds
const CACHE = new Map<string, { timestamp: number, data: CandleData[], source: string }>();
const CACHE_DURATION = 60 * 1000; // 60 Seconds

// --- UTILITIES ---

export const detectTimeframe = (data: CandleData[]): Timeframe => {
    if (data.length < 2) return '1m';
    const samples = data.slice(0, 10);
    let minDiff = Infinity;
    for(let i=1; i<samples.length; i++) {
        const diff = samples[i].time - samples[i-1].time;
        if(diff < minDiff && diff > 0) minDiff = diff;
    }
    if (minDiff >= 2419200) return '1M';
    if (minDiff >= 604800) return '1W';
    if (minDiff >= 86400) return '1D';
    if (minDiff >= 14400) return '4H';
    if (minDiff >= 3600) return '1H';
    if (minDiff >= 1800) return '30m';
    if (minDiff >= 900) return '15m';
    if (minDiff >= 300) return '5m';
    return '1m';
};

export const resampleCandles = (candles: CandleData[], targetTf: Timeframe): CandleData[] => {
    const tfToSeconds = (tf: Timeframe) => {
        switch(tf) {
            case '1m': return 60;
            case '5m': return 300;
            case '15m': return 900;
            case '30m': return 1800;
            case '1H': return 3600;
            case '4H': return 14400;
            case '1D': return 86400;
            case '1W': return 604800;
            case '1M': return 2592000;
            default: return 60;
        }
    };
    
    const targetSec = tfToSeconds(targetTf);
    if (!candles.length) return [];

    const resampled: CandleData[] = [];
    let currentBucket: CandleData | null = null;
    let bucketStartTime = Math.floor(candles[0].time / targetSec) * targetSec;

    for (const c of candles) {
        const bucketEnd = bucketStartTime + targetSec;
        if (c.time >= bucketEnd) {
            if (currentBucket) resampled.push(currentBucket);
            bucketStartTime = Math.floor(c.time / targetSec) * targetSec;
            currentBucket = { ...c, time: bucketStartTime };
        } else {
            if (!currentBucket) {
                currentBucket = { ...c, time: bucketStartTime };
            } else {
                currentBucket.high = Math.max(currentBucket.high, c.high);
                currentBucket.low = Math.min(currentBucket.low, c.low);
                currentBucket.close = c.close;
            }
        }
    }
    if (currentBucket) resampled.push(currentBucket);
    return resampled;
};

// --- MAPPERS ---
const isCrypto = (pair: string) => {
    const commonCrypto = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'MATIC', 'LTC', 'DOT', 'AVAX', 'LINK', 'UNI', 'SHIB', 'NEAR', 'PEPE', 'WIF'];
    return commonCrypto.some(c => pair.startsWith(c));
};

const mapSymbol = (provider: 'binance' | 'twelve' | 'finnhub', pair: string): string => {
    if (provider === 'binance') {
        if (pair === 'BTCUSD') return 'BTCUSDT';
        if (pair === 'ETHUSD') return 'ETHUSDT';
        if (pair === 'SOLUSD') return 'SOLUSDT';
        if (pair.endsWith('USD')) return pair + 'T'; 
        return pair.replace('/', '');
    }
    if (provider === 'twelve') {
        return pair.includes('/') ? pair : `${pair.substring(0, 3)}/${pair.substring(3)}`;
    }
    if (provider === 'finnhub') {
        if (isCrypto(pair)) return `BINANCE:${mapSymbol('binance', pair)}`; 
        if (!pair.includes('/') && pair.length <= 5 && !['EUR','GBP','USD','AUD','NZD'].includes(pair.substring(0,3))) {
            return pair; 
        }
        const base = pair.substring(0, 3);
        const quote = pair.substring(3);
        return `OANDA:${base}_${quote}`;
    }
    return pair;
};

const mapTimeframe = (provider: 'binance' | 'twelve' | 'finnhub', tf: Timeframe): string => {
    if (provider === 'binance') {
        const map: Record<string, string> = { '1m': '1m', '5m': '5m', '15m': '15m', '30m': '30m', '1H': '1h', '4H': '4h', '1D': '1d', '1W': '1w', '1M': '1M' };
        return map[tf] || '15m';
    }
    if (provider === 'twelve') {
        const map: Record<string, string> = { '1m': '1min', '5m': '5min', '15m': '15min', '30m': '30min', '1H': '1h', '4H': '4h', '1D': '1day', '1W': '1week', '1M': '1month' };
        return map[tf] || '15min';
    }
    if (provider === 'finnhub') {
        const map: Record<string, string> = { '1m': '1', '5m': '5', '15m': '15', '30m': '30', '1H': '60', '4H': '240', '1D': 'D', '1W': 'W', '1M': 'M' };
        return map[tf] || '15';
    }
    return tf;
};

// --- DATA PROVIDERS ---

// 1. BINANCE
const fetchBinance = async (pair: string, timeframe: Timeframe, count: number, endTime?: number): Promise<CandleData[]> => {
    const symbol = mapSymbol('binance', pair);
    const interval = mapTimeframe('binance', timeframe);
    let url = `${ENDPOINTS.binance.rest}/klines?symbol=${symbol}&interval=${interval}&limit=${count}`;
    if (endTime) url += `&endTime=${endTime * 1000}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Binance Error: ${res.statusText}`);
    const data = await res.json();
    
    return data.map((d: any) => ({
        time: Math.floor(d[0] / 1000),
        open: parseFloat(d[1]),
        high: parseFloat(d[2]),
        low: parseFloat(d[3]),
        close: parseFloat(d[4]),
    }));
};

// 2. TWELVE DATA
const fetchTwelveData = async (pair: string, timeframe: Timeframe, count: number, endTime?: number): Promise<CandleData[]> => {
    const symbol = mapSymbol('twelve', pair);
    const interval = mapTimeframe('twelve', timeframe);
    const apiKey = API_KEYS.twelveData;
    let url = `${ENDPOINTS.twelveData.rest}/time_series?symbol=${symbol}&interval=${interval}&outputsize=${count}&apikey=${apiKey}&format=JSON`;
    
    if (endTime) {
        const date = new Date(endTime * 1000);
        const dateStr = date.toISOString().replace('T', ' ').split('.')[0];
        url += `&end_date=${dateStr}`;
    }

    const res = await fetch(url);
    const data = await res.json();

    if (data.status === 'error') {
        if (data.code === 429) throw new Error("RATE_LIMIT");
        throw new Error(data.message);
    }

    if (!data.values) return [];

    return data.values.map((item: any) => ({
        time: parseInt(item.timestamp) || Math.floor(new Date(item.datetime).getTime() / 1000),
        open: parseFloat(item.open),
        high: parseFloat(item.high),
        low: parseFloat(item.low),
        close: parseFloat(item.close),
    })).reverse();
};

// 3. FINNHUB
const fetchFinnhub = async (pair: string, timeframe: Timeframe, count: number, endTime?: number): Promise<CandleData[]> => {
    const symbol = mapSymbol('finnhub', pair);
    const resolution = mapTimeframe('finnhub', timeframe);
    const apiKey = API_KEYS.finnhub;
    
    const to = endTime || Math.floor(Date.now() / 1000);
    const tfSeconds = 15 * 60; 
    const from = to - (count * tfSeconds * 2); 

    const url = `${ENDPOINTS.finnhub.rest}/stock/candle?symbol=${symbol}&resolution=${resolution}&from=${from}&to=${to}&token=${apiKey}`;

    const res = await fetch(url);
    const data = await res.json();

    if (data.s === 'no_data') return [];
    if (data.s !== 'ok') throw new Error(`Finnhub Error: ${data.s}`);

    const candles: CandleData[] = [];
    for(let i = 0; i < data.t.length; i++) {
        candles.push({
            time: data.t[i],
            open: data.o[i],
            high: data.h[i],
            low: data.l[i],
            close: data.c[i]
        });
    }
    return candles;
};

// --- HYDRA ORCHESTRATOR ---
export const fetchMarketData = async (
    pair: CurrencyPair, 
    timeframe: Timeframe, 
    count: number = 300,
    endTime?: number
): Promise<{ data: CandleData[], source: string }> => {
    
    // CHECK CACHE FIRST (If not requesting historical specific time)
    const cacheKey = `${pair}-${timeframe}`;
    if (!endTime) {
        const cached = CACHE.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
            // console.log(`[Hydra] Cache Hit: ${pair}`);
            return { data: cached.data, source: 'Cortex Cache (Hot)' };
        }
    }

    let result: { data: CandleData[], source: string } | null = null;

    // 1. CRYPTO FAST LANE (Binance)
    if (isCrypto(pair)) {
        try {
            const data = await fetchBinance(pair, timeframe, count, endTime);
            if (data.length > 0) result = { data, source: 'Binance (Velocity)' };
        } catch (e) {
            console.warn("Hydra: Binance failed, attempting fallbacks...", e);
        }
    }

    // 2. FOREX/STOCKS PRIMARY (TwelveData)
    if (!result) {
        try {
            const data = await fetchTwelveData(pair, timeframe, count, endTime);
            if (data.length > 0) result = { data, source: 'TwelveData (Institutional)' };
        } catch (e: any) {
            if (e.message === 'RATE_LIMIT' || e.message.includes('429')) {
                console.warn("Hydra: TwelveData Rate Limit. Engaging Finnhub Backup.");
            } else {
                console.warn("Hydra: TwelveData Error.", e);
            }
        }
    }

    // 3. THE SAFETY NET (Finnhub)
    if (!result) {
        try {
            const data = await fetchFinnhub(pair, timeframe, count, endTime);
            if (data.length > 0) result = { data, source: 'Finnhub (Hydra Backup)' };
        } catch (e) {
            console.warn("Hydra: Finnhub failed.", e);
        }
    }

    if (result) {
        // UPDATE CACHE if live request
        if (!endTime) {
            CACHE.set(cacheKey, { timestamp: Date.now(), data: result.data, source: result.source });
        }
        return result;
    }

    // 4. FAILURE (NO SIMULATION)
    throw new Error("MARKET_DATA_UNAVAILABLE");
};

// --- STREAMING MANAGER ---
export class MarketStream {
    private ws: WebSocket | null = null;
    private pair: string | null = null;
    private cb: ((price: number, time: number) => void) | null = null;
    private ping: any = null;
    private onError: ((msg: string) => void) | null = null;

    connect(pair: CurrencyPair, callback: (price: number, time: number) => void, lastKnownPrice?: number, onError?: (msg: string) => void) {
        this.pair = pair;
        this.cb = callback;
        if (onError) this.onError = onError;
        
        if (isCrypto(pair)) {
            this.connectBinance(pair);
        } else {
            this.connectTwelveData(pair);
        }
    }

    private connectBinance(pair: string) {
        const symbol = mapSymbol('binance', pair).toLowerCase();
        try {
            this.ws = new WebSocket(`${ENDPOINTS.binance.ws}/${symbol}@kline_1m`);
            this.ws.onmessage = (e) => {
                const d = JSON.parse(e.data);
                if (d.e === 'kline' && this.cb) {
                    this.cb(parseFloat(d.k.c), Math.floor(d.k.t / 1000));
                }
            };
            this.ws.onerror = () => {
                if (this.onError) this.onError("WS_CONNECTION_LOST");
            };
        } catch (e) {
            if (this.onError) this.onError("WS_INIT_FAILED");
        }
    }

    private connectTwelveData(pair: string) {
        const apiKey = API_KEYS.twelveData;
        if (apiKey === 'demo' && pair !== 'EURUSD') {
            if (this.onError) this.onError("TWELVE_DATA_AUTH_ERROR");
            return;
        }

        try {
            this.ws = new WebSocket(`${ENDPOINTS.twelveData.ws}?apikey=${apiKey}`);
            this.ws.onopen = () => {
                this.ws?.send(JSON.stringify({ action: 'subscribe', params: { symbols: mapSymbol('twelve', pair) } }));
                this.ping = setInterval(() => this.ws?.send(JSON.stringify({ action: 'heartbeat' })), 10000);
            };
            this.ws.onmessage = (e) => {
                const d = JSON.parse(e.data);
                if (d.event === 'price' && this.cb) {
                    this.cb(d.price, d.timestamp);
                }
                if (d.status === 'error') {
                    console.warn("TwelveData WS Error", d);
                    this.disconnect();
                    if (this.onError) this.onError(d.message || "WS_ERROR");
                }
            };
            this.ws.onerror = () => {
                if (this.onError) this.onError("WS_CONNECTION_LOST");
            };
        } catch (e) {
            if (this.onError) this.onError("WS_INIT_FAILED");
        }
    }

    disconnect() {
        clearInterval(this.ping);
        this.ws?.close();
        this.ws = null;
        this.cb = null;
        this.onError = null;
    }
}
