
import React, { useEffect, useState } from 'react';
import { dataHub } from '../services/dataHub';
import { WifiOff, Activity, Lock } from 'lucide-react';

interface OrderBookWidgetProps {
    pair: string;
    visible: boolean;
}

export const OrderBookWidget: React.FC<OrderBookWidgetProps> = ({ pair, visible }) => {
    const [bids, setBids] = useState<[string, string][]>([]);
    const [asks, setAsks] = useState<[string, string][]>([]);
    const [isAvailable, setIsAvailable] = useState(true);

    useEffect(() => {
        if (!visible) return;

        // Check availability logic (Basic check)
        const commonCrypto = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'MATIC', 'LTC', 'DOT', 'AVAX', 'LINK', 'UNI', 'SHIB', 'PEPE', 'WIF'];
        const isCrypto = commonCrypto.some(c => pair.startsWith(c));

        if (!isCrypto) {
            setIsAvailable(false);
            setBids([]);
            setAsks([]);
            return;
        }

        setIsAvailable(true);

        const handleDepth = (newBids: [string, string][], newAsks: [string, string][]) => {
            setBids(newBids.slice(0, 8)); // Top 8
            setAsks(newAsks.slice(0, 8));
        };

        dataHub.subscribeDepth(pair, handleDepth);

        return () => {
            if (isCrypto) {
                dataHub.unsubscribeDepth(pair, handleDepth);
            }
        };
    }, [pair, visible]);

    if (!visible) return null;

    if (!isAvailable) {
        return (
            <div className="absolute top-16 right-4 z-20 bg-black/80 backdrop-blur-md border border-white/10 rounded-sm p-4 w-48 flex flex-col items-center justify-center gap-2 text-center shadow-2xl">
                <Lock size={20} className="text-zinc-600" />
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">L2 Data Unavailable</span>
                <span className="text-[9px] text-zinc-600 font-mono">Order Flow unavailable for this asset class.</span>
            </div>
        );
    }

    if (bids.length === 0 && asks.length === 0) {
        return (
            <div className="absolute top-16 right-4 z-20 bg-black/80 backdrop-blur-md border border-white/10 rounded-sm p-3 w-40 flex items-center justify-center gap-2 shadow-2xl">
                <Activity size={14} className="text-primary animate-pulse" />
                <span className="text-[9px] font-mono text-zinc-400 uppercase">Syncing Depth...</span>
            </div>
        );
    }

    // Calculate depths for visual bars
    const maxVol = Math.max(
        ...bids.map(b => parseFloat(b[1])), 
        ...asks.map(a => parseFloat(a[1]))
    );

    return (
        <div className="absolute top-16 right-4 z-20 bg-[#050505]/90 backdrop-blur-md border border-white/10 rounded-sm w-48 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 font-mono">
            <div className="bg-white/5 p-2 border-b border-white/5 flex justify-between items-center">
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Order Book (L2)</span>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
            </div>
            
            <div className="flex flex-col text-[9px]">
                {/* ASKS (Red, Descending) */}
                <div className="flex flex-col-reverse">
                    {asks.map((ask, i) => {
                        const price = parseFloat(ask[0]).toFixed(2);
                        const vol = parseFloat(ask[1]);
                        const width = (vol / maxVol) * 100;
                        return (
                            <div key={`ask-${i}`} className="flex justify-between items-center relative px-2 py-0.5 group">
                                <div className="absolute top-0 right-0 bottom-0 bg-rose-500/10 transition-all duration-300" style={{ width: `${width}%` }}></div>
                                <span className="text-rose-500 relative z-10">{price}</span>
                                <span className="text-zinc-500 relative z-10">{vol.toFixed(3)}</span>
                            </div>
                        );
                    })}
                </div>

                <div className="h-px bg-white/10 my-1"></div>

                {/* BIDS (Green) */}
                <div>
                    {bids.map((bid, i) => {
                        const price = parseFloat(bid[0]).toFixed(2);
                        const vol = parseFloat(bid[1]);
                        const width = (vol / maxVol) * 100;
                        return (
                            <div key={`bid-${i}`} className="flex justify-between items-center relative px-2 py-0.5 group">
                                <div className="absolute top-0 right-0 bottom-0 bg-emerald-500/10 transition-all duration-300" style={{ width: `${width}%` }}></div>
                                <span className="text-emerald-500 relative z-10">{price}</span>
                                <span className="text-zinc-500 relative z-10">{vol.toFixed(3)}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
