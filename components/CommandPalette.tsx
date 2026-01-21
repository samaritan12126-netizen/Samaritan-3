
import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal, Activity, BookOpen, Database, Server, Grid, 
  Search, ArrowRight, CornerDownLeft, BrainCircuit, ShieldAlert,
  Zap, LogOut, LayoutDashboard, Calculator, FileText, Book, Swords
} from 'lucide-react';
import { View, CurrencyPair } from '../types';
import { audio } from '../services/audio'; 

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: View) => void;
  onAction: (action: string, payload?: any) => void;
}

interface Command {
  id: string;
  label: string;
  group: 'NAVIGATION' | 'ACTION' | 'SYSTEM';
  icon: any;
  shortcut?: string;
  action: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onNavigate, onAction }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const commands: Command[] = [
    { id: 'nav-term', label: 'Live Terminal', group: 'NAVIGATION', icon: Terminal, action: () => onNavigate('TERMINAL') },
    { id: 'nav-cortex', label: 'Cortex HQ', group: 'NAVIGATION', icon: BrainCircuit, action: () => onNavigate('CORTEX') },
    { id: 'nav-back', label: 'Backtest Lab', group: 'NAVIGATION', icon: Activity, action: () => onNavigate('BACKTEST') },
    { id: 'nav-kb', label: 'Knowledge Base', group: 'NAVIGATION', icon: Database, action: () => onNavigate('KNOWLEDGE_BASE') },
    { id: 'nav-journal', label: 'Trade Journal', group: 'NAVIGATION', icon: BookOpen, action: () => onNavigate('JOURNAL') },
    { id: 'nav-mosaic', label: 'Mosaic Command', group: 'NAVIGATION', icon: Grid, action: () => onNavigate('MOSAIC') },
    { id: 'nav-core', label: 'System Core', group: 'NAVIGATION', icon: Server, action: () => onNavigate('SYSTEM_CORE') },
    { id: 'act-scan', label: 'Run Visionary Scan', group: 'ACTION', icon: BrainCircuit, action: () => onAction('SCAN_MARKET') },
    { id: 'act-entry', label: 'New Journal Entry', group: 'ACTION', icon: FileText, action: () => { onNavigate('JOURNAL'); setTimeout(() => onAction('NEW_ENTRY'), 100); } },
    { id: 'sys-backup', label: 'Backup System', group: 'SYSTEM', icon: LogOut, action: () => { onNavigate('SYSTEM_CORE'); } },
    { id: 'sys-manual', label: 'Open Field Manual', group: 'SYSTEM', icon: Book, action: () => { onNavigate('SYSTEM_CORE'); setTimeout(() => onAction('OPEN_MANUAL'), 100); } },
  ];

  const filteredCommands = commands.filter(cmd => 
    cmd.label.toLowerCase().includes(query.toLowerCase()) || 
    cmd.group.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
        audio.play('HOVER');
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
        audio.play('HOVER');
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          audio.play('SUCCESS');
          filteredCommands[selectedIndex].action();
          onClose();
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  useEffect(() => {
    if (listRef.current) {
        const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
        if (selectedElement) {
            selectedElement.scrollIntoView({ block: 'nearest' });
        }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-start justify-center pt-[15vh] animate-in fade-in duration-100" onClick={onClose}>
      <div 
        className="w-full max-w-xl bg-[#080808] border border-white/20 rounded-lg shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-150 ring-1 ring-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center px-4 py-4 border-b border-white/10 bg-white/5">
          <Search size={20} className="text-zinc-500 mr-3" />
          <input 
            ref={inputRef}
            type="text" 
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            placeholder="Type a command or search..."
            className="w-full bg-transparent text-lg text-white placeholder-zinc-600 focus:outline-none font-sans"
          />
          <button 
            onClick={onClose}
            className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-[10px] font-bold text-zinc-500 hover:text-white uppercase tracking-wider cursor-pointer transition-colors"
          >
            ESC
          </button>
        </div>

        <div ref={listRef} className="max-h-[300px] overflow-y-auto custom-scrollbar p-2">
          {filteredCommands.length === 0 ? (
             <div className="py-8 text-center text-zinc-600 text-xs font-mono">No matching commands found.</div>
          ) : (
             filteredCommands.map((cmd, idx) => (
                <div 
                  key={cmd.id}
                  onClick={() => { audio.play('SUCCESS'); cmd.action(); onClose(); }}
                  onMouseEnter={() => { if(selectedIndex !== idx) audio.play('HOVER'); setSelectedIndex(idx); }}
                  className={`
                    flex items-center justify-between px-4 py-3 rounded-md cursor-pointer transition-all duration-75
                    ${idx === selectedIndex ? 'bg-primary/20 text-white' : 'text-zinc-400 hover:bg-white/5'}
                  `}
                >
                   <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-sm ${idx === selectedIndex ? 'text-primary bg-primary/20' : 'text-zinc-500 bg-white/5'}`}>
                          <cmd.icon size={16} />
                      </div>
                      <div className="flex flex-col">
                          <span className={`text-sm font-medium ${idx === selectedIndex ? 'text-white' : 'text-zinc-300'}`}>{cmd.label}</span>
                          <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider">{cmd.group}</span>
                      </div>
                   </div>
                   
                   {idx === selectedIndex && (
                       <CornerDownLeft size={14} className="text-primary opacity-50" />
                   )}
                </div>
             ))
          )}
        </div>

        <div className="px-4 py-2 bg-black border-t border-white/10 flex items-center justify-between text-[10px] text-zinc-600 font-mono">
            <div className="flex gap-4">
                <span>Select <strong className="text-zinc-400">↑↓</strong></span>
                <span>Execute <strong className="text-zinc-400">↵</strong></span>
            </div>
            <span>Cortex v2.0</span>
        </div>
      </div>
    </div>
  );
};
