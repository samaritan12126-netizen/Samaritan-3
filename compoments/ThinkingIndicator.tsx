
import React from 'react';
import { BrainCircuit, Users } from 'lucide-react';

interface ThinkingIndicatorProps {
  label?: string;
  isSwarm?: boolean;
}

export const ThinkingIndicator: React.FC<ThinkingIndicatorProps> = ({ label = "DEEP_REASONING_PROTOCOL", isSwarm = false }) => {
  return (
    <div className={`flex items-center space-x-3 p-4 bg-surface/50 border rounded-lg max-w-[80%] animate-pulse ${isSwarm ? 'border-violet-500/20 shadow-[0_0_15px_rgba(139,92,246,0.15)]' : 'border-secondary/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]'}`}>
      <div className="relative">
        <div className={`absolute inset-0 rounded-full blur-md animate-pulse-slow ${isSwarm ? 'bg-violet-500/20' : 'bg-secondary/20'}`}></div>
        {isSwarm ? (
            <Users className="w-6 h-6 text-violet-500 relative z-10" />
        ) : (
            <BrainCircuit className="w-6 h-6 text-secondary relative z-10" />
        )}
      </div>
      <div className="flex flex-col space-y-1">
        <span className={`text-sm font-medium font-mono tracking-wide ${isSwarm ? 'text-violet-400' : 'text-secondary'}`}>
            {label}
        </span>
        <div className="flex space-x-1">
          <span className={`w-1.5 h-1.5 rounded-full animate-bounce ${isSwarm ? 'bg-violet-500/60' : 'bg-secondary/60'}`} style={{ animationDelay: '0ms' }}></span>
          <span className={`w-1.5 h-1.5 rounded-full animate-bounce ${isSwarm ? 'bg-violet-500/60' : 'bg-secondary/60'}`} style={{ animationDelay: '150ms' }}></span>
          <span className={`w-1.5 h-1.5 rounded-full animate-bounce ${isSwarm ? 'bg-violet-500/60' : 'bg-secondary/60'}`} style={{ animationDelay: '300ms' }}></span>
        </div>
      </div>
    </div>
  );
};
