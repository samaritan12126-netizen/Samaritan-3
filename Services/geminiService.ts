
import { 
  CandleData, 
  Strategy, 
  ScanResult, 
  NeuralDB, 
  Message, 
  Role, 
  SendMessageOptions,
  BacktestMetrics,
  GenesisMode,
  Trade,
  JournalEntry,
  JournalImage,
  SwarmVerdict,
  Concept,
  PatternMatch
} from '../types';
import { storage } from './storage';
import { getTechnicalSummary } from './indicators';
import { oracle } from './oracle';
import { vectorDb } from './vectorDb';
import { 
    hydraRoute, 
    extractJson, 
    extractJsonArray, 
    formatError, 
    GEMINI_MODEL_FAST, 
    GEMINI_MODEL_REASONING,
    loadNeuralConfig
} from './aiCore';

// Re-export specific helpers used elsewhere if needed, though they should import from aiCore ideally
export { loadNeuralConfig, updateNeuralConfig, generateEmbedding } from './aiCore';

// --- SYSTEM TYPE DEFINITIONS FOR CONTEXT ---
const SYSTEM_TYPES_CONTEXT = `
export type Timeframe = '1m' | '5m' | '15m' | '30m' | '1H' | '4H' | '1D' | '1W' | '1M';
export type CurrencyPair = string;
export interface CandleData { time: number; open: number; high: number; low: number; close: number; }
export interface Strategy { id: string; name: string; content: string; isActive?: boolean; executionStatus: 'ACTIVE'|'INCUBATION'; }
export interface Alert { id: string; timestamp: number; pair: string; type: 'BULLISH'|'BEARISH'; strategyName: string; entryPrice: number; tp: number; sl: number; status: 'ACTIVE'|'WIN'|'LOSS'|'IGNORED'; exitPrice?: number; rMultiple?: number; }
export interface JournalEntry { id: string; date: number; pair: string; direction: 'LONG'|'SHORT'; status: 'WIN'|'LOSS'|'BE'; entryPrice: number; exitPrice: number; size: number; pnl: number; rMultiple: number; strategyName: string; origin: string; }
export interface NeuralDB { concepts: any[]; nuggets: any[]; strategies: Strategy[]; }
`;

// --- EXPORTED FUNCTIONS ---

const assembleOmniContext = async (): Promise<string> => {
    try {
        const db = await storage.loadNeuralDB();
        const evolutionLogs = await storage.getEvolutionLogs();
        const activeStrategies = db.strategies.filter(s => s.executionStatus === 'ACTIVE');

        let context = `[SYSTEM IDENTITY: THE SAMARITAN]\n`;
        context += `You are an advanced algorithmic trading intelligence. Your goal is profit through precision and risk management.\n`;
        context += `OPERATIONAL TIMEZONE: America/New_York (EST/EDT). All time references, market sessions (Asian, London, NY), and analysis must align with New York time.\n`;
        
        if (activeStrategies.length > 0) {
            context += `\n>>> ACTIVE PROTOCOLS (STRATEGIES) <<<\n${activeStrategies.map(s => `[${s.name}]: ${s.content}`).join('\n')}\n`;
        }
        
        if (evolutionLogs.length > 0) {
            const recentLessons = evolutionLogs.sort((a,b) => b.timestamp - a.timestamp).slice(0, 5);
            context += `\n>>> EVOLUTIONARY MEMORY (ADAPTATIONS) <<<\n${recentLessons.map(l => `- OBSERVED: ${l.insight} -> ADAPTATION: ${l.adaptation}`).join('\n')}\n`;
        }
        
        return context;
    } catch (e) {
        return "";
    }
};

export const queryKnowledgeBase = async (query: string, db: NeuralDB): Promise<string> => {
    try {
        // 1. Perform Vector Search to find relevant shards
        const relevantDocs = await vectorDb.search(query, 5);
        
        let context = "";
        
        if (relevantDocs.length > 0) {
            context = `RELEVANT KNOWLEDGE SHARDS (RAG):\n${relevantDocs.map(d => `- [${d.score.toFixed(2)}] ${d.item.text}`).join('\n')}`;
        } else {
            // Fallback to basic DB structure if vector db is empty/miss
            context = JSON.stringify({
                concepts: db.concepts.map(c => ({ name: c.name, desc: c.description })),
                nuggets: db.nuggets.slice(0, 5).map(n => ({ title: n.title, content: n.content })), // Limit to save tokens
                strategies: db.strategies.map(s => ({ name: s.name, content: s.content }))
            });
        }

        const prompt = `
            ROLE: KNOWLEDGE BASE ARCHIVIST.
            TASK: Answer the user's query strictly based on the provided Knowledge Base data.
            
            RETRIEVED CONTEXT:
            ${context}
            
            USER QUERY: "${query}"
            
            INSTRUCTIONS:
            1. Search the provided context for the answer.
            2. Cite specific items if found (e.g. "Found in Strategy 'London Breakout'").
            3. If the information is missing, say "No record found in Cortex."
            
            OUTPUT: Concise, helpful response formatted in Markdown.
        `;

        return await hydraRoute(prompt, []);
    } catch (e: any) {
        return `Query Error: ${e.message}`;
    }
};

export const parseTradeLogFromVoice = async (transcript: string): Promise<Partial<JournalEntry>> => {
    try {
        const prompt = `
            TASK: Extract trade data from unstructured voice dictation.
            INPUT: "${transcript}"
            
            OUTPUT JSON: {
                "pair": "string (e.g. BTCUSD)",
                "direction": "LONG|SHORT",
                "entryPrice": number,
                "exitPrice": number (optional),
                "emotion": "ZEN|FOMO|REVENGE|ANXIOUS|CONFIDENT|BORED",
                "notes": "string (cleaned up notes)",
                "pnl": number (optional),
                "status": "WIN|LOSS|OPEN"
            }
        `;
        
        const response = await hydraRoute(prompt, [], undefined, true);
        return JSON.parse(extractJson(response));
    } catch (e) {
        console.error("Voice parse failed", e);
        return {};
    }
};

export const proposeConceptMergeName = async (c1: Concept, c2: Concept, feedback?: string): Promise<string> => {
    try {
        const prompt = `
            TASK: Merge two trading concepts into a single, unified name.
            CONCEPT 1: ${c1.name} - ${c1.description}
            CONCEPT 2: ${c2.name} - ${c2.description}
            
            ${feedback ? `USER FEEDBACK ON PREVIOUS ATTEMPT: "${feedback}". Please adjust accordingly.` : ''}
            
            OUTPUT JSON: { "name": "Unified Name" }
        `;
        const response = await hydraRoute(prompt, [], undefined, true);
        return JSON.parse(extractJson(response)).name;
    } catch (e) {
        return "MERGE_FAILED";
    }
};

export const proposeConceptMergeDescription = async (c1: Concept, c2: Concept, newName: string, feedback?: string): Promise<string> => {
    try {
        const prompt = `
            TASK: Write a unified description for the new concept "${newName}".
            Combine the essence of both source concepts.
            
            SOURCE 1: ${c1.description}
            SOURCE 2: ${c2.description}
            
            ${feedback ? `USER FEEDBACK ON PREVIOUS ATTEMPT: "${feedback}". Adjust tone/content.` : ''}
            
            OUTPUT JSON: { "description": "Concise, technical definition..." }
        `;
        const response = await hydraRoute(prompt, [], undefined, true);
        return JSON.parse(extractJson(response)).description;
    } catch (e) {
        return "Description generation failed.";
    }
};

export const analyzeMultiTimeframe = async (
    pair: string, 
    currentData: CandleData[], 
    strategies: Strategy[],
    htfData?: Record<string, CandleData[]>
): Promise<string> => {
    try {
        const omniContext = await assembleOmniContext();
        const oracleData = await oracle.getContextForAsset(pair);
        
        const activeStrategy = strategies.find(s => s.isActive) || strategies[0];
        const requiredTfs = activeStrategy?.requiredTimeframes || ['15m', '1H', '4H'];
        
        let mtfContext = "";
        if (htfData) {
            Object.entries(htfData).forEach(([tf, data]) => {
                const recent = data.slice(-5);
                mtfContext += `\n[${tf} TIMEFRAME LAST 5 CANDLES]: ${JSON.stringify(recent)}`;
            });
        }

        const currentTfData = currentData.slice(-20);

        const prompt = `
            ${omniContext}
            TASK: Perform Multi-Timeframe Analysis on ${pair}.
            STRATEGY CONTEXT: ${activeStrategy?.name || 'Pure Price Action'}
            REQUIRED TIMEFRAMES: ${requiredTfs.join(', ')}
            
            MACRO CONTEXT:
            ${oracleData}
            
            CURRENT TIMEFRAME DATA (Recent):
            ${JSON.stringify(currentTfData)}
            
            HTF CONTEXT:
            ${mtfContext || "HTF Data unavailable, extrapolate from current trend."}
            
            INSTRUCTIONS:
            1. Analyze alignment or divergence between timeframes.
            2. Identify key HTF levels (Support/Resistance) impacting current price.
            3. Determine if the current setup aligns with the HTF trend.
            
            OUTPUT: Concise, bulleted technical breakdown.
        `;

        return await hydraRoute(prompt, []);
    } catch (e: any) {
        return formatError(e);
    }
};

const assessRelevanceLocal = (techSummary: string, strategies: Strategy[]): boolean => {
    if (strategies.length === 0) return true; 

    const summaryLower = techSummary.toLowerCase();
    let score = 0;
    
    for (const strat of strategies) {
        const content = strat.content.toLowerCase();
        if (content.includes('rsi') && summaryLower.includes('rsi')) score++;
        if (content.includes('ema') && summaryLower.includes('ema')) score++;
        if (content.includes('bollinger') && summaryLower.includes('bollinger')) score++;
        if (content.includes('trend') && summaryLower.includes('trend')) score++;
        
        if (content.includes('volatile') && (summaryLower.includes('squeeze') || summaryLower.includes('flat'))) score -= 2;
    }

    const rsiMatch = summaryLower.match(/rsi.*?(\d+\.\d+)/);
    if (rsiMatch) {
        const rsiVal = parseFloat(rsiMatch[1]);
        const strategiesWantRange = strategies.some(s => s.content.toLowerCase().includes('range') || s.content.toLowerCase().includes('consolidation'));
        
        if (rsiVal > 40 && rsiVal < 60 && !strategiesWantRange) {
            console.log("Neural Gate: Market too neutral (RSI 40-60) and no range strategy active. Skipping.");
            return false;
        }
    }

    return true; 
};

export const scanMarketStructure = async (
  candles: CandleData[], 
  pair: string, 
  strategies: Strategy[],
  htfCandles?: CandleData[],
  htfTimeframe?: string,
  image?: string 
): Promise<ScanResult> => {
  try {
    const recentData = candles.slice(-100); 
    const lastCandle = recentData[recentData.length - 1];
    const technicalStats = getTechnicalSummary(candles);
    
    const isRelevant = assessRelevanceLocal(technicalStats, strategies);
    
    if (!isRelevant) {
        return {
            patterns: [], zones: [], lines: [],
            analysis: "Neural Gate: Scan Aborted. Market conditions do not match active strategy parameters (Low Relevance).",
            bias: "NEUTRAL",
            biasConfidence: 0,
            orderFlow: { status: "IDLE", context: "GATE_CLOSED", strength: 0 },
            timestamp: Date.now()
        };
    }

    const omniContext = await assembleOmniContext();
    const oracleData = await oracle.getContextForAsset(pair);
    
    const evolutionLogs = await storage.getEvolutionLogs();
    const lossLogs = evolutionLogs.filter(l => l.insight.toLowerCase().includes('loss') || l.trigger === 'LOSS_STREAK').slice(0, 5);
    const psychContext = lossLogs.map(l => `- PAST MISTAKE: ${l.insight}`).join('\n');

    let htfContext = "";
    if (htfCandles && htfCandles.length > 0) {
       const recentHtf = htfCandles.slice(-50);
       htfContext = `HTF DATA (${htfTimeframe || 'HTF'}): ${JSON.stringify(recentHtf)}`;
    }

    const prompt = `
      ${omniContext}
      TASK: Analyze Market Structure for ${pair}.
      CURRENT PRICE: ${lastCandle.close}
      ${technicalStats}
      ${oracleData}
      ${htfContext}
      LTF DATA: ${JSON.stringify(recentData)}
      
      PAST MISTAKES (CIRCUIT BREAKER CHECK):
      ${psychContext}
      
      INSTRUCTIONS:
      1. Identify patterns, zones, and bias.
      2. CRITICAL: Compare current setup against 'PAST MISTAKES'. If it looks like a setup that caused a loss before, trigger a 'psychWarning'.
      3. If a strategy is provided, check for specific entry criteria.
      
      RETURN JSON ONLY. Format: { 
          patterns: [], zones: [], lines: [], 
          analysis: "", 
          market_bias: "BULLISH|BEARISH|NEUTRAL", 
          confidence_score: 0-100,
          strategyName: "Matched Strategy Name (if any)",
          psychWarning: { "riskLevel": "HIGH|MED|LOW", "matchReason": "Resembles loss pattern...", "relevantLogId": "optional_id" } (OR NULL if safe)
      }
    `;

    const text = await hydraRoute(prompt, [], image, true);
    let jsonText = extractJson(text);
    const result = JSON.parse(jsonText);
    
    return {
      patterns: result.patterns || [],
      zones: result.zones || [],
      lines: result.lines || [],
      analysis: result.analysis || "Scan complete.",
      bias: result.market_bias || "NEUTRAL",
      biasConfidence: result.confidence_score || 0,
      orderFlow: result.order_flow || { status: "NORMAL", context: "", strength: 0 },
      strategyName: result.strategyName,
      timestamp: Date.now(),
      psychWarning: result.psychWarning
    };
  } catch (error: any) {
    console.error("Scan Failed:", error);
    return { 
        patterns: [], zones: [], lines: [], 
        analysis: formatError(error),
        bias: "NEUTRAL", 
        biasConfidence: 0, 
        orderFlow: { status: "ERROR", context: "OFFLINE", strength: 0 }, 
        timestamp: Date.now() 
    };
  }
};

const runDeepThought = async (prompt: string, history: Message[]): Promise<{ text: string, verdict: SwarmVerdict }> => {
    
    const speculatorPrompt = `
        ROLE: SPECULATOR. Aggressive, profit-seeking.
        TASK: Analyze for LONG/SHORT signals based on upside potential.
        CONTEXT: ${prompt}
    `;

    const riskPrompt = `
        ROLE: RISK MANAGER. Conservative, capital protection.
        TASK: Analyze for downside risk, traps, and invalidation.
        CONTEXT: ${prompt}
    `;

    const macroPrompt = `
        ROLE: MACRO ANALYST.
        TASK: Analyze external environment (News, Sentiment).
        CONTEXT: ${prompt}
    `;

    const [speculatorOut, riskOut, macroOut] = await Promise.all([
        hydraRoute(speculatorPrompt, history),
        hydraRoute(riskPrompt, history),
        hydraRoute(macroPrompt, history)
    ]);

    const judgePrompt = `
        ROLE: THE JUDGE.
        TASK: Issue Final Verdict based on Council.
        
        SPECULATOR: ${speculatorOut}
        RISK MANAGER: ${riskOut}
        MACRO: ${macroOut}
        
        OUTPUT JSON: { "consensus": "GO|NO_GO|WAIT", "confidence": 0-100, "judgeReasoning": "txt", "opinions": [{ "agent": "RISK_MANAGER", "verdict": "APPROVE|REJECT", "reasoning": "txt" }, { "agent": "SPECULATOR", "verdict": "APPROVE|REJECT", "reasoning": "txt" }] }
    `;

    const rawVerdict = await hydraRoute(judgePrompt, history, undefined, true);
    const jsonVerdict = JSON.parse(extractJson(rawVerdict));

    return { 
        text: jsonVerdict.judgeReasoning, 
        verdict: {
            id: Math.random().toString(36).substr(2, 9),
            timestamp: Date.now(),
            consensus: jsonVerdict.consensus,
            confidence: jsonVerdict.confidence,
            judgeReasoning: jsonVerdict.judgeReasoning,
            opinions: jsonVerdict.opinions || []
        }
    };
};

export const sendMessageToGemini = async (options: SendMessageOptions): Promise<{ text: string, swarmVerdict?: SwarmVerdict }> => {
    const { message, history, image, useSwarm } = options; 
    const omniContext = await assembleOmniContext();
    
    try {
        if (useSwarm) {
            const { text, verdict } = await runDeepThought(`${omniContext}\nUSER: ${message}`, history);
            return { text, swarmVerdict: verdict };
        }

        const prompt = `${omniContext}\nUSER MESSAGE: ${message}`;
        const text = await hydraRoute(prompt, history, image);

        return { text: text || "" };
    } catch (e: any) {
        return { text: formatError(e) };
    }
};

export const diagnoseCodeSnippet = async (filename: string, code: string): Promise<{ diagnosis: string, fixedCode: string }> => {
    try {
        const prompt = `
            ROLE: Senior React Engineer.
            TASK: Fix the provided code snippet.
            CONTEXT: The app is a high-performance trading dashboard ("The Samaritan").
            
            CRITICAL TYPE DEFINITIONS (Use EXACTLY these):
            ${SYSTEM_TYPES_CONTEXT}

            FILENAME: ${filename}
            
            CODE TO FIX:
            ${code}
            
            OUTPUT JSON: { "diagnosis": "explanation of bugs", "fixedCode": "full fixed code string" }
        `;
        
        const response = await hydraRoute(prompt, [], undefined, true);
        const json = JSON.parse(extractJson(response));
        return json;
    } catch (e: any) {
        return { diagnosis: formatError(e), fixedCode: code };
    }
};

export const generateStrategyFromData = async (candles: CandleData[], db: NeuralDB, mode: GenesisMode): Promise<Strategy> => {
    try {
        const slice = candles.slice(-200); 
        
        const existingStrats = db.strategies.map(s => s.name).join(', ');
        
        const prompt = `
            ROLE: QUANTITATIVE RESEARCHER.
            TASK: Analyze price action data and invent a profitable Trading Strategy.
            MODE: ${mode} (Global Grid + Internal Echo)
            
            EXISTING STRATEGIES (Avoid duplicates): ${existingStrats}
            
            DATA SAMPLE (Last 5):
            ${JSON.stringify(slice.slice(-5))}
            
            ANALYSIS REQUIREMENT:
            Look for recurring patterns in the provided data structure (Open, High, Low, Close).
            Define Entry Rules, Exit Rules, and Risk Management.
            
            OUTPUT JSON:
            {
                "name": "Creative Strategy Name",
                "content": "Full markdown description of the strategy logic..."
            }
        `;
        
        const response = await hydraRoute(prompt, [], undefined, true);
        const json = JSON.parse(extractJson(response));
        
        return {
            id: Math.random().toString(36).substr(2, 9),
            name: json.name,
            content: json.content,
            requiredTimeframes: ['15m', '1H'],
            isActive: false,
            executionStatus: 'INCUBATION',
            timestamp: Date.now(),
            versions: []
        };
    } catch (e: any) {
        throw new Error(formatError(e));
    }
};

export const runDeepPatternSearch = async (
    candles: CandleData[],
    definition: string,
    mtfCandles?: CandleData[]
): Promise<PatternMatch[]> => {
    try {
        const compress = (data: CandleData[]) => data.map(c => 
            `${c.time}:${c.open.toFixed(2)},${c.high.toFixed(2)},${c.low.toFixed(2)},${c.close.toFixed(2)}`
        ).join('|');

        const mainDataStr = compress(candles);
        let mtfStr = "";
        if (mtfCandles && mtfCandles.length > 0) {
            mtfStr = `\nHTF_DATA: ${compress(mtfCandles)}`;
        }

        const prompt = `
            ROLE: DEEP PATTERN RECOGNITION ENGINE.
            TASK: Find instances of the user's defined pattern in the provided historical data.
            
            PATTERN DEFINITION:
            "${definition}"
            
            DATA FORMAT: Timestamp:Open,High,Low,Close (Separated by |)
            
            LTF_DATA:
            ${mainDataStr}
            ${mtfStr}
            
            INSTRUCTIONS:
            1. Scan the entire dataset.
            2. Identify the top 30 clearest occurrences of the pattern.
            3. If MTF data is provided, verify higher timeframe alignment.
            
            OUTPUT JSON ONLY:
            [
                { 
                    "time": number (timestamp of the trigger candle),
                    "confidence": number (0-100),
                    "reasoning": "string (Why this matches)",
                    "type": "LONG|SHORT"
                }
            ]
        `;

        const response = await hydraRoute(prompt, [], undefined, true);
        return JSON.parse(extractJsonArray(response));
    } catch (e: any) {
        throw new Error(formatError(e));
    }
};

export const verifyKnowledgeInput = async (input: { type: string, title: string, content: string, image?: string | null }, db: NeuralDB): Promise<{ text: string, conflictId?: string }> => {
    try {
        const existingTitles = [...db.nuggets.map(n => n.title), ...db.concepts.map(c => c.name)].join(', ');
        
        const prompt = `
            ROLE: SENIOR TRADING MENTOR.
            TASK: Audit a student's new knowledge entry for accuracy, clarity, and duplication.
            
            INPUT TYPE: ${input.type}
            TITLE: ${input.title}
            CONTENT: ${input.content}
            
            EXISTING KNOWLEDGE BASE TOPICS:
            ${existingTitles}
            
            INSTRUCTIONS:
            1. Check if this topic already exists (Conflict).
            2. Check for vagueness or weak logic.
            3. Provide constructive feedback.
            
            OUTPUT JSON:
            {
                "text": "Feedback message to user...",
                "conflictId": "ID of conflicting item if found, else null"
            }
        `;
        
        const response = await hydraRoute(prompt, [], input.image || undefined, true);
        const json = JSON.parse(extractJson(response));
        
        const exactMatch = db.nuggets.find(n => n.title.toLowerCase() === input.title.toLowerCase()) || 
                           db.concepts.find(c => c.name.toLowerCase() === input.title.toLowerCase());
                           
        return {
            text: json.text,
            conflictId: exactMatch ? exactMatch.id : undefined
        };
    } catch (e: any) {
        return { text: formatError(e) };
    }
};

export const generateSemanticTags = async (content: string): Promise<string[]> => {
    try {
        const prompt = `
            TASK: Extract 3-5 semantic tags/keywords from the text.
            TEXT: ${content.substring(0, 500)}
            
            OUTPUT: JSON Array of strings. Example: ["Psychology", "Risk", "FOMO"]
        `;
        
        const response = await hydraRoute(prompt, [], undefined, true);
        const tags = JSON.parse(extractJsonArray(response));
        return tags.slice(0, 5);
    } catch (e) {
        return ["General"];
    }
};

export const synthesizeProtocol = async (strats: Strategy[], logs: any[]): Promise<string> => {
    try {
        const stratText = strats.filter(s => s.isActive).map(s => `## ${s.name}\n${s.content}`).join('\n\n');
        const logsText = logs.slice(0, 10).map(l => `- INSIGHT: ${l.insight} => ADAPTATION: ${l.adaptation}`).join('\n');
        
        const prompt = `
            ROLE: HEAD OF ALGORITHMIC TRADING.
            TASK: Synthesize a Master Trading Protocol document.
            
            INPUTS:
            1. ACTIVE STRATEGIES:
            ${stratText}
            
            2. EVOLUTIONARY LESSONS (From Mistakes):
            ${logsText}
            
            OUTPUT:
            A structured Markdown document combining the hard logic of strategies with the wisdom of the evolution logs.
            Sections: "Core Philosophy", "Execution Rules", "Risk Parameters", "Psychological Safeguards".
        `;
        
        return await hydraRoute(prompt, []);
    } catch (e: any) {
        return formatError(e);
    }
};

export const generateImageCaption = async (base64Image: string): Promise<string> => {
    try {
        const prompt = "Analyze this trading chart. Describe the price action, key levels, and market structure in one concise paragraph.";
        return await hydraRoute(prompt, [], base64Image);
    } catch (e) {
        return "Error analyzing visual data.";
    }
};

export const analyzeJournalForPatches = async (strats: Strategy[], entries: JournalEntry[]): Promise<any[]> => {
    try {
        if (entries.length < 5) return [];
        
        const losses = entries.filter(e => e.status === 'LOSS');
        const stratNames = strats.map(s => s.name).join(', ');
        
        const prompt = `
            ROLE: SYSTEM OPTIMIZER.
            TASK: Analyze recent trading losses and suggest "Patches" for the strategies.
            
            LOSSES (Last 5):
            ${JSON.stringify(losses.slice(0, 5).map(e => ({ pair: e.pair, strategy: e.strategyName, reason: e.mistakes })))}
            
            AVAILABLE STRATEGIES: ${stratNames}
            
            OUTPUT JSON ARRAY:
            [{ "strategyId": "GUESS_NAME_OR_ID", "suggestion": "Add rule: Wait for candle close...", "reason": "Consistent fakeouts detected" }]
        `;
        
        const response = await hydraRoute(prompt, [], undefined, true);
        const json = JSON.parse(extractJsonArray(response));
        
        return json.map((item: any) => {
            const strat = strats.find(s => s.name.includes(item.strategyId) || s.id === item.strategyId);
            return strat ? { ...item, strategyId: strat.id } : null;
        }).filter(Boolean);
    } catch (e) {
        return [];
    }
};

export const analyzeTradeSequence = async (images: JournalImage[]): Promise<any> => {
    try {
        const prompt = `
            TASK: Analyze this sequence of trade screenshots (Entry, Management, Exit).
            Determine the Outcome and Quality of execution.
            
            OUTPUT JSON:
            {
                "status": "WIN|LOSS|BE",
                "reasoning": "Analysis of the trade...",
                "confidence": 0-100,
                "setupType": "Breakout|Reversal|..."
            }
        `;
        
        const response = await hydraRoute(prompt, [], images[0]?.data, true);
        return JSON.parse(extractJson(response));
    } catch (e) {
        return { reasoning: "Visual Analysis Failed" };
    }
};

export const submitFeedback = async (guessed: string, actual: string, img: string): Promise<void> => {
    console.log(`[FEEDBACK LOOP] AI Guessed: ${guessed}, Actual: ${actual}`);
};

export const proveStrategy = async (candles: CandleData[], strategy: any, count: number): Promise<any[]> => { 
    // REPLACED RANDOM WITH DETERMINISTIC MEAN REVERSION LOGIC FOR DEMO
    const signals = [];
    const len = candles.length;
    
    for (let i = 20; i < len; i++) {
        if (i % 43 !== 0) continue; 

        const slice = candles.slice(i - 14, i + 1);
        const current = slice[slice.length - 1];
        
        let gains = 0, losses = 0;
        for(let k=1; k<slice.length; k++) {
            const diff = slice[k].close - slice[k-1].close;
            if(diff >= 0) gains += diff; else losses += Math.abs(diff);
        }
        const rs = losses === 0 ? 100 : gains/losses;
        const rsi = 100 - (100 / (1 + rs));

        if (rsi < 30) {
            signals.push({
                time: current.time,
                type: 'LONG',
                reason: 'Oversold Condition (RSI < 30)',
                strategyName: strategy.name
            });
        } else if (rsi > 70) {
            signals.push({
                time: current.time,
                type: 'SHORT',
                reason: 'Overbought Condition (RSI > 70)',
                strategyName: strategy.name
            });
        }
    }
    
    return signals;
};

export const generateTradeInsights = async (trades: Trade[], metrics: BacktestMetrics, stratName: string): Promise<string> => { 
    return `Analysis of ${stratName}: Win Rate ${metrics.winRate}%. Profit Factor ${metrics.profitFactor}. Suggestion: Increase Risk Reward ratio.`;
};

export const analyzeBacktestData = async (candles: CandleData[], strategies: Strategy[], useWaterfall: boolean, model: string): Promise<any[]> => { return []; }
