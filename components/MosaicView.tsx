
import React, { useState, useEffect } from 'react';
import { LiveTerminal } from './LiveTerminal';
import { NeuralDB, Alert, CurrencyPair, View, Timeframe } from '../types';
import { Grid, Maximize2, Minimize2, ArrowLeft, Layers, X, Settings } from 'lucide-react';
import { storage } from '../services/storage';
import { MultiSelectDropdown } from './CustomUI';

interface MosaicViewProps {
  db: NeuralDB;
  alerts: Alert[];
  onUpdateAlerts: (alerts: Alert[]) => void;
  onNavigate: (view: View) => void;
}

type GlobalTimeframe = Timeframe | 'CUSTOM';

export const MosaicView: React.FC<MosaicViewProps> = ({ db, alerts, onUpdateAlerts, onNavigate }) => {
  const [pairs, setPairs] = useState<CurrencyPair[]>([]);
  const [maximizedIndex, setMaximizedIndex] = useState<number | null>(null);
  const [isMosaicEnabled, setIsMosaicEnabled] = useState(true);
  const [mosaicLimit, setMosaicLimit] = useState(4);
  const [globalTimeframe, setGlobalTimeframe] = useState<GlobalTimeframe>('CUSTOM');
  const [globalStrategies, setGlobalStrategies] = useState<string[] | 'CUSTOM'>('CUSTOM');

  useEffect(() => {
      const savedConfig = localStorage.getItem('samaritan_mosaic_config');
      if (savedConfig) {
          const config = JSON.parse(savedConfig);
          setIsMosaicEnabled(config.enabled);
          setMosaicLimit(config.limit || 4);
      }
      const watchlist = storage.getWatchlist();
      setPairs(watchlist.length > 0 ? watchlist as CurrencyPair[] : ['BTCUSD', 'ETHUSD', 'EURUSD', 'XAUUSD']);
  }, [db.strategies]);

  if (!isMosaicEnabled) {
      return (
          <div className="flex flex-col items-center justify-center h-full bg-[#000000] text-center p-8">
              <div className="bg-[#050505] border border-white/10 p-8 rounded-sm shadow-2xl max-w-md w-full flex flex-col items-center gap-6">
                  <Grid size={32} className="text-zinc-600" />
                  <div>
                      <h2 className="text-xl font-bold text-white uppercase tracking-[0.2em]">Protocol Disabled</h2>
                      <p className="text-xs text-zinc-500 font-mono">Mosaic Interface Deactivated.</p>
                  </div>
                  <button onClick={() => onNavigate('SYSTEM_CORE')} className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-sm text-xs font-bold text-zinc-300 hover:text-white uppercase tracking-wider transition-all">
                      <Settings size={14} /> Go to System Core
                  </button>
              </div>
          </div>
      );
  }

  const visiblePairs = pairs.slice(0, mosaicLimit);

  return (
    <div className="flex flex-col h-full bg-[#000000]">
        <div className="h-14 bg-[#050505] border-b border-white/5 flex items-center justify-between px-4 shrink-0 z-20 sticky top-0 backdrop-blur-md gap-4">
             <div className="flex items-center gap-4 shrink-0">
                 <button onClick={() => onNavigate('TERMINAL')} className="text-zinc-500 hover:text-white transition-colors"><ArrowLeft size={16} /></button>
                 <div className="flex items-center gap-2">
                     <Grid size={14} className="text-secondary" />
                     <span className="text-xs font-bold text-white uppercase tracking-widest hidden md:inline">Mosaic Command</span>
                     <span className="text-[9px] font-mono text-zinc-600 bg-white/5 px-1.5 py-0.5 rounded-sm border border-white/5">{visiblePairs.length} / {mosaicLimit} ACTIVE</span>
                 </div>
             </div>
             
             <div className="flex items-center bg-black border border-white/10 rounded-sm p-0.5 overflow-x-auto hide-scrollbar mask-fade-right">
                 <button onClick={() => setGlobalTimeframe('CUSTOM')} className={`px-3 py-1 text-[9px] font-bold rounded-sm transition-all whitespace-nowrap border-r border-white/5 mr-1 ${globalTimeframe === 'CUSTOM' ? 'bg-secondary text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>CUSTOM</button>
                 {['1m','5m','15m','1H','4H','1D'].map((tf) => (
                     <button key={tf} onClick={() => setGlobalTimeframe(tf as Timeframe)} className={`px-2 py-1 text-[9px] font-bold rounded-sm transition-all whitespace-nowrap ${globalTimeframe === tf ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>{tf}</button>
                 ))}
             </div>

             <div className="flex items-center gap-2 shrink-0 mr-8 lg:mr-0"> 
                 <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest hidden lg:inline">Fleet Protocol:</span>
                 {globalStrategies === 'CUSTOM' ? (
                     <button onClick={() => setGlobalStrategies([])} className="flex items-center gap-2 px-3 py-1.5 bg-secondary/10 border border-secondary/30 rounded-sm text-[9px] font-bold text-secondary uppercase tracking-wider hover:bg-secondary/20 transition-all"><Layers size={10} /> Custom (Per Chart)</button>
                 ) : (
                     <div className="flex items-center gap-2">
                         <button onClick={() => setGlobalStrategies('CUSTOM')} className="p-1.5 hover:bg-white/10 text-zinc-500 rounded-sm transition-colors"><X size={12} /></button>
                         <MultiSelectDropdown label="Global Strategy" options={db.strategies.map(s => ({ value: s.id, label: s.name }))} selectedValues={globalStrategies as string[]} onChange={setGlobalStrategies} className="z-50" />
                     </div>
                 )}
             </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar bg-black p-1 md:p-2">
            {pairs.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-zinc-600">
                    <span className="text-xs font-mono mb-2">No assets in watchlist.</span>
                    <button onClick={() => onNavigate('MARKET_COMMAND')} className="text-[10px] text-primary hover:text-white font-bold uppercase underline">Configure Assets</button>
                </div>
            )}

            {maximizedIndex !== null ? (
                <div className="h-full w-full relative min-h-[600px]">
                     <button onClick={() => setMaximizedIndex(null)} className="absolute top-14 right-4 z-50 p-2 bg-black/80 hover:bg-secondary text-white rounded-sm border border-white/10 shadow-lg transition-colors"><Minimize2 size={16} /></button>
                     <LiveTerminal db={db} isVisible={true} alerts={alerts} onUpdateAlerts={onUpdateAlerts} key={`max-${maximizedIndex}`} onNavigate={onNavigate} defaultPair={pairs[maximizedIndex] as string} forcedTimeframe={globalTimeframe !== 'CUSTOM' ? globalTimeframe : undefined} activeStrategyIds={globalStrategies !== 'CUSTOM' ? globalStrategies : undefined} isDormant={false} />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pb-20">
                    {visiblePairs.map((pair, idx) => (
                        <div key={idx} className="relative border border-white/5 group min-h-[600px] bg-[#020202] flex flex-col">
                             <div className="absolute top-12 right-2 z-40 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 pointer-events-none md:pointer-events-auto">
                                 <button onClick={() => setMaximizedIndex(idx)} className="p-1.5 bg-black/50 hover:bg-secondary text-white rounded-sm border border-white/10 pointer-events-auto"><Maximize2 size={12} /></button>
                             </div>
                             <div className="w-full h-full text-[0.85em] flex-1 min-h-0">
                                 <LiveTerminal db={db} isVisible={true} alerts={alerts} onUpdateAlerts={onUpdateAlerts} key={`grid-${idx}`} isMosaic={true} onNavigate={onNavigate} defaultPair={pair as string} forcedTimeframe={globalTimeframe !== 'CUSTOM' ? globalTimeframe : undefined} activeStrategyIds={globalStrategies !== 'CUSTOM' ? globalStrategies : undefined} />
                             </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    </div>
  );
};
