
import React, { useRef, useEffect, useState } from 'react';
import { WatchlistAsset, SentinelLog } from '../types';
import { Eye, Activity, Terminal, Shield, Scan, Lock, AlertTriangle, ChevronRight, EyeOff, Radio, Sun, Moon, Ghost, PictureInPicture } from 'lucide-react';
import { useWakeLock } from '../hooks/useWakeLock';

interface SentinelPanelProps {
  assets: WatchlistAsset[];
  logs: SentinelLog[];
  lastSnapshot: string | null;
  isEnabled: boolean;
  onToggle: () => void;
  className?: string;
  compact?: boolean;
  onEnableStealth?: () => void;
  isLocked?: boolean;
}

export const SentinelPanel: React.FC<SentinelPanelProps> = ({ 
  assets, 
  logs, 
  lastSnapshot,
  isEnabled,
  onToggle,
  className,
  compact = false,
  onEnableStealth,
  isLocked = false
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { isLocked: isWakeLocked, toggleLock } = useWakeLock();
  
  // GHOST PROTOCOL (PiP Hack)
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isGhostActive, setIsGhostActive] = useState(false);

  useEffect(() => {
    if (scrollRef.current) {
        requestAnimationFrame(() => {
             if (scrollRef.current) scrollRef.current.scrollTop = 0; 
        });
    }
  }, [logs]);

  // Ghost Protocol: Initialize Stream
  useEffect(() => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      if (canvas && video && isGhostActive) {
          const ctx = canvas.getContext('2d');
          
          // Draw loop to keep stream "active"
          const draw = () => {
              if (!ctx) return;
              ctx.fillStyle = isEnabled ? '#10b981' : '#3f3f46';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              
              // Minimal rendering for efficiency
              if (isEnabled) {
                  ctx.fillStyle = '#fff';
                  ctx.font = '10px monospace';
                  ctx.fillText("RUN", 5, 25);
              }
              
              if (isGhostActive) requestAnimationFrame(draw);
          };
          draw();

          const stream = canvas.captureStream(1); // 1 FPS is enough
          video.srcObject = stream;
          video.play().catch(e => console.error("Ghost Protocol Video Play Failed", e));
      }
  }, [isGhostActive, isEnabled]);

  const toggleGhostProtocol = async () => {
      const video = videoRef.current;
      if (!video) return;

      try {
          if (document.pictureInPictureElement) {
              await document.exitPictureInPicture();
              setIsGhostActive(false);
          } else {
              setIsGhostActive(true);
              // Slight delay to ensure render cycle handles the stream setup
              setTimeout(async () => {
                  await video.requestPictureInPicture();
              }, 100);
          }
      } catch (e) {
          console.error("Ghost Protocol Failed:", e);
          setIsGhostActive(false);
          alert("Ghost Protocol Failed. Browser may not support PiP API.");
      }
  };

  const activeAsset = assets.find(a => a.status !== 'IDLE' && a.status !== 'COOLDOWN');

  // --- LAYOUT CLASSES (INCREASED HEIGHTS) ---
  const containerClass = compact 
    ? 'flex-col h-auto w-full' 
    : 'flex-col lg:flex-row lg:h-[300px] w-full';

  const retinaClass = compact 
    ? 'h-[250px] w-full border-b border-white/5 relative' 
    : 'h-[250px] lg:h-full lg:w-[450px] border-b lg:border-b-0 lg:border-r border-white/5 shrink-0 relative';

  const cycleClass = compact
    ? 'h-[180px] w-full border-b border-white/5'
    : 'h-[150px] lg:h-full lg:w-[280px] border-b lg:border-b-0 lg:border-r border-white/5 shrink-0 relative';

  const logClass = compact
    ? 'h-[250px] w-full'
    : 'h-[200px] w-full lg:h-full lg:w-auto lg:flex-1 min-w-0 relative';

  return (
    <div className={`bg-[#020202] border border-white/10 rounded-sm overflow-hidden flex ${containerClass} shadow-2xl ${className || ''}`}>
        
        {/* Hidden Elements for Ghost Protocol */}
        {/* Reduced size to 64x64 for minimal footprint */}
        <canvas ref={canvasRef} width="64" height="64" className="hidden" />
        <video ref={videoRef} muted autoPlay playsInline className="hidden" />

        {/* SECTION 1: VISUAL CONTROL (RETINA) */}
        <div className={`${retinaClass} flex flex-col bg-black`}>
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-20 p-2 flex items-center justify-between pointer-events-none">
                <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-sm border border-white/5">
                    <Shield size={10} className={isEnabled ? "text-emerald-500 animate-pulse" : "text-zinc-500"} />
                    <span className="text-[9px] font-bold text-white uppercase tracking-widest font-mono">RETINA</span>
                    {isLocked && <Lock size={10} className="text-emerald-500 ml-1" />}
                </div>
                
                <div className="flex gap-2 pointer-events-auto">
                    {onEnableStealth && (
                        <button 
                            onClick={onEnableStealth}
                            className="p-1.5 rounded-sm border border-white/10 bg-black/60 text-zinc-500 hover:text-white hover:bg-white/10 backdrop-blur-sm transition-all"
                            title="Stealth Mode (OLED Saver)"
                        >
                            <Ghost size={10} />
                        </button>
                    )}

                    <button 
                        onClick={toggleGhostProtocol}
                        className={`p-1.5 rounded-sm border transition-all backdrop-blur-sm ${isGhostActive ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-500' : 'bg-black/60 border-white/10 text-zinc-500 hover:text-white'}`}
                        title={isGhostActive ? "Ghost Protocol Active (Background Run)" : "Enable Ghost Protocol"}
                    >
                        <PictureInPicture size={10} className={isGhostActive ? "animate-pulse" : ""} />
                    </button>

                    <button 
                        onClick={toggleLock}
                        className={`p-1.5 rounded-sm border transition-all backdrop-blur-sm ${isWakeLocked ? 'bg-amber-500/20 border-amber-500/50 text-amber-500' : 'bg-black/60 border-white/10 text-zinc-500 hover:text-white'}`}
                        title={isWakeLocked ? "Insomnia Mode Active (Screen On)" : "Enable Insomnia Mode"}
                    >
                        {isWakeLocked ? <Sun size={10} className="animate-pulse" /> : <Moon size={10} />}
                    </button>

                    <button 
                    onClick={onToggle}
                    className={`px-2 py-1 rounded-sm border text-[8px] font-bold uppercase tracking-widest transition-all backdrop-blur-sm ${isEnabled ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-500 shadow-glow-sm hover:bg-emerald-500/30' : 'bg-black/60 border-white/10 text-zinc-500 hover:text-white hover:bg-white/10'}`}
                    >
                    {isEnabled ? 'Disengage' : 'Engage'}
                    </button>
                </div>
            </div>

            {/* Retina Feed */}
            <div className="relative w-full h-full bg-black overflow-hidden group flex items-center justify-center">
                <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" 
                     style={{ 
                         backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(6, 182, 212, 0.1) 0%, transparent 50%), linear-gradient(0deg, transparent 24%, rgba(255, 255, 255, .05) 25%, rgba(255, 255, 255, .05) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, .05) 75%, rgba(255, 255, 255, .05) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(255, 255, 255, .05) 25%, rgba(255, 255, 255, .05) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, .05) 75%, rgba(255, 255, 255, .05) 76%, transparent 77%, transparent)',
                         backgroundSize: '50px 50px'
                     }}>
                </div>
                
                {lastSnapshot ? (
                  <div className="relative w-full h-full">
                     <img src={lastSnapshot} className="w-full h-full object-cover opacity-80 transition-opacity duration-1000" />
                     <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-20 pointer-events-none bg-[length:100%_2px,3px_100%] animate-scan"></div>
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-zinc-700 relative z-10">
                      {isEnabled ? (
                          <div className="flex flex-col items-center animate-pulse">
                              <div className="relative mb-3">
                                  <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping"></div>
                                  <div className="w-12 h-12 rounded-full border border-emerald-500/30 flex items-center justify-center bg-black">
                                      <Activity size={20} className="text-emerald-500" />
                                  </div>
                              </div>
                              <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-500">Scanning...</span>
                          </div>
                      ) : (
                          <div className="flex flex-col items-center opacity-50">
                             <EyeOff size={24} className="mb-2 opacity-50" />
                             <span className="text-[9px] font-mono uppercase tracking-widest">Offline</span>
                          </div>
                      )}
                  </div>
                )}
                <div className="absolute bottom-2 left-2 z-30 flex items-center gap-2">
                    {activeAsset && <span className="bg-black/80 text-white text-[9px] font-bold font-mono px-1.5 py-0.5 rounded-sm border border-white/10 animate-in fade-in">{activeAsset.symbol}</span>}
                </div>
            </div>
        </div>

        {/* SECTION 2: TARGET CYCLE */}
        <div className={`${cycleClass} flex flex-col bg-[#030303]`}>
            <div className="p-2 border-b border-white/5 flex items-center gap-2 bg-black/40 h-8 shrink-0">
               <Radio size={10} className={isEnabled ? "text-secondary animate-pulse" : "text-zinc-600"} />
               <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Cycle</span>
               {isLocked && <span className="text-[8px] bg-emerald-500/10 text-emerald-500 px-1 rounded">LOCKED</span>}
            </div>
            
            <div className="flex-1 relative min-h-0">
               <div className="absolute inset-0 overflow-y-auto custom-scrollbar p-1 space-y-0.5">
                  {assets.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-zinc-700 text-[9px] font-mono">
                          {isLocked ? "TARGET LOCKED" : "NO TARGETS"}
                      </div>
                  ) : (
                      assets.map(asset => {
                          const isActive = asset.status !== 'IDLE' && asset.status !== 'COOLDOWN';
                          return (
                            <div key={asset.symbol} className={`flex items-center justify-between px-2 py-1.5 rounded-sm border transition-all duration-300 ${isActive ? 'bg-white/5 border-secondary/30' : 'bg-transparent border-transparent opacity-50'}`}>
                                <div className="flex items-center gap-2">
                                    <div className={`w-1 h-1 rounded-full transition-all duration-300 ${isActive ? 'bg-secondary shadow-[0_0_8px_rgba(139,92,246,1)] scale-150' : 'bg-zinc-800'}`}></div>
                                    <span className={`text-[9px] font-mono font-bold transition-colors ${isActive ? 'text-white' : 'text-zinc-500'}`}>{asset.symbol}</span>
                                </div>
                                {isActive && <Activity size={8} className="text-secondary animate-pulse" />}
                            </div>
                          );
                      })
                  )}
               </div>
            </div>
        </div>

        {/* SECTION 3: CORTEX LOG */}
        <div className={`${logClass} flex flex-col bg-black overflow-hidden`}>
             <div className="p-2 border-b border-white/5 bg-white/5 flex items-center justify-between h-8 shrink-0">
                <div className="flex items-center gap-2">
                   <Terminal size={10} className="text-zinc-400" />
                   <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Cortex Log</span>
                </div>
                <div className="flex gap-1 opacity-50">
                   <div className="w-1 h-1 bg-zinc-600 rounded-full"></div>
                   <div className="w-1 h-1 bg-zinc-600 rounded-full"></div>
                </div>
             </div>
             
             <div className="flex-1 relative w-full min-h-0">
                 <div ref={scrollRef} className="absolute inset-0 overflow-y-auto custom-scrollbar p-2 font-mono text-[9px] space-y-1 bg-[#020202]">
                     {logs.length === 0 && (
                         <div className="flex flex-col items-center justify-center h-full text-zinc-800 gap-2">
                             <div className="w-1 h-1 bg-zinc-800 rounded-full animate-ping"></div>
                             <span>AWAITING DATA</span>
                         </div>
                     )}
                     {logs.map(log => (
                        <div key={log.id} className="flex gap-2 opacity-80 hover:opacity-100 transition-opacity pl-1 border-l border-transparent hover:border-white/20">
                           <span className="text-zinc-600 shrink-0">[{new Date(log.timestamp).toLocaleTimeString([], {hour12: false, hour:'2-digit', minute:'2-digit', second:'2-digit'})}]</span>
                           <div className="flex flex-col min-w-0 flex-1">
                               <span className={`font-bold uppercase truncate ${
                                   log.type === 'ERROR' ? 'text-rose-500' : 
                                   log.type === 'SUCCESS' ? 'text-emerald-500' : 
                                   log.type === 'WARNING' ? 'text-amber-500' : 'text-primary'
                               }`}>
                                  {log.asset}
                               </span>
                               <span className="text-zinc-400 break-words leading-tight">{log.message}</span>
                           </div>
                        </div>
                     ))}
                 </div>
             </div>
        </div>
    </div>
  );
};
