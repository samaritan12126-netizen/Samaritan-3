
import React, { useState, useEffect } from 'react';
import { archivist, SystemSnapshot } from '../services/archivist';
import { ShieldCheck, HardDrive, Share2, Upload, AlertTriangle, RefreshCw, FileJson, CheckCircle2, Server, Download, Database, Activity, BookOpen, ArrowLeft, Key, Cpu, Zap, Network, Book, Send, Bell, Trash2, Wallet, Plus, X, ListChecks, Wrench, Copy, Fingerprint, Globe, Coins, LayoutGrid, Monitor, Signal, Wifi, WifiOff, FileText, Check, Lock, Code, FileCode } from 'lucide-react';
import { storage } from '../services/storage';
import { loadNeuralConfig, updateNeuralConfig } from '../services/aiCore';
import { View, ModelProvider, BrokerAccount } from '../types';
import { brokerService } from '../services/execution';
import { ManualModal } from './ManualModal'; 
import { useSamaritan } from '../contexts/SamaritanContext';

interface SystemCoreViewProps {
    onRefreshDb: () => Promise<void>;
    onNavigate: (view: View) => void;
}

export const SystemCoreView: React.FC<SystemCoreViewProps> = ({ onRefreshDb, onNavigate }) => {
    // CONTEXT
    const { bioLockEnabled, setBioLockEnabled } = useSamaritan();

    // BACKUP STATE
    const [includeKnowledge, setIncludeKnowledge] = useState(true);
    const [includeFiles, setIncludeFiles] = useState(true);
    const [includeAlerts, setIncludeAlerts] = useState(true);
    const [includeLogs, setIncludeLogs] = useState(true);
    const [includeJournal, setIncludeJournal] = useState(true); 
    const [includeEvolution, setIncludeEvolution] = useState(true); 
    const [includeBrokers, setIncludeBrokers] = useState(true);
    const [includeVectors, setIncludeVectors] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);

    // BROKER STATE
    const [accounts, setAccounts] = useState<BrokerAccount[]>([]);
    const [newAccount, setNewAccount] = useState<Partial<BrokerAccount>>({ type: 'PAPER', name: '', isLive: false });
    const [showAddBroker, setShowAddBroker] = useState(false);
    const [web3Enabled, setWeb3Enabled] = useState(false);

    // RESTORE STATE
    const [restoreMode, setRestoreMode] = useState<'MERGE' | 'OVERWRITE'>('MERGE');
    const [isRestoring, setIsRestoring] = useState(false);
    const [restoreFile, setRestoreFile] = useState<File | null>(null);
    const [statusMsg, setStatusMsg] = useState<string | null>(null);

    // HYDRA NEURAL BRIDGE STATE
    const [apiKeys, setApiKeys] = useState({ openai: '', anthropic: '', groq: '', xai: '', deepseek: '', gemini: '' });
    const [activeProvider, setActiveProvider] = useState<ModelProvider>('GEMINI');
    
    // TELEGRAM STATE
    const [telegramConfig, setTelegramConfig] = useState({ botToken: '', chatId: '' });

    // MANUAL STATE
    const [showManual, setShowManual] = useState(false);
    const [purgeDays, setPurgeDays] = useState(30);
    const [isPurging, setIsPurging] = useState(false);

    const fileInputRef = React.useRef<HTMLInputElement>(null);

    useEffect(() => {
        const config = loadNeuralConfig();
        setApiKeys({
            gemini: config.apiKeys.gemini || '',
            openai: config.apiKeys.openai || '',
            anthropic: config.apiKeys.anthropic || '',
            groq: config.apiKeys.groq || '',
            xai: config.apiKeys.xai || '',
            deepseek: config.apiKeys.deepseek || ''
        });
        setActiveProvider(config.activeProvider);

        // Load Telegram
        setTelegramConfig({
            botToken: localStorage.getItem('telegram_bot_token') || '',
            chatId: localStorage.getItem('telegram_chat_id') || ''
        });

        setAccounts(brokerService.getAccounts());
        setWeb3Enabled(brokerService.web3Enabled);
    }, []);

    const handleSaveKeys = () => {
        updateNeuralConfig({
            activeProvider,
            apiKeys: apiKeys
        });
        localStorage.setItem('telegram_bot_token', telegramConfig.botToken);
        localStorage.setItem('telegram_chat_id', telegramConfig.chatId);
        setStatusMsg("System Configuration Saved.");
        setTimeout(() => setStatusMsg(null), 2000);
    };

    const handleTestTelegram = async () => {
        if(!telegramConfig.botToken || !telegramConfig.chatId) return alert("Missing Telegram Config");
        try {
            await fetch(`https://api.telegram.org/bot${telegramConfig.botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: telegramConfig.chatId, text: "Samaritan System Test: Uplink Active." })
            });
            setStatusMsg("Telegram Test Sent.");
        } catch(e) { alert("Telegram Test Failed"); }
    };

    const handleAddBroker = async () => {
        if (!newAccount.name) return;
        const account: BrokerAccount = {
            id: Math.random().toString(36).substr(2, 9),
            name: newAccount.name,
            type: newAccount.type as any,
            isLive: newAccount.type !== 'PAPER',
            apiKey: newAccount.apiKey,
            apiSecret: newAccount.apiSecret
        };
        await brokerService.addAccount(account); 
        setAccounts(brokerService.getAccounts());
        setShowAddBroker(false);
    };

    const handleRemoveBroker = async (id: string) => {
        if (confirm("Remove this broker?")) {
            await brokerService.removeAccount(id);
            setAccounts(brokerService.getAccounts());
        }
    };

    const toggleAllBackup = (val: boolean) => {
        setIncludeKnowledge(val); setIncludeFiles(val); setIncludeAlerts(val);
        setIncludeLogs(val); setIncludeJournal(val); setIncludeEvolution(val);
        setIncludeBrokers(val); setIncludeVectors(val);
    };

    const handleGenerate = async () => {
        setIsGenerating(true);
        setStatusMsg("Aggregating Core Data...");
        try {
            const snapshot = await archivist.createSnapshot({ 
                includeKnowledge, includeFiles, includeAlerts, includeLogs, includeJournal, includeEvolution, includeBrokers, includeVectors 
            });
            const dataStr = JSON.stringify(snapshot, null, 2);
            const fileName = `SAMARITAN_CORE_${new Date().toISOString().split('T')[0]}.cortex`;
            const blob = new Blob([dataStr], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setStatusMsg("Export Complete.");
        } catch (e: any) { setStatusMsg(`Error: ${e.message}`); } 
        finally { setIsGenerating(false); setTimeout(() => setStatusMsg(null), 3000); }
    };

    const handleRestore = () => {
        if (!restoreFile) return;
        setIsRestoring(true);
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const snapshot = JSON.parse(e.target?.result as string);
                await archivist.restoreSnapshot(snapshot, restoreMode);
                await onRefreshDb();
                setStatusMsg("System Restore Successful.");
            } catch (err: any) { setStatusMsg(`Restore Failed: ${err.message}`); }
            finally { setIsRestoring(false); }
        };
        reader.readAsText(restoreFile);
    };

    const handlePurge = async () => {
        if (!confirm(`Purge data older than ${purgeDays} days?`)) return;
        setIsPurging(true);
        try {
            await storage.purgeSystemData(purgeDays, { alerts: true, logs: true, files: true, journal: false, evolution: false });
            setStatusMsg("Maintenance Complete.");
        } catch(e) { setStatusMsg("Purge Failed"); }
        finally { setIsPurging(false); }
    };

    return (
        <div className="flex flex-col h-full bg-[#000000] text-zinc-200 overflow-y-auto custom-scrollbar">
            {showManual && <ManualModal onClose={() => setShowManual(false)} />}

            {/* HEADER */}
            <div className="p-6 border-b border-white/5 bg-[#050505]/90 backdrop-blur-md sticky top-0 z-20 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <button onClick={() => onNavigate('TERMINAL')} className="text-zinc-500 hover:text-white"><ArrowLeft size={18} /></button>
                    <div>
                        <h2 className="text-lg font-bold text-white tracking-widest uppercase font-mono">System Core</h2>
                        <p className="text-[10px] text-zinc-500 font-mono uppercase">Neural Configuration & Archival</p>
                    </div>
                </div>
                <button onClick={() => setShowManual(true)} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-sm text-[10px] font-bold uppercase text-zinc-300 hover:text-white"><Book size={14} /> Manual</button>
            </div>

            <div className="flex-1 p-6 max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-8 pb-20">
                
                {/* PANEL 1: SECURITY (BIOMETRICS ONLY) */}
                <div className="bg-[#020202] border border-white/10 rounded-sm p-6 flex flex-col gap-6">
                    <div className="flex justify-between items-center">
                        <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-widest flex items-center gap-2"><Lock size={16} /> Security</h3>
                    </div>
                    
                    {/* BIO LOCK */}
                    <div className="flex items-center justify-between p-4 bg-black border border-white/10 rounded-sm hover:border-white/20 transition-all">
                        <div className="flex items-center gap-3">
                            <Fingerprint size={20} className={bioLockEnabled ? "text-emerald-500" : "text-zinc-600"} />
                            <div>
                                <div className="text-xs font-bold text-white uppercase tracking-wider">Biometric Interlock</div>
                                <div className="text-[10px] text-zinc-500 font-mono">Require authentication on system resume</div>
                            </div>
                        </div>
                        <button 
                            onClick={() => setBioLockEnabled(!bioLockEnabled)}
                            className={`w-10 h-5 rounded-full p-0.5 transition-colors ${bioLockEnabled ? 'bg-emerald-500' : 'bg-zinc-800'}`}
                        >
                            <div className={`w-4 h-4 bg-white rounded-full transition-transform shadow-md ${bioLockEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                    </div>
                </div>

                {/* PANEL 2: HYDRA */}
                <div className="bg-[#020202] border border-white/10 rounded-sm p-6 flex flex-col gap-6 relative overflow-hidden">
                    <div className="flex justify-between items-center">
                        <h3 className="text-sm font-bold text-secondary uppercase tracking-widest flex items-center gap-2"><Cpu size={16} /> Neural Bridge (Hydra)</h3>
                        <span className="text-[10px] text-zinc-500">{activeProvider} ACTIVE</span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                        {['GEMINI', 'OPENAI', 'ANTHROPIC', 'GROQ', 'XAI', 'DEEPSEEK'].map(p => (
                            <button key={p} onClick={() => setActiveProvider(p as ModelProvider)} className={`px-2 py-2 border rounded-sm text-[10px] font-mono flex justify-center items-center gap-1 ${activeProvider === p ? 'border-secondary text-secondary bg-secondary/10' : 'border-white/10 text-zinc-500'}`}>
                                {p} {activeProvider === p && <CheckCircle2 size={10} />}
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input type="password" value={apiKeys.gemini} onChange={e => setApiKeys({...apiKeys, gemini: e.target.value})} placeholder="Gemini API Key" className="bg-black border border-white/10 p-2 text-xs text-white rounded-sm font-mono" />
                        <input type="password" value={apiKeys.openai} onChange={e => setApiKeys({...apiKeys, openai: e.target.value})} placeholder="OpenAI API Key" className="bg-black border border-white/10 p-2 text-xs text-white rounded-sm font-mono" />
                        <input type="password" value={apiKeys.anthropic} onChange={e => setApiKeys({...apiKeys, anthropic: e.target.value})} placeholder="Anthropic API Key" className="bg-black border border-white/10 p-2 text-xs text-white rounded-sm font-mono" />
                        <input type="password" value={apiKeys.groq} onChange={e => setApiKeys({...apiKeys, groq: e.target.value})} placeholder="Groq API Key" className="bg-black border border-white/10 p-2 text-xs text-white rounded-sm font-mono" />
                        <input type="password" value={apiKeys.xai} onChange={e => setApiKeys({...apiKeys, xai: e.target.value})} placeholder="xAI (Grok) API Key" className="bg-black border border-white/10 p-2 text-xs text-white rounded-sm font-mono" />
                        <input type="password" value={apiKeys.deepseek} onChange={e => setApiKeys({...apiKeys, deepseek: e.target.value})} placeholder="DeepSeek API Key" className="bg-black border border-white/10 p-2 text-xs text-white rounded-sm font-mono" />
                    </div>
                </div>

                {/* PANEL 3: BROKERS */}
                <div className="bg-[#020202] border border-white/10 rounded-sm p-6 flex flex-col gap-6">
                    <div className="flex justify-between items-center">
                        <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-widest flex items-center gap-2"><Wallet size={16} /> Execution Gateways</h3>
                        <button onClick={() => setShowAddBroker(true)} className="p-1 bg-white/10 rounded-sm hover:text-white"><Plus size={14} /></button>
                    </div>
                    <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                        <div className="flex justify-between p-2 bg-white/5 rounded-sm">
                            <span className="text-xs text-zinc-400">Web3 / DeFi Wallet</span>
                            <div onClick={() => { brokerService.toggleWeb3(!web3Enabled); setWeb3Enabled(!web3Enabled); }} className={`w-8 h-4 rounded-full relative cursor-pointer ${web3Enabled ? 'bg-orange-500' : 'bg-zinc-700'}`}><div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${web3Enabled ? 'left-4.5' : 'left-0.5'}`}></div></div>
                        </div>
                        {accounts.map(acc => (
                            <div key={acc.id} className="flex justify-between p-2 bg-white/5 rounded-sm">
                                <span className="text-xs text-white">{acc.name} ({acc.type})</span>
                                <button onClick={() => handleRemoveBroker(acc.id)} className="text-zinc-600 hover:text-rose-500"><X size={12}/></button>
                            </div>
                        ))}
                    </div>
                    {showAddBroker && (
                        <div className="p-3 bg-black border border-white/10 rounded-sm space-y-2">
                            <input value={newAccount.name} onChange={e => setNewAccount({...newAccount, name: e.target.value})} placeholder="Broker Name" className="w-full bg-white/5 p-1 text-xs text-white border border-white/10" />
                            <div className="flex gap-2">
                                <select value={newAccount.type} onChange={e => setNewAccount({...newAccount, type: e.target.value as any})} className="bg-white/5 text-xs text-white border border-white/10"><option value="PAPER">Paper</option><option value="BINANCE">Binance</option></select>
                                <button onClick={handleAddBroker} className="flex-1 bg-emerald-500 text-black text-xs font-bold uppercase rounded-sm">Add</button>
                            </div>
                        </div>
                    )}
                </div>

                {/* PANEL 4: TELEGRAM UPLINK */}
                <div className="bg-[#020202] border border-white/10 rounded-sm p-6 flex flex-col gap-6">
                    <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-widest flex items-center gap-2"><Send size={16} /> Telegram Uplink</h3>
                    <div className="space-y-3">
                        <input value={telegramConfig.botToken} onChange={e => setTelegramConfig({...telegramConfig, botToken: e.target.value})} placeholder="Bot Token" className="w-full bg-black border border-white/10 p-2 text-xs text-white font-mono rounded-sm" />
                        <input value={telegramConfig.chatId} onChange={e => setTelegramConfig({...telegramConfig, chatId: e.target.value})} placeholder="Chat ID" className="w-full bg-black border border-white/10 p-2 text-xs text-white font-mono rounded-sm" />
                        <button onClick={handleTestTelegram} className="w-full py-2 bg-blue-500/10 border border-blue-500/30 text-blue-500 font-bold uppercase text-[10px] rounded-sm hover:bg-blue-500/20">Test Connection</button>
                    </div>
                </div>

                {/* PANEL 5: BACKUP & RESTORE PROTOCOLS */}
                <div className="col-span-1 lg:col-span-2 bg-[#020202] border border-white/10 rounded-sm p-6 flex flex-col gap-6">
                    <h3 className="text-sm font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-2"><HardDrive size={16} /> Backup & Restore Protocols</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* BACKUP */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <div className="text-[10px] font-bold text-zinc-500 uppercase">Export Manifest</div>
                                <button onClick={() => toggleAllBackup(true)} className="text-[8px] text-zinc-500 hover:text-white uppercase underline">Select All</button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer"><input type="checkbox" checked={includeKnowledge} onChange={e => setIncludeKnowledge(e.target.checked)} /> Knowledge Base</label>
                                <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer"><input type="checkbox" checked={includeFiles} onChange={e => setIncludeFiles(e.target.checked)} /> Stored Files</label>
                                <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer"><input type="checkbox" checked={includeJournal} onChange={e => setIncludeJournal(e.target.checked)} /> Trade Journal</label>
                                <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer"><input type="checkbox" checked={includeAlerts} onChange={e => setIncludeAlerts(e.target.checked)} /> System Alerts</label>
                                <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer"><input type="checkbox" checked={includeEvolution} onChange={e => setIncludeEvolution(e.target.checked)} /> Evolution Logs</label>
                                <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer"><input type="checkbox" checked={includeBrokers} onChange={e => setIncludeBrokers(e.target.checked)} /> Broker Configs</label>
                                <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer"><input type="checkbox" checked={includeVectors} onChange={e => setIncludeVectors(e.target.checked)} /> Neural Vectors</label>
                            </div>
                            <button 
                                onClick={handleGenerate} 
                                disabled={isGenerating} 
                                className="w-full py-3 bg-zinc-800 text-white font-bold uppercase text-xs rounded-sm hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2"
                            >
                                <Download size={14} />
                                {isGenerating ? "Archiving..." : "Download Core Dump (.cortex)"}
                            </button>
                        </div>
                        {/* RESTORE */}
                        <div className="space-y-4">
                            <div className="text-[10px] font-bold text-zinc-500 uppercase">System Restore</div>
                            <div className="flex gap-2 mb-2">
                                <button onClick={() => setRestoreMode('MERGE')} className={`flex-1 py-1 text-[9px] font-bold uppercase border rounded-sm ${restoreMode === 'MERGE' ? 'bg-white text-black border-white' : 'border-white/10 text-zinc-500'}`}>Merge</button>
                                <button onClick={() => setRestoreMode('OVERWRITE')} className={`flex-1 py-1 text-[9px] font-bold uppercase border rounded-sm ${restoreMode === 'OVERWRITE' ? 'bg-rose-500 text-white border-rose-500' : 'border-white/10 text-zinc-500'}`}>Wipe & Restore</button>
                            </div>
                            <div onClick={() => fileInputRef.current?.click()} className="w-full py-2 border border-dashed border-white/20 text-center text-[10px] text-zinc-500 cursor-pointer hover:border-white/40 rounded-sm">{restoreFile ? restoreFile.name : "Select .CORTEX File"}</div>
                            <input type="file" ref={fileInputRef} onChange={e => setRestoreFile(e.target.files?.[0] || null)} className="hidden" accept=".cortex,.json" />
                            <button 
                                onClick={handleRestore} 
                                disabled={!restoreFile || isRestoring} 
                                className="w-full py-3 bg-emerald-500 text-black font-bold uppercase text-xs rounded-sm hover:bg-emerald-400 transition-colors flex items-center justify-center gap-2"
                            >
                                <Upload size={14} />
                                {isRestoring ? "Restoring..." : "Execute Restore"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* PANEL 6: MAINTENANCE */}
                <div className="col-span-1 lg:col-span-2 bg-[#020202] border border-white/10 rounded-sm p-6 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                        <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-widest flex items-center gap-2"><RefreshCw size={16} /> Maintenance</h3>
                        <p className="text-[10px] text-zinc-500">Purge logs older than {purgeDays} days</p>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        <input type="number" value={purgeDays} onChange={e => setPurgeDays(parseInt(e.target.value))} className="w-16 bg-black border border-white/10 text-center text-xs text-white rounded-sm" />
                        <button onClick={handlePurge} disabled={isPurging} className="px-4 py-2 bg-rose-500/10 border border-rose-500/30 text-rose-500 font-bold uppercase text-xs rounded-sm hover:bg-rose-500/20">{isPurging ? "Purging..." : "Purge Data"}</button>
                        <button onClick={handleSaveKeys} className="px-6 py-2 bg-primary text-black font-bold uppercase text-xs rounded-sm shadow-glow hover:bg-primary/90 flex-1 md:flex-none">Save All Changes</button>
                    </div>
                </div>

            </div>
            {statusMsg && <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-zinc-900 border border-white/20 px-4 py-2 rounded-full text-xs font-mono text-white shadow-xl z-50 animate-in slide-in-from-bottom-2">{statusMsg}</div>}
        </div>
    );
};
