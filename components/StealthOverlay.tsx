
import React, { useState, useEffect } from 'react';
import { Activity, Lock } from 'lucide-react';
import { SentinelLog } from '../types';

interface StealthOverlayProps {
    onUnlock: () => void;
    logs: SentinelLog[];
}

export const StealthOverlay: React.FC<StealthOverlayProps> = ({ onUnlock, logs }) => {
    const [position, setPosition] = useState({ x: 50, y: 50 });
    const lastLog = logs.length > 0 ? logs[0] : null;

    // Pixel shift to prevent burn-in (Moves every 10 seconds)
    useEffect(() => {
        const interval = setInterval(() => {
            setPosition({
                x: Math.random() * 60 + 20, // Keep within 20-80% of screen
                y: Math.random() * 60 + 20
            });
        }, 10000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div 
            onClick={onUnlock}
            className="fixed inset-0 z-[9999] bg-black flex items-center justify-center touch-manipulation"
        >
            {/* Moving Indicator */}
            <div 
                className="absolute flex flex-col items-center gap-4 transition-all duration-[2000ms] ease-in-out pointer-events-none"
                style={{ left: `${position.x}%`, top: `${position.y}%`, transform: 'translate(-50%, -50%)' }}
            >
                <div className="relative">
                    <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full animate-pulse"></div>
                    <Activity size={48} className="text-emerald-900/50 relative z-10" />
                </div>
                
                <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] font-mono text-emerald-900 uppercase tracking-[0.3em] animate-pulse">
                        SENTINEL ACTIVE
                    </span>
                    {lastLog && (
                        <span className="text-[8px] font-mono text-zinc-900 whitespace-nowrap max-w-[200px] truncate">
                            {lastLog.message}
                        </span>
                    )}
                </div>
            </div>
            
            {/* Unlock Hint */}
            <div className="absolute bottom-12 text-zinc-900 text-[9px] font-mono uppercase tracking-widest flex items-center gap-2 opacity-50">
                <Lock size={10} /> Tap screen to wake
            </div>
        </div>
    );
};
