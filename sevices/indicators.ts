
import { CandleData } from '../types';

export const calculateSMA = (data: CandleData[], period: number): number | null => {
  if (data.length < period) return null;
  const slice = data.slice(-period);
  const sum = slice.reduce((acc, curr) => acc + curr.close, 0);
  return sum / period;
};

export const calculateEMA = (data: CandleData[], period: number): number | null => {
  if (data.length < period) return null;
  const k = 2 / (period + 1);
  let ema = data[0].close;
  for (let i = 1; i < data.length; i++) {
    ema = data[i].close * k + ema * (1 - k);
  }
  return ema;
};

export const calculateRSI = (data: CandleData[], period: number = 14): number | null => {
  if (data.length < period + 1) return null;
  
  let gains = 0;
  let losses = 0;

  // Calculate initial average
  for (let i = 1; i <= period; i++) {
    const diff = data[i].close - data[i - 1].close;
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  // Smooth
  for (let i = period + 1; i < data.length; i++) {
    const diff = data[i].close - data[i - 1].close;
    const gain = diff >= 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;

    avgGain = ((avgGain * (period - 1)) + gain) / period;
    avgLoss = ((avgLoss * (period - 1)) + loss) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
};

export const calculateBollingerBands = (data: CandleData[], period: number = 20, stdDev: number = 2) => {
  if (data.length < period) return null;
  const sma = calculateSMA(data, period);
  if (!sma) return null;

  const slice = data.slice(-period);
  const squaredDiffs = slice.map(c => Math.pow(c.close - sma, 2));
  const variance = squaredDiffs.reduce((acc, curr) => acc + curr, 0) / period;
  const std = Math.sqrt(variance);

  return {
    upper: sma + (std * stdDev),
    middle: sma,
    lower: sma - (std * stdDev)
  };
};

export const getTechnicalSummary = (data: CandleData[]) => {
  if (data.length < 50) return "Insufficient Data for Indicators";

  const rsi = calculateRSI(data, 14);
  const ema20 = calculateEMA(data, 20);
  const ema50 = calculateEMA(data, 50);
  const ema200 = calculateEMA(data, 200);
  const bb = calculateBollingerBands(data, 20);
  const current = data[data.length - 1].close;

  let summary = `TECHNICAL INDICATORS (Calculated locally):\n`;
  summary += `- RSI (14): ${rsi ? rsi.toFixed(2) : 'N/A'}\n`;
  summary += `- EMA (20): ${ema20 ? ema20.toFixed(2) : 'N/A'}\n`;
  summary += `- EMA (50): ${ema50 ? ema50.toFixed(2) : 'N/A'}\n`;
  summary += `- EMA (200): ${ema200 ? ema200.toFixed(2) : 'N/A'} (Trend: ${ema200 && current > ema200 ? 'BULLISH' : 'BEARISH'})\n`;
  
  if (bb) {
    summary += `- Bollinger Bands: Upper ${bb.upper.toFixed(2)} / Lower ${bb.lower.toFixed(2)}\n`;
  }

  return summary;
};
