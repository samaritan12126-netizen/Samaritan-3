
import React, { useState, useEffect } from 'react';
import { 
  Menu, X, Activity, Terminal, Database, Grid, Download, BookOpen, Server, Search, Radio, Fingerprint, ShieldCheck, BrainCircuit, AlertTriangle
} from 'lucide-react';
import { NeuralNetwork } from './components/NeuralNetwork'; 
import { KnowledgeBase } from './components/KnowledgeBase';
import { BacktestView } from './components/BacktestView'; 
import { LiveTerminal } from './components/LiveTerminal';
import { AlertsView } from './components/AlertsView';
import { MosaicView } from './components/MosaicView';
import { SystemCoreView } from './components/SystemCoreView'; 
import { JournalView } from './components/JournalView'; 
import { MarketCommand } from './components/MarketCommand'; 
import { CortexView } from './components/CortexView'; 
import { CommandPalette } from './components/CommandPalette';
import { BootSequence } from './components/BootSequence'; 
import { AppState, NeuralDB, Alert, Strategy, View } from './types';
import { storage } from './services/storage';
import { audio } from './services/audio'; 
import { oracle } from './services/oracle';
import { SamaritanProvider, useSamaritan } from './contexts/SamaritanContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { brokerService } from './services/execution'; 

const BiometricLockScreen = () => {
    const { unlockBio } = useSamaritan();
    const [isScanning, setIsScanning] = useState(false);
    const [scanProgress, setScanProgress] = useState(0);
    const [status, setStatus] = useState("LOCKED");

    const handleUnlock = () => {
        if (isScanning) return;
        setIsScanning(true);
        setStatus("SCANNING BIOMETRICS...");
        audio.play('SCAN');
        let progress = 0;
        const interval = setInterval(() => {
            progress += 5;
            setScanProgress(progress);
            if (progress >= 100) {
                clearInterval(interval);
                setStatus("IDENTITY VERIFIED");
                audio.play('SUCCESS');
                setTimeout(() => { unlockBio(); }, 500);
            }
        }, 50);
    };
    
    return (
        <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center gap-8 animate-in fade-in duration-500">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,157,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,157,0.03)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20 pointer-events-none"></div>
            <div className="flex flex-col items-center gap-2 z-10">
                <ShieldCheck size={48} className="text-emerald-900 animate-pulse" />
                <h1 className="text-2xl font-bold text-zinc-500 tracking-[0.3em] uppercase">System Locked</h1>
            </div>
            <div className="relative group cursor-pointer" onClick={handleUnlock}>
                <div className={`absolute inset-0 rounded-full border-2 ${isScanning ? 'border-emerald-500 animate-ping' : 'border-zinc-800'}`}></div>
                <button className={`w-32 h-32 rounded-full bg-black border-4 flex items-center justify-center transition-all duration-300 relative overflow-hidden ${isScanning ? 'border-emerald-500' : 'border-zinc-800'}`}>
                    <Fingerprint size={64} className={`transition-all duration-500 ${isScanning ? 'text-emerald-500 scale-110' : 'text-zinc-700'}`} />
                </button>
            </div>
            <div className="flex flex-col items-center gap-2 h-10 z-10">
                <div className={`text-xs font-mono font-bold uppercase tracking-widest ${isScanning ? 'text-emerald-400 animate-pulse' : 'text-zinc-600'}`}>{status}</div>
                {isScanning && <div className="w-48 h-1 bg-zinc-900 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 transition-all duration-75" style={{ width: `${scanProgress}%` }}></div></div>}
            </div>
        </div>
    );
};

const AppContent: React.FC = () => {
  const [state, setState] = useState<AppState>({ currentView: 'TERMINAL', selectedPair: 'BTCUSD', selectedTimeframe: '15m', selectedDate: new Date().toISOString().split('T')[0], isHistoricalMode: false });
  const { isBioLocked } = useSamaritan();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false); 
  const [db, setDb] = useState<NeuralDB>({ concepts: [], nuggets: [], strategies: [] });
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isDbReady, setIsDbReady] = useState(false);
  const [isBooting, setIsBooting] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [replayContext, setReplayContext] = useState<{ pair: string, timestamp: number } | null>(null);

  useEffect(() => {
    const initDb = async () => {
      await storage.init();
      await brokerService.init(); 
      oracle.start(); 
      
      const loadedDb = await storage.loadNeuralDB();
      setDb(loadedDb);
      const savedAlerts = localStorage.getItem('gemini_alerts_v1');
      if (savedAlerts) setAlerts(JSON.parse(savedAlerts));
      setIsDbReady(true);
    };
    initDb();
    
    return () => oracle.stop();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setIsCommandPaletteOpen(prev => !prev); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handler = (e: any) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
  };

  const refreshDb = async () => { setDb(await storage.loadNeuralDB()); };
  const handleNavigate = (view: View) => { setState(s => ({ ...s, currentView: view })); };
  const handleValidateStrategy = (strategy: Strategy) => { setState(s => ({ ...s, currentView: 'BACKTEST', validationTarget: strategy })); };
  const handleCommandAction = (action: string, payload?: any) => { if (action === 'OPEN_MANUAL') window.dispatchEvent(new Event('OPEN_MANUAL')); };
  
  const handleReplay = (pair: string, timestamp: number) => {
     setReplayContext({ pair, timestamp });
     setState(s => ({ ...s, currentView: 'TERMINAL' }));
  };

  const handleUpdateAlert = (updatedAlert: Alert) => {
     setAlerts(prev => prev.map(a => a.id === updatedAlert.id ? updatedAlert : a));
  };

  const SidebarItem = ({ view, icon: Icon, label }: { view: any, icon: any, label: string }) => (
    <button onClick={() => { setState(s => ({...s, currentView: view})); setIsDrawerOpen(false); }} className={`w-full text-left px-4 py-3 flex items-center gap-3 rounded-sm transition-all ${state.currentView === view ? 'bg-primary/10 text-primary border-r-2 border-primary' : 'hover:bg-white/5 text-zinc-400'}`}>
      <Icon size={16} />
      <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
    </button>
  );

  if (isBooting) return <BootSequence onComplete={() => setIsBooting(false)} />;
  if (!isDbReady) return <div className="h-screen bg-black text-white flex items-center justify-center font-mono animate-pulse">INITIALIZING CORTEX DB...</div>;

  return (
    <div className="flex flex-col h-screen bg-[#000000] text-zinc-100 font-sans relative">
      {isBioLocked && <BiometricLockScreen />}
      <div className="absolute inset-0 z-0 pointer-events-none" style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)`, backgroundSize: '40px 40px' }}></div>
      
      <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} onNavigate={handleNavigate} onAction={handleCommandAction} />

      <header className="h-14 flex-shrink-0 flex items-center justify-between px-4 border-b border-white/5 bg-[#000000]/80 backdrop-blur-xl z-40 sticky top-0 relative">
        <div className="flex items-center gap-3 z-50">
          <button onClick={() => setIsDrawerOpen(true)} className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors"><Menu size={20} /></button>
        </div>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
          <div className="flex items-center gap-2.5 px-4 py-1.5 bg-white/5 border border-white/10 rounded-sm backdrop-blur-sm">
             <BrainCircuit size={16} className="text-primary animate-pulse shadow-glow-sm" />
             <span className="text-sm font-bold font-mono text-zinc-100 tracking-[0.2em] uppercase text-shadow-sm whitespace-nowrap">THE SAMARITAN</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <button onClick={() => { setIsCommandPaletteOpen(true); }} className="p-2 text-zinc-400 hover:text-white bg-white/5 border border-white/10 rounded-sm"><Search size={18} /></button>
        </div>
      </header>
      
      {isDrawerOpen && <div className="fixed inset-0 z-[140] bg-black/80 backdrop-blur-sm" onClick={() => setIsDrawerOpen(false)} />}
      <div className={`fixed inset-y-0 left-0 z-[150] w-64 bg-[#050505] border-r border-white/5 transform transition-transform duration-300 ease-out shadow-2xl flex flex-col ${isDrawerOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="p-4 border-b border-white/5 flex justify-between items-center">
             <h2 className="text-xs font-bold uppercase tracking-widest text-white">System Menu</h2>
             <button onClick={() => setIsDrawerOpen(false)}><X size={16} className="text-zinc-500" /></button>
          </div>
          <div className="py-2 flex-1 overflow-y-auto">
             <div className="mb-2">
                 <div className="px-4 py-2 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Operations</div>
                 <SidebarItem view="TERMINAL" icon={Terminal} label="Live Terminal" />
                 <SidebarItem view="MARKET_COMMAND" icon={Radio} label="Market Command" />
                 <SidebarItem view="MOSAIC" icon={Grid} label="Mosaic Command" />
                 <SidebarItem view="ALERTS" icon={AlertTriangle} label="Alert Logs" />
             </div>
             <div className="mb-2 border-t border-white/5 pt-2">
                 <div className="px-4 py-2 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Intelligence</div>
                 <SidebarItem view="CORTEX" icon={BrainCircuit} label="Cortex HQ" />
                 <SidebarItem view="BACKTEST" icon={Activity} label="Backtest Lab" />
                 <SidebarItem view="NEURAL" icon={BrainCircuit} label="Neural Training" />
                 <SidebarItem view="KNOWLEDGE_BASE" icon={Database} label="Knowledge Base" />
             </div>
             <div className="mb-2 border-t border-white/5 pt-2">
                 <div className="px-4 py-2 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">System</div>
                 <SidebarItem view="JOURNAL" icon={BookOpen} label="Trading Journal" />
                 <SidebarItem view="SYSTEM_CORE" icon={Server} label="System Core" />
             </div>
          </div>
          {deferredPrompt && (
              <div className="p-4 border-t border-white/5">
                 <button 
                   onClick={handleInstallClick}
                   className="w-full flex items-center gap-3 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-sm hover:bg-emerald-500/20 transition-all animate-pulse"
                 >
                    <Download size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider">Install App</span>
                 </button>
              </div>
          )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar relative flex flex-col">
        {state.currentView === 'TERMINAL' ? (
           <LiveTerminal db={db} isVisible={state.currentView === 'TERMINAL'} alerts={alerts} onUpdateAlerts={setAlerts} initialReplayContext={replayContext} onNavigate={handleNavigate} />
        ) : state.currentView === 'MARKET_COMMAND' ? ( 
           <MarketCommand onNavigate={handleNavigate} />
        ) : state.currentView === 'MOSAIC' ? (
           <MosaicView db={db} alerts={alerts} onUpdateAlerts={setAlerts} onNavigate={handleNavigate} />
        ) : state.currentView === 'ALERTS' ? (
            <AlertsView alerts={alerts} strategies={db.strategies} onNavigate={handleNavigate} onReplay={handleReplay} onUpdateAlert={handleUpdateAlert} />
        ) : state.currentView === 'BACKTEST' ? (
           <BacktestView db={db} validationTarget={state.validationTarget} onNavigate={handleNavigate} />
        ) : state.currentView === 'NEURAL' ? (
           <div className="h-full"><NeuralNetwork db={db} onRefreshDb={refreshDb} onNavigate={handleNavigate} /></div>
        ) : state.currentView === 'JOURNAL' ? (
           <JournalView onNavigate={handleNavigate} />
        ) : state.currentView === 'CORTEX' ? (
           <CortexView db={db} onNavigate={handleNavigate} />
        ) : state.currentView === 'SYSTEM_CORE' ? (
           <SystemCoreView onRefreshDb={refreshDb} onNavigate={handleNavigate} />
        ) : (
           <KnowledgeBase db={db} onRefreshDb={refreshDb} onValidate={(strategy) => handleValidateStrategy(strategy)} onNavigate={handleNavigate} />
        )}
      </div>
    </div>
  );
};

export const Root: React.FC = () => {
    return (
        <ErrorBoundary>
            <SamaritanProvider>
                <AppContent />
            </SamaritanProvider>
        </ErrorBoundary>
    );
}
