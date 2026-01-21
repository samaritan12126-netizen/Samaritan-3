
import { BacktestEngine } from './backtestEngine'; // Assuming imports work in this build setup
import { CandleData, BacktestConfig } from '../types';

/* 
 * WEB WORKER: OPTIMIZER
 * Handles heavy simulation loops off-thread.
 */

self.onmessage = (e: MessageEvent) => {
    const { baseData, autoTrades, config, variations, strategyIds } = e.data;
    
    if (!baseData || !autoTrades || !config || !variations) {
        self.postMessage({ error: "Invalid payload" });
        return;
    }

    const results = [];

    // Filter trades based on selected Strategies if provided
    let tradesToProcess = autoTrades;
    if (strategyIds && strategyIds.length > 0) {
        // We match signal.strategyName or strategyId if available. 
        // Note: autoTrades objects usually have 'strategyName'. 
        // But for exact matching we might need ID. 
        // For now, assuming strategyName is sufficient or we passed IDs in the signal.
        // Let's assume the 'strategyName' field holds the ID in the new implementation, 
        // OR we filter by names if passed names.
        // Actually, the main thread will handle the mapping or we assume 'strategyName' corresponds to ID.
        // Let's filter by checking if the signal's strategyId (which we will add) is in the list.
        tradesToProcess = autoTrades.filter((t: any) => strategyIds.includes(t.strategyId));
    }

    // Run simulations sequentially
    for (const v of variations) {
        const optEngine = new BacktestEngine(config);
        
        for (const candle of baseData) {
            optEngine.processCandle(candle);
            
            // Find trades for this time
            const matches = tradesToProcess.filter((t: any) => t.time === candle.time);
            
            for (const match of matches) {
                const price = candle.close;
                const atr = (candle.high - candle.low) * 3; // Approx ATR
                const stopDist = atr * v.sl;
                const targetDist = atr * v.tp;
                
                const sl = match.type === 'LONG' ? price - stopDist : price + stopDist;
                const tp = match.type === 'LONG' ? price + targetDist : price - targetDist;
                
                optEngine.openTrade(candle, match.type, sl, tp, 0.01, match.strategyName);
            }
        }
        
        const met = optEngine.calculateMetrics();
        results.push({ slMult: v.sl, tpMult: v.tp, metrics: met });
        
        // Report progress back to main thread
        self.postMessage({ type: 'progress', count: results.length, total: variations.length });
    }

    // Sort by Net Profit
    results.sort((a, b) => b.metrics.netProfit - a.metrics.netProfit);
    
    // Final Result
    self.postMessage({ type: 'complete', results });
};
