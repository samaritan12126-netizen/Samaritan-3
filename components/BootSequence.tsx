
import React, { useEffect, useState, useRef } from 'react';
import { audio } from '../services/audio';
import { BrainCircuit, Cpu, ShieldCheck, Database, Radio } from 'lucide-react';

interface BootSequenceProps {
    onComplete: () => void;
}

export const BootSequence: React.FC<BootSequenceProps> = ({ onComplete }) => {
    const [lines, setLines] = useState<string[]>([]);
    const [progress, setProgress] = useState(0);
    const [stage, setStage] = useState(0); // 0: Init, 1: Loading, 2: Complete
    const containerRef = useRef<HTMLDivElement>(null);

    const BOOT_LOG = [
        "INITIALIZING SAMARITAN KERNEL v1.5...",
        "MOUNTING FILE SYSTEM... OK",
        "LOADING NEURAL WEIGHTS [GEMINI-3-PRO]... OK",
        "ESTABLISHING HYDRA DATA LINK... OK",
        "VERIFYING SENTINEL PROTOCOLS... OK",
        "CONNECTING TO GLOBAL GRID... OK",
        "CALIBRATING AUDIO VISUALIZERS... OK",
        "SYSTEM READY."
    ];

    useEffect(() => {
        // audio.play('BOOT'); // Removed to prevent delayed siren effect on interaction
        
        let currentLine = 0;
        const lineInterval = setInterval(() => {
            if (currentLine < BOOT_LOG.length) {
                setLines(prev => [...prev, BOOT_LOG[currentLine]]);
                audio.play('TYPING');
                
                if (containerRef.current) {
                    containerRef.current.scrollTop = containerRef.current.scrollHeight;
                }
                currentLine++;
            } else {
                clearInterval(lineInterval);
                setStage(1);
            }
        }, 150); // Speed of text

        return () => clearInterval(lineInterval);
    }, []);

    useEffect(() => {
        if (stage === 1) {
            const progressInterval = setInterval(() => {
                setProgress(prev => {
                    const next = prev + 2;
                    if (next >= 100) {
                        clearInterval(progressInterval);
                        setStage(2);
                        setTimeout(onComplete, 800); // Delay before unmount
                        return 100;
                    }
                    return next;
                });
            }, 20); // Speed of progress bar
            return () => clearInterval(progressInterval);
        }
    }, [stage, onComplete]);

    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center font-mono cursor-wait">
            <div className="w-full max-w-lg p-8 flex flex-col gap-8">
                
                {/* LOGO */}
                <div className="flex items-center justify-center gap-4 animate-pulse">
                    <BrainCircuit size={48} className="text-primary" />
                    <div className="flex flex-col">
                        <h1 className="text-3xl font-bold text-white tracking-[0.3em]">THE SAMARITAN</h1>
                        <span className="text-xs text-zinc-500 uppercase tracking-widest text-right">System Version 1.5</span>
                    </div>
                </div>

                {/* LOG */}
                <div 
                    ref={containerRef}
                    className="h-32 overflow-hidden border-l-2 border-primary/30 pl-4 flex flex-col justify-end"
                >
                    {lines.map((line, i) => (
                        <div key={i} className="text-xs text-primary/80 mb-1">
                            <span className="opacity-50 mr-2">{`>`}</span>
                            {line}
                        </div>
                    ))}
                </div>

                {/* PROGRESS */}
                <div className="space-y-2">
                    <div className="flex justify-between text-[10px] text-zinc-500 uppercase">
                        <span>Loading Core Modules</span>
                        <span>{progress}%</span>
                    </div>
                    <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-primary shadow-[0_0_15px_rgba(6,182,212,0.8)] transition-all duration-75"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                </div>

                {/* ICONS */}
                <div className="flex justify-center gap-8 text-zinc-700">
                    <Cpu size={16} className={progress > 20 ? "text-zinc-500" : ""} />
                    <Database size={16} className={progress > 40 ? "text-zinc-500" : ""} />
                    <Radio size={16} className={progress > 60 ? "text-zinc-500" : ""} />
                    <ShieldCheck size={16} className={progress > 80 ? "text-zinc-500" : ""} />
                </div>
            </div>
        </div>
    );
};
