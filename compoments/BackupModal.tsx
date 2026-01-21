
import React, { useState } from 'react';
import { Cloud, HardDrive, Check, X, ShieldCheck, Share2 } from 'lucide-react';

interface BackupModalProps {
    onClose: () => void;
    onExecute: (options: { local: boolean; cloud: boolean }) => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({ onClose, onExecute }) => {
    const [local, setLocal] = useState(true);
    const [cloud, setCloud] = useState(false);

    return (
        <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-[#050505] border border-white/10 w-full max-w-sm rounded-sm shadow-[0_0_50px_rgba(0,0,0,0.8)] relative overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
                    <div className="flex items-center gap-2">
                        <ShieldCheck size={16} className="text-emerald-500" />
                        <span className="text-xs font-bold text-white uppercase tracking-widest">System Backup Protocol</span>
                    </div>
                    <button onClick={onClose}><X size={16} className="text-zinc-500 hover:text-white"/></button>
                </div>
                
                <div className="p-6 flex flex-col gap-3">
                    <p className="text-[10px] text-zinc-500 font-mono mb-2 uppercase tracking-wider">Select Uplink Channels</p>
                    
                    {/* Local Toggle */}
                    <div 
                        onClick={() => setLocal(!local)}
                        className={`flex items-center justify-between p-4 rounded-sm border cursor-pointer transition-all duration-300 group ${local ? 'bg-primary/10 border-primary/50' : 'bg-black border-white/10 hover:bg-white/5'}`}
                    >
                        <div className="flex items-center gap-4">
                            <div className={`p-2.5 rounded-full transition-colors ${local ? 'bg-primary/20 text-primary' : 'bg-zinc-800 text-zinc-500'}`}>
                                <HardDrive size={20} />
                            </div>
                            <div>
                                <div className={`text-xs font-bold uppercase mb-0.5 ${local ? 'text-white' : 'text-zinc-500'}`}>Local Hardlink</div>
                                <div className="text-[9px] text-zinc-500 font-mono">Save .json to Device Storage</div>
                            </div>
                        </div>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${local ? 'bg-primary border-primary' : 'border-zinc-700'}`}>
                            {local && <Check size={10} className="text-black" />}
                        </div>
                    </div>

                    {/* Cloud Toggle */}
                    <div 
                        onClick={() => setCloud(!cloud)}
                        className={`flex items-center justify-between p-4 rounded-sm border cursor-pointer transition-all duration-300 group ${cloud ? 'bg-secondary/10 border-secondary/50' : 'bg-black border-white/10 hover:bg-white/5'}`}
                    >
                        <div className="flex items-center gap-4">
                            <div className={`p-2.5 rounded-full transition-colors ${cloud ? 'bg-secondary/20 text-secondary' : 'bg-zinc-800 text-zinc-500'}`}>
                                <Share2 size={20} />
                            </div>
                            <div>
                                <div className={`text-xs font-bold uppercase mb-0.5 ${cloud ? 'text-white' : 'text-zinc-500'}`}>Cloud Uplink</div>
                                <div className="text-[9px] text-zinc-500 font-mono">Google Drive / WhatsApp / Share</div>
                            </div>
                        </div>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${cloud ? 'bg-secondary border-secondary' : 'border-zinc-700'}`}>
                            {cloud && <Check size={10} className="text-white" />}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/5 bg-black/50">
                    <button 
                        onClick={() => onExecute({ local, cloud })}
                        disabled={!local && !cloud}
                        className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs uppercase tracking-[0.2em] rounded-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-glow hover:shadow-glow-lg flex items-center justify-center gap-2"
                    >
                        <span>Execute Protocol</span>
                        <Cloud size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
};
