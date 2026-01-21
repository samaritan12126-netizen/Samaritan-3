
import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, BrainCircuit, Mic, MicOff, Globe, X, Radio, Cpu, ArrowUpRight, Zap } from 'lucide-react';
import { loadNeuralConfig } from '../services/aiCore'; 
import { VoiceVisualizer } from './VoiceVisualizer'; 

interface InputAreaProps {
  onSend: (text: string) => void;
  isLoading: boolean;
  isThinkingMode: boolean;
  onToggleThinking: () => void;
  attachment?: string | null;
  onClearAttachment?: () => void;
  isVoiceActive: boolean;
  isSpeaking: boolean;
  onToggleVoice: () => void;
  marketSentiment: string | null;
  onCheckOracle: () => void;
  onConfigureHydra: () => void; 
  onCommand?: (cmd: string) => void; 
}

export const InputArea: React.FC<InputAreaProps> = ({ 
  onSend, 
  isLoading, 
  isThinkingMode,
  onToggleThinking,
  attachment,
  onClearAttachment,
  isVoiceActive,
  isSpeaking,
  onToggleVoice,
  marketSentiment,
  onCheckOracle,
  onConfigureHydra,
  onCommand
}) => {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [useSearch, setUseSearch] = useState(false);
  const [activeProvider, setActiveProvider] = useState('GEMINI');
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  // Poll for config changes
  useEffect(() => {
      const checkProvider = () => {
          const config = loadNeuralConfig();
          setActiveProvider(config.activeProvider);
      };
      checkProvider();
      const interval = setInterval(checkProvider, 2000);
      return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if ((window as any).webkitSpeechRecognition || (window as any).SpeechRecognition) {
       const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
       recognitionRef.current = new SpeechRecognition();
       recognitionRef.current.continuous = false;
       recognitionRef.current.interimResults = false;
       recognitionRef.current.lang = 'en-US';
       
       recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          const cmdMatch = transcript.match(/^(Samaritan|Execute|Close|Buy|Sell|Risk)/i);
          if (cmdMatch && onCommand) {
              onCommand(transcript);
              setInput('');
          } else {
              setInput(prev => prev ? `${prev} ${transcript}` : transcript);
          }
          setIsListening(false);
       };

       recognitionRef.current.onerror = () => setIsListening(false);
       recognitionRef.current.onend = () => setIsListening(false);
    }
  }, [onCommand]);

  const toggleMic = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((input.trim() || attachment) && !isLoading) {
      if (input.startsWith('/') && onCommand) {
          onCommand(input.substring(1));
          setInput('');
      } else {
          onSend(input); 
          setInput('');
      }
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  return (
    <div className="w-full bg-[#000000]/90 backdrop-blur-xl border-t border-white/10 p-4 pb-6 sticky bottom-0 z-20">
      <div className="max-w-4xl mx-auto flex flex-col gap-3">
        
        {/* MODEL GATEKEEPER (Prompt to switch to Pro if Flash is active) */}
        {!isThinkingMode && activeProvider === 'GEMINI' && input.length > 5 && (
            <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-sm animate-in fade-in slide-in-from-bottom-1">
                <div className="flex items-center gap-2">
                    <Zap size={12} className="text-amber-500" />
                    <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-wide">
                        Default: Gemini 3.0 Flash
                    </span>
                </div>
                <button 
                    onClick={onToggleThinking}
                    className="flex items-center gap-1 text-[9px] font-bold text-amber-500 hover:text-white uppercase tracking-widest transition-colors"
                >
                    Switch to 3.0 Pro <ArrowUpRight size={10} />
                </button>
            </div>
        )}

        {/* Toggle Switch Toolbar */}
        <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide mask-fade-right w-full pr-12">
              {/* THINKING MODE */}
              <button
                onClick={onToggleThinking}
                type="button"
                className={`
                  flex items-center gap-2 px-3 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-wider transition-all duration-300 border shrink-0
                  ${isThinkingMode 
                    ? 'bg-secondary/10 border-secondary text-secondary shadow-[0_0_15px_rgba(139,92,246,0.2)]' 
                    : 'bg-white/5 border-white/5 text-zinc-500 hover:text-zinc-300'}
                `}
              >
                {isThinkingMode ? <BrainCircuit size={12} /> : <Sparkles size={12} />}
                <span className="whitespace-nowrap">{isThinkingMode ? '3.0 Pro (Reasoning)' : '3.0 Flash (Speed)'}</span>
              </button>
              
              {/* SEARCH GROUNDING */}
              <button
                onClick={() => setUseSearch(!useSearch)}
                disabled={activeProvider !== 'GEMINI'}
                className={`
                   flex items-center gap-2 px-3 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-wider transition-all duration-300 border shrink-0
                   ${useSearch ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500' : 'bg-white/5 border-white/5 text-zinc-500 hover:text-zinc-300'}
                   ${activeProvider !== 'GEMINI' ? 'opacity-30 cursor-not-allowed' : ''}
                `}
                title={activeProvider !== 'GEMINI' ? "Available only with Gemini" : "Enable Web Grounding"}
              >
                <Globe size={12} />
                <span className="whitespace-nowrap">Search Grounding</span>
              </button>

              {/* ACTIVE MODEL INDICATOR */}
              <button 
                  onClick={onConfigureHydra}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-sm border border-white/10 bg-white/5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 hover:text-white hover:bg-white/10 shrink-0 transition-all"
                  title="Configure Neural Bridge"
              >
                  <Cpu size={12} className={activeProvider === 'GEMINI' ? 'text-primary' : 'text-secondary'} />
                  <span className="whitespace-nowrap">Hydra: {activeProvider}</span>
              </button>

              {/* VOICE TOGGLE */}
              <button
                onClick={onToggleVoice}
                className={`
                   flex items-center gap-2 px-3 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-wider transition-all duration-300 border shrink-0
                   ${isVoiceActive ? 'bg-rose-500/10 border-rose-500 text-rose-500 animate-pulse' : 'bg-white/5 border-white/5 text-zinc-500 hover:text-zinc-300'}
                `}
              >
                {isSpeaking ? <Radio size={12} className="animate-ping" /> : <Mic size={12} />}
                <span className="whitespace-nowrap">{isVoiceActive ? 'Voice Active' : 'Voice'}</span>
              </button>

              {/* ORACLE TOGGLE */}
              <button
                onClick={onCheckOracle}
                className={`
                   flex items-center gap-2 px-3 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-wider transition-all duration-300 border shrink-0
                   ${marketSentiment === 'BULLISH' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500' : marketSentiment === 'BEARISH' ? 'bg-rose-500/10 border-rose-500 text-rose-500' : 'bg-white/5 border-white/5 text-zinc-500 hover:text-zinc-300'}
                `}
              >
                <Globe size={12} />
                <span className="whitespace-nowrap">{marketSentiment || 'Oracle'}</span>
              </button>
            </div>
        </div>

        {/* Attachment Preview */}
        {attachment && (
            <div className="flex px-2 animate-in fade-in slide-in-from-bottom-2">
                <div className="relative group">
                    <div className="h-16 w-24 bg-black border border-white/20 rounded-sm overflow-hidden">
                        <img src={attachment} alt="Snapshot" className="h-full w-full object-cover opacity-80" />
                    </div>
                    <button 
                        onClick={onClearAttachment}
                        className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-0.5 shadow-md hover:scale-110 transition-transform"
                    >
                        <X size={10} />
                    </button>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-[8px] font-mono font-bold bg-black/50 px-1 rounded-sm text-white backdrop-blur-sm">CHART_SNAP</span>
                    </div>
                </div>
            </div>
        )}

        {/* INPUT OR VISUALIZER */}
        {isVoiceActive ? (
            <VoiceVisualizer isActive={isVoiceActive} isSpeaking={isSpeaking} />
        ) : (
            <div className={`
                relative flex items-end gap-2 bg-[#050505] border rounded-sm p-2 transition-all duration-300
                ${input.trim() || attachment ? 'border-primary/50 shadow-[0_0_20px_rgba(6,182,212,0.1)]' : 'border-white/10'}
            `}>
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder={isThinkingMode ? "Initialize complex reasoning sequence..." : "Enter command or query (Flash Mode)..."}
                className="w-full bg-transparent text-zinc-200 placeholder-zinc-600 text-sm resize-none focus:outline-none py-3 px-2 max-h-[120px] scrollbar-hide font-sans"
                disabled={isLoading}
              />
              
              <button 
                 onClick={toggleMic}
                 className={`p-3 rounded-sm transition-all ${isListening ? 'bg-rose-500 text-white animate-pulse' : 'bg-white/5 text-zinc-500 hover:text-white'}`}
              >
                 {isListening ? <MicOff size={16} /> : <Mic size={16} />}
              </button>

              <button
                onClick={() => handleSubmit()}
                disabled={(!input.trim() && !attachment) || isLoading}
                className={`
                  p-3 rounded-sm flex-shrink-0 transition-all duration-300
                  ${(input.trim() || attachment) && !isLoading 
                    ? isThinkingMode ? 'bg-secondary hover:bg-secondary/90 text-white shadow-lg' : 'bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20'
                    : 'bg-white/5 text-zinc-600 cursor-not-allowed'}
                `}
              >
                <Send size={16} />
              </button>
            </div>
        )}
        
        <div className="text-center text-[9px] text-zinc-700 font-mono">
           MODEL: {isThinkingMode ? 'GEMINI 3.0 PRO PREVIEW' : 'GEMINI 3.0 FLASH'} // {activeProvider}
        </div>
      </div>
    </div>
  );
};
