
import React, { useState, useEffect } from 'react';
import { ShieldAlert, AlertTriangle, Check, X, TrendingDown, Thermometer, Info } from 'lucide-react';
import { PreMortemData } from '../types';

interface PreMortemModalProps {
    data: PreMortemData;
    onConfirm: () => void;
    onCancel: () => void;
}

export const PreMortemModal: React.FC<PreMortemModalProps> = ({ data, onConfirm, onCancel }) => {
    const [timeLeft, setTimeLeft] = useState(3);
    const [canConfirm, setCanConfirm] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    setCanConfirm(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const isHighRisk = data.riskPercent > 2 || data.isHighImpactNews || data.sentiment === 'TILT';

    return (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in zoom-in-95">
            <div className={`
                w-full max-w-sm border rounded-sm shadow-2xl overflow-hidden relative
                ${isHighRisk ? 'bg-[#0f0505] border-rose-500/50' : 'bg-[#050505] border-white/10'}
            `}>
                {/* Header */}
                <div className={`p-4 border-b flex items-center justify-between ${isHighRisk ? 'bg-rose-500/10 border-rose-500/20' : 'bg-white/5 border-white/5'}`}>
                    <div className="flex items-center gap-2">
                        <ShieldAlert size={18} className={isHighRisk ? 'text-rose-500 animate-pulse' : 'text-emerald-500'} />
                        <span className={`text-xs font-bold uppercase tracking-widest ${isHighRisk ? 'text-rose-500' : 'text-white'}`}>
                            Pre-Mortem Gate
                        </span>
                    </div>
                    <div className="text-[9px] font-mono text-zinc-500">EXEC_ID: {Math.random().toString(36).substr(2,6).toUpperCase()}</div>
                </div>

                {/* Body */}
                <div className="p-6 flex flex-col gap-6">
                    
                    {/* RISK CARD */}
                    <div className="bg-black/50 border border-white/5 rounded-sm p-4 flex flex-col gap-2">
                        <div className="flex justify-between items-end">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Risk Exposure</span>
                            <span className={`text-xl font-mono font-bold ${data.riskPercent > 2 ? 'text-rose-500' : 'text-white'}`}>
                                ${data.riskAmount.toFixed(2)}
                            </span>
                        </div>
                        <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                            <div 
                                className={`h-full transition-all duration-500 ${data.riskPercent > 2 ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                                style={{ width: `${Math.min(data.riskPercent * 20, 100)}%` }}
                            ></div>
                        </div>
                        <div className="flex justify-between text-[9px] font-mono text-zinc-400">
                            <span>{data.riskPercent.toFixed(2)}% of Balance</span>
                            <span>Limit: 2.00%</span>
                        </div>
                    </div>

                    {/* CHECKS */}
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between p-2 rounded-sm bg-white/5 border border-white/5">
                            <div className="flex items-center gap-2">
                                <Thermometer size={14} className={data.sentiment === 'ZEN' ? 'text-emerald-500' : 'text-rose-500'} />
                                <span className="text-[10px] text-zinc-300 font-bold uppercase">Psychology</span>
                            </div>
                            <span className={`text-[10px] font-mono font-bold ${data.sentiment === 'ZEN' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {data.sentiment}
                            </span>
                        </div>

                        <div className="flex items-center justify-between p-2 rounded-sm bg-white/5 border border-white/5">
                            <div className="flex items-center gap-2">
                                <TrendingDown size={14} className={data.lossStreak > 0 ? 'text-amber-500' : 'text-zinc-500'} />
                                <span className="text-[10px] text-zinc-300 font-bold uppercase">Streak Context</span>
                            </div>
                            <span className="text-[10px] font-mono text-zinc-400">
                                {data.lossStreak > 0 ? `${data.lossStreak} Loss Streak` : `${data.winStreak} Win Streak`}
                            </span>
                        </div>

                        {data.isHighImpactNews && (
                            <div className="flex items-center gap-2 p-2 rounded-sm bg-rose-500/10 border border-rose-500/30">
                                <AlertTriangle size={14} className="text-rose-500" />
                                <span className="text-[10px] text-rose-500 font-bold uppercase">High Impact News Detected</span>
                            </div>
                        )}
                    </div>

                    <div className="text-[10px] text-zinc-500 font-mono text-center italic">
                        "If this trade hits stop loss, will you remain calm?"
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-black/50 border-t border-white/5 flex gap-3">
                    <button 
                        onClick={onCancel}
                        className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold uppercase rounded-sm transition-all"
                    >
                        Abort
                    </button>
                    <button 
                        onClick={onConfirm}
                        disabled={!canConfirm}
                        className={`
                            flex-1 py-3 text-black text-xs font-bold uppercase rounded-sm transition-all flex items-center justify-center gap-2
                            ${canConfirm 
                                ? 'bg-emerald-500 hover:bg-emerald-400 cursor-pointer shadow-glow' 
                                : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'}
                        `}
                    >
                        {canConfirm ? (
                            <>
                                <Check size={14} /> Execute
                            </>
                        ) : (
                            <span>Wait {timeLeft}s</span>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
