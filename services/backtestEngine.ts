
import { CandleData, BacktestConfig, Trade, BacktestMetrics } from '../types';

// --- HELPERS ---

const generateSyntheticTicks = (candle: CandleData): number[] => {
  const { open, high, low, close } = candle;
  if (close >= open) {
    return [open, low, high, close];
  } else {
    return [open, high, low, close];
  }
};

const getKillzone = (timestamp: number): string => {
  const date = new Date(timestamp * 1000);
  // Using simplified UTC windows for major sessions
  // Asian: 00:00 - 08:00 UTC
  // London: 08:00 - 13:00 UTC
  // NY AM: 13:00 - 16:00 UTC
  // NY PM: 16:00 - 21:00 UTC
  // Off-Hours: 21:00 - 00:00 UTC
  
  const hour = date.getUTCHours(); 
  
  if (hour >= 0 && hour < 8) return "Asian";
  if (hour >= 8 && hour < 13) return "London";
  if (hour >= 13 && hour < 16) return "NY AM";
  if (hour >= 16 && hour < 21) return "NY PM";
  return "Off-Hours";
};

// --- SIMULATION HELPER FOR AI ---
export const runScenario = (
    candles: CandleData[], 
    signals: { time: number, type: 'LONG' | 'SHORT', reason: string, strategyName: string }[],
    config: BacktestConfig
): any => {
    // Run headless backtest
    const engine = new BacktestEngine(config);
    let blownDate = null;
    let minBalance = config.initialBalance;
    let maxBalance = config.initialBalance;
    let lotsHistory: { time: string, lots: number, balance: number }[] = [];
    
    // Process all candles
    for (const candle of candles) {
        engine.processCandle(candle);
        
        // Track stats
        const currentEq = engine.getEquity();
        if (currentEq < minBalance) minBalance = currentEq;
        if (currentEq > maxBalance) maxBalance = currentEq;
        
        if (currentEq <= 0 && !blownDate) {
            blownDate = new Date(candle.time * 1000).toLocaleString();
        }

        // Check for signal match
        const signal = signals.find(s => s.time === candle.time);
        if (signal && currentEq > 0) {
            const price = candle.close;
            // Assuming dynamic sizing based on risk in config (e.g. initialBalance * 0.01)
            // But we want "Risk % of CURRENT Balance" for true compounding test
            const atr = (candle.high - candle.low) * 3;
            const sl = signal.type === 'LONG' ? price - atr : price + atr;
            const tp = signal.type === 'LONG' ? price + (atr * 2) : price - (atr * 2);
            
            // NOTE: engine.openTrade logic uses static % of INITIAL balance usually in simple backtests,
            // but we will update it to use CURRENT balance if provided.
            // For this scenario runner, we calculate size manually to report it.
            
            // Risk 1% of CURRENT equity
            const riskAmt = currentEq * 0.01; 
            const dist = Math.abs(price - sl);
            const size = dist > 0 ? riskAmt / dist : 0;
            
            lotsHistory.push({
                time: new Date(candle.time * 1000).toLocaleDateString(),
                lots: parseFloat(size.toFixed(2)),
                balance: parseFloat(currentEq.toFixed(2))
            });

            engine.openTrade(candle, signal.type, sl, tp, 0.01, signal.strategyName);
        }
    }

    const metrics = engine.calculateMetrics();

    // Return a summarized report for the LLM
    return {
        initialBalance: config.initialBalance,
        finalBalance: metrics.netProfit + config.initialBalance,
        netProfit: metrics.netProfit,
        isBlown: minBalance <= 10, // Effectively zero
        blownDate,
        maxDrawdown: metrics.maxDrawdown,
        totalTrades: metrics.totalTrades,
        winRate: metrics.winRate,
        lotSizingSample: lotsHistory.filter((_, i) => i % Math.ceil(lotsHistory.length / 5) === 0), // Sample 5 points
        minBalance,
        maxBalance
    };
};

export class BacktestEngine {
  private config: BacktestConfig;
  private balance: number;
  private equity: number;
  private trades: Trade[] = [];
  private equityCurve: { time: number; value: number }[] = [];
  
  constructor(config: BacktestConfig) {
    this.config = config;
    this.balance = config.initialBalance;
    this.equity = config.initialBalance;
    this.equityCurve.push({ time: 0, value: config.initialBalance }); 
  }
  
  public getEquity(): number {
      return this.equity;
  }

  // --- METRICS CALCULATION (INSTITUTIONAL GRADE) ---
  public calculateMetrics(): BacktestMetrics {
    const closedTrades = this.trades.filter(t => t.status !== 'OPEN');
    const wins = closedTrades.filter(t => t.pnl > 0);
    const losses = closedTrades.filter(t => t.pnl <= 0);

    const totalTrades = closedTrades.length;
    const netProfit = this.balance - this.config.initialBalance;
    const winRate = totalTrades > 0 ? (wins.length / totalTrades) * 100 : 0;

    const grossProfit = wins.reduce((acc, t) => acc + t.pnl, 0);
    const grossLoss = Math.abs(losses.reduce((acc, t) => acc + t.pnl, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit;

    const avgWin = wins.length > 0 ? grossProfit / wins.length : 0;
    const avgLoss = losses.length > 0 ? grossLoss / losses.length : 0;
    const expectancy = totalTrades > 0 ? (avgWin * (winRate/100)) - (Math.abs(avgLoss) * (1 - (winRate/100))) : 0;

    // Advanced Stats
    const totalRR = closedTrades.reduce((acc, t) => acc + (t.riskReward || 0), 0);
    const avgRR = totalTrades > 0 ? totalRR / totalTrades : 0;
    
    const totalPips = closedTrades.reduce((acc, t) => acc + (t.pips || 0), 0);
    const avgPips = totalTrades > 0 ? totalPips / totalTrades : 0;

    // MAE/MFE Calculation
    const totalMae = closedTrades.reduce((acc, t) => acc + t.mae, 0); // MAE is typically negative or 0 based on implementation, here pnl based so usually negative.
    const totalMfe = closedTrades.reduce((acc, t) => acc + t.mfe, 0); // MFE is positive
    const avgMae = totalTrades > 0 ? totalMae / totalTrades : 0;
    const avgMfe = totalTrades > 0 ? totalMfe / totalTrades : 0;

    // Time & Session Analysis
    let totalDuration = 0;
    let winDuration = 0;
    let lossDuration = 0;
    const killzoneStats: Record<string, number> = {
        'Asian': 0, 'London': 0, 'NY AM': 0, 'NY PM': 0, 'Off-Hours': 0
    };

    closedTrades.forEach(t => {
        const dur = t.durationSeconds || 0;
        totalDuration += dur;
        if (t.pnl > 0) winDuration += dur;
        else lossDuration += dur;

        // Tally killzones
        if (t.killzone && killzoneStats.hasOwnProperty(t.killzone)) {
            killzoneStats[t.killzone]++;
        } else {
            killzoneStats['Off-Hours']++;
        }
    });

    const avgTradeDuration = totalTrades > 0 ? totalDuration / totalTrades : 0;
    const avgTimeToProfit = wins.length > 0 ? winDuration / wins.length : 0;
    const avgTimeToLoss = losses.length > 0 ? lossDuration / losses.length : 0;
    
    // Profit per Hour (Efficiency)
    const totalHours = totalDuration / 3600;
    const profitPerHour = totalHours > 0 ? netProfit / totalHours : 0;

    // Consecutive Streaks
    let maxConsWins = 0, maxConsLosses = 0;
    let currWins = 0, currLosses = 0;
    closedTrades.forEach(t => {
       if (t.pnl > 0) {
          currWins++;
          currLosses = 0;
          maxConsWins = Math.max(maxConsWins, currWins);
       } else {
          currLosses++;
          currWins = 0;
          maxConsLosses = Math.max(maxConsLosses, currLosses);
       }
    });

    // Drawdown Calculation & Recovery Time
    let maxDrawdownAbs = 0;
    let maxDrawdown = 0;
    let peakEquity = this.config.initialBalance;
    let peakTime = 0;
    let totalRecoveryTime = 0;
    let recoveryCount = 0;
    let inDrawdown = false;
    let drawdownStartTime = 0;

    for (const point of this.equityCurve) {
       if (point.value > peakEquity) {
           if (inDrawdown) {
               // Recovered
               totalRecoveryTime += (point.time - drawdownStartTime);
               recoveryCount++;
               inDrawdown = false;
           }
           peakEquity = point.value;
           peakTime = point.time;
       } else if (point.value < peakEquity) {
           if (!inDrawdown) {
               inDrawdown = true;
               drawdownStartTime = point.time;
           }
           const dd = peakEquity - point.value;
           const ddPct = (dd / peakEquity) * 100;
           
           maxDrawdownAbs = Math.max(maxDrawdownAbs, dd);
           maxDrawdown = Math.max(maxDrawdown, ddPct);
       }
    }
    
    const avgRecoveryTime = recoveryCount > 0 ? (totalRecoveryTime / recoveryCount) / 3600 : 0; // Hours

    const returns = closedTrades.map(t => t.pnl / this.config.initialBalance);
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length || 0;
    const stdDev = Math.sqrt(returns.map(x => Math.pow(x - avgReturn, 2)).reduce((a, b) => a + b, 0) / returns.length) || 1;
    const sharpeRatio = totalTrades > 0 ? (avgReturn / stdDev) * Math.sqrt(totalTrades) : 0;

    const sqn = totalTrades > 0 ? Math.sqrt(totalTrades) * (expectancy / (stdDev * this.config.initialBalance || 1)) : 0;

    return {
      timestamp: Date.now(),
      totalTrades,
      winRate,
      profitFactor,
      sharpeRatio,
      maxDrawdown,
      maxDrawdownAbs,
      expectancy,
      netProfit,
      avgWin,
      avgLoss,
      avgRR,
      avgPips,
      consecutiveWins: maxConsWins,
      consecutiveLosses: maxConsLosses,
      sqn,
      equityCurve: [...this.equityCurve],
      // New Metrics
      avgTradeDuration,
      avgTimeToProfit,
      avgTimeToLoss,
      profitPerHour,
      killzoneStats,
      avgMae,
      avgMfe,
      avgRecoveryTime
    };
  }

  // --- ORDER EXECUTION ---
  public openTrade(candle: CandleData, type: 'LONG' | 'SHORT', sl: number, tp: number, riskPct: number = 0.01, strategyName: string = "Manual") {
    // Risk Management Sizing - Always use CURRENT equity for compounding
    const riskAmount = this.equity * riskPct;
    const distToStop = Math.abs(candle.close - sl);
    if (distToStop === 0) return; 
    
    // Size = Risk / Distance
    let size = riskAmount / distToStop;
    size = size * this.config.leverage;
    
    const distToTp = Math.abs(tp - candle.close);
    const rr = distToTp / distToStop;

    const trade: Trade = {
      id: Math.random().toString(36).substr(2, 9),
      entryTime: candle.time,
      type,
      entryPrice: candle.close,
      size,
      sl,
      tp,
      pnl: 0,
      status: 'OPEN',
      mae: 0,
      mfe: 0,
      drawdown: 0,
      killzone: getKillzone(candle.time),
      riskReward: rr,
      setupOrigin: strategyName
    };
    
    this.trades.push(trade);
  }

  // --- SEQUENTIAL PROCESSING (TICK SIMULATION) ---
  public processCandle(candle: CandleData) {
    if (this.trades.length === 0) {
      this.equityCurve.push({ time: candle.time, value: this.balance });
      return;
    }

    const ticks = this.config.useSyntheticTicks 
       ? generateSyntheticTicks(candle) 
       : [candle.open, candle.high, candle.low, candle.close]; 

    this.trades.forEach(trade => {
       if (trade.status !== 'OPEN') return;
       
       for (const price of ticks) {
         if (trade.status !== 'OPEN') break;

         const rawDiff = trade.type === 'LONG' ? price - trade.entryPrice : trade.entryPrice - price;
         const pnl = rawDiff * trade.size;
         
         if (pnl > trade.mfe) trade.mfe = pnl;
         if (pnl < trade.mae) trade.mae = pnl;

         const hitSL = trade.type === 'LONG' ? price <= trade.sl : price >= trade.sl;
         const hitTP = trade.type === 'LONG' ? price >= trade.tp : price <= trade.tp;

         if (hitSL) {
            this.closeTrade(trade, trade.sl, candle.time, 'CLOSED_SL');
         } else if (hitTP) {
            this.closeTrade(trade, trade.tp, candle.time, 'CLOSED_TP');
         }
       }
    });

    // Update Equity
    const floatingPnL = this.trades
      .filter(t => t.status === 'OPEN')
      .reduce((acc, t) => {
         const price = candle.close;
         const rawDiff = t.type === 'LONG' ? price - t.entryPrice : t.entryPrice - price;
         return acc + (rawDiff * t.size);
      }, 0);
    
    this.equity = this.balance + floatingPnL;
    this.equityCurve.push({ time: candle.time, value: this.equity });
  }

  private closeTrade(trade: Trade, price: number, time: number, status: 'CLOSED_TP' | 'CLOSED_SL' | 'CLOSED_MANUAL') {
     trade.exitPrice = price;
     trade.exitTime = time;
     trade.status = status;
     
     // Calculate Duration
     trade.durationSeconds = time - trade.entryTime;
     
     const rawDiff = trade.type === 'LONG' ? price - trade.entryPrice : trade.entryPrice - price;
     
     const slippageCost = this.config.slippage * trade.size; 
     const commissionCost = (price * trade.size) * this.config.commission;
     
     trade.pnl = (rawDiff * trade.size) - commissionCost - slippageCost;
     
     // Calculate Pips
     const pipDiff = trade.type === 'LONG' ? price - trade.entryPrice : trade.entryPrice - price;
     // Rough heuristic for pip calc - ideally we pass pair to engine, but this works for visualization
     trade.pips = pipDiff * (trade.entryPrice > 500 ? 1 : 10000); 

     this.balance += trade.pnl;
  }
  
  public getTrades(): Trade[] {
      return this.trades;
  }
}
