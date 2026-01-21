
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, X, Calendar, Clock, ArrowRight, Layers } from 'lucide-react';

// --- HELPER HOOK FOR FIXED POSITIONING ---
const useFixedPosition = (isOpen: boolean, triggerRef: React.RefObject<HTMLElement>) => {
    const [layout, setLayout] = useState<{ style: React.CSSProperties, originClass: string }>({ 
        style: { display: 'none' }, 
        originClass: 'origin-top-left' 
    });

    useEffect(() => {
        if (isOpen && triggerRef.current) {
            const updatePosition = () => {
                const rect = triggerRef.current!.getBoundingClientRect();
                const viewportWidth = window.innerWidth;
                const isRightSide = rect.left > (viewportWidth * 0.5);

                const newStyle: React.CSSProperties = {
                    position: 'fixed',
                    top: `${rect.bottom + 4}px`,
                    minWidth: `${Math.max(rect.width, 120)}px`,
                    maxWidth: '90vw', 
                    zIndex: 99999,
                };

                let origin = 'origin-top-left';

                if (isRightSide) {
                    newStyle.right = `${viewportWidth - rect.right}px`;
                    newStyle.left = 'auto'; 
                    origin = 'origin-top-right';
                } else {
                    newStyle.left = `${rect.left}px`;
                    newStyle.right = 'auto';
                    origin = 'origin-top-left';
                }

                setLayout({ style: newStyle, originClass: origin });
            };
            
            updatePosition();
            window.addEventListener('resize', updatePosition);
            window.addEventListener('scroll', updatePosition, true); 
            
            return () => {
                window.removeEventListener('resize', updatePosition);
                window.removeEventListener('scroll', updatePosition, true);
            };
        }
    }, [isOpen]);

    return layout;
};

const FixedBackdrop: React.FC<{ onClose: () => void }> = ({ onClose }) => (
    <div 
        className="fixed inset-0 z-[99998] cursor-default bg-transparent" 
        onClick={(e) => { e.stopPropagation(); onClose(); }} 
    />
);

const Portal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    if (typeof document === 'undefined') return null;
    return createPortal(children, document.body);
};

// --- CUSTOM SELECT DROPDOWN ---
interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  options: (Option | string)[]; 
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  prefix?: React.ReactNode; 
}

export const CustomSelect: React.FC<CustomSelectProps> = ({ 
  value, 
  options, 
  onChange, 
  placeholder = "Select...", 
  className = "",
  triggerClassName = "",
  prefix
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { style, originClass } = useFixedPosition(isOpen, buttonRef);

  const normalizedOptions: Option[] = options.map(o => 
    typeof o === 'string' ? { value: o, label: o } : o
  );

  const selectedOption = normalizedOptions.find(o => o.value === value);

  return (
    <>
        <div className={`relative ${className}`}>
        <button 
            ref={buttonRef}
            onClick={() => setIsOpen(!isOpen)}
            className={`flex items-center justify-between gap-2 w-full text-left outline-none transition-all ${triggerClassName || 'bg-black border border-white/10 px-3 py-1.5 rounded-sm text-xs font-bold text-zinc-300 hover:text-white'}`}
        >
            <div className="flex items-center gap-2 overflow-hidden">
                {prefix}
                <span className="truncate uppercase">{selectedOption ? selectedOption.label : placeholder}</span>
            </div>
            <ChevronDown size={12} className={`text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        </div>

        {isOpen && (
            <Portal>
                <FixedBackdrop onClose={() => setIsOpen(false)} />
                <div 
                    className={`fixed bg-[#080808] border border-white/10 rounded-sm shadow-[0_10px_40px_rgba(0,0,0,0.9)] max-h-[300px] overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 ${originClass}`}
                    style={style}
                >
                {normalizedOptions.length === 0 && <div className="p-3 text-[10px] text-zinc-500 font-mono text-center">No Options</div>}
                {normalizedOptions.map((opt) => (
                    <button
                    key={opt.value}
                    onClick={() => { onChange(opt.value); setIsOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-[10px] font-mono uppercase tracking-wider flex items-center justify-between group transition-colors border-b border-white/5 last:border-0 ${opt.value === value ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'}`}
                    >
                    <span>{opt.label}</span>
                    {opt.value === value && <Check size={12} className="text-primary" />}
                    </button>
                ))}
                </div>
            </Portal>
        )}
    </>
  );
};

// --- MULTI SELECT DROPDOWN ---
interface MultiSelectDropdownProps {
    label: string;
    options: Option[];
    selectedValues: string[];
    onChange: (values: string[]) => void;
    className?: string;
}

export const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
    label,
    options,
    selectedValues,
    onChange,
    className = ""
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const { style, originClass } = useFixedPosition(isOpen, buttonRef);

    const toggleOption = (val: string) => {
        if (selectedValues.includes(val)) {
            onChange(selectedValues.filter(v => v !== val));
        } else {
            onChange([...selectedValues, val]);
        }
    };

    const count = selectedValues.length;

    return (
        <>
            <div className={`relative ${className}`}>
                <button
                    ref={buttonRef}
                    onClick={() => setIsOpen(!isOpen)}
                    className={`flex items-center gap-2 bg-transparent border ${count > 0 ? 'border-primary/30 text-primary bg-primary/5' : 'border-white/10 text-zinc-500'} px-3 py-1.5 rounded-sm text-[10px] font-bold uppercase transition-all hover:border-white/20 hover:text-white min-w-[120px] justify-between`}
                >
                    <div className="flex items-center gap-2">
                        <Layers size={12} />
                        <span>{label} {count > 0 && `(${count})`}</span>
                    </div>
                    <ChevronDown size={12} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
            </div>

            {isOpen && (
                <Portal>
                    <FixedBackdrop onClose={() => setIsOpen(false)} />
                    <div 
                        className={`fixed bg-[#050505] border border-white/10 rounded-sm shadow-[0_10px_40px_rgba(0,0,0,0.9)] max-h-[300px] overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 ${originClass} flex flex-col`}
                        style={{ ...style, minWidth: '220px' }}
                    >
                        <div className="p-2 border-b border-white/5 flex justify-between items-center bg-white/5 shrink-0 sticky top-0 backdrop-blur-sm z-10">
                            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Strategies</span>
                            <div className="flex gap-2">
                                <button onClick={() => onChange(options.map(o => o.value))} className="text-[9px] text-primary hover:text-white uppercase">All</button>
                                <button onClick={() => onChange([])} className="text-[9px] text-zinc-500 hover:text-white uppercase">None</button>
                            </div>
                        </div>
                        {options.length === 0 && <div className="p-4 text-center text-[10px] text-zinc-600">No Strategies Found</div>}
                        {options.map(opt => {
                            const isSelected = selectedValues.includes(opt.value);
                            return (
                                <button
                                    key={opt.value}
                                    onClick={() => toggleOption(opt.value)}
                                    className={`flex items-center justify-between px-3 py-2 text-left text-xs font-mono transition-colors border-b border-white/5 last:border-0 ${isSelected ? 'bg-primary/10 text-white' : 'text-zinc-400 hover:bg-white/5'}`}
                                >
                                    <span className="truncate pr-2">{opt.label}</span>
                                    <div className={`w-3 h-3 rounded-sm border flex items-center justify-center ${isSelected ? 'bg-primary border-primary' : 'border-zinc-700'}`}>
                                        {isSelected && <Check size={10} className="text-black" />}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </Portal>
            )}
        </>
    );
};

// --- CUSTOM DATE TIME PICKER MODAL (STRICTLY NEW YORK TIME) ---
interface DateTimePickerModalProps {
  onClose: () => void;
  onSelect: (timestamp: number) => void;
  initialTime?: number;
}

export const DateTimePickerModal: React.FC<DateTimePickerModalProps> = ({ onClose, onSelect, initialTime }) => {
    // 1. Initialize Inputs using NY Time
    // We create a Date object from the initial UTC timestamp (or Now)
    // Then we extract the NY-specific date/time strings for the inputs.
    
    const getNYValues = (ts: number) => {
        const d = new Date(ts * 1000);
        // "en-CA" results in YYYY-MM-DD
        const dateStr = d.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
        // "en-GB" with hour12:false results in HH:MM:SS
        const timeStr = d.toLocaleTimeString('en-GB', { timeZone: 'America/New_York', hour12: false }).slice(0, 5); // HH:MM
        return { dateStr, timeStr };
    };

    const initial = initialTime || Math.floor(Date.now() / 1000);
    const { dateStr: initDate, timeStr: initTime } = getNYValues(initial);

    const [date, setDate] = useState(initDate); 
    const [time, setTime] = useState(initTime);

    const handleConfirm = () => {
        if (!date || !time) return;

        // 2. Convert NY Input back to UTC Timestamp
        // We cannot just use new Date(date + 'T' + time) because that uses local browser time.
        // We need a date that, when converted to NY time, matches the input.
        
        // Approach: Iterative offset calculation to handle daylight savings reliably without heavy libraries.
        // Step A: Assume UTC = Target Input.
        const targetStr = `${date}T${time}:00`;
        const naiveDate = new Date(targetStr + "Z"); // Treat as UTC first
        let guessTs = naiveDate.getTime();

        // Step B: Check discrepancy. 
        // If we want 09:30 NY, and we guessed 09:30 UTC.
        // 09:30 UTC might be 05:30 NY. Discrepancy = 4 hours.
        // We add 4 hours to the guess.
        
        // Max 3 iterations usually converges perfectly.
        for (let i = 0; i < 3; i++) {
            const guessDate = new Date(guessTs);
            const guessNYStr = guessDate.toLocaleDateString('en-CA', { timeZone: 'America/New_York' }) + 
                               'T' + 
                               guessDate.toLocaleTimeString('en-GB', { timeZone: 'America/New_York', hour12: false });
            
            const targetDateObj = new Date(targetStr); // Local parse just for comparison diff
            const currentNYDateObj = new Date(guessNYStr);
            
            const diff = targetDateObj.getTime() - currentNYDateObj.getTime();
            
            if (Math.abs(diff) < 1000) break; // Close enough
            guessTs += diff;
        }

        const finalTimestamp = Math.floor(guessTs / 1000);
        
        if (!isNaN(finalTimestamp)) {
            onSelect(finalTimestamp);
            onClose();
        }
    };

    return (
        <Portal>
            <div className="fixed inset-0 z-[100000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                <div className="bg-[#050505] border border-white/10 w-full max-w-sm rounded-sm shadow-[0_0_50px_rgba(0,0,0,0.8)] relative overflow-hidden animate-in zoom-in-95 duration-300">
                    {/* Header */}
                    <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
                        <div className="flex items-center gap-2">
                            <Calendar size={16} className="text-primary" />
                            <span className="text-xs font-bold text-white uppercase tracking-widest">Temporal Jump</span>
                        </div>
                        <button onClick={onClose}><X size={16} className="text-zinc-500 hover:text-white"/></button>
                    </div>

                    <div className="p-8 flex flex-col gap-6">
                        {/* Timezone Indicator */}
                        <div className="text-center">
                            <span className="text-[9px] font-mono text-primary bg-primary/10 border border-primary/20 px-2 py-1 rounded-sm uppercase">
                                Calibrated: New York (EST/EDT)
                            </span>
                        </div>

                        {/* Date Input */}
                        <div className="space-y-2">
                            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                <Calendar size={12} /> Target Date
                            </label>
                            <input 
                                type="date" 
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full bg-black border border-white/20 p-3 text-lg font-mono text-center text-white rounded-sm focus:border-primary/50 outline-none uppercase"
                            />
                        </div>

                        {/* Time Input */}
                        <div className="space-y-2">
                            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                <Clock size={12} /> Target Time (NY)
                            </label>
                            <input 
                                type="time" 
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                                className="w-full bg-black border border-white/20 p-3 text-lg font-mono text-center text-white rounded-sm focus:border-primary/50 outline-none"
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-white/5 bg-black/50">
                        <button 
                            onClick={handleConfirm}
                            className="w-full py-3 bg-primary hover:bg-primary/80 text-black font-bold text-xs uppercase tracking-[0.2em] rounded-sm transition-all shadow-glow hover:shadow-glow-lg flex items-center justify-center gap-2"
                        >
                            <span>Initiate Jump</span>
                            <ArrowRight size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </Portal>
    );
};
