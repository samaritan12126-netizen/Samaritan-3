
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Message, Role } from '../types';
import { User, Bot, Brain, Users, AlertTriangle, TrendingUp, Scale, Gavel, ShieldAlert, ChevronDown, ChevronUp } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === Role.USER;
  const isThinking = message.isThinking;
  const hasSwarm = !!message.swarmVerdict;
  const isError = message.text.startsWith('⚠️') || message.text.includes('SYSTEM ANOMALY');
  
  // Local state for expanded cards
  const [expandedCard, setExpandedCard] = useState<'RISK' | 'SPEC' | null>(null);

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-6`}>
      <div className={`flex max-w-[90%] md:max-w-[75%] ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start gap-3`}>
        
        {/* Avatar */}
        <div className={`
          flex-shrink-0 w-8 h-8 rounded-sm flex items-center justify-center border
          ${isUser 
            ? 'bg-primary/10 border-primary/30 text-primary' 
            : isError 
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-500 animate-pulse'
              : isThinking 
                ? 'bg-secondary/10 border-secondary/30 text-secondary' 
                : hasSwarm
                  ? 'bg-violet-500/10 border-violet-500/30 text-violet-500'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'}
        `}>
          {isUser ? <User size={16} /> : isError ? <ShieldAlert size={16} /> : isThinking ? <Brain size={16} /> : hasSwarm ? <Users size={16} /> : <Bot size={16} />}
        </div>

        {/* Bubble */}
        <div className={`
          flex flex-col p-4 rounded-sm shadow-lg border backdrop-blur-md overflow-hidden min-w-[300px]
          ${isUser 
            ? 'bg-primary/5 border-primary/20 text-zinc-100 rounded-tr-none' 
            : isError
              ? 'bg-rose-500/5 border-rose-500/20 text-rose-200 rounded-tl-none'
              : 'bg-surface/80 text-zinc-300 rounded-tl-none border-white/5'}
        `}>
          {isThinking && !isUser && (
            <div className="text-xs text-secondary mb-2 font-mono flex items-center gap-1 opacity-80 border-b border-secondary/20 pb-2">
              <Brain size={12} />
              <span className="uppercase tracking-wider">Reasoning Complete</span>
            </div>
          )}
          
          {message.attachment && (
             <div className="mb-3 rounded-sm overflow-hidden border border-white/10 max-w-[300px]">
                 <img src={message.attachment} alt="Analyzed Chart" className="w-full h-auto object-contain opacity-90" />
                 <div className="bg-black/50 px-2 py-1 text-[8px] font-mono text-zinc-500 uppercase">Visual Context Analyzed</div>
             </div>
          )}

          {/* SWARM VERDICT UI */}
          {hasSwarm && message.swarmVerdict && (
              <div className="mb-4 bg-black/40 border border-violet-500/30 rounded-sm overflow-hidden shadow-[0_0_20px_rgba(139,92,246,0.1)]">
                  <div className="flex items-center justify-between p-3 bg-violet-500/10 border-b border-violet-500/20">
                      <div className="flex items-center gap-2">
                          <Scale size={16} className="text-violet-500" />
                          <span className="text-xs font-bold text-white uppercase tracking-widest">Council Verdict</span>
                      </div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-sm uppercase ${
                          message.swarmVerdict.consensus === 'GO' ? 'bg-emerald-500 text-black' : 
                          message.swarmVerdict.consensus === 'NO_GO' ? 'bg-rose-500 text-white' : 
                          'bg-amber-500 text-black'
                      }`}>
                          {message.swarmVerdict.consensus.replace('_', ' ')}
                      </span>
                  </div>
                  
                  <div className={`p-3 grid gap-3 transition-all ${expandedCard ? 'grid-cols-1' : 'grid-cols-2'}`}>
                      {/* RISK MANAGER CARD */}
                      <div 
                        className={`p-2 bg-rose-500/5 border border-rose-500/20 rounded-sm cursor-pointer hover:bg-rose-500/10 transition-all ${expandedCard === 'RISK' ? 'col-span-1 shadow-glow-sm' : ''}`}
                        onClick={() => setExpandedCard(expandedCard === 'RISK' ? null : 'RISK')}
                      >
                          <div className="flex items-center justify-between mb-2 text-rose-500">
                              <div className="flex items-center gap-1">
                                  <AlertTriangle size={12} />
                                  <span className="text-[9px] font-bold uppercase">Risk Manager</span>
                              </div>
                              {expandedCard === 'RISK' ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                          </div>
                          <p className={`text-[10px] text-zinc-400 leading-tight ${expandedCard === 'RISK' ? 'whitespace-pre-wrap' : 'line-clamp-3'}`}>
                              {message.swarmVerdict.opinions[0].reasoning}
                          </p>
                          {expandedCard === 'RISK' && <div className="mt-2 text-[8px] text-rose-500 font-bold uppercase tracking-wider text-right">Confidence: 95%</div>}
                      </div>
                      
                      {/* SPECULATOR CARD */}
                      <div 
                        className={`p-2 bg-emerald-500/5 border border-emerald-500/20 rounded-sm cursor-pointer hover:bg-emerald-500/10 transition-all ${expandedCard === 'SPEC' ? 'col-span-1 shadow-glow-sm' : ''}`}
                        onClick={() => setExpandedCard(expandedCard === 'SPEC' ? null : 'SPEC')}
                      >
                          <div className="flex items-center justify-between mb-2 text-emerald-500">
                              <div className="flex items-center gap-1">
                                  <TrendingUp size={12} />
                                  <span className="text-[9px] font-bold uppercase">Speculator</span>
                              </div>
                              {expandedCard === 'SPEC' ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                          </div>
                          <p className={`text-[10px] text-zinc-400 leading-tight ${expandedCard === 'SPEC' ? 'whitespace-pre-wrap' : 'line-clamp-3'}`}>
                              {message.swarmVerdict.opinions[1].reasoning}
                          </p>
                          {expandedCard === 'SPEC' && <div className="mt-2 text-[8px] text-emerald-500 font-bold uppercase tracking-wider text-right">Confidence: 85%</div>}
                      </div>
                  </div>
                  
                  <div className="p-3 border-t border-white/5 bg-white/5 flex gap-2">
                      <Gavel size={16} className="text-zinc-500 shrink-0 mt-0.5" />
                      <div>
                          <span className="text-[9px] font-bold text-zinc-500 uppercase block mb-1">Judge's Ruling</span>
                          <p className="text-xs text-zinc-200 italic">"{message.swarmVerdict.judgeReasoning}"</p>
                      </div>
                  </div>
              </div>
          )}

          <div className={`prose prose-invert prose-sm max-w-none break-words font-sans ${isError ? 'text-rose-200 font-mono' : ''}`}>
            <ReactMarkdown>{message.text}</ReactMarkdown>
          </div>
          <span className={`text-[9px] font-mono mt-2 block opacity-40 uppercase tracking-widest ${isUser ? 'text-primary' : 'text-zinc-500'}`}>
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );
};
