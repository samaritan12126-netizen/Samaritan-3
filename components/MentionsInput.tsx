
import React, { useState, useRef, useEffect } from 'react';
import { NeuralDB } from '../types';
import { Layers, Folder } from 'lucide-react';

interface MentionsInputProps {
  value: string;
  onChange: (value: string) => void;
  db: NeuralDB;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

export const MentionsInput: React.FC<MentionsInputProps> = ({ 
  value, 
  onChange, 
  db, 
  placeholder, 
  className = "", 
  minHeight = "150px" 
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionQuery, setSuggestionQuery] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const newCursorPos = e.target.selectionStart;
    onChange(newValue);

    // Check for @ trigger
    const textBeforeCursor = newValue.slice(0, newCursorPos);
    const lastAt = textBeforeCursor.lastIndexOf('@');
    
    if (lastAt !== -1) {
       const query = textBeforeCursor.slice(lastAt + 1);
       if (query.length < 20 && !query.includes('\n')) {
          setSuggestionQuery(query);
          setShowSuggestions(true);
          return;
       }
    }
    
    setShowSuggestions(false);
  };

  const handleSelectSuggestion = (item: { id: string, name: string, type: 'NUGGET' | 'CONCEPT' }) => {
      if (!textareaRef.current) return;
      
      const cursorPos = textareaRef.current.selectionStart;
      const textBefore = value.slice(0, cursorPos);
      const lastAt = textBefore.lastIndexOf('@');
      const textAfter = value.slice(cursorPos);
      
      // Insert Token
      const token = `{{${item.type}:${item.id}:${item.name}}}`;
      const newValue = value.slice(0, lastAt) + token + " " + textAfter;
      
      onChange(newValue);
      setShowSuggestions(false);
      
      setTimeout(() => {
          if (textareaRef.current) {
              textareaRef.current.focus();
              const newCursor = lastAt + token.length + 1;
              textareaRef.current.setSelectionRange(newCursor, newCursor);
          }
      }, 0);
  };

  const filteredItems = [
      ...db.concepts.map(c => ({ id: c.id, name: c.name, type: 'CONCEPT' as const })),
      ...db.nuggets.map(n => ({ id: n.id, name: n.title, type: 'NUGGET' as const }))
  ].filter(i => i.name.toLowerCase().includes(suggestionQuery.toLowerCase())).slice(0, 5);

  return (
    <div className="relative w-full" ref={containerRef}>
        <textarea
            ref={textareaRef}
            value={value}
            onChange={handleInput}
            placeholder={placeholder}
            className={`w-full bg-black border border-white/10 p-4 text-sm text-zinc-300 focus:border-primary/50 focus:outline-none rounded-sm resize-none leading-relaxed font-mono ${className}`}
            style={{ minHeight }}
        />
        
        {showSuggestions && filteredItems.length > 0 && (
            <div className="absolute left-4 bottom-4 z-50 w-72 bg-[#080808] border border-white/20 shadow-2xl rounded-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 ring-1 ring-white/10">
                <div className="px-3 py-2 bg-white/5 border-b border-white/5 text-[9px] font-bold text-zinc-500 uppercase flex justify-between">
                    <span>Link Knowledge (@{suggestionQuery})</span>
                    <span>{filteredItems.length} found</span>
                </div>
                {filteredItems.map((item, idx) => {
                    const isConcept = item.type === 'CONCEPT';
                    return (
                    <button
                        key={`${item.type}-${item.id}`}
                        onClick={() => handleSelectSuggestion(item)}
                        className={`w-full text-left px-3 py-2.5 text-xs flex items-center justify-between gap-3 hover:bg-white/10 transition-colors group border-b border-white/5 last:border-0 ${idx === 0 ? 'bg-white/5' : ''}`}
                    >
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className={`shrink-0 p-1 rounded-sm ${isConcept ? 'bg-secondary/10 text-secondary' : 'bg-primary/10 text-primary'}`}>
                                {isConcept ? <Folder size={14} /> : <Layers size={14} />}
                            </div>
                            <span className={`truncate font-mono ${isConcept ? 'text-secondary font-bold' : 'text-zinc-200'}`}>
                                {item.name}
                            </span>
                        </div>
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider shrink-0 ${isConcept ? 'bg-secondary/20 text-secondary' : 'bg-primary/20 text-primary'}`}>
                            {item.type}
                        </span>
                    </button>
                    );
                })}
            </div>
        )}
    </div>
  );
};
