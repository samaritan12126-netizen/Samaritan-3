
import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { X, Book, ShieldAlert, KeyRound, Unlock } from 'lucide-react';
import { audio } from '../services/audio';

interface ManualModalProps {
    onClose: () => void;
}

const ACCESS_CODE = "3012001";

const MANUAL_CONTENT = `
# THE SAMARITAN // OPERATOR'S CODEX
**System Version:** 1.5 (Cortex)  
**Clearance:** LEVEL 1 (ADMIN)  
**Architecture:** Hydra-Hybrid (Local/Cloud)

> "We do not predict the future. We prepare for it."

---

## 📋 TABLE OF CONTENTS
1.  **The Philosophy** (Core Directive)
2.  **System Architecture** (Hydra & Cortex)
3.  **The Sentinel** (Vision & Auto-Execution)
4.  **The Neural Dictionary** (Trading Concepts)
5.  **Psychological Warfare** (Pre-Mortem Gate)
6.  **The Forge** (Backtesting & Genesis)
7.  **Voice Command Syntax** (Vocal Interface)
8.  **Crisis Protocols** (Troubleshooting)

---

## 1. THE PHILOSOPHY
The Samaritan is not a "bot". A bot is a script that executes \`IF X THEN Y\`. Scripts are brittle; they break when market conditions change.

The Samaritan is an **Intelligence Augmentation System (IAS)**. It uses probabilistic reasoning (LLMs) and computer vision to mimic human intuition but scales it with infinite patience and zero emotion.

### The Three Pillars
1.  **Capital Preservation (The Shield):** 
    *   The system assumes every trade will fail until proven otherwise. 
    *   It forces you to confront the worst-case scenario *before* entry via the **Pre-Mortem Gate**.
    *   *Rule:* If you cannot accept the loss, the trade is rejected.
2.  **Evolutionary Learning (The Memory):** 
    *   Mistakes are data. When you log a loss or reject a trade, the system creates an **Evolution Log**.
    *   These logs are fed back into the AI during future decisions. The system literally "learns" from your pain.
3.  **Flawless Execution (The Sword):** 
    *   Human reaction time is ~250ms. Human hesitation (fear) can be seconds or minutes.
    *   The Sentinel executes in <100ms once criteria are met. It pulls the trigger so you don't have to.

---

## 2. SYSTEM ARCHITECTURE

### 🧠 The Cortex (Neural Database)
Unlike ChatGPT, which resets every session, The Samaritan has long-term memory stored in your device's **IndexedDB**.
*   **Concepts:** Abstract ideas (e.g., "Liquidity Sweep").
*   **Nuggets:** Concrete examples (e.g., a screenshot of a specific sweep on GOLD).
*   **Strategies:** Executable logic files written in natural language.

**RAG (Retrieval-Augmented Generation):**
When you ask "Is this a buy?", the system:
1.  Converts your question into a **Vector Embedding** (math representation).
2.  Searches your Cortex for similar vectors (past trades, saved nuggets).
3.  Injects those memories into the AI's prompt.
4.  *Result:* The AI trades like **YOU**, not like a generic textbook.

### 🐍 Hydra (The Neural Bridge)
The app is model-agnostic. It routes queries to the best available brain:
*   **Gemini 1.5 Pro:** The "Reasoning Engine". Used for complex chart analysis and strategy synthesis.
*   **Gemini 1.5 Flash:** The "Reflex Engine". Used for quick chat replies and voice dictation.
*   **DeepSeek / Claude:** (Optional) Can be configured in System Core for coding tasks or second opinions.

---

## 3. THE SENTINEL (AUTONOMOUS VISION)
The Sentinel is a computer-vision loop that watches your watchlist 24/7.

### The Loop (25s Cycle)
1.  **Acquisition:** Selects next asset from Watchlist.
2.  **Data Uplink:** Pulls latest OHLC data (M1, M5, M15).
3.  **Rendering:** Draws an invisible high-res chart in memory.
4.  **Inference:** Sends chart image to Vision Model.
5.  **Evaluation:** 
    *   Identifies Pattern -> Assigns Confidence Score.
    *   Checks against **Active Strategies**.
    *   Checks **Psychological Safety** (Time of day, recent loss streaks).
6.  **Trigger:** IF Confidence > 80% AND Strategy matches -> **Execute**.

### 🛡️ Mobile Survival (The Immortality Protocol)
Phones kill background apps to save battery. To keep Sentinel alive:
1.  **Insomnia Mode:** Tap the **Moon Icon**. This forces the screen to stay awake (\`WakeLock\`).
2.  **Stealth Mode:** Tap the **Ghost Icon**. Turns screen black to save OLED pixels while running.
3.  **Power:** Keep device plugged in. Vision AI is energy-intensive.

---

## 4. THE NEURAL DICTIONARY (GLOSSARY)
The AI understands these concepts natively. Use them in your prompts and strategy definitions.

*   **FVG (Fair Value Gap):** An imbalance pattern where price leaves a gap between three candles. The AI looks for price to "fill" this gap.
*   **OB (Order Block):** The last down-candle before a violent up-move (or vice versa). Acts as institutional support/resistance.
*   **Liquidity Sweep (Turtle Soup):** Price pokes above a high/low to trigger stops, then immediately reverses.
*   **BOS (Break of Structure):** Price closes beyond a previous key high/low, confirming trend continuation.
*   **CHoCH (Change of Character):** The first BOS in the opposite direction, signaling a potential reversal.
*   **Equilibrium (EQ):** The 50% level of a range.
*   **Killzone:** Specific time windows of high volatility (London Open, NY Open).

---

## 5. PSYCHOLOGICAL WARFARE
Trading is 90% psychology. The Samaritan automates discipline.

### The Pre-Mortem Gate
Before *any* manual execution, a modal appears:
1.  **Risk Calc:** Calculates % of account at risk. If > 2%, it turns RED.
2.  **Streak Check:** If you have lost 3 in a row, it flags **TILT**.
3.  **News Check:** Scans the Oracle for high-impact events in the next hour.
4.  **The Question:** "If this trade hits stop loss immediately, will you remain calm?"
    *   *You must wait 3 seconds to answer.* This forced pause breaks the dopamine loop of impulsive trading.

### Evolution Logs
*   **Trigger:** When you log a trade with the emotion "REVENGE" or "FOMO".
*   **Action:** The system creates a permanent record: *"User tends to force trades after 11:00 AM on Fridays."*
*   **Consequence:** In future scans, the Sentinel will warn you: *"Risk High: Matching pattern of previous emotional loss."*

---

## 6. THE FORGE (BACKTESTING & GENESIS)

### Genesis Protocol
Can't find a strategy? Let the AI invent one.
1.  Upload CSV data (M5 or M15).
2.  Select **Genesis Mode**:
    *   *Internal Echo:* Based on your existing knowledge.
    *   *Global Grid:* Based on general market theory.
3.  **Result:** The AI writes a strategy file (Entry, Exit, Risk rules) and saves it to Cortex.

### Cascade Optimizer
Find the perfect Stop Loss / Take Profit.
1.  Load a Strategy and Data.
2.  Click **"Cascade"** (Sliders Icon).
3.  **The Grid:** The system runs 100+ simulations in the background:
    *   SL: 1.0 ATR to 3.0 ATR
    *   TP: 1.0 ATR to 5.0 ATR
4.  **Heatmap:** It identifies the exact parameter combination that yields the highest Net Profit.

### Deep Search
Type: *"Find all Bullish Engulfing patterns that happened at 8:00 AM."*
*   The AI scans the entire history file.
*   It marks every occurrence on the chart.
*   You can click a marker to validate/reject it, training the system further.

---

## 7. VOICE COMMAND SYNTAX
Tap the Microphone icon to issue commands.

**Navigation:**
*   "Go to Terminal"
*   "Open Journal"
*   "Show Backtest"
*   "System Core"

**Operational:**
*   "Switch to [Asset]" (e.g., "Switch to Bitcoin", "Switch to Euro Dollar")
*   "Enable Sentinel" / "Disable Sentinel"
*   "Scan Market" (Triggers immediate analysis)

**Journaling (Dictation):**
*   "Log a win on BTC. Entry 65k, exit 66k. Strategy was breakout. Felt confident."
*   "Log a loss on Gold. I moved my stop loss. Revenge trading."

**Queries:**
*   "What is the trend on the 4-hour?"
*   "Check news for Tesla." (Triggers Oracle)

---

## 8. CRISIS PROTOCOLS

### API Disconnect / Rate Limit (429)
*   **Symptom:** "Cognitive Overload" message.
*   **Cause:** You are making too many requests to Gemini too fast.
*   **Fix:** Wait 60 seconds. The system auto-cools down. Switch to **Gemini Flash** (Toggle in Input Area) for higher limits.

### "Zombie" Sentinel (No Scans)
*   **Symptom:** Sentinel is "Active" but logs show nothing.
*   **Cause:** Browser throttled the background tab.
*   **Fix:**
    1.  Toggle "Insomnia Mode" (Sun Icon).
    2.  Keep the tab focused (foreground).
    3.  Refresh the page to reset the main loop.

### Database Corruption
*   **Symptom:** White screen or "Failed to load Cortex".
*   **Fix:**
    1.  Go to **System Core**.
    2.  Select **"Maintenance Protocol"**.
    3.  Select **"Re-Initialize DB"**. (Warning: Deletes local data unless backed up).
    4.  *Prevention:* Run **"Execute Core Dump"** weekly to save a backup file.

---

**END OF FILE.**
`;

export const ManualModal: React.FC<ManualModalProps> = ({ onClose }) => {
    const [isLocked, setIsLocked] = useState(true);
    const [input, setInput] = useState('');
    const [errorState, setErrorState] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if(isLocked) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isLocked]);

    const handleUnlock = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (input.trim() === ACCESS_CODE) {
            audio.play('SUCCESS');
            setIsLocked(false);
        } else {
            audio.play('ERROR');
            setErrorState(true);
            setInput('');
            setTimeout(() => setErrorState(false), 500);
        }
    };

    if (isLocked) {
        return (
            <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in">
                <div className={`w-full max-w-sm bg-[#050505] border border-red-500/30 p-8 rounded-sm shadow-[0_0_50px_rgba(220,38,38,0.15)] flex flex-col items-center gap-6 text-center relative overflow-hidden transition-transform duration-100 ${errorState ? 'translate-x-1' : ''}`}>
                    
                    {/* Security Lines */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-red-500 shadow-[0_0_10px_#ef4444]"></div>
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-red-500 shadow-[0_0_10px_#ef4444]"></div>

                    <div className="flex flex-col items-center gap-3 text-red-500 animate-pulse">
                        <div className="p-4 rounded-full border-2 border-red-500/50 bg-red-500/10">
                            <ShieldAlert size={32} />
                        </div>
                        <h2 className="text-xl font-bold uppercase tracking-[0.3em] text-red-500">Classified</h2>
                    </div>

                    <div className="space-y-1">
                        <p className="text-xs font-mono text-red-400 uppercase tracking-wider">Level 1 Clearance Required</p>
                        <p className="text-[10px] text-zinc-600 font-mono">The Samaritan Protocol // Operator's Codex</p>
                    </div>

                    <form onSubmit={handleUnlock} className="w-full flex flex-col gap-4 mt-2">
                        <div className="relative group w-full">
                            <input 
                                ref={inputRef}
                                type="password" 
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="ACCESS CODE"
                                className={`w-full bg-black border text-center font-mono text-lg py-3 rounded-sm focus:outline-none uppercase tracking-widest transition-all ${errorState ? 'border-red-500 text-red-500 placeholder-red-500/50' : 'border-red-900/50 text-red-500 focus:border-red-500 placeholder-red-900/30'}`}
                                autoFocus
                            />
                            <KeyRound size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-red-900" />
                        </div>
                        
                        <button 
                            type="submit"
                            className="w-full py-3 bg-red-900/10 hover:bg-red-900/30 border border-red-500/30 text-red-500 font-bold uppercase tracking-widest text-xs rounded-sm transition-all flex items-center justify-center gap-2 hover:shadow-[0_0_15px_rgba(220,38,38,0.2)]"
                        >
                            <Unlock size={14} /> Authenticate
                        </button>
                    </form>

                    <button onClick={onClose} className="absolute top-2 right-2 text-zinc-800 hover:text-red-500 transition-colors p-2">
                        <X size={20} />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-[#050505] border border-white/10 w-full max-w-5xl h-[90vh] rounded-sm shadow-2xl flex flex-col relative overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-sm border border-primary/20">
                            <Book size={18} className="text-primary" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-white uppercase tracking-[0.2em]">Field Manual</h2>
                            <p className="text-[10px] text-zinc-500 font-mono uppercase">Operator's Codex v1.5</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors"><X size={20} /></button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-[#080808] flex gap-8">
                    
                    {/* Main Content */}
                    <div className="flex-1 prose prose-invert prose-sm max-w-none font-mono">
                        <ReactMarkdown 
                            components={{
                                h1: ({node, ...props}) => <h1 className="text-2xl font-bold text-white border-b border-white/10 pb-4 mb-6 uppercase tracking-widest" {...props} />,
                                h2: ({node, ...props}) => <h2 className="text-xl font-bold text-primary mt-10 mb-4 uppercase tracking-widest flex items-center gap-2" {...props} />,
                                h3: ({node, ...props}) => <h3 className="text-lg font-bold text-zinc-200 mt-6 mb-2" {...props} />,
                                strong: ({node, ...props}) => <strong className="text-emerald-400 font-bold" {...props} />,
                                blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-primary/50 pl-4 py-1 italic text-zinc-400 bg-white/5 rounded-r-sm" {...props} />,
                                ul: ({node, ...props}) => <ul className="list-disc pl-5 space-y-1 text-zinc-300" {...props} />,
                                li: ({node, ...props}) => <li className="pl-1" {...props} />,
                            }}
                        >
                            {MANUAL_CONTENT}
                        </ReactMarkdown>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/5 bg-black flex flex-col items-center gap-2">
                    <span className="text-[9px] text-zinc-600 font-mono uppercase tracking-widest">Confidential // The Samaritan Protocol</span>
                    
                    {/* EUGO SIGNATURE */}
                    <div 
                        className="text-[10px] font-bold uppercase tracking-[0.2em] animate-pulse"
                        style={{ 
                            color: '#60A5FA', 
                            textShadow: '0 0 8px #3B82F6, 0 0 16px #2563EB' 
                        }}
                    >
                        Made by Eugo
                    </div>
                </div>
            </div>
        </div>
    );
};
