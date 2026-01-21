
import React, { useState, useEffect } from 'react';
import { BrainCircuit, Cpu, Zap, Activity, Save, History, Play, Terminal, ArrowLeft, Trash2 } from 'lucide-react';
import { EvolutionLog, NeuralDB, View } from '../types';
import { storage } from '../services/storage';
import { synthesizeProtocol } from '../services/geminiService';
import { ThinkingIndicator } from './ThinkingIndicator';
import ReactMarkdown from 'react-markdown';

interface CortexViewProps {
    db: NeuralDB;
    onNavigate: (view: View) => void;
}

export const CortexView: React.FC<CortexViewProps> = ({ db, onNavigate }) => {
    const [logs, setLogs] = useState<EvolutionLog[]>([]);
    const [isSynthesizing, setIsSynthesizing] = useState(false);
    const [protocol, setProtocol] = useState<string | null>(null);

    useEffect(() => {
        loadLogs();
        const savedProtocol = localStorage.getItem('samaritan_master_protocol');
        if (savedProtocol) setProtocol(savedProtocol);
    }, []);

    const loadLogs = async () => {
        const data = await storage.getEvolutionLogs();
        setLogs(data.sort((a,b) => b.timestamp - a.timestamp));
    };

    const handleSynthesize = async () => {
        setIsSynthesizing(true);
        try {
            const result = await synthesizeProtocol(db.strategies, logs);
            setProtocol(result);
            localStorage.setItem('samaritan_master_protocol', result);
        } catch (e) {
            console.error(e);
        } finally {
            setIsSynthesizing(false);
        }
    };

    const handleDeleteLog = async (id: string) => {
        if (confirm("Delete this evolution memory? This action cannot be undone.")) {
            await storage.deleteEvolutionLog(id);
            await loadLogs();
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#000000] text-zinc-200 font-sans">
            {/* HEADER */}
            <div className="p-6 border-b border-white/5 bg-[#050505]/90 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => onNavigate('TERMINAL')} className="text-zinc-500 hover:text-white transition-colors">
                        <ArrowLeft size={18} />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-sm bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shadow-glow-sm">
                            <BrainCircuit size={20} className="text-violet-500" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white tracking-widest uppercase font-mono">Cortex HQ</h2>
                            <p className="text-[10px] text-zinc-500 font-mono uppercase">Evolutionary Memory Core</p>
                        </div>
                    </div>
                </div>
                
                <button 
                    onClick={handleSynthesize}
                    disabled={isSynthesizing}
                    className="px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white text-xs font-bold uppercase tracking-widest rounded-sm shadow-glow flex items-center gap-2 transition-all disabled:opacity-50"
                >
                    {isSynthesizing ? <Activity size={14} className="animate-spin" /> : <Zap size={14} />}
                    Synthesize Protocol
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* COLUMN 1: THE REGISTRY (LOGS) */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2 mb-2">
                        <History size={16} className="text-zinc-500" />
                        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Evolutionary Registry ({logs.length})</h3>
                    </div>
                    
                    {logs.length === 0 && (
                        <div className="p-8 border border-white/5 border-dashed rounded-sm text-center text-zinc-600 text-xs font-mono">
                            No self-learned lessons yet. Run Backtests to populate.
                        </div>
                    )}

                    {logs.map(log => (
                        <div key={log.id} className="bg-[#050505] border border-white/10 hover:border-violet-500/30 p-4 rounded-sm transition-all group relative">
                            <button 
                                onClick={() => handleDeleteLog(log.id)}
                                className="absolute top-2 right-2 text-zinc-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all p-1"
                                title="Delete Memory"
                            >
                                <Trash2 size={14} />
                            </button>
                            <div className="flex justify-between items-start mb-2 pr-6">
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider ${log.trigger === 'LOSS_STREAK' ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                    {log.trigger}
                                </span>
                                <span className="text-[9px] text-zinc-600 font-mono">{new Date(log.timestamp).toLocaleDateString()}</span>
                            </div>
                            <p className="text-sm font-bold text-white mb-2">{log.insight}</p>
                            <div className="flex items-start gap-2 bg-white/5 p-2 rounded-sm">
                                <Terminal size={12} className="text-violet-500 mt-0.5 shrink-0" />
                                <p className="text-xs text-zinc-400 font-mono">Adaptation: {log.adaptation}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* COLUMN 2: MASTER PROTOCOL */}
                <div className="flex flex-col gap-4 h-full">
                    <div className="flex items-center gap-2 mb-2">
                        <Cpu size={16} className="text-violet-500" />
                        <h3 className="text-xs font-bold text-violet-500 uppercase tracking-widest">Synthesized Master Protocol</h3>
                    </div>

                    <div className="bg-[#020202] border border-white/10 rounded-sm p-6 flex-1 relative overflow-hidden">
                        {isSynthesizing ? (
                            <div className="flex flex-col items-center justify-center h-full gap-4">
                                <ThinkingIndicator />
                                <span className="text-xs font-mono text-zinc-500 animate-pulse">FUSING STRATEGIES WITH EVOLUTION DATA...</span>
                            </div>
                        ) : protocol ? (
                            <div className="prose prose-invert prose-sm max-w-none font-mono h-full overflow-y-auto custom-scrollbar">
                                <ReactMarkdown>{protocol}</ReactMarkdown>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-zinc-600">
                                <BrainCircuit size={48} className="mb-4 opacity-20" />
                                <span className="text-xs font-mono uppercase">Protocol Not Synthesized</span>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};
