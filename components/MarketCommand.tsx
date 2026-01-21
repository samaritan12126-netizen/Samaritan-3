
import React, { useState, useEffect, useMemo } from 'react';
import { 
    Search, LayoutGrid, CheckCircle2, Circle, Activity, 
    Zap, Globe, Bitcoin, TrendingUp, Layers, Plus, X, ArrowLeft, BarChart3, ShieldCheck, Network 
} from 'lucide-react';
import { MASTER_ASSETS, FOCUS_MODES, AssetCategory } from '../services/assets';
import { storage } from '../services/storage';
import { View, StoredFile } from '../types';
import { audio } from '../services/audio';
import { performanceService, AssetHealth } from '../services/performance';

interface MarketCommandProps {
    onNavigate: (view: View) => void;
}

type SectorStat = { count: number, total: number, color: string };

// Helper to calculate Pearson Correlation
const calculatePearson = (data1: number[], data2: number[]) => {
    const n = Math.min(data1.length, data2.length);
    if (n < 2) return 0;
    
    const x = data1.slice(0, n);
    const y = data2.slice(0, n);
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
};

export const MarketCommand: React.FC<MarketCommandProps> = ({ onNavigate }) => {
    const [activeTab, setActiveTab] = useState<AssetCategory | 'ALL'>('ALL');
    const [search, setSearch] = useState('');
    const [watchlist, setWatchlist] = useState<string[]>([]);
    const [manualSymbol, setManualSymbol] = useState('');
    const [healthMap, setHealthMap] = useState<Record<string, AssetHealth>>({});
    const [showCorrelations, setShowCorrelations] = useState(false);
    const [storedFiles, setStoredFiles] = useState<StoredFile[]>([]); // For correlation calculation

    useEffect(() => {
        setWatchlist(storage.getWatchlist());
        // Load Health Data
        const loadHealth = async () => {
            const map: Record<string, AssetHealth> = {};
            for (const asset of MASTER_ASSETS) {
                map[asset.symbol] = await performanceService.calculateAssetHealth(asset.symbol);
            }
            setHealthMap(map);
        };
        // Load Files for Correlation
        const loadFiles = async () => {
            const files = await storage.getFiles();
            setStoredFiles(files);
        }
        
        loadHealth();
        loadFiles();
    }, []);

    const save = (newList: string[]) => {
        setWatchlist(newList);
        storage.saveWatchlist(newList);
        audio.play('CLICK');
    };

    const toggleAsset = (symbol: string) => {
        if (watchlist.includes(symbol)) {
            save(watchlist.filter(s => s !== symbol));
        } else {
            save([...watchlist, symbol]);
        }
    };

    const applyFocusMode = (modeKey: string) => {
        const modeAssets = FOCUS_MODES[modeKey as keyof typeof FOCUS_MODES];
        if (modeAssets) {
            save(modeAssets);
            audio.play('SUCCESS');
        }
    };

    const addManualSymbol = () => {
        if (!manualSymbol) return;
        const upper = manualSymbol.toUpperCase().trim();
        if (!watchlist.includes(upper)) {
            save([...watchlist, upper]);
            setManualSymbol('');
            audio.play('SUCCESS');
        }
    };

    const filteredAssets = MASTER_ASSETS.filter(a => {
        const matchesTab = activeTab === 'ALL' || a.category === activeTab;
        const matchesSearch = a.symbol.toLowerCase().includes(search.toLowerCase()) || 
                              a.name.toLowerCase().includes(search.toLowerCase());
        return matchesTab && matchesSearch;
    });

    // --- SECTOR HEATMAP STATS ---
    const sectorStats = useMemo<Record<string, SectorStat>>(() => {
        const stats: Record<string, SectorStat> = {
            'CRYPTO': { count: 0, total: 0, color: 'bg-orange-500' },
            'FOREX': { count: 0, total: 0, color: 'bg-emerald-500' },
            'INDICES': { count: 0, total: 0, color: 'bg-cyan-500' },
            'COMMODITIES': { count: 0, total: 0, color: 'bg-yellow-500' },
            'STOCKS': { count: 0, total: 0, color: 'bg-violet-500' }
        };

        MASTER_ASSETS.forEach(a => {
            if (stats[a.category]) stats[a.category].total++;
        });

        watchlist.forEach(w => {
            const asset = MASTER_ASSETS.find(a => a.symbol === w);
            if (asset && stats[asset.category]) {
                stats[asset.category].count++;
            }
        });

        return stats;
    }, [watchlist]);

    // --- CORRELATION LOGIC ---
    const getCorrelation = (a1: string, a2: string) => {
        if (a1 === a2) return 1.0;

        // Try to find historical data in stored files
        // This is a naive check by file name or custom ID mapping - simplifying by assuming file.name contains pair
        const file1 = storedFiles.find(f => f.name.includes(a1));
        const file2 = storedFiles.find(f => f.name.includes(a2));

        if (file1 && file2) {
            // Found real data - calculate Pearson
            // We need aligned data. Intersect timestamps.
            const map1 = new Map<number, number>(file1.data.map(c => [c.time, c.close]));
            const map2 = new Map<number, number>(file2.data.map(c => [c.time, c.close]));
            
            const prices1: number[] = [];
            const prices2: number[] = [];
            
            map1.forEach((val, time) => {
                if (map2.has(time)) {
                    prices1.push(val);
                    prices2.push(map2.get(time)!);
                }
            });
            
            if (prices1.length > 50) {
                return calculatePearson(prices1, prices2);
            }
        }

        // Fallback Heuristics
        const asset1 = MASTER_ASSETS.find(a => a.symbol === a1);
        const asset2 = MASTER_ASSETS.find(a => a.symbol === a2);
        
        if (!asset1 || !asset2) return 0.1; 
        
        if (asset1.category === asset2.category) {
            if (asset1.category === 'CRYPTO') return 0.85; 
            if (asset1.category === 'INDICES') return 0.9;
            return 0.6;
        }
        
        const isTech1 = ['NDX', 'BTCUSD', 'ETHUSD', 'NVDA', 'TSLA'].includes(a1);
        const isTech2 = ['NDX', 'BTCUSD', 'ETHUSD', 'NVDA', 'TSLA'].includes(a2);
        if (isTech1 && isTech2) return 0.75;

        if ((a1.includes('USD') && !a1.startsWith('USD')) && a2 === 'DXY') return -0.8;

        return 0.2; 
    };

    return (
        <div className="flex flex-col h-full bg-[#000000] text-zinc-200 font-sans">
            {/* HEADER */}
            <div className="p-6 border-b border-white/5 bg-[#050505]/90 backdrop-blur-md sticky top-0 z-30">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <button onClick={() => onNavigate('TERMINAL')} className="text-zinc-500 hover:text-white transition-colors">
                            <ArrowLeft size={18} />
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-sm bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shadow-glow-sm">
                                <LayoutGrid size={20} className="text-cyan-500" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white tracking-widest uppercase font-mono">Market Command</h2>
                                <p className="text-[10px] text-zinc-500 font-mono uppercase">Asset Selection & Watchlist Config</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <input 
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="SEARCH ASSETS..."
                                className="bg-black border border-white/10 rounded-sm py-2 pl-8 pr-4 text-xs font-mono text-white focus:border-cyan-500/50 outline-none w-48"
                            />
                            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                        </div>
                    </div>
                </div>

                {/* COVERAGE MATRIX (HEATMAP) */}
                <div className="mb-4 bg-black border border-white/10 p-3 rounded-sm flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                            <BarChart3 size={10} /> Coverage Matrix
                        </span>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setShowCorrelations(!showCorrelations)}
                                className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-sm border flex items-center gap-1 ${showCorrelations ? 'bg-indigo-500/20 text-indigo-500 border-indigo-500/30' : 'bg-transparent text-zinc-500 border-white/10'}`}
                            >
                                <Network size={10} /> Correlations
                            </button>
                            <span className="text-[9px] font-mono text-zinc-600">{watchlist.length} ACTIVE TARGETS</span>
                        </div>
                    </div>
                    <div className="flex h-1.5 w-full rounded-full overflow-hidden bg-zinc-900">
                        {Object.entries(sectorStats).map(([key, data]: [string, SectorStat]) => {
                            const width = watchlist.length > 0 ? (data.count / watchlist.length) * 100 : 0;
                            return width > 0 ? <div key={key} className={`h-full ${data.color}`} style={{ width: `${width}%` }}></div> : null;
                        })}
                    </div>
                    
                    {showCorrelations && (
                        <div className="mt-2 overflow-x-auto">
                            <div className="flex gap-1">
                                <div className="w-16"></div> 
                                {watchlist.slice(0, 10).map(w => ( // Limit for UI
                                    <div key={w} className="w-8 text-[8px] text-zinc-500 -rotate-45 font-mono">{w}</div>
                                ))}
                            </div>
                            {watchlist.slice(0, 10).map((rowAsset, rIdx) => (
                                <div key={rowAsset} className="flex gap-1 mb-1">
                                    <div className="w-16 text-[9px] font-mono text-zinc-400 truncate">{rowAsset}</div>
                                    {watchlist.slice(0, 10).map((colAsset, cIdx) => {
                                        const corr = getCorrelation(rowAsset, colAsset);
                                        let bg = 'bg-zinc-900';
                                        if (corr > 0.8) bg = 'bg-emerald-500';
                                        else if (corr > 0.5) bg = 'bg-emerald-500/50';
                                        else if (corr < -0.5) bg = 'bg-rose-500/50';
                                        
                                        return (
                                            <div 
                                                key={colAsset} 
                                                className={`w-8 h-6 rounded-sm flex items-center justify-center text-[7px] text-white ${bg}`}
                                                title={`${rowAsset} vs ${colAsset}: ${corr}`}
                                            >
                                                {rIdx === cIdx ? '-' : corr.toFixed(1)}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                            {watchlist.length > 10 && <div className="text-[9px] text-zinc-600 mt-1 italic">Showing top 10 assets only.</div>}
                        </div>
                    )}

                    {!showCorrelations && (
                        <div className="flex gap-3 overflow-x-auto hide-scrollbar">
                            {Object.entries(sectorStats).map(([key, data]: [string, SectorStat]) => (
                                <div key={key} className="flex items-center gap-1.5 shrink-0">
                                    <div className={`w-1.5 h-1.5 rounded-full ${data.count > 0 ? data.color : 'bg-zinc-800'}`}></div>
                                    <span className={`text-[8px] font-mono uppercase ${data.count > 0 ? 'text-zinc-300' : 'text-zinc-600'}`}>
                                        {key} ({data.count})
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* FOCUS MODES */}
                <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
                    {Object.keys(FOCUS_MODES).map(mode => (
                        <button
                            key={mode}
                            onClick={() => applyFocusMode(mode)}
                            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-sm text-[9px] font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition-all whitespace-nowrap flex items-center gap-2"
                        >
                            <Zap size={10} className={mode.includes('CRYPTO') ? 'text-secondary' : 'text-emerald-500'} />
                            {mode.replace('_', ' ')}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                {/* LEFT: ASSET LIBRARY */}
                <div className="flex-1 flex flex-col bg-[#020202] overflow-hidden min-h-0">
                    {/* TABS */}
                    <div className="px-6 py-3 border-b border-white/5 flex items-center gap-4 overflow-x-auto hide-scrollbar">
                        {[
                            { id: 'ALL', icon: LayoutGrid, label: 'All' },
                            { id: 'CRYPTO', icon: Bitcoin, label: 'Crypto' },
                            { id: 'FOREX', icon: Globe, label: 'Forex' },
                            { id: 'INDICES', icon: Activity, label: 'Indices' },
                            { id: 'COMMODITIES', icon: Layers, label: 'Metals/Oil' },
                            { id: 'STOCKS', icon: TrendingUp, label: 'Stocks' },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-cyan-500/10 text-cyan-500 border border-cyan-500/20' : 'text-zinc-500 hover:text-white'}`}
                            >
                                <tab.icon size={12} />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* ASSET GRID */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                            {filteredAssets.map(asset => {
                                const isSelected = watchlist.includes(asset.symbol);
                                const health = healthMap[asset.symbol] || { tier: 'N', color: 'border-zinc-800' };
                                const providerColor = asset.provider === 'binance' ? 'bg-yellow-500' : asset.provider === 'twelve' ? 'bg-indigo-500' : 'bg-rose-500';
                                
                                return (
                                    <div 
                                        key={asset.symbol}
                                        onClick={() => toggleAsset(asset.symbol)}
                                        className={`
                                            p-3 rounded-sm border cursor-pointer transition-all flex items-center justify-between group relative overflow-hidden
                                            ${isSelected 
                                                ? 'bg-cyan-500/5' 
                                                : 'bg-black hover:bg-white/5'}
                                            ${health.color}
                                        `}
                                    >
                                        <div className="flex items-center gap-3 relative z-10">
                                            <div className={`w-8 h-8 rounded-sm flex items-center justify-center border ${isSelected ? 'bg-cyan-500 text-black border-cyan-500' : 'bg-white/5 text-zinc-600 border-white/5'}`}>
                                                <span className="text-[10px] font-bold">{asset.symbol[0]}</span>
                                            </div>
                                            <div>
                                                <div className={`text-xs font-bold font-mono ${isSelected ? 'text-white' : 'text-zinc-400'}`}>{asset.symbol}</div>
                                                <div className="text-[9px] text-zinc-600 uppercase flex items-center gap-2">
                                                    {asset.name}
                                                    {health.tier !== 'N' && (
                                                        <span className={`px-1 rounded-[2px] bg-white/10 text-white font-bold`}>{health.tier}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${providerColor}`} title={asset.provider.toUpperCase()}></div>
                                            {isSelected 
                                                ? <CheckCircle2 size={16} className="text-cyan-500 relative z-10" />
                                                : <Circle size={16} className="text-zinc-700 group-hover:text-zinc-500 relative z-10" />
                                            }
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* RIGHT: WATCHLIST */}
                <div className="w-full lg:w-80 bg-black border-t lg:border-t-0 lg:border-l border-white/5 flex flex-col h-80 lg:h-auto shrink-0">
                    <div className="p-4 border-b border-white/5 bg-white/5">
                        <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                            <Activity size={14} className="text-emerald-500" /> Active Watchlist
                        </h3>
                    </div>

                    <div className="p-4 border-b border-white/5">
                        <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Manual Override</div>
                        <div className="flex gap-2">
                            <input 
                                value={manualSymbol}
                                onChange={e => setManualSymbol(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && addManualSymbol()}
                                placeholder="TICKER (e.g. NVDA)"
                                className="flex-1 bg-[#050505] border border-white/10 px-3 py-2 text-xs font-mono text-white rounded-sm focus:border-emerald-500/50 outline-none uppercase"
                            />
                            <button 
                                onClick={addManualSymbol}
                                disabled={!manualSymbol}
                                className="px-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 rounded-sm transition-all"
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                        {watchlist.length === 0 && (
                            <div className="p-8 text-center text-zinc-600 text-xs font-mono">
                                Watchlist Empty.<br/>Select assets to begin.
                            </div>
                        )}
                        <div className="flex flex-col gap-1">
                            {watchlist.map(symbol => {
                                const def = MASTER_ASSETS.find(a => a.symbol === symbol);
                                const health = healthMap[symbol];
                                const providerColor = def?.provider === 'binance' ? 'bg-yellow-500' : def?.provider === 'twelve' ? 'bg-indigo-500' : 'bg-rose-500';

                                return (
                                    <div key={symbol} className="flex items-center justify-between p-2 rounded-sm bg-[#050505] border border-white/5 hover:border-white/10 group">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-1 h-8 rounded-full transition-colors ${health?.winRate > 50 ? 'bg-emerald-500' : health?.winRate < 40 ? 'bg-rose-500' : 'bg-zinc-800'}`}></div>
                                            <div>
                                                <div className="text-xs font-bold text-white font-mono">{symbol}</div>
                                                <div className="text-[8px] text-zinc-500 uppercase flex gap-2 items-center">
                                                    <div className={`w-1.5 h-1.5 rounded-full ${providerColor}`}></div>
                                                    {health?.tier !== 'N' && <span className="text-zinc-300">WR: {health?.winRate.toFixed(0)}%</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => toggleAsset(symbol)}
                                            className="p-1.5 text-zinc-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    
                    <div className="p-3 bg-[#050505] border-t border-white/5 text-center">
                        <span className="text-[9px] text-zinc-600 font-mono">
                            {watchlist.length} ASSETS MONITORING
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};
