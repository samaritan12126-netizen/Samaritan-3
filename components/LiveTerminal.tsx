
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChartContainer } from './ChartContainer';
import { MessageBubble } from './MessageBubble';
import { InputArea } from './InputArea';
import { ThinkingIndicator } from './ThinkingIndicator';
import { SentinelPanel } from './SentinelPanel';
import { PreMortemModal } from './PreMortemModal'; 
import { StealthOverlay } from './StealthOverlay'; 
import { OrderBookWidget } from './OrderBookWidget'; 
import { Timeframe, CurrencyPair, CandleData, ScanResult, Message, Role, NeuralDB, Alert, Trade, View, PreMortemData } from '../types';
import { fetchMarketData } from '../services/marketData'; 
import { dataHub } from '../services/dataHub'; 
import { scanMarketStructure, sendMessageToGemini, analyzeMultiTimeframe } from '../services/geminiService';
import { Scale, BrainCircuit, Ghost, Layers, ShieldCheck, Lock, Unlock, ArrowLeft, WifiOff, Activity, RotateCcw } from 'lucide-react';
import { useSentinel } from '../hooks/useSentinel';
import { useLiveSession } from '../hooks/useLiveSession';
import { brokerService } from '../services/execution';
import { CustomSelect, MultiSelectDropdown } from './CustomUI'; 
import { audio } from '../services/audio'; 
import { storage } from '../services/storage';
import { useSamaritan } from '../contexts/SamaritanContext';
import { oracle } from '../services/oracle';

interface LiveTerminalProps {
  db: NeuralDB;
  isVisible: boolean;
  alerts?: Alert[];
  onUpdateAlerts?: (alerts: Alert[]) => void;
  initialReplayContext?: { pair: string, timestamp: number } | null; 
  defaultPair?: string; 
  isMosaic?: boolean; 
  onNavigate: (view: View) => void; 
  activeStrategyIds?: string[]; 
  forcedTimeframe?: Timeframe; 
  isDormant?: boolean; 
}

const getCandleStartTime = (time: number, tf: Timeframe): number => {
    const seconds = {
        '1m': 60, '5m': 300, '15m': 900, '30m': 1800, '1H': 3600,
        '4H': 14400, '1D': 86400, '1W': 604800, '1M': 2592000
    }[tf] || 60;
    return Math.floor(time / seconds) * seconds;
};

const TIMEFRAMES: Timeframe[] = ['1m', '5m', '15m', '30m', '1H', '4H', '1D', '1W', '1M'];

export const LiveTerminal: React.FC<LiveTerminalProps> = ({ db, isVisible, alerts = [], onUpdateAlerts, initialReplayContext, defaultPair, isMosaic = false, onNavigate, activeStrategyIds, forcedTimeframe, isDormant = false }) => {
  const { shadowModeEnabled, toggleShadowMode } = useSamaritan();

  // STATE
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [selectedPair, setSelectedPair] = useState<CurrencyPair>((initialReplayContext?.pair || defaultPair || 'BTCUSD') as CurrencyPair);
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('15m');
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [htfCandles, setHtfCandles] = useState<CandleData[]>([]); 
  const [errorState, setErrorState] = useState<string | null>(null);
  const [isHistoricalView, setIsHistoricalView] = useState(false);
  
  const [selectedStrategies, setSelectedStrategies] = useState<string[]>([]);
  const [isSentinelPanelOpen, setIsSentinelPanelOpen] = useState(!isMosaic);
  const [isAssetLocked, setIsAssetLocked] = useState(false); 
  const [isOrderBookVisible, setIsOrderBookVisible] = useState(false); 
  const [isDataSaver, setIsDataSaver] = useState(false);

  // CHAT & AI STATE
  const [messages, setMessages] = useState<Message[]>([{ role: Role.MODEL, text: "The Samaritan is online.", timestamp: Date.now() }]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMode, setLoadingMode] = useState<'STANDARD' | 'MTF' | 'SWARM'>('STANDARD');
  const [pendingAttachment, setPendingAttachment] = useState<string | null>(null);
  const [preMortemData, setPreMortemData] = useState<PreMortemData | null>(null);
  
  // SENTINEL STATE
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanResult, setLastScanResult] = useState<ScanResult | null>(null);
  const [isStealthActive, setIsStealthActive] = useState(false);

  // VOICE
  const [voiceApiKey, setVoiceApiKey] = useState(process.env.API_KEY || '');
  const { isActive: isVoiceActive, isSpeaking, connect: connectVoice, disconnect: disconnectVoice } = useLiveSession(voiceApiKey, (text, role) => {
      setMessages(prev => [...prev, { role: role === 'user' ? Role.USER : Role.MODEL, text, timestamp: Date.now() }]);
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      const list = storage.getWatchlist();
      setWatchlist(list);
      const saver = localStorage.getItem('samaritan_data_saver');
      if (saver) setIsDataSaver(JSON.parse(saver));
  }, []);

  useEffect(() => {
      if (forcedTimeframe) setSelectedTimeframe(forcedTimeframe);
  }, [forcedTimeframe]);

  useEffect(() => {
      if (activeStrategyIds) {
          setSelectedStrategies(activeStrategyIds);
      } else {
          const activeIds = db.strategies.filter(s => s.executionStatus === 'ACTIVE').map(s => s.id);
          setSelectedStrategies(activeIds.length > 0 ? activeIds : db.strategies.map(s => s.id));
      }
  }, [db.strategies, activeStrategyIds]);

  const loadData = async (pair: string, tf: Timeframe, endTime?: number) => {
      setIsLoading(true);
      setErrorState(null);
      try {
          const { data } = await fetchMarketData(pair as CurrencyPair, tf, 300, endTime);
          const alignedData = data.map(c => ({ ...c, time: getCandleStartTime(c.time, tf) }));
          setCandles(alignedData);
          
          if (!isDataSaver && !endTime) {
              const htfTf = tf === '1m' ? '5m' : tf === '5m' ? '15m' : '4H';
              const { data: htf } = await fetchMarketData(pair as CurrencyPair, htfTf as Timeframe, 100);
              setHtfCandles(htf);
          }
      } catch (e: any) {
          setCandles([]);
          setErrorState(e.message || "DATA_UNAVAILABLE");
      } finally {
          setIsLoading(false);
      }
  };

  useEffect(() => { 
      if (!isHistoricalView) {
          loadData(selectedPair, selectedTimeframe); 
      }
  }, [selectedPair, selectedTimeframe, isDataSaver]);

  const { assets, logs, snapshotTrigger, lastSnapshotImage, processSnapshot } = useSentinel({
      onSwitchPair: (pair) => {
          if (!isAssetLocked) setSelectedPair(pair); 
      },
      onTriggerSnapshot: () => {},
      onAnalyze: async (pair, image) => {
          const activeStrats = db.strategies.filter(s => selectedStrategies.includes(s.id));
          const result = await scanMarketStructure(candles, pair, activeStrats, htfCandles, undefined, image || undefined);
          setLastScanResult(result);
          
          const hasPatterns = result.patterns.length > 0;
          const isHighConfidence = result.biasConfidence > 65;
          const isSignificant = hasPatterns || isHighConfidence;

          if (isSignificant) {
              const patternsText = hasPatterns ? `\nPatterns: ${result.patterns.map(p => p.name).join(', ')}` : '';
              const strategiesText = result.strategyName ? `\nStrategy Match: ${result.strategyName}` : '';
              
              setMessages(prev => [...prev, { 
                  role: Role.MODEL, 
                  text: `👁️ **SENTINEL SCAN [${pair}]**\nBias: ${result.bias} (${result.biasConfidence}%)${patternsText}${strategiesText}\n"${result.analysis.substring(0, 100)}..."`, 
                  timestamp: Date.now() 
              }]);
          }

          if (result.biasConfidence > 80 && result.strategyName) {
              const type = result.bias === 'BULLISH' ? 'MARKET_BUY' : 'MARKET_SELL';
              try {
                  const adapter = brokerService.getAdapterForAsset(pair);
                  await adapter.placeOrder({ symbol: pair, type, volume: 1, setupType: result.strategyName, snapshot: image || undefined });
                  audio.play('SUCCESS');
                  setMessages(prev => [...prev, { role: Role.MODEL, text: `⚡ **AUTO-EXECUTION**: ${type} on ${pair} via ${result.strategyName}`, timestamp: Date.now() }]);
              } catch(e) { console.error(e); }
          }
          return result;
      },
      isEnabled: isScanning,
      alerts: alerts,
      watchlistOverride: isAssetLocked ? [selectedPair] : watchlist, 
      scanIntervalOverride: isDataSaver ? 60000 : undefined
  });

  const handleDateJump = (timestamp: number) => {
      setIsHistoricalView(true);
      loadData(selectedPair, selectedTimeframe, timestamp);
      setMessages(prev => [...prev, { role: Role.MODEL, text: `Loaded historical context for ${new Date(timestamp * 1000).toLocaleString()}.`, timestamp: Date.now() }]);
  };

  const handleLiveReset = () => {
      setIsHistoricalView(false);
      loadData(selectedPair, selectedTimeframe);
      setMessages(prev => [...prev, { role: Role.MODEL, text: "Live feed re-established.", timestamp: Date.now() }]);
  };

  const handleCheckOracle = () => {
      audio.play('SCAN');
      const insights = oracle.getLatestInsights();
      
      if (insights.length === 0) {
          setMessages(prev => [...prev, { role: Role.MODEL, text: "Oracle: Initializing uplink...", timestamp: Date.now() }]);
          return;
      }

      const errorInsight = insights.find(i => i.id === 'error-state');
      if (errorInsight) {
           setMessages(prev => [...prev, { role: Role.MODEL, text: `⚠️ **ORACLE SYSTEM ALERT**\n${errorInsight.title}\n${errorInsight.summary}`, timestamp: Date.now() }]);
           return;
      }

      const formatted = insights.slice(0, 5).map(i => `• **${i.title}** (${i.sentiment})\n  _${i.summary}_`).join('\n\n');
      setMessages(prev => [...prev, { role: Role.MODEL, text: `**ORACLE MACRO FEED**\n\n${formatted}`, timestamp: Date.now() }]);
  };

  const handleMTF = async () => {
      setLoadingMode('MTF');
      setIsLoading(true);
      try {
          const analysis = await analyzeMultiTimeframe(selectedPair, candles, db.strategies.filter(s => selectedStrategies.includes(s.id)));
          setMessages(prev => [...prev, { role: Role.MODEL, text: analysis, timestamp: Date.now() }]);
      } catch (e) { setMessages(prev => [...prev, { role: Role.MODEL, text: "MTF Error", timestamp: Date.now() }]); }
      finally { setIsLoading(false); setLoadingMode('STANDARD'); }
  };

  const handleSwarm = async () => {
      setLoadingMode('SWARM');
      setIsLoading(true);
      try {
          const res = await sendMessageToGemini({ 
              message: `Evaluate ${selectedPair} price action.`, 
              history: messages, 
              isThinkingMode: true, 
              useSwarm: true 
          });
          setMessages(prev => [...prev, { role: Role.MODEL, text: res.text, swarmVerdict: res.swarmVerdict, timestamp: Date.now() }]);
      } catch (e) { setMessages(prev => [...prev, { role: Role.MODEL, text: "Swarm Error", timestamp: Date.now() }]); }
      finally { setIsLoading(false); setLoadingMode('STANDARD'); }
  };

  const handleSendMessage = async (text: string) => {
      setMessages(prev => [...prev, { role: Role.USER, text, timestamp: Date.now() }]);
      setIsLoading(true);
      try {
          const res = await sendMessageToGemini({ message: text, history: messages, isThinkingMode: false, image: pendingAttachment || undefined });
          setMessages(prev => [...prev, { role: Role.MODEL, text: res.text, timestamp: Date.now() }]);
          setPendingAttachment(null);
      } catch(e) { setMessages(prev => [...prev, { role: Role.MODEL, text: "Error", timestamp: Date.now() }]); }
      finally { setIsLoading(false); }
  };

  const toggleLock = () => {
      setIsAssetLocked(!isAssetLocked);
      audio.play(isAssetLocked ? 'CLICK' : 'LOCK');
  };

  const toggleVoice = () => {
      if (isVoiceActive) {
          disconnectVoice();
      } else {
          connectVoice();
      }
  };

  return (
    <div className={`flex flex-col relative ${isMosaic ? 'h-full bg-black overflow-hidden' : 'h-full overflow-y-auto bg-[#000000]'}`}>
        {isStealthActive && <StealthOverlay onUnlock={() => setIsStealthActive(false)} logs={[]} />}
        {preMortemData && <PreMortemModal data={preMortemData} onConfirm={() => setPreMortemData(null)} onCancel={() => setPreMortemData(null)} />}

        <div className="bg-[#050505] border-b border-white/5 flex flex-col gap-2 p-2 shrink-0 z-30 sticky top-0">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {!isMosaic && (
                        <button onClick={() => onNavigate('TERMINAL')} className="text-zinc-500 hover:text-white transition-colors">
                            <ArrowLeft size={16} />
                        </button>
                    )}
                    <div className="flex items-center gap-2">
                        <div className="bg-white/5 border border-white/10 px-2 py-1 rounded-sm flex items-center gap-2">
                            <CustomSelect 
                                value={selectedPair}
                                options={watchlist}
                                onChange={(p) => setSelectedPair(p as CurrencyPair)}
                                className="min-w-[100px]"
                                triggerClassName="bg-transparent text-sm font-bold font-mono text-white outline-none uppercase"
                            />
                        </div>
                        {errorState && <span className="text-[9px] text-rose-500 font-bold bg-rose-500/10 px-1 rounded animate-pulse">{errorState}</span>}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button onClick={handleMTF} disabled={isLoading} className="flex items-center gap-1.5 px-2 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-500 text-[9px] font-bold uppercase rounded-sm disabled:opacity-50">
                        <BrainCircuit size={12} /> <span className="hidden sm:inline">MTF</span>
                    </button>
                    <button onClick={handleSwarm} disabled={isLoading} className="flex items-center gap-1.5 px-2 py-1 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 text-violet-500 text-[9px] font-bold uppercase rounded-sm disabled:opacity-50">
                        <Scale size={12} /> <span className="hidden sm:inline">Swarm</span>
                    </button>
                    <div className="p-1.5 rounded-sm border transition-all cursor-pointer bg-transparent border-transparent text-zinc-500 hover:bg-white/5" onClick={toggleLock} title={isAssetLocked ? "Unlock" : "Lock"}>
                        {isAssetLocked ? <Lock size={14} className="text-emerald-500" /> : <Unlock size={14} />}
                    </div>
                    <button onClick={() => setIsOrderBookVisible(!isOrderBookVisible)} className={`p-1.5 rounded-sm border transition-all ${isOrderBookVisible ? 'bg-white/10 border-white/20 text-white' : 'bg-transparent border-transparent text-zinc-500'}`}>
                        <Layers size={14} />
                    </button>
                </div>
            </div>

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar mask-fade-right">
                    {TIMEFRAMES.map(tf => (
                        <button key={tf} onClick={() => setSelectedTimeframe(tf)} className={`px-2 py-0.5 text-[9px] font-bold rounded-sm transition-all whitespace-nowrap ${selectedTimeframe === tf ? 'bg-primary text-black' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}>
                            {tf}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-2">
                    {isHistoricalView && (
                        <button onClick={handleLiveReset} className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/20 text-amber-500 text-[9px] font-bold rounded-sm animate-pulse">
                            <RotateCcw size={10} /> LIVE REPLAY
                        </button>
                    )}
                    {!isMosaic && (
                        <button onClick={toggleShadowMode} className={`p-1 rounded-sm border transition-all ${shadowModeEnabled ? 'bg-purple-500/20 border-purple-500 text-purple-500' : 'bg-transparent border-transparent text-zinc-600'}`} title="Shadow Mode">
                            <Ghost size={12} />
                        </button>
                    )}
                    {isDataSaver && (
                        <div className="text-amber-500" title="Eco Mode">
                            <WifiOff size={12} />
                        </div>
                    )}
                </div>
            </div>
        </div>

        <div className={`relative w-full ${isMosaic ? 'flex-1 min-h-[300px]' : 'h-[60vh] min-h-[450px] shrink-0'}`}>
            <OrderBookWidget pair={selectedPair} visible={isOrderBookVisible} />
            {candles.length > 0 ? (
                <ChartContainer 
                    pair={selectedPair} 
                    timeframe={selectedTimeframe} 
                    data={candles} 
                    scanResult={lastScanResult} 
                    onSnapshot={(img) => { if(isScanning) processSnapshot(img); else setPendingAttachment(img); }} 
                    isDormant={isDormant} 
                    snapshotTrigger={snapshotTrigger}
                    onDateJump={handleDateJump}
                    onLiveReset={handleLiveReset}
                    datePickerPosition="top-right"
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-[#020202]">
                    <Activity size={48} className="text-zinc-800 animate-pulse" />
                </div>
            )}
        </div>

        <div className="shrink-0 bg-[#080808] border-t border-b border-white/5 flex items-center justify-between px-4 py-1.5 z-20 shadow-lg">
            <div className="flex items-center gap-2">
                <ShieldCheck size={12} className={selectedStrategies.length > 0 ? "text-emerald-500" : "text-zinc-600"} />
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest hidden md:inline">Active Protocols:</span>
                <div className={activeStrategyIds ? "pointer-events-none opacity-80" : ""}>
                    <MultiSelectDropdown label="Strategies" options={(db?.strategies || []).map(s => ({ value: s.id, label: s.name }))} selectedValues={selectedStrategies} onChange={setSelectedStrategies} className="z-50" />
                </div>
            </div>
        </div>

        {isSentinelPanelOpen && (
            <div className="border-t border-white/5 bg-[#020202] shrink-0">
                <SentinelPanel assets={assets} logs={logs} lastSnapshot={lastSnapshotImage} isEnabled={isScanning} onToggle={() => setIsScanning(!isScanning)} compact={isMosaic} onEnableStealth={() => setIsStealthActive(true)} isLocked={isAssetLocked} />
            </div>
        )}

        <div className={`bg-[#000000] border-t border-white/10 flex flex-col ${isMosaic ? 'h-[250px] shrink-0' : 'flex-1 min-h-[300px]'}`}>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-black/50">
                {messages.map((msg, i) => <MessageBubble key={i} message={msg} />)}
                {isLoading && <ThinkingIndicator isSwarm={loadingMode === 'SWARM'} label={loadingMode === 'MTF' ? "MTF Analysis" : loadingMode === 'SWARM' ? "Swarm Consensus" : "Processing"} />}
                <div ref={messagesEndRef} />
            </div>
            <div className="bg-[#050505] p-2 sticky bottom-0 z-20">
                <InputArea 
                    onSend={handleSendMessage} 
                    isLoading={isLoading} 
                    isThinkingMode={false} 
                    onToggleThinking={() => {}} 
                    attachment={pendingAttachment} 
                    onClearAttachment={() => setPendingAttachment(null)} 
                    isVoiceActive={isVoiceActive} 
                    isSpeaking={isSpeaking} 
                    onToggleVoice={toggleVoice} 
                    marketSentiment={null} 
                    onCheckOracle={handleCheckOracle} 
                    onConfigureHydra={() => onNavigate('SYSTEM_CORE')} 
                    onCommand={() => {}} 
                />
            </div>
        </div>
    </div>
  );
};
