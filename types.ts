
export type Timeframe = '1m' | '5m' | '15m' | '30m' | '1H' | '4H' | '1D' | '1W' | '1M';

export type CurrencyPair = 
  | 'USDJPY' | 'AUDUSD' | 'USDCHF' | 'EURUSD' 
  | 'GBPUSD' | 'GBPJPY' | 'NZDUSD' | 'EURJPY' 
  | 'EURGBP' | 'AUDJPY' | 'NZDCAD' | 'AUDNZD' 
  | 'USDCAD' | 'BTCUSD' | 'ETHUSD' | 'SOLUSD'
  | string; 

export interface CandleData {
  time: number; 
  open: number;
  high: number;
  low: number;
  close: number;
}

export type View = 'TERMINAL' | 'NEURAL' | 'KNOWLEDGE_BASE' | 'BACKTEST' | 'ALERTS' | 'MOSAIC' | 'JOURNAL' | 'SYSTEM_CORE' | 'MARKET_COMMAND' | 'CORTEX';

export interface AppState {
  currentView: View;
  selectedPair: CurrencyPair;
  selectedTimeframe: Timeframe;
  selectedDate: string; 
  isHistoricalMode: boolean;
  validationTarget?: Strategy; 
}

export enum Role {
  USER = 'user',
  MODEL = 'model',
}

export interface Message {
  role: Role;
  text: string;
  timestamp: number;
  isThinking?: boolean;
  sources?: { uri: string; title: string }[];
  attachment?: string; 
  swarmVerdict?: SwarmVerdict; 
  deepThoughtTrace?: { agent: string, thought: string }[]; 
}

export interface AgentOpinion {
    agent: 'RISK_MANAGER' | 'SPECULATOR' | 'MACRO_ANALYST';
    verdict: 'APPROVE' | 'REJECT' | 'CAUTION';
    confidence: number;
    reasoning: string;
}

export interface SwarmVerdict {
    id: string;
    timestamp: number;
    consensus: 'GO' | 'NO_GO' | 'WAIT';
    confidence: number;
    judgeReasoning: string;
    opinions: AgentOpinion[];
}

export interface SendMessageOptions {
  message: string;
  history: Message[];
  isThinkingMode: boolean;
  useGrounding?: boolean;
  image?: string; 
  performanceContext?: string; 
  evolutionContext?: string; 
  backtestContext?: {
      candles: CandleData[];
      signals: { time: number; type: 'LONG' | 'SHORT'; reason: string; strategyName: string }[];
      currentConfig: BacktestConfig;
  };
  useSwarm?: boolean; 
  useDeepThought?: boolean; 
}

export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'alert' | 'success';
}

export type ModelProvider = 'GEMINI' | 'OPENAI' | 'ANTHROPIC' | 'GROQ' | 'XAI' | 'DEEPSEEK';

export interface NeuralConfig {
    activeProvider: ModelProvider;
    apiKeys: {
        gemini?: string; 
        openai?: string;
        anthropic?: string;
        groq?: string;
        xai?: string;
        deepseek?: string;
    };
    models: {
        gemini: string;
        openai: string;
        anthropic: string;
        groq: string;
        xai: string;
        deepseek: string;
    }
}

export type BrokerType = 'PAPER' | 'BINANCE' | 'META_API';

export interface BrokerAccount {
    id: string;
    name: string; 
    type: BrokerType;
    apiKey?: string;
    apiSecret?: string;
    proxyUrl?: string; 
    isLive: boolean; 
    balance?: number;
}

export interface TradeRouting {
    asset: string;
    accountId: string; 
}

export interface JournalImage {
  id: string;
  data: string; 
  context: string; 
  caption?: string; 
  embedding?: number[]; 
}

export interface JournalExecution {
  id: string;
  type: 'ENTRY' | 'EXIT' | 'TP' | 'SL';
  price: number;
  size: number;
  time: number;
}

export interface JournalEntry {
  id: string;
  date: number; 
  pair: string;
  direction: 'LONG' | 'SHORT';
  status: 'WIN' | 'LOSS' | 'BE' | 'OPEN' | 'UNVERIFIED'; 
  
  origin: 'HUMAN' | 'SAMARITAN_AUTO' | 'SAMARITAN_SIGNAL' | 'SHADOW_CHALLENGER'; 

  entryPrice: number;
  exitPrice: number;
  stopLoss: number;
  takeProfit: number;
  size: number; 
  pnl: number; 
  rMultiple: number; 
  
  mae?: number; 
  mfe?: number; 
  
  leverage?: number;
  pipValue?: number;
  contractSize?: number;

  strategyId?: string; 
  strategyName: string;
  timeframe: Timeframe;
  session: 'ASIAN' | 'LONDON' | 'NY' | 'OFF';
  
  confidence: number; 
  emotion: 'ZEN' | 'FOMO' | 'REVENGE' | 'ANXIOUS' | 'CONFIDENT' | 'BORED';
  mistakes?: string[]; 
  setupType?: string; 
  
  images: JournalImage[]; 
  aiAnalysis?: string; 
  
  aiSetupMatch?: 'CORRECT' | 'WRONG'; 
  userCorrection?: string; 

  dailyGrade?: string; 
  notes?: string;
  tags: string[]; 
  executions?: JournalExecution[];
  
  embedding?: number[]; 
}

export interface EvolutionLog {
    id: string;
    timestamp: number;
    insight: string;
    trigger: 'BACKTEST' | 'LIVE_PERFORMANCE' | 'LOSS_STREAK' | 'USER_FEEDBACK';
    asset?: string;
    adaptation: string; 
    status?: 'ACTIVE' | 'ARCHIVED';
}

export interface Alert {
  id: string;
  timestamp: number;
  pair: string;
  type: 'BULLISH' | 'BEARISH';
  strategyName: string; 
  entryPrice: number;
  tp: number;
  sl: number;
  status: 'ACTIVE' | 'WIN' | 'LOSS' | 'IGNORED';
  exitPrice?: number;
  snapshot?: string; 
  rMultiple?: number; 
  manualOverride?: boolean; 
  notes?: string; 
}

export interface Concept {
  id: string;
  name: string;
  description: string;
  semanticTags?: string[]; 
  timestamp: number;
  embedding?: number[]; 
}

export interface Nugget {
  id: string;
  conceptIds: string[];
  title: string;
  content: string;
  imageData?: string;
  semanticTags?: string[]; 
  timestamp: number;
  embedding?: number[]; 
}

export interface StrategyVersion {
  version: number;
  timestamp: number;
  content: string;
  changeNote?: string;
}

export interface Strategy {
  id: string;
  name: string;
  content: string; 
  requiredTimeframes?: Timeframe[]; 
  isActive?: boolean;
  executionStatus: 'ACTIVE' | 'INCUBATION'; 
  timestamp: number;
  versions?: StrategyVersion[]; 
  tuningData?: string; 
  lastPerformance?: BacktestMetrics;
  embedding?: number[]; 
}

export interface StoredFile {
  id: string;
  name: string;
  data: CandleData[];
  timestamp: number;
  source?: string;
}

export interface NeuralDB {
  concepts: Concept[];
  nuggets: Nugget[];
  strategies: Strategy[];
}

export type GenesisMode = 'KB_ONLY' | 'GLOBAL' | 'HYBRID' | 'EVOLUTIONARY'; 

export interface GenesisConfig {
    mode: GenesisMode;
    targetExamples: number; 
}

export interface MarketPattern {
  id: string;
  name: string;
  type: 'bullish' | 'bearish' | 'neutral';
  confidence: number; 
  description: string;
  timestamp: number;
}

export interface PatternMatch {
    time: number;
    confidence: number;
    reasoning: string;
    type: 'LONG' | 'SHORT';
}

export interface ChartZone {
  id: string;
  label: string;
  type: 'supply' | 'demand' | 'gap' | 'liquidity';
  priceStart: number;
  priceEnd: number;
  timeStart: number;
  timeEnd?: number; 
  color?: string;
}

export interface ChartLine {
  id: string;
  label?: string;
  type: 'trend' | 'support' | 'resistance' | 'channel';
  x1: number; 
  y1: number; 
  x2: number; 
  y2: number; 
  color?: string;
}

export interface ScanResult {
  patterns: MarketPattern[];
  zones: ChartZone[]; 
  lines: ChartLine[]; 
  analysis: string;
  bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  biasConfidence: number; 
  orderFlow: {
    status: string;
    context: string;
    strength: number;
  };
  strategyName?: string; 
  timestamp: number;
  psychWarning?: {
      riskLevel: 'HIGH' | 'MED' | 'LOW';
      matchReason: string;
      relevantLogId?: string;
  };
}

export type SentinelStatus = 'IDLE' | 'SCANNING' | 'SNAPSHOT' | 'ANALYZING' | 'COOLDOWN';

export interface WatchlistAsset {
  symbol: CurrencyPair;
  status: SentinelStatus;
  lastScan: number;
  result?: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  confidence?: number;
}

export interface SentinelLog {
  id: string;
  timestamp: number;
  asset: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
}

export interface ExecutionOrder {
  symbol: string;
  type: 'MARKET_BUY' | 'MARKET_SELL' | 'LIMIT_BUY' | 'LIMIT_SELL';
  volume: number;
  sl?: number;
  tp?: number;
  setupType?: string;
  snapshot?: string; 
  isShadow?: boolean; 
}

export interface ExecutionPosition {
  id: string;
  symbol: string;
  type: 'LONG' | 'SHORT';
  entryPrice: number;
  volume: number;
  sl: number;
  tp: number;
  currentPrice: number;
  pnl: number;
  openTime: number;
  setupType?: string;
  snapshot?: string;
  isShadow?: boolean; 
}

export interface IExecutionAdapter {
  id: string; 
  name: string;
  type: BrokerType;
  isConnected: boolean;
  connect(): Promise<boolean>;
  disconnect(): Promise<void>;
  getBalance(): Promise<number>;
  getPositions(): Promise<ExecutionPosition[]>;
  placeOrder(order: ExecutionOrder): Promise<ExecutionPosition>;
  closePosition(id: string): Promise<boolean>;
  modifyPosition(id: string, sl: number, tp: number): Promise<boolean>;
  closeAllPositions?(): Promise<number>; 
}

export interface PreMortemData {
    pair: string;
    type: 'BUY' | 'SELL';
    riskAmount: number;
    riskPercent: number;
    accountBalance: number;
    winStreak: number;
    lossStreak: number;
    dailyLoss: number;
    maxDailyLoss: number;
    sentiment: 'ZEN' | 'TILT' | 'FOMO';
    isHighImpactNews: boolean;
}

export interface BacktestConfig {
  initialBalance: number;
  leverage: number;
  commission: number; 
  slippage: number; 
  useSyntheticTicks: boolean; 
}

export interface Trade {
  id: string;
  entryTime: number;
  exitTime?: number;
  type: 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice?: number;
  size: number;
  sl: number;
  tp: number;
  pnl: number;
  status: 'OPEN' | 'CLOSED_TP' | 'CLOSED_SL' | 'CLOSED_MANUAL';
  mae: number; 
  mfe: number; 
  drawdown: number; 
  killzone?: string; 
  pips?: number;
  riskReward?: number;
  setupOrigin?: string; 
  durationSeconds?: number; 
}

export interface BacktestMetrics {
  timestamp?: number; 
  totalTrades: number;
  winRate: number; 
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number; 
  maxDrawdownAbs: number; 
  expectancy: number; 
  netProfit: number;
  avgWin: number;
  avgLoss: number;
  avgRR: number; 
  avgPips: number; 
  consecutiveWins: number;
  consecutiveLosses: number;
  sqn: number; 
  equityCurve: { time: number; value: number }[];
  avgTradeDuration: number; 
  avgTimeToProfit: number; 
  avgTimeToLoss: number; 
  profitPerHour: number; 
  killzoneStats: Record<string, number>; 
  avgMae: number; // New
  avgMfe: number; // New
  avgRecoveryTime: number; // New: Avg hours to recover drawdown
}

export interface OracleInsight {
    id: string;
    timestamp: number;
    title: string;
    summary: string;
    impact: 'HIGH' | 'MED' | 'LOW';
    sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    assetsAffected: string[];
    sourceUrl?: string;
}
