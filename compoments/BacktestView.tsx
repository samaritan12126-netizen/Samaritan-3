
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Upload, Play, Pause, Activity, BrainCircuit, 
  Settings, ChevronRight, ChevronLeft,
  FileText, TrendingUp, Target, AlertTriangle,
  Zap, Clock, ChevronDown, DollarSign,
  Workflow, List, Save, Table, PlusCircle, Sparkles,
  Hourglass, BarChart3, PieChart, Lock, Unlock,
  XCircle, Lightbulb, Globe, Database, Edit3, Sliders, ArrowLeft, MoveRight, CloudRain, RotateCcw,
  FastForward, Rewind, StopCircle, Calendar, Cpu, Check, Scale, ShieldCheck, Search, Eye, ThumbsUp, ThumbsDown, Layers, Trophy, X, Folder
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { CandleData, Message, Role, NeuralDB, Timeframe, BacktestConfig, BacktestMetrics, Trade, Strategy, StoredFile, GenesisMode, View, PatternMatch, Nugget, EvolutionLog } from '../types';
import { ChartContainer } from './ChartContainer';
import { MessageBubble } from './MessageBubble';
import { InputArea } from './InputArea';
import { ThinkingIndicator } from './ThinkingIndicator';
import { BacktestEngine } from '../services/backtestEngine';
import { sendMessageToGemini, analyzeBacktestData, generateStrategyFromData, generateTradeInsights, proveStrategy, analyzeMultiTimeframe, runDeepPatternSearch } from '../services/geminiService';
import { getTechnicalSummary } from '../services/indicators';
import { storage } from '../services/storage';
import { CustomSelect, DateTimePickerModal, MultiSelectDropdown } from './CustomUI'; 
import { notificationService } from '../services/notification'; 
import { audio } from '../services/audio';
import { detectTimeframe, resampleCandles } from '../services/marketData';
import { SeriesMarker, Time } from 'lightweight-charts';

// --- HELPERS ---
const generateDreamData = (config: { days: number, volatility: number, trend: number, blackSwanProb: number }): CandleData[] => {
    const data: CandleData[] = [];
    let price = 1000;
    const start = Math.floor(Date.now() / 1000) - (config.days * 86400);
    const steps = config.days * 24 * 4; 
    const dt = 1/252; 
    for (let i = 0; i < steps; i++) {
        const u1 = Math.random();
        const u2 = Math.random();
        const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
        let jump = 0;
        if (Math.random() < config.blackSwanProb) jump = (Math.random() - 0.5) * 0.2; 
        const drift = config.trend * dt;
        const diffusion = config.volatility * Math.sqrt(dt) * z;
        const ret = drift + diffusion + jump;
        const open = price;
        const close = price * Math.exp(ret);
        const high = Math.max(open, close) * (1 + Math.random() * config.volatility * 0.1);
        const low = Math.min(open, close) * (1 - Math.random() * config.volatility * 0.1);
        data.push({ time: start + (i * 900), open, high, low, close });
        price = close;
    }
    return data;
};

interface BacktestViewProps {
  db: NeuralDB;
  validationTarget?: Strategy;
  onNavigate: (view: View) => void;
}

interface OptimizationResult {
    slMult: number;
    tpMult: number;
    netProfit: number;
    winRate: number;
    trades: number;
}

const TIMEFRAMES: Timeframe[] = ['1m', '5m', '15m', '30m', '1H', '4H', '1D', '1W', '1M'];
const PLAYBACK_SPEEDS = [1, 2, 3, 5, 10, 100];

const tfValue = (tf: Timeframe): number => {
    switch(tf) {
        case '1m': return 1;
        case '5m': return 5;
        case '15m': return 15;
        case '30m': return 30;
        case '1H': return 60;
        case '4H': return 240;
        case '1D': return 1440;
        case '1W': return 10080;
        case '1M': return 43200;
        default: return 1;
    }
};

export const BacktestView: React.FC<BacktestViewProps> = ({ db, validationTarget, onNavigate }) => {
  // Data State
  const [baseData, setBaseData] = useState<CandleData[]>([]);
  const [displayData, setDisplayData] = useState<CandleData[]>([]); // Current slice being viewed
  const [filename, setFilename] = useState<string | null>(null);
  const [storedFiles, setStoredFiles] = useState<StoredFile[]>([]);
  
  // Timeframe Management
  const [baseTimeframe, setBaseTimeframe] = useState<Timeframe>('1m'); // Detected from CSV
  const [displayTimeframe, setDisplayTimeframe] = useState<Timeframe>('15m'); // User selected

  // Strategy Selection
  const [selectedStrategies, setSelectedStrategies] = useState<string[]>([]);

  // Engine State
  const [engine, setEngine] = useState<BacktestEngine | null>(null);
  const [config, setConfig] = useState<BacktestConfig>({
    initialBalance: 100000,
    leverage: 1,
    commission: 0.001,
    slippage: 0.5,
    useSyntheticTicks: true
  });
  
  // Playback State
  const [currentIndex, setCurrentIndex] = useState(0); // Index relative to BASE data
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1); 
  const [playbackIntervalMs, setPlaybackIntervalMs] = useState(100);

  // Analysis State
  const [metrics, setMetrics] = useState<BacktestMetrics | null>(null);
  const [tradeJournal, setTradeJournal] = useState<Trade[]>([]);
  // Extended autoTrades to include strategyId for filtering
  const [autoTrades, setAutoTrades] = useState<{ time: number, type: 'LONG'|'SHORT', reason: string, strategyName: string, strategyId: string }[]>([]);
  
  // UI State
  const [showGenesisModal, setShowGenesisModal] = useState(false);
  const [showOptimizer, setShowOptimizer] = useState(false);
  const [genesisMode, setGenesisMode] = useState<GenesisMode>('HYBRID');
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeTab, setActiveTab] = useState<'METRICS' | 'JOURNAL'>('METRICS');
  
  // --- OPTIMIZER STATE ---
  const [optResults, setOptResults] = useState<any[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optConfig, setOptConfig] = useState({ minSL: 1, maxSL: 3, minTP: 1, maxTP: 5, step: 0.5 });
  const [optProgress, setOptProgress] = useState(0);

  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false); 
  
  // --- DEEP SEARCH STATE ---
  const [showDeepSearch, setShowDeepSearch] = useState(false);
  const [deepSearchQuery, setDeepSearchQuery] = useState('');
  const [isDeepSearching, setIsDeepSearching] = useState(false);
  const [deepSearchMarkers, setDeepSearchMarkers] = useState<SeriesMarker<Time>[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<SeriesMarker<Time> | null>(null);
  const [deepSearchMatches, setDeepSearchMatches] = useState<PatternMatch[]>([]);
  const [auditFeedback, setAuditFeedback] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const playbackTimeoutRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- KB SEARCH HOOK ---
  const kbMatches = useMemo(() => {
      if (!deepSearchQuery || !db) return [];
      const q = deepSearchQuery.toLowerCase();
      
      const concepts = db.concepts.filter(c => c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)).map(c => ({ ...c, type: 'CONCEPT' }));
      const nuggets = db.nuggets.filter(n => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)).map(n => ({ ...n, name: n.title, description: n.content, type: 'NUGGET' }));
      const strats = db.strategies.filter(s => s.name.toLowerCase().includes(q) || s.content.toLowerCase().includes(q)).map(s => ({ ...s, description: s.content, type: 'STRATEGY' }));
      
      return [...concepts, ...nuggets, ...strats].slice(0, 5); // Limit to top 5
  }, [deepSearchQuery, db]);

  useEffect(() => {
     const loadFiles = async () => {
         const files = await storage.getFiles();
         setStoredFiles(files);
     };
     loadFiles();
     
     if (validationTarget) {
         setSelectedStrategies([validationTarget.id]);
     } else if (db && db.strategies) {
         setSelectedStrategies(db.strategies.map(s => s.id));
     }
  }, [db?.strategies, validationTarget]);

  // Handle Base Data Changes (New File Loaded)
  useEffect(() => {
      if (baseData.length > 0) {
          const detected = detectTimeframe(baseData);
          setBaseTimeframe(detected);
          
          // Default display to detected or higher
          setDisplayTimeframe(prev => tfValue(prev) < tfValue(detected) ? detected : prev);
          
          regenerateAllSignals(); // PRE-CALCULATE ALL SIGNALS
          
          initEngine();
          setCurrentIndex(100); // Start with some history
      }
  }, [baseData]);

  // Handle Resampling for Display
  useEffect(() => {
      if (baseData.length === 0) return;
      
      // Calculate the slice of base data up to current index
      const visibleBaseSlice = baseData.slice(0, currentIndex + 1);
      
      if (displayTimeframe === baseTimeframe) {
          setDisplayData(visibleBaseSlice);
      } else {
          // Check if valid resample (target >= base)
          if (tfValue(displayTimeframe) >= tfValue(baseTimeframe)) {
              const resampled = resampleCandles(visibleBaseSlice, displayTimeframe);
              setDisplayData(resampled);
          } else {
              setDisplayData(visibleBaseSlice);
          }
      }
  }, [baseData, currentIndex, displayTimeframe, baseTimeframe]);

  useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // REGENERATE SIGNALS FOR ALL STRATEGIES WHEN DATA LOADS
  const regenerateAllSignals = async () => {
      if (!baseData.length || !db.strategies) return;
      
      let allSignals: any[] = [];
      
      // We run proveStrategy for each strategy to get its specific signals on this data
      // For demo performance, we limit loop if too many strategies
      const strategiesToProcess = db.strategies.slice(0, 10); 
      
      for (const strat of strategiesToProcess) {
          const stratSignals = await proveStrategy(baseData, strat, 100);
          // Append strategyId to signals for filtering
          const taggedSignals = stratSignals.map(s => ({ ...s, strategyId: strat.id }));
          allSignals = [...allSignals, ...taggedSignals];
      }
      
      setAutoTrades(allSignals);
  };

  const initEngine = () => {
      const newEngine = new BacktestEngine(config);
      setEngine(newEngine);
      setMetrics(newEngine.calculateMetrics());
      setTradeJournal([]);
  };

  // RESTART ENGINE WHEN STRATEGY SELECTION CHANGES
  useEffect(() => {
      initEngine();
      setCurrentIndex(100); // Reset time
  }, [selectedStrategies]);

  useEffect(() => {
      if (isPlaying) {
          playbackTimeoutRef.current = setTimeout(() => {
              handleStep();
          }, playbackIntervalMs);
      }
      return () => clearTimeout(playbackTimeoutRef.current);
  }, [isPlaying, currentIndex, playbackIntervalMs, selectedStrategies]); // Add strategies as dep

  const handleStep = () => {
      if (!baseData || currentIndex >= baseData.length - 1) {
          setIsPlaying(false);
          return;
      }
      const nextIndex = Math.min(currentIndex + playbackSpeed, baseData.length - 1);
      const newCandles = baseData.slice(currentIndex, nextIndex + 1);
      
      if (engine) {
          newCandles.forEach(candle => {
              engine.processCandle(candle);
              
              // FILTER SIGNALS BY SELECTED STRATEGIES
              const activeSignals = autoTrades.filter(t => 
                  t.time === candle.time && selectedStrategies.includes(t.strategyId)
              );
              
              if (activeSignals.length > 0) {
                  // Execute all matching signals
                  activeSignals.forEach(signal => {
                      const price = candle.close;
                      const atr = (candle.high - candle.low) * 3;
                      // Use optimized values or defaults
                      const slMult = (optResults.length > 0) ? optResults[0].slMult : 1;
                      const tpMult = (optResults.length > 0) ? optResults[0].tpMult : 2;
                      
                      const sl = signal.type === 'LONG' ? price - (atr * slMult) : price + (atr * slMult);
                      const tp = signal.type === 'LONG' ? price + (atr * tpMult) : price - (atr * tpMult);
                      
                      engine.openTrade(candle, signal.type, sl, tp, 0.02, signal.strategyName);
                  });
              }
          });
          setMetrics(engine.calculateMetrics());
          setTradeJournal(engine.getTrades());
      }
      setCurrentIndex(nextIndex);
  };

  const handleDateJump = (timestamp: number) => {
      if (!baseData.length) return;
      let closestIdx = 0;
      let minDiff = Infinity;
      
      baseData.forEach((candle, idx) => {
          const diff = Math.abs(candle.time - timestamp);
          if (diff < minDiff) { minDiff = diff; closestIdx = idx; }
      });
      
      if (closestIdx < 100) closestIdx = 100;
      if (closestIdx >= baseData.length) closestIdx = baseData.length - 1;

      setCurrentIndex(closestIdx);
      initEngine(); // Reset trades on jump for clean state
      audio.play('SCAN');
  };

  // Improved CSV Parsing with Column Detection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFilename(file.name);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target?.result as string;
      const lines = text.split('\n');
      const parsedData: CandleData[] = [];
      const hasHeader = isNaN(Date.parse(lines[0].split(',')[0]));
      const startRow = hasHeader ? 1 : 0;
      
      // DETECT COLUMNS from first data row
      let hasTimeCol = false;
      let openIdx = 1;
      let highIdx = 2;
      let lowIdx = 3;
      let closeIdx = 4;

      if (lines.length > startRow) {
          const firstRow = lines[startRow].trim().split(',');
          if (firstRow[1] && firstRow[1].includes(':')) {
              hasTimeCol = true;
              openIdx = 2;
              highIdx = 3;
              lowIdx = 4;
              closeIdx = 5;
          }
      }

      for (let i = startRow; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const parts = line.split(',');
        
        if (parts.length >= closeIdx + 1) { // Ensure enough columns
            let dateStr = parts[0];
            if (hasTimeCol) {
                dateStr += ' ' + parts[1];
            }

            let time = NaN;

            // 1. Try ISO/Standard Date Parse
            const directParse = Date.parse(dateStr);
            if (!isNaN(directParse)) {
                time = directParse / 1000;
            } else {
                // 2. Handle Trading Platform Formats (e.g., 2023.10.27)
                const normalized = dateStr.replace(/\./g, '-').replace(/\//g, '-');
                const normParse = Date.parse(normalized);
                if (!isNaN(normParse)) {
                    time = normParse / 1000;
                } else {
                    // 3. Fallback: Compact YYYYMMDD
                    const num = parseFloat(parts[0]); // Only look at date part
                    if (!isNaN(num) && num > 19900101 && num < 20991231) { 
                        const s = num.toString();
                        const y = parseInt(s.substring(0,4));
                        const m = parseInt(s.substring(4,6)) - 1;
                        const d = parseInt(s.substring(6,8));
                        const t = hasTimeCol ? parts[1] : "00:00";
                        const constructed = new Date(y, m, d);
                        if (hasTimeCol) {
                            const [hh, mm] = t.split(':').map(Number);
                            constructed.setHours(hh || 0, mm || 0);
                        }
                        time = constructed.getTime() / 1000;
                    }
                }
            }

            // 4. Last Resort: Synthetic Time (for non-dated data)
            if (isNaN(time)) {
                if (!isNaN(parseFloat(parts[openIdx]))) {
                    time = 1577836800 + (i * 3600);
                }
            }

            if (!isNaN(time)) {
                const open = parseFloat(parts[openIdx]);
                const high = parseFloat(parts[highIdx]);
                const low = parseFloat(parts[lowIdx]);
                const close = parseFloat(parts[closeIdx]);
                
                if (!isNaN(close)) {
                    parsedData.push({ time, open, high, low, close });
                }
            }
        }
      }
      
      // Sort and Deduplicate
      parsedData.sort((a,b) => a.time - b.time);
      const uniqueData = [];
      if (parsedData.length > 0) {
          uniqueData.push(parsedData[0]);
          for(let k=1; k<parsedData.length; k++) {
              if (parsedData[k].time > parsedData[k-1].time) {
                  uniqueData.push(parsedData[k]);
              }
          }
      }

      if (uniqueData.length === 0) {
          alert("Failed to parse CSV data. Format required: Date,[Time],Open,High,Low,Close");
          return;
      }
      
      setBaseData(uniqueData);
      await storage.saveFile({ id: Math.random().toString(36).substr(2,9), name: file.name, data: uniqueData, timestamp: Date.now() });
      setStoredFiles(await storage.getFiles());
    };
    reader.readAsText(file);
  };

  const handleLoadStoredFile = (fileId: string) => {
      const file = storedFiles.find(f => f.id === fileId);
      if (file) { setBaseData(file.data); setFilename(file.name); }
  };

  const handleDream = () => {
      const data = generateDreamData({ days: 30, volatility: 0.5, trend: 0.1, blackSwanProb: 0.002 });
      setBaseData(data);
      setFilename("DREAM_SIMULATION_" + Math.floor(Math.random()*1000));
  };

  const handleRunOptimizer = async () => { setShowOptimizer(true); }; 

  const handleGenesisStrategy = async () => {
     setShowGenesisModal(false);
     if (baseData.length === 0) return;
     setMessages(prev => [...prev, { role: Role.MODEL, text: `🧬 **Genesis Protocol (${genesisMode}).** Analyzing...`, timestamp: Date.now(), isThinking: true }]);
     try {
        const strategy = await generateStrategyFromData(baseData, db, genesisMode);
        setMessages(prev => [...prev, { role: Role.MODEL, text: `## Strategy Acquired: ${strategy.name}\n${strategy.content}`, timestamp: Date.now() }]);
        
        await storage.saveStrategy(strategy); // Auto save
        await regenerateAllSignals(); // Re-scan with new strat
        setSelectedStrategies([strategy.id]); // Focus new strategy
        
        initEngine(); 
        setIsPlaying(true); 
        
        setMessages(prev => [...prev, { role: Role.MODEL, text: `**Simulation Linked.** Playback started.`, timestamp: Date.now() }]);

     } catch (e: any) {
        setMessages(prev => [...prev, { role: Role.MODEL, text: `Genesis Error: ${e.message}`, timestamp: Date.now() }]);
     }
  };

  const handleStartOptimization = async () => {
      if (!baseData.length) return;
      if (selectedStrategies.length === 0) {
          alert("Please select at least one strategy to optimize.");
          return;
      }

      setIsOptimizing(true);
      setOptResults([]);
      setOptProgress(0);

      // Generate Variations
      const variations: { sl: number, tp: number }[] = [];
      for (let sl = optConfig.minSL; sl <= optConfig.maxSL; sl += optConfig.step) {
          for (let tp = optConfig.minTP; tp <= optConfig.maxTP; tp += optConfig.step) {
              variations.push({ sl, tp });
          }
      }

      const total = variations.length;
      const results: any[] = [];
      const tradesToProcess = autoTrades.filter(t => selectedStrategies.includes(t.strategyId));

      // Use a timeout loop to prevent UI freezing (Main Thread Async Chunking)
      let i = 0;
      
      const processNext = async () => {
          const startTime = performance.now();
          while (i < total && performance.now() - startTime < 16) { // Process for ~16ms (1 frame)
              const v = variations[i];
              const optEngine = new BacktestEngine(config);
              
              // Optimization loop
              for (const candle of baseData) {
                  optEngine.processCandle(candle);
                  const matches = tradesToProcess.filter(t => t.time === candle.time);
                  for (const match of matches) {
                      const price = candle.close;
                      const atr = (candle.high - candle.low) * 3;
                      const stopDist = atr * v.sl;
                      const targetDist = atr * v.tp;
                      
                      const sl = match.type === 'LONG' ? price - stopDist : price + stopDist;
                      const tp = match.type === 'LONG' ? price + targetDist : price - targetDist;
                      
                      optEngine.openTrade(candle, match.type, sl, tp, 0.01, match.strategyName);
                  }
              }
              
              results.push({ slMult: v.sl, tpMult: v.tp, metrics: optEngine.calculateMetrics() });
              i++;
          }

          setOptProgress((i / total) * 100);

          if (i < total) {
              setTimeout(processNext, 0);
          } else {
              results.sort((a, b) => b.metrics.netProfit - a.metrics.netProfit);
              setOptResults(results);
              setIsOptimizing(false);
              audio.play('SUCCESS');
          }
      };

      setTimeout(processNext, 0);
  };

  const handleBacktestMTF = async () => {
      if (displayData.length < 50 || isLoadingAnalysis) return;
      setIsLoadingAnalysis(true);
      audio.play('SCAN');
      
      const activeStrats = db.strategies.filter(s => selectedStrategies.includes(s.id));
      const sliceTime = new Date(displayData[displayData.length-1].time * 1000).toLocaleString();
      setMessages(prev => [...prev, { role: Role.USER, text: `Analyzing historical structure @ ${sliceTime}. Protocol: ${activeStrats.map(s => s.name).join(', ')}`, timestamp: Date.now() }]);

      try {
          const analysis = await analyzeMultiTimeframe(filename || 'BACKTEST_ASSET', displayData, activeStrats);
          setMessages(prev => [...prev, { role: Role.MODEL, text: analysis, timestamp: Date.now() }]);
      } catch (e: any) {
          setMessages(prev => [...prev, { role: Role.MODEL, text: "Analysis Failed.", timestamp: Date.now() }]);
      } finally {
          setIsLoadingAnalysis(false);
      }
  };

  const handleBacktestSwarm = async () => {
      if (displayData.length < 50 || isLoadingAnalysis) return;
      setIsLoadingAnalysis(true);
      audio.play('BOOT');
      
      const activeStrats = db.strategies.filter(s => selectedStrategies.includes(s.id));
      const sliceTime = new Date(displayData[displayData.length-1].time * 1000).toLocaleString();
      setMessages(prev => [...prev, { role: Role.USER, text: `Summoning Council @ ${sliceTime}`, timestamp: Date.now() }]);

      try {
          const contextMsg = `Evaluate Historical Price Action @ ${sliceTime}. Close: ${displayData[displayData.length-1].close}. Active Protocols: ${activeStrats.map(s => s.name).join(', ')}`;
          const response = await sendMessageToGemini({
              message: contextMsg,
              history: messages,
              isThinkingMode: true,
              useSwarm: true 
          });
          setMessages(prev => [...prev, { role: Role.MODEL, text: response.text, timestamp: Date.now(), swarmVerdict: response.swarmVerdict }]);
      } catch (e: any) {
          setMessages(prev => [...prev, { role: Role.MODEL, text: "Council Error.", timestamp: Date.now() }]);
      } finally {
          setIsLoadingAnalysis(false);
      }
  };

  // --- DEEP PATTERN SEARCH ---
  const executeDeepSearch = async () => {
      if (baseData.length === 0 || !deepSearchQuery) return;
      setIsDeepSearching(true);
      setDeepSearchMatches([]);
      setDeepSearchMarkers([]);
      setShowDeepSearch(false);
      
      setMessages(prev => [...prev, { 
          role: Role.MODEL, 
          text: `🔍 **Deep Pattern Search Initiated.**\nPattern: "${deepSearchQuery}"\nScanning ${baseData.length} candles...`, 
          timestamp: Date.now(), 
          isThinking: true 
      }]);

      try {
          // Prepare MTF Data if needed (heuristic: if query mentions HTF/Trend/4H)
          let mtfData = undefined;
          if (deepSearchQuery.match(/4H|1H|Trend|HTF/i)) {
              // Resample base data to 4H
              mtfData = resampleCandles(baseData, '4H');
          }

          const matches = await runDeepPatternSearch(baseData, deepSearchQuery, mtfData);
          setDeepSearchMatches(matches);
          
          // Create Markers
          const markers: SeriesMarker<Time>[] = matches.map(m => ({
              time: m.time as Time,
              position: m.type === 'LONG' ? 'belowBar' : 'aboveBar',
              color: m.type === 'LONG' ? '#10b981' : '#f43f5e',
              shape: m.type === 'LONG' ? 'arrowUp' : 'arrowDown',
              text: `MATCH (${m.confidence}%)`,
              id: m.time.toString() // Custom ID for linking
          }));
          
          setDeepSearchMarkers(markers);
          
          setMessages(prev => [...prev, { 
              role: Role.MODEL, 
              text: `✅ **Scan Complete.** Found ${matches.length} instances. Check markers on chart.`, 
              timestamp: Date.now() 
          }]);

          // Jump to first match
          if (matches.length > 0) {
              handleDateJump(matches[0].time);
          }

      } catch (e: any) {
          setMessages(prev => [...prev, { role: Role.MODEL, text: e.message || `Deep Search Failed: ${e.message}`, timestamp: Date.now() }]);
      } finally {
          setIsDeepSearching(false);
      }
  };

  const handleMarkerClick = (marker: SeriesMarker<Time>) => {
      // Find the match data
      const match = deepSearchMatches.find(m => m.time === marker.time);
      if (match) {
          setSelectedMarker({ ...marker, text: match.reasoning } as any);
      }
  };

  const confirmMatch = async () => {
      if (!selectedMarker) return;
      const match = deepSearchMatches.find(m => m.time === selectedMarker.time as number);
      if (!match) return;

      const newNugget: Nugget = {
          id: Math.random().toString(36).substr(2, 9),
          title: `Verified: ${deepSearchQuery}`,
          content: `Pattern found at ${new Date(match.time * 1000).toLocaleString()}. \nReasoning: ${match.reasoning}`,
          conceptIds: [], // User can tag later
          timestamp: Date.now(),
          semanticTags: ['VERIFIED_PATTERN', match.type]
      };
      
      await storage.saveNugget(newNugget);
      audio.play('SUCCESS');
      setSelectedMarker(null);
      setMessages(prev => [...prev, { role: Role.MODEL, text: `Corrected. Validated pattern saved to Knowledge Base.`, timestamp: Date.now() }]);
  };

  const rejectMatch = async () => {
      if (!selectedMarker) return;
      if (!auditFeedback) {
          alert("Please provide a reason for rejection.");
          return;
      }

      const match = deepSearchMatches.find(m => m.time === selectedMarker.time as number);
      
      const log: EvolutionLog = {
          id: Math.random().toString(36).substr(2, 9),
          timestamp: Date.now(),
          insight: `AI Misidentified pattern: ${deepSearchQuery}`,
          trigger: 'USER_FEEDBACK',
          adaptation: `Improve pattern recognition. User Feedback: ${auditFeedback}. Context: ${match?.reasoning}`
      };
      
      await storage.saveEvolutionLog(log);
      audio.play('ERROR');
      setSelectedMarker(null);
      setAuditFeedback('');
      setMessages(prev => [...prev, { role: Role.MODEL, text: `Correction Logged. Evolution Memory Updated.`, timestamp: Date.now() }]);
  };

  // --- RENDER HELPERS ---
  const hasData = baseData.length > 0;

  const getColor = (type: string) => {
      if (type === 'CONCEPT') return 'bg-violet-500/10 text-violet-500 border border-violet-500/20';
      if (type === 'NUGGET') return 'bg-cyan-500/10 text-cyan-500 border border-cyan-500/20';
      return 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';
  }

  return (
    <div className="flex flex-col h-full bg-[#000000] text-zinc-200 relative overflow-hidden">
        
        {/* ... (Modals kept same) ... */}
        {selectedMarker && (
            <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in-95">
                <div className="bg-[#050505] border border-white/10 w-full max-w-md p-6 rounded-sm shadow-2xl relative">
                    <button onClick={() => setSelectedMarker(null)} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><XCircle size={20}/></button>
                    
                    <div className="flex items-center gap-2 mb-4">
                        <Search size={20} className="text-secondary" />
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest">Pattern Audit</h3>
                    </div>
                    
                    <div className="bg-white/5 p-4 rounded-sm border border-white/5 mb-6 max-h-40 overflow-y-auto custom-scrollbar">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2">AI Reasoning</span>
                        <p className="text-xs text-zinc-300 font-mono leading-relaxed">
                            {(selectedMarker as any).text}
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Feedback (If Rejecting)</label>
                            <input 
                                value={auditFeedback} 
                                onChange={e => setAuditFeedback(e.target.value)}
                                placeholder="Why is this wrong? (e.g. Wick too long)"
                                className="bg-black border border-white/10 p-2 text-xs text-white rounded-sm focus:border-rose-500/50 outline-none w-full"
                            />
                        </div>

                        <div className="flex gap-3">
                            <button 
                                onClick={rejectMatch} 
                                className="flex-1 py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 font-bold uppercase rounded-sm flex items-center justify-center gap-2 transition-all"
                            >
                                <ThumbsDown size={16} /> Reject
                            </button>
                            <button 
                                onClick={confirmMatch} 
                                className="flex-1 py-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 font-bold uppercase rounded-sm flex items-center justify-center gap-2 transition-all"
                            >
                                <ThumbsUp size={16} /> Confirm
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* DEEP SEARCH MODAL */}
        {showDeepSearch && (
            <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in-95">
                <div className="bg-[#050505] border border-white/10 w-full max-w-lg p-6 rounded-sm shadow-2xl relative">
                    <button onClick={() => setShowDeepSearch(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><XCircle size={20}/></button>
                    <div className="flex items-center gap-2 mb-6">
                        <Search size={20} className="text-secondary" />
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest">Neural Query / Deep Search</h3>
                    </div>
                    
                    <div className="space-y-4">
                        <textarea
                            value={deepSearchQuery}
                            onChange={(e) => setDeepSearchQuery(e.target.value)}
                            placeholder="Describe the pattern or query the knowledge base (e.g., 'Double bottom reversal' or 'What is an Order Block?')..."
                            className="w-full h-20 bg-black border border-white/10 p-4 text-sm text-zinc-300 focus:border-secondary/50 focus:outline-none rounded-sm resize-none font-mono"
                        />

                        {/* KB HITS */}
                        {kbMatches.length > 0 && (
                            <div className="max-h-40 overflow-y-auto custom-scrollbar border-t border-b border-white/5 py-2">
                                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 sticky top-0 bg-[#050505] py-1">Knowledge Base Hits</div>
                                <div className="flex flex-col gap-2">
                                    {kbMatches.map((item: any) => (
                                        <div key={item.id} className="bg-white/5 p-2 rounded-sm border border-white/5 flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[8px] font-bold px-1 rounded-sm uppercase ${getColor(item.type)}`}>{item.type}</span>
                                                <span className="text-xs font-bold text-zinc-300">{item.name}</span>
                                            </div>
                                            <div className="text-[10px] text-zinc-500 line-clamp-2 font-mono leading-tight">{item.description}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <button
                            onClick={executeDeepSearch}
                            disabled={!deepSearchQuery.trim()}
                            className="w-full py-3 bg-secondary hover:bg-secondary/80 text-white font-bold uppercase tracking-widest text-xs rounded-sm shadow-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            <Search size={14} /> Scan Chart for Pattern
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* HEADER - PERMANENT TOP BAR */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 border-b border-white/10 bg-[#050505] z-50 shrink-0 shadow-lg">
            <div className="flex items-center gap-4">
                <button onClick={() => onNavigate('TERMINAL')} className="text-zinc-500 hover:text-white transition-colors">
                    <ArrowLeft size={18} />
                </button>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-sm bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shadow-glow-sm">
                        <Activity size={20} className="text-purple-500" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white tracking-widest uppercase font-mono">Backtest Lab</h2>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-zinc-500 font-mono uppercase">{filename || 'NO_DATA_LOADED'}</span>
                            {baseTimeframe && <span className="text-[9px] bg-white/10 px-1 rounded text-zinc-400">{baseTimeframe} BASE</span>}
                        </div>
                    </div>
                </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar mask-fade-right max-w-full">
                <button 
                    onClick={handleBacktestMTF}
                    disabled={!hasData || isLoadingAnalysis}
                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-sm text-[10px] font-bold uppercase tracking-wider text-indigo-500 hover:text-indigo-400 transition-all whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                >
                    <BrainCircuit size={12} /> MTF Analysis
                </button>
                <button 
                    onClick={handleBacktestSwarm}
                    disabled={!hasData || isLoadingAnalysis}
                    className="flex items-center gap-2 px-3 py-1.5 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 rounded-sm text-[10px] font-bold uppercase tracking-wider text-violet-500 hover:text-violet-400 transition-all whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                >
                    <Scale size={12} /> Council Vote
                </button>
                
                {storedFiles.length > 0 && (
                    <div className="shrink-0">
                        <CustomSelect 
                            value="" 
                            onChange={handleLoadStoredFile} 
                            options={storedFiles.map(f => ({ value: f.id, label: f.name }))} 
                            placeholder="Load Recent"
                            className="w-32"
                            triggerClassName="bg-white/5 border border-white/10 text-[10px] font-bold uppercase text-zinc-400 hover:text-white px-2 py-1.5 rounded-sm outline-none w-full flex justify-between items-center"
                        />
                    </div>
                )}
                <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-sm text-[10px] font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition-all whitespace-nowrap shrink-0">
                    <Upload size={12} /> Load CSV
                </button>
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".csv" className="hidden" />
            </div>
        </div>

        {/* SCROLLABLE WRAPPER (Content Below Header) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col relative">
            
            {/* MAIN CONTENT AREA */}
            <div className="flex flex-col lg:flex-row flex-1 min-h-0">
                {/* LEFT: CHART (Fixed Min Height 450px) */}
                <div className="w-full lg:flex-1 bg-black relative flex flex-col min-h-[450px] border-b lg:border-b-0 lg:border-r border-white/10">
                    {hasData ? (
                        <ChartContainer 
                            pair={filename || 'SIMULATION'} 
                            timeframe={displayTimeframe} 
                            data={displayData} 
                            isSimulation={true} // Used for internal logic
                            watermarkText={filename?.includes('DREAM') ? 'SIMULATION FEED' : 'CSV DATA FEED'} // NEW PROP
                            markers={deepSearchMarkers}
                            onMarkerClick={handleMarkerClick}
                            onDateJump={handleDateJump}
                            datePickerPosition="bottom-left" 
                        />
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-zinc-700 gap-4">
                            <Upload size={48} className="opacity-20" />
                            <span className="text-xs font-mono uppercase tracking-widest opacity-50">Awaiting Time Series Data</span>
                        </div>
                    )}
                </div>

                {/* RIGHT: CONTROLS & METRICS */}
                <div className="w-full lg:w-[400px] bg-[#050505] flex flex-col shrink-0 border-l border-white/10">
                    
                    {/* UNIVERSAL STRATEGY SELECTOR CARD (SANDWICHED) */}
                    <div className="p-4 border-b border-white/10 bg-[#080808]">
                        <div className="bg-[#050505] border border-indigo-500/20 rounded-sm p-3 shadow-lg relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                            <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center gap-2 text-indigo-400">
                                    <Layers size={14} />
                                    <span className="text-[10px] font-bold uppercase tracking-widest">Active Strategy Protocols</span>
                                </div>
                                <span className="text-[9px] font-mono text-zinc-500">{selectedStrategies.length} / {db.strategies.length}</span>
                            </div>
                            
                            <div className="flex gap-2 mb-2">
                                <MultiSelectDropdown 
                                    label="Select Protocols"
                                    options={db.strategies.map(s => ({ value: s.id, label: s.name }))}
                                    selectedValues={selectedStrategies}
                                    onChange={setSelectedStrategies}
                                    className="flex-1 z-20"
                                />
                                <button 
                                    onClick={() => setSelectedStrategies(db.strategies.map(s => s.id))}
                                    className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 text-[9px] font-bold uppercase rounded-sm text-zinc-400 hover:text-white transition-colors"
                                >
                                    All
                                </button>
                                <button 
                                    onClick={() => setSelectedStrategies([])}
                                    className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 text-[9px] font-bold uppercase rounded-sm text-zinc-400 hover:text-white transition-colors"
                                >
                                    Clear
                                </button>
                            </div>

                            {/* Tag List */}
                            <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto custom-scrollbar">
                                {selectedStrategies.length === 0 && <span className="text-[9px] text-zinc-600 italic">No logic loaded. Engine dormant.</span>}
                                {selectedStrategies.map(id => {
                                    const s = db.strategies.find(st => st.id === id);
                                    return s ? (
                                        <span key={id} className="text-[8px] font-bold px-1.5 py-0.5 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-sm uppercase flex items-center gap-1">
                                            {s.name} <button onClick={() => setSelectedStrategies(prev => prev.filter(p => p !== id))} className="hover:text-white"><X size={8}/></button>
                                        </span>
                                    ) : null;
                                })}
                            </div>
                        </div>
                    </div>

                    {/* TABS */}
                    <div className="flex border-b border-white/10 shrink-0 bg-[#050505] z-10">
                        <button onClick={() => setActiveTab('METRICS')} className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider border-b-2 transition-all ${activeTab === 'METRICS' ? 'border-primary text-white bg-white/5' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}>Metrics</button>
                        <button onClick={() => setActiveTab('JOURNAL')} className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider border-b-2 transition-all ${activeTab === 'JOURNAL' ? 'border-primary text-white bg-white/5' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}>Journal</button>
                    </div>

                    <div className="flex-1 p-4 bg-black/50 min-h-[300px]">
                        {/* METRICS TAB */}
                        {activeTab === 'METRICS' && metrics && (
                            <div className="flex flex-col gap-4">
                                {selectedStrategies.length > 1 && (
                                    <div className="bg-gradient-to-r from-violet-500/10 to-indigo-500/10 border border-indigo-500/20 p-3 rounded-sm animate-in fade-in">
                                        <div className="flex items-center gap-2 mb-2 text-indigo-400 border-b border-indigo-500/20 pb-1">
                                            <Trophy size={14} />
                                            <span className="text-[10px] font-bold uppercase tracking-widest">Comparative Analytics</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-[9px] font-mono text-zinc-300">
                                            <div className="flex justify-between">
                                                <span>SQN Score:</span>
                                                <span className={metrics.sqn > 2 ? "text-emerald-500 font-bold" : "text-zinc-400"}>{metrics.sqn.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Correlation:</span>
                                                <span className="text-zinc-400">N/A (Beta)</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Avg Recovery:</span>
                                                <span className="text-zinc-400">{metrics.avgRecoveryTime.toFixed(1)} hrs</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>MAE/MFE:</span>
                                                <span className="text-zinc-400">{metrics.avgMae.toFixed(0)} / {metrics.avgMfe.toFixed(0)}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-black border border-white/10 p-3 rounded-sm">
                                        <span className="text-[9px] text-zinc-500 uppercase tracking-widest block mb-1">Net Profit</span>
                                        <div className={`text-xl font-mono font-bold ${metrics.netProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            ${metrics.netProfit.toFixed(2)}
                                        </div>
                                    </div>
                                    <div className="bg-black border border-white/10 p-3 rounded-sm">
                                        <span className="text-[9px] text-zinc-500 uppercase tracking-widest block mb-1">Win Rate</span>
                                        <div className="text-xl font-mono font-bold text-white">
                                            {metrics.winRate.toFixed(1)}%
                                        </div>
                                    </div>
                                    <div className="bg-black border border-white/10 p-3 rounded-sm">
                                        <span className="text-[9px] text-zinc-500 uppercase tracking-widest block mb-1">Drawdown</span>
                                        <div className="text-xl font-mono font-bold text-rose-500">
                                            {metrics.maxDrawdown.toFixed(2)}%
                                        </div>
                                    </div>
                                    <div className="bg-black border border-white/10 p-3 rounded-sm">
                                        <span className="text-[9px] text-zinc-500 uppercase tracking-widest block mb-1">Profit Factor</span>
                                        <div className="text-xl font-mono font-bold text-indigo-500">
                                            {metrics.profitFactor.toFixed(2)}
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-black border border-white/10 p-4 rounded-sm">
                                    <span className="text-[9px] text-zinc-500 uppercase tracking-widest block mb-3">Equity Curve</span>
                                    <div className="h-32 w-full">
                                        <ChartContainer pair="EQ" timeframe="1D" data={metrics.equityCurve} type="AREA" isDormant={false} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* JOURNAL TAB */}
                        {activeTab === 'JOURNAL' && (
                            <div className="flex flex-col gap-2">
                                {tradeJournal.length === 0 && <div className="text-center text-zinc-600 text-xs py-8">No trades executed yet.</div>}
                                {tradeJournal.slice().reverse().map((trade) => (
                                    <div key={trade.id} className="bg-black border border-white/5 p-3 rounded-sm flex items-center justify-between hover:border-white/10 transition-colors">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm ${trade.type === 'LONG' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>{trade.type}</span>
                                                <span className="text-[10px] text-zinc-400 font-mono">{new Date(trade.entryTime * 1000).toLocaleTimeString()}</span>
                                            </div>
                                            <div className="text-[9px] text-zinc-600 font-mono">{trade.setupOrigin}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className={`text-xs font-mono font-bold ${trade.pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}
                                            </div>
                                            <div className="text-[9px] text-zinc-600 font-mono">{trade.status}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* AI CHAT INTERFACE */}
                    <div className="h-[400px] shrink-0 border-t border-white/10 bg-[#080808] flex flex-col">
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-black/30">
                            {messages.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-zinc-700 opacity-50">
                                    <div className="relative mb-4">
                                        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse"></div>
                                        <BrainCircuit size={48} className="text-primary/50 relative z-10" />
                                    </div>
                                    <p className="text-xs font-mono uppercase tracking-widest text-zinc-500 animate-pulse">
                                        The Samaritan is awaiting your data
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {messages.map((msg, i) => <MessageBubble key={i} message={msg} />)}
                                    {isLoadingAnalysis && <ThinkingIndicator label="Processing Market Data..." />}
                                    {isDeepSearching && <ThinkingIndicator label="Deep Searching Historical Patterns..." />}
                                    <div ref={messagesEndRef} />
                                </>
                            )}
                        </div>
                        <div className="p-2 bg-[#050505] shrink-0 sticky bottom-0">
                            <InputArea 
                                onSend={(text) => setMessages(prev => [...prev, { role: Role.USER, text, timestamp: Date.now() }])}
                                isLoading={false}
                                isThinkingMode={false}
                                onToggleThinking={() => {}}
                                isVoiceActive={false}
                                isSpeaking={false}
                                onToggleVoice={() => {}}
                                marketSentiment={null}
                                onCheckOracle={() => {}}
                                onConfigureHydra={() => {}}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* ... (Footer and Modals same as before) ... */}
        {/* PERMANENT FOOTER (Outside Scroll Area) */}
        <div className="h-16 bg-[#050505] border-t border-white/10 flex items-center justify-between px-4 shrink-0 overflow-x-auto hide-scrollbar gap-6 z-40 relative shadow-[0_-5px_20px_rgba(0,0,0,0.5)]">
            
            {/* 1. PLAYBACK CONTROLS (SCRUBBER) */}
            <div className={`flex items-center gap-3 bg-black/50 p-2 rounded-sm border border-white/5 transition-opacity ${!hasData ? 'opacity-50 pointer-events-none' : ''}`}>
                <button onClick={() => setIsPlaying(!isPlaying)} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isPlaying ? 'bg-amber-500 text-black' : 'bg-emerald-500 text-black hover:bg-emerald-400'}`}>
                    {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                </button>
                <button onClick={handleStep} className="p-1.5 bg-white/5 hover:bg-white/10 rounded-full text-zinc-300 hover:text-white border border-white/5"><ChevronRight size={14} /></button>
                
                <div className="flex flex-col w-32 md:w-48 gap-1">
                    <input 
                        type="range" 
                        min="0" 
                        max={hasData ? baseData.length - 1 : 100} 
                        value={currentIndex} 
                        onChange={(e) => setCurrentIndex(parseInt(e.target.value))}
                        className="w-full accent-primary h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-[7px] font-mono text-zinc-500">
                        <span>{hasData ? new Date(baseData[currentIndex]?.time * 1000).toLocaleString() : '00:00'}</span>
                    </div>
                </div>
            </div>

            <div className={`flex items-center gap-4 transition-opacity ${!hasData ? 'opacity-50 pointer-events-none' : ''}`}>
                
                {/* 2. TIMEFRAME SELECTOR (Scrollable) */}
                <div className="flex flex-col gap-1">
                    <span className="text-[7px] font-bold text-zinc-600 uppercase tracking-widest ml-1">Timeframe</span>
                    <div className="flex items-center gap-1 bg-black/50 p-1 rounded-sm border border-white/5 overflow-x-auto max-w-[140px] hide-scrollbar mask-fade-right">
                        {TIMEFRAMES.map(tf => {
                            const disabled = tfValue(tf) < tfValue(baseTimeframe);
                            return (
                                <button
                                    key={tf}
                                    onClick={() => setDisplayTimeframe(tf)}
                                    disabled={disabled}
                                    className={`px-2 py-0.5 text-[9px] font-bold rounded-sm transition-all whitespace-nowrap shrink-0 ${displayTimeframe === tf ? 'bg-primary text-black' : disabled ? 'text-zinc-700 cursor-not-allowed' : 'text-zinc-400 hover:text-white hover:bg-white/10'}`}
                                >
                                    {tf}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* 3. SPEED SELECTOR (New) */}
                <div className="flex flex-col gap-1">
                    <span className="text-[7px] font-bold text-zinc-600 uppercase tracking-widest ml-1">Speed</span>
                    <div className="flex items-center gap-1 bg-black/50 p-1 rounded-sm border border-white/5">
                        {PLAYBACK_SPEEDS.map(speed => (
                            <button
                                key={speed}
                                onClick={() => setPlaybackSpeed(speed)}
                                className={`px-1.5 py-0.5 text-[9px] font-bold font-mono rounded-sm transition-all ${playbackSpeed === speed ? 'bg-secondary text-white' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
                            >
                                x{speed}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* 3. ACTION COMMAND CENTER */}
            <div className="flex items-center gap-2">
                <button onClick={handleDream} className="flex items-center gap-2 px-3 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-sm text-[10px] font-bold uppercase tracking-wider text-indigo-500 hover:text-indigo-400 transition-all whitespace-nowrap">
                    <CloudRain size={14} /> <span className="hidden md:inline">Dream Mode</span>
                </button>

                <button 
                    onClick={() => setShowDeepSearch(true)} 
                    disabled={!hasData}
                    className={`flex items-center gap-2 px-3 py-2 bg-secondary/10 hover:bg-secondary/20 border border-secondary/30 rounded-sm text-[10px] font-bold uppercase tracking-wider text-secondary hover:text-white transition-all whitespace-nowrap ${!hasData ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    <Search size={14} /> <span className="hidden md:inline">Deep Search</span>
                </button>

                <button 
                    onClick={() => setShowGenesisModal(true)} 
                    disabled={!hasData}
                    className={`flex items-center gap-2 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-sm text-[10px] font-bold uppercase tracking-wider text-emerald-500 hover:text-emerald-400 transition-all whitespace-nowrap ${!hasData ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    <Sparkles size={14} /> <span className="hidden md:inline">Genesis</span>
                </button>

                <button 
                    onClick={handleRunOptimizer} 
                    disabled={!hasData}
                    className={`flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-sm text-[10px] font-bold uppercase tracking-wider text-zinc-300 hover:text-white transition-all whitespace-nowrap ${!hasData ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    <Sliders size={14} /> <span className="hidden md:inline">Cascade</span>
                </button>
            </div>
        </div>

        {/* GENESIS MODAL */}
        {showGenesisModal && (
            <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-[#050505] border border-white/10 w-full max-w-md p-6 rounded-sm shadow-2xl relative">
                    <button onClick={() => setShowGenesisModal(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><XCircle size={20}/></button>
                    <div className="flex items-center gap-2 mb-6">
                        <Sparkles size={20} className="text-secondary" />
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest">Genesis Protocol</h3>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Synthesis Mode</label>
                            <div className="flex gap-2">
                                {['KB_ONLY', 'GLOBAL', 'HYBRID'].map(mode => (
                                    <button
                                        key={mode}
                                        onClick={() => setGenesisMode(mode as GenesisMode)}
                                        className={`flex-1 py-2 text-[9px] font-bold uppercase rounded-sm border transition-all ${genesisMode === mode ? 'bg-secondary/20 border-secondary text-white' : 'bg-transparent border-white/10 text-zinc-500 hover:text-white'}`}
                                    >
                                        {mode.replace('_', ' ')}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="bg-white/5 p-3 rounded-sm border border-white/5 text-[10px] text-zinc-400 font-mono leading-relaxed">
                            {genesisMode === 'KB_ONLY' && "Strictly uses your existing Knowledge Base nuggets to formulate a strategy."}
                            {genesisMode === 'GLOBAL' && "Ignores local bias. Scans global market theory for optimal fit."}
                            {genesisMode === 'HYBRID' && "Combines your documented edge with external quantitative models."}
                        </div>
                        <button 
                            onClick={handleGenesisStrategy}
                            className="w-full py-3 bg-secondary hover:bg-secondary/80 text-white font-bold uppercase tracking-widest text-xs rounded-sm shadow-glow transition-all"
                        >
                            Initiate Synthesis
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* CASCADE OPTIMIZER MODAL */}
        {showOptimizer && (
            <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-[#050505] border border-white/10 w-full max-w-2xl p-6 rounded-sm shadow-2xl relative flex flex-col max-h-[80vh]">
                    <button onClick={() => setShowOptimizer(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><XCircle size={20}/></button>
                    
                    <div className="flex items-center gap-2 mb-6 shrink-0">
                        <Sliders size={20} className="text-secondary" />
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest">Cascade Optimizer</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 shrink-0">
                        <div className="space-y-4">
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Stop Loss Range (ATR Mult)</label>
                                <div className="flex gap-2">
                                    <input type="number" value={optConfig.minSL} onChange={e => setOptConfig({...optConfig, minSL: parseFloat(e.target.value)})} className="w-full bg-black border border-white/10 px-3 py-2 text-xs text-white rounded-sm" placeholder="Min" />
                                    <input type="number" value={optConfig.maxSL} onChange={e => setOptConfig({...optConfig, maxSL: parseFloat(e.target.value)})} className="w-full bg-black border border-white/10 px-3 py-2 text-xs text-white rounded-sm" placeholder="Max" />
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Take Profit Range (ATR Mult)</label>
                                <div className="flex gap-2">
                                    <input type="number" value={optConfig.minTP} onChange={e => setOptConfig({...optConfig, minTP: parseFloat(e.target.value)})} className="w-full bg-black border border-white/10 px-3 py-2 text-xs text-white rounded-sm" placeholder="Min" />
                                    <input type="number" value={optConfig.maxTP} onChange={e => setOptConfig({...optConfig, maxTP: parseFloat(e.target.value)})} className="w-full bg-black border border-white/10 px-3 py-2 text-xs text-white rounded-sm" placeholder="Max" />
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Step Size</label>
                                <input type="number" value={optConfig.step} onChange={e => setOptConfig({...optConfig, step: parseFloat(e.target.value)})} className="w-full bg-black border border-white/10 px-3 py-2 text-xs text-white rounded-sm" placeholder="0.5" />
                            </div>
                        </div>

                        <div className="bg-white/5 border border-white/5 rounded-sm p-4 flex flex-col justify-center">
                            <div className="text-[10px] text-zinc-400 font-mono mb-2 uppercase text-center">Permutations</div>
                            <div className="text-3xl font-mono font-bold text-white text-center mb-4">
                                {Math.floor(((optConfig.maxSL - optConfig.minSL)/optConfig.step + 1) * ((optConfig.maxTP - optConfig.minTP)/optConfig.step + 1))}
                            </div>
                            <div className="text-[9px] text-zinc-500 text-center mb-2">Targets: {selectedStrategies.length} Strategy Protocols</div>
                            <button 
                                onClick={handleStartOptimization}
                                disabled={isOptimizing}
                                className="w-full py-3 bg-secondary hover:bg-secondary/90 text-white font-bold uppercase tracking-widest text-xs rounded-sm shadow-glow transition-all"
                            >
                                {isOptimizing ? 'Running Simulation...' : 'Initiate Cascade'}
                            </button>
                        </div>
                    </div>

                    {isOptimizing && (
                        <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden mb-4 shrink-0">
                            <div className="h-full bg-secondary transition-all duration-300" style={{ width: `${optProgress}%` }}></div>
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto custom-scrollbar bg-black/50 border border-white/5 rounded-sm">
                        {optResults.length === 0 ? (
                            <div className="flex items-center justify-center h-full text-zinc-600 text-xs font-mono">No results yet.</div>
                        ) : (
                            <div className="grid grid-cols-4 gap-1 p-2">
                                {optResults.map((res, i) => (
                                    <div 
                                        key={i} 
                                        className={`p-2 rounded-sm border flex flex-col items-center justify-center text-center cursor-pointer hover:scale-105 transition-transform ${res.metrics.netProfit > 0 ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-rose-500/10 border-rose-500/30'}`}
                                        title={`SL: ${res.slMult} | TP: ${res.tpMult}`}
                                    >
                                        <div className={`text-xs font-bold font-mono ${res.metrics.netProfit > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>${res.metrics.netProfit.toFixed(0)}</div>
                                        <div className="text-[8px] text-zinc-500 font-mono mt-1">SL:{res.slMult} TP:{res.tpMult}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}

    </div>
  );
};
