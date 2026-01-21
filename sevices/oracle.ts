
import { vectorDb } from './vectorDb';
import { OracleInsight } from '../types';
import { notificationService } from './notification';

export class OracleService {
    private intervalId: any = null;
    private insights: OracleInsight[] = [];
    private RSS_URL = "https://api.rss2json.com/v1/api.json?rss_url=https://cointelegraph.com/rss";

    // Start the autonomous loop
    public start(intervalMs: number = 60000 * 30) { // Check every 30 mins
        if (this.intervalId) return;
        
        console.log("Oracle: Active Uplink Initiated.");
        
        // IMMEDIATE INIT STATE so UI doesn't hang
        this.insights = [{
            id: 'init-uplink',
            timestamp: Date.now(),
            title: 'SYSTEM UPLINK ESTABLISHED',
            summary: 'Oracle module online. Scanning global macro feeds...',
            impact: 'LOW',
            sentiment: 'NEUTRAL',
            assetsAffected: [],
            sourceUrl: '#'
        }];

        this.fetchNews(); // Run immediately
        this.intervalId = setInterval(() => this.fetchNews(), intervalMs);
    }

    public stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    private async fetchNews() {
        try {
            const res = await fetch(this.RSS_URL);
            if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
            const data = await res.json();
            
            if (data.status === 'ok' && data.items) {
                const newInsights: OracleInsight[] = [];
                
                for (const item of data.items) {
                    if (this.insights.some(i => i.title === item.title)) continue;

                    const text = (item.title + " " + item.description).toLowerCase();
                    let impact: 'HIGH' | 'MED' | 'LOW' = 'LOW';
                    if (text.includes('sec') || text.includes('fed') || text.includes('binance') || text.includes('hack') || text.includes('etf')) {
                        impact = 'HIGH';
                    } else if (text.includes('partnership') || text.includes('launch')) {
                        impact = 'MED';
                    }

                    let sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
                    if (text.includes('surge') || text.includes('bull') || text.includes('approve') || text.includes('high')) sentiment = 'BULLISH';
                    if (text.includes('crash') || text.includes('bear') || text.includes('ban') || text.includes('sue') || text.includes('low')) sentiment = 'BEARISH';

                    const insight: OracleInsight = {
                        id: Math.random().toString(36).substr(2, 9),
                        timestamp: Date.now(), 
                        title: item.title,
                        summary: item.description?.replace(/<[^>]*>?/gm, '').substring(0, 150) + "...", 
                        impact,
                        sentiment,
                        assetsAffected: ['CRYPTO'], 
                        sourceUrl: item.link
                    };
                    
                    newInsights.push(insight);
                    
                    if (impact === 'HIGH') {
                        notificationService.send(`ORACLE: ${item.title}`, "High Impact News Detected", "ALERT");
                    }
                }

                if (newInsights.length > 0) {
                    // Filter out the init/error messages when real data arrives
                    const validInsights = this.insights.filter(i => i.id !== 'init-uplink' && i.id !== 'error-state');
                    this.insights = [...newInsights, ...validInsights].slice(0, 50);
                    
                    // Only embed real news
                    newInsights.forEach(i => vectorDb.addMemory(i.id, `${i.title} ${i.summary}`, { type: 'NEWS', ...i }));
                }
            } else {
                throw new Error("Invalid RSS Data");
            }
        } catch (e: any) {
            console.warn("Oracle: Data Feed Offline.", e);
            
            // Only replace if we don't have real data yet
            const hasRealData = this.insights.some(i => i.id !== 'init-uplink' && i.id !== 'error-state');
            
            if (!hasRealData) {
                this.insights = [{
                    id: 'error-state',
                    timestamp: Date.now(),
                    title: '⚠️ ORACLE UPLINK SEVERED',
                    summary: `External Data Feed Unreachable. Reason: ${e.message || 'Rate Limit / Network Error'}. Using offline protocols.`,
                    impact: 'HIGH',
                    sentiment: 'NEUTRAL',
                    assetsAffected: [],
                    sourceUrl: '#'
                }];
                notificationService.send("ORACLE SYSTEM", "Feed Offline / Rate Limit Reached", "ALERT");
            }
        }
    }

    public getLatestInsights(): OracleInsight[] {
        return this.insights;
    }

    public async getContextForAsset(asset: string): Promise<string> {
        // If we only have the error state, return that
        if (this.insights.length === 1 && this.insights[0].id === 'error-state') {
            return `ORACLE WARNING: Live macro data unavailable (${this.insights[0].summary}). Proceed with technicals only.`;
        }

        const relevant = this.insights.filter(i => 
            i.assetsAffected.some(a => asset.includes(a) || (a === 'CRYPTO' && asset.includes('BTC')))
        );

        // Check history even if live feed is down
        const history = await vectorDb.search(`News affecting ${asset}`, 3);
        
        const historyText = history.map(h => `[ARCHIVED] ${h.item.text}`).join('\n');
        const recentText = relevant.slice(0, 5).map(i => `[FRESH] ${i.title} (${i.sentiment})`).join('\n');

        if (!recentText && !historyText) return "Oracle: No significant macro data found. Proceed with technicals.";
        
        return `ORACLE MACRO CONTEXT:\n${recentText}\n${historyText}`;
    }
}

export const oracle = new OracleService();
