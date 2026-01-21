
import { storage } from './storage';
import { JournalEntry, Alert } from '../types';

export type AssetHealthTier = 'S' | 'A' | 'B' | 'F' | 'N';

export interface AssetHealth {
    symbol: string;
    score: number; // 0.0 to 1.0
    tier: AssetHealthTier;
    winRate: number;
    totalTrades: number;
    humanWinRate: number;
    aiWinRate: number;
    color: string;
}

export const performanceService = {
    
    async calculateAssetHealth(symbol: string): Promise<AssetHealth> {
        const entries = await storage.getJournalEntries();
        const alerts: Alert[] = JSON.parse(localStorage.getItem('gemini_alerts_v1') || '[]');

        // Filter for specific symbol
        const assetEntries = entries.filter(e => e.pair === symbol);
        const assetAlerts = alerts.filter(a => a.pair === symbol && (a.status === 'WIN' || a.status === 'LOSS'));

        // 1. Human Stats
        const humanEntries = assetEntries.filter(e => e.origin === 'HUMAN');
        const humanWins = humanEntries.filter(e => e.status === 'WIN').length;
        const humanWinRate = humanEntries.length > 0 ? (humanWins / humanEntries.length) : 0;

        // 2. AI Stats (Executions + Alerts)
        const aiEntries = assetEntries.filter(e => e.origin === 'SAMARITAN_AUTO' || e.origin === 'SAMARITAN_SIGNAL');
        const aiWins = aiEntries.filter(e => e.status === 'WIN').length + assetAlerts.filter(a => a.status === 'WIN').length;
        const aiTotal = aiEntries.length + assetAlerts.length;
        const aiWinRate = aiTotal > 0 ? (aiWins / aiTotal) : 0;

        // 3. Combined Score (Weighted: 60% Execution, 40% Alerts if available)
        const totalTrades = humanEntries.length + aiTotal;
        const totalWins = humanWins + aiWins;
        const rawWinRate = totalTrades > 0 ? (totalWins / totalTrades) : 0;

        // 4. Tier Logic
        let tier: AssetHealthTier = 'N';
        let color = 'border-zinc-700'; // Default Grey

        if (totalTrades < 5) {
            tier = 'N';
            color = 'border-zinc-700';
        } else if (rawWinRate >= 0.65) {
            tier = 'S';
            color = 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]'; // Neon Emerald
        } else if (rawWinRate >= 0.45) {
            tier = 'B';
            color = 'border-amber-500'; // Golden Amber
        } else {
            tier = 'F';
            color = 'border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.5)]'; // Crimson Rose
        }

        return {
            symbol,
            score: rawWinRate,
            tier,
            winRate: rawWinRate * 100,
            totalTrades,
            humanWinRate: humanWinRate * 100,
            aiWinRate: aiWinRate * 100,
            color
        };
    },

    async getSystemStats(): Promise<{ 
        human: { eq: any[], wr: number }, 
        ai: { eq: any[], wr: number },
        shadow: { eq: any[], wr: number } 
    }> {
        const entries = await storage.getJournalEntries();
        const sorted = entries.sort((a,b) => a.date - b.date);

        let humanBal = 0;
        let aiBal = 0;
        let shadowBal = 0;

        const humanCurve = [];
        const aiCurve = [];
        const shadowCurve = [];

        let humanWins = 0, humanTotal = 0;
        let aiWins = 0, aiTotal = 0;
        let shadowWins = 0, shadowTotal = 0;

        for (const e of sorted) {
            if (e.origin === 'HUMAN') {
                humanBal += e.pnl;
                humanTotal++;
                if (e.status === 'WIN') humanWins++;
                humanCurve.push({ time: e.date / 1000, value: humanBal });
            } else if (e.origin === 'SHADOW_CHALLENGER') {
                shadowBal += e.pnl;
                shadowTotal++;
                if (e.status === 'WIN') shadowWins++;
                shadowCurve.push({ time: e.date / 1000, value: shadowBal });
            } else {
                aiBal += e.pnl;
                aiTotal++;
                if (e.status === 'WIN') aiWins++;
                aiCurve.push({ time: e.date / 1000, value: aiBal });
            }
        }

        return {
            human: { eq: humanCurve, wr: humanTotal > 0 ? (humanWins/humanTotal)*100 : 0 },
            ai: { eq: aiCurve, wr: aiTotal > 0 ? (aiWins/aiTotal)*100 : 0 },
            shadow: { eq: shadowCurve, wr: shadowTotal > 0 ? (shadowWins/shadowTotal)*100 : 0 }
        };
    },

    // --- DYNAMIC RISK MANAGER ---
    async calculateDynamicRisk(balance: number): Promise<{ riskPct: number, riskAmount: number, reason: string }> {
        const entries = await storage.getJournalEntries();
        // Sort descending by date, take last 20
        const recent = entries.sort((a, b) => b.date - a.date).slice(0, 20);
        
        if (recent.length < 5) {
            return { riskPct: 0.01, riskAmount: balance * 0.01, reason: "Insufficient Data (Default 1%)" };
        }

        let riskFactor = 1.0;
        const reasons: string[] = [];

        // 1. Performance Factor (Last 10 trades)
        const recentSubset = recent.slice(0, 10);
        const wins = recentSubset.filter(e => e.status === 'WIN').length;
        const wr = wins / recentSubset.length;

        if (wr >= 0.7) {
            riskFactor += 0.5;
            reasons.push("High Performance (>70% WR)");
        } else if (wr < 0.4) {
            riskFactor -= 0.5;
            reasons.push("Low Performance (<40% WR)");
        }

        // 2. Psychology Factor (Last trade emotion)
        const lastEntry = recent[0];
        const emotion = lastEntry.emotion;
        
        // Tilt Circuit Breaker
        if (['FOMO', 'REVENGE', 'TILT', 'ANXIOUS'].includes(emotion)) {
            riskFactor = 0.25; // Immediate clamp to 0.25x
            reasons.push(`Psychological Circuit Breaker Active (${emotion})`);
        } else if (['ZEN', 'CONFIDENT'].includes(emotion)) {
            riskFactor += 0.1;
            reasons.push(`Positive Mindset (${emotion})`);
        }

        // 3. Drawdown Protection
        if (lastEntry.status === 'LOSS' && recent[1]?.status === 'LOSS' && recent[2]?.status === 'LOSS') {
            riskFactor *= 0.5;
            reasons.push("3-Loss Streak Detected");
        }

        // Clamp Risk Multiplier
        riskFactor = Math.max(0.1, Math.min(riskFactor, 2.0)); // Min 0.1x, Max 2.0x

        const finalRiskPct = 0.01 * riskFactor; // Base 1% * Factor

        return {
            riskPct: finalRiskPct,
            riskAmount: balance * finalRiskPct,
            reason: reasons.join(" + ")
        };
    }
};
