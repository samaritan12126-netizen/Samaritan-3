
import React, { useState, useRef, useEffect } from 'react';
import { 
  BrainCircuit, Trash2, Search, FileImage, Database, Folder, Layers,
  Edit2, Check, X, Upload, Play, Clock, ToggleLeft, ToggleRight, History, 
  UploadCloud, Share2, ShieldCheck, ArrowLeft, Network, ShieldAlert, QrCode, Scan, Merge, ThumbsUp, ThumbsDown, MessageSquare, Zap, Activity
} from 'lucide-react';
import { NeuralDB, Concept, Nugget, Strategy, Timeframe, View, EvolutionLog } from '../types';
import { storage } from '../services/storage';
import { proposeConceptMergeName, proposeConceptMergeDescription, queryKnowledgeBase } from '../services/geminiService';
import { BackupModal } from './BackupModal';
import { NeuralGraph } from './NeuralGraph'; 
import { ThinkingIndicator } from './ThinkingIndicator';
import ReactMarkdown from 'react-markdown';

type Tab = 'NUGGETS' | 'CONCEPTS' | 'STRATEGIES' | 'GRAPH';

interface KnowledgeBaseProps {
  db: NeuralDB;
  onRefreshDb: () => Promise<void>;
  onValidate: (strategy: Strategy) => void;
  onNavigate: (view: View) => void;
}

const ConceptMultiSelect: React.FC<{
  selectedIds: string[];
  concepts: Concept[];
  onChange: (ids: string[]) => void;
}> = ({ selectedIds, concepts, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const safeConcepts = concepts || [];
  const filtered = safeConcepts.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  const toggleSelection = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(sid => sid !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <div className="relative" ref={wrapperRef}>
       <div 
         onClick={() => setIsOpen(true)}
         className={`w-full bg-black border border-white/10 p-3 text-sm text-white rounded-sm min-h-[46px] cursor-text flex flex-wrap gap-2 transition-all ${isOpen ? 'border-secondary/50 shadow-glow-sm' : ''}`}
       >
         {selectedIds.length === 0 && <span className="text-zinc-500 self-center">Select concepts...</span>}
         {selectedIds.map(id => {
           const concept = safeConcepts.find(c => c.id === id);
           return concept ? (
             <span key={id} className="bg-secondary/20 text-secondary border border-secondary/30 px-2 py-0.5 rounded-sm text-[10px] font-bold flex items-center gap-1">
               {concept.name}
               <button onClick={(e) => { e.stopPropagation(); toggleSelection(id); }} className="hover:text-white"><X size={10} /></button>
             </span>
           ) : null;
         })}
       </div>

       {isOpen && (
         <div className="absolute top-full left-0 w-full bg-[#050505] border border-white/10 mt-1 z-50 shadow-2xl rounded-sm max-h-60 overflow-hidden flex flex-col">
            <div className="p-2 border-b border-white/5 flex items-center gap-2">
               <Search size={14} className="text-zinc-500" />
               <input 
                 autoFocus
                 type="text" 
                 value={search}
                 onChange={(e) => setSearch(e.target.value)}
                 placeholder="Search concepts..."
                 className="bg-transparent border-none text-xs text-white focus:outline-none w-full font-mono placeholder-zinc-700"
               />
            </div>
            <div className="overflow-y-auto custom-scrollbar flex-1">
               {filtered.map(c => (
                 <div 
                   key={c.id} 
                   onClick={() => toggleSelection(c.id)}
                   className="px-3 py-2 text-xs text-zinc-300 hover:bg-white/5 cursor-pointer flex items-center justify-between group"
                 >
                   <span>{c.name}</span>
                   {selectedIds.includes(c.id) && <Check size={14} className="text-secondary" />}
                 </div>
               ))}
               {filtered.length === 0 && (
                 <div className="p-3 text-[10px] text-zinc-600 font-mono text-center">No concepts found</div>
               )}
            </div>
         </div>
       )}
    </div>
  );
};

export const KnowledgeBase: React.FC<KnowledgeBaseProps> = ({
  db,
  onRefreshDb,
  onValidate,
  onNavigate
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('NUGGETS');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [shareItem, setShareItem] = useState<any | null>(null); // QR Share

  // --- CONCEPT MERGE STATE ---
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedForMerge, setSelectedForMerge] = useState<string[]>([]);
  const [mergeStage, setMergeStage] = useState<'IDLE' | 'NAME' | 'DESC' | 'COMMIT'>('IDLE');
  const [mergeProposal, setMergeProposal] = useState<{ name: string, desc: string }>({ name: '', desc: '' });
  const [isReasoning, setIsReasoning] = useState(false);
  const [feedbackInput, setFeedbackInput] = useState('');
  const [showFeedbackInput, setShowFeedbackInput] = useState(false);

  // --- NEURAL SEARCH STATE ---
  const [isNeuralSearch, setIsNeuralSearch] = useState(false);
  const [neuralAnswer, setNeuralAnswer] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  // Safe Wrappers
  const safeConcepts = db?.concepts || [];
  const safeNuggets = db?.nuggets || [];
  const safeStrategies = db?.strategies || [];

  const startEdit = (item: any, type: Tab) => {
    setEditingItem({ ...item, type });
    if (type === 'CONCEPTS') {
      setEditForm({ name: item.name, description: item.description });
    } else if (type === 'NUGGETS') {
      setEditForm({ 
        title: item.title, 
        content: item.content, 
        conceptIds: item.conceptIds || [], 
        imageData: item.imageData || null 
      });
    } else {
      setEditForm({ name: item.name, content: item.content, timeframes: item.requiredTimeframes || [], isActive: item.isActive, executionStatus: item.executionStatus });
    }
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setEditForm({});
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    
    try {
        if (editingItem.type === 'CONCEPTS') {
           await storage.saveConcept({ ...editingItem, name: editForm.name, description: editForm.description });
        } else if (editingItem.type === 'NUGGETS') {
           await storage.saveNugget({ ...editingItem, title: editForm.title, content: editForm.content, conceptIds: editForm.conceptIds, imageData: editForm.imageData });
        } else {
           const oldStrategy = editingItem as Strategy;
           const newVersion = {
              version: (oldStrategy.versions?.length || 0) + 1,
              timestamp: Date.now(),
              content: oldStrategy.content
           };
           const updatedVersions = [...(oldStrategy.versions || []), newVersion];
           
           await storage.saveStrategy({ 
               ...editingItem, 
               name: editForm.name, 
               content: editForm.content, 
               requiredTimeframes: editForm.timeframes, 
               isActive: editForm.isActive,
               executionStatus: editForm.executionStatus, 
               versions: updatedVersions
           });
        }
        await onRefreshDb();
        setEditingItem(null);
    } catch (e) {
        console.error("Update failed", e);
    }
  };

  const handleDelete = async (id: string, type: string) => {
      if (!confirm("Are you sure? This action cannot be undone.")) return;
      if (type === 'concept') await storage.deleteConcept(id);
      if (type === 'nugget') await storage.deleteNugget(id);
      if (type === 'strategy') await storage.deleteStrategy(id);
      await onRefreshDb();
  };

  const handleToggleStrategyActive = async (strategy: Strategy, e: React.MouseEvent) => {
     e.stopPropagation();
     await storage.saveStrategy({ ...strategy, isActive: !strategy.isActive });
     await onRefreshDb();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditForm((prev: any) => ({ ...prev, imageData: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleExecuteBackup = async (options: { local: boolean; cloud: boolean }) => {
      const dataStr = JSON.stringify(db, null, 2);
      const dateStr = new Date().toISOString().split('T')[0];
      const fileName = `cortex_backup_${dateStr}.json`;
      const file = new File([dataStr], fileName, { type: "application/json" });

      if (options.local) {
          const blob = new Blob([dataStr], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
      }

      if (options.cloud) {
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
              try {
                  await navigator.share({
                      title: 'Samaritan Neural Backup',
                      text: `Critical knowledge base export (${dateStr}). Save to Drive, Gmail, or WhatsApp.`,
                      files: [file]
                  });
              } catch (err) {
                  console.warn("Share cancelled or failed", err);
              }
          } else {
              alert("Cloud Uplink not supported on this device/browser. Local backup was generated.");
          }
      }
      
      setShowBackupModal(false);
  };

  const handleImportHive = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (ev) => {
          try {
              const importedDB = JSON.parse(ev.target?.result as string);
              if (importedDB.concepts && importedDB.nuggets && importedDB.strategies) {
                  for (const c of importedDB.concepts) await storage.saveConcept(c);
                  for (const n of importedDB.nuggets) await storage.saveNugget(n);
                  for (const s of importedDB.strategies) await storage.saveStrategy(s);
                  await onRefreshDb();
                  alert("Knowledge Base Imported Successfully.");
              } else {
                  alert("Invalid Cortex File Format.");
              }
          } catch (err) {
              alert("Import Failed: Corrupt Data");
          }
      };
      reader.readAsText(file);
  };

  const toggleEditTimeframe = (tf: Timeframe) => {
    setEditForm((prev: any) => {
      const current = prev.timeframes || [];
      if (current.includes(tf)) return { ...prev, timeframes: current.filter((t: any) => t !== tf) };
      return { ...prev, timeframes: [...current, tf] };
    });
  };

  const handleGraphNodeClick = (id: string, type: 'CONCEPT' | 'NUGGET' | 'STRATEGY') => {
      const pluralType = type === 'CONCEPT' ? 'CONCEPTS' : type === 'NUGGET' ? 'NUGGETS' : 'STRATEGIES';
      setActiveTab(pluralType);
      
      let item;
      if (type === 'CONCEPT') item = safeConcepts.find(c => c.id === id);
      else if (type === 'NUGGET') item = safeNuggets.find(n => n.id === id);
      else item = safeStrategies.find(s => s.id === id);
      
      if (item) {
          startEdit(item, pluralType);
      }
  };

  // --- CONCEPT MERGE LOGIC ---
  const toggleMergeSelect = (id: string) => {
      if (selectedForMerge.includes(id)) {
          setSelectedForMerge(prev => prev.filter(mid => mid !== id));
      } else {
          if (selectedForMerge.length < 2) {
              setSelectedForMerge(prev => [...prev, id]);
          }
      }
  };

  const initiateMerge = async () => {
      if (selectedForMerge.length !== 2) return;
      const c1 = safeConcepts.find(c => c.id === selectedForMerge[0]);
      const c2 = safeConcepts.find(c => c.id === selectedForMerge[1]);
      if (!c1 || !c2) return;

      setMergeStage('NAME');
      setIsReasoning(true);
      
      try {
          const name = await proposeConceptMergeName(c1, c2);
          setMergeProposal(prev => ({ ...prev, name }));
      } catch (e) {
          alert("Merge Proposal Failed");
          setMergeStage('IDLE');
      } finally {
          setIsReasoning(false);
      }
  };

  const handleFeedbackSubmit = async (approved: boolean) => {
      const c1 = safeConcepts.find(c => c.id === selectedForMerge[0])!;
      const c2 = safeConcepts.find(c => c.id === selectedForMerge[1])!;

      if (approved) {
          if (mergeStage === 'NAME') {
              // Move to Desc
              setMergeStage('DESC');
              setIsReasoning(true);
              const desc = await proposeConceptMergeDescription(c1, c2, mergeProposal.name);
              setMergeProposal(prev => ({ ...prev, desc }));
              setIsReasoning(false);
          } else if (mergeStage === 'DESC') {
              // Move to Commit
              setMergeStage('COMMIT');
          }
      } else {
          // Rejected - Retry with feedback
          const feedback = feedbackInput;
          setFeedbackInput('');
          setShowFeedbackInput(false);
          setIsReasoning(true);

          // Log feedback for training
          await storage.saveEvolutionLog({
              id: Math.random().toString(36).substr(2, 9),
              timestamp: Date.now(),
              insight: `User rejected merge proposal. Feedback: ${feedback}`,
              trigger: 'USER_FEEDBACK',
              adaptation: 'Refine future conceptual merging logic.'
          });

          if (mergeStage === 'NAME') {
              const name = await proposeConceptMergeName(c1, c2, feedback);
              setMergeProposal(prev => ({ ...prev, name }));
          } else if (mergeStage === 'DESC') {
              const desc = await proposeConceptMergeDescription(c1, c2, mergeProposal.name, feedback);
              setMergeProposal(prev => ({ ...prev, desc }));
          }
          setIsReasoning(false);
      }
  };

  const commitMerge = async () => {
      const newConcept: Concept = {
          id: Math.random().toString(36).substr(2, 9),
          name: mergeProposal.name,
          description: mergeProposal.desc,
          timestamp: Date.now()
      };
      
      await storage.mergeConcepts(selectedForMerge[0], selectedForMerge[1], newConcept);
      await onRefreshDb();
      setMergeStage('IDLE');
      setSelectedForMerge([]);
      setIsSelectionMode(false);
  };

  // --- NEURAL SEARCH HANDLER ---
  const handleSearchKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
          // If in neural mode or explicit trigger
          if (isNeuralSearch || searchQuery.includes('?')) {
              await executeNeuralSearch();
          }
      }
  };

  const executeNeuralSearch = async () => {
      if (!searchQuery.trim()) return;
      setIsSearching(true);
      setNeuralAnswer(null);
      setIsNeuralSearch(true); // Switch to neural view

      try {
          const result = await queryKnowledgeBase(searchQuery, db);
          setNeuralAnswer(result);
      } catch (e) {
          setNeuralAnswer("Neural Search Failed: " + (e as any).message);
      } finally {
          setIsSearching(false);
      }
  };

  const filteredConcepts = safeConcepts.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredNuggets = safeNuggets.filter(n => 
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    n.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredStrategies = safeStrategies.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleShare = (item: any) => {
      setShareItem(item);
  };

  return (
    <div className="flex flex-col h-full bg-[#000000] text-zinc-200 overflow-hidden relative font-sans">
      
      {showBackupModal && (
          <BackupModal 
             onClose={() => setShowBackupModal(false)}
             onExecute={handleExecuteBackup}
          />
      )}

      {/* SHARE MODAL (QR) */}
      {shareItem && (
          <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white p-6 rounded-sm w-full max-w-sm flex flex-col items-center gap-4 text-black">
                  <h3 className="text-sm font-bold uppercase tracking-widest">Share Neural Pattern</h3>
                  <div className="text-xs font-mono text-center mb-2">{shareItem.name || shareItem.title}</div>
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(JSON.stringify(shareItem))}`} 
                    className="w-48 h-48 border-4 border-black"
                  />
                  <p className="text-[10px] text-zinc-500 text-center mt-2">Scan with another Samaritan unit to import.</p>
                  <button onClick={() => setShareItem(null)} className="w-full py-3 bg-black text-white font-bold uppercase text-xs rounded-sm">Close</button>
              </div>
          </div>
      )}

      {/* MERGE WIZARD MODAL */}
      {mergeStage !== 'IDLE' && (
          <div className="fixed inset-0 z-[80] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-[#050505] border border-violet-500/30 w-full max-w-lg rounded-sm shadow-2xl relative overflow-hidden flex flex-col">
                  <div className="p-4 border-b border-violet-500/20 bg-violet-500/5 flex items-center gap-2">
                      <Merge size={18} className="text-violet-500 animate-pulse" />
                      <span className="text-sm font-bold text-white uppercase tracking-widest">Concept Fusion Protocol</span>
                  </div>
                  
                  <div className="p-8 flex flex-col gap-6 items-center text-center">
                      {isReasoning ? (
                          <ThinkingIndicator label="Synthesizing Knowledge..." />
                      ) : (
                          <>
                              <div className="flex flex-col gap-1">
                                  <span className="text-[10px] text-zinc-500 uppercase tracking-widest">
                                      {mergeStage === 'NAME' ? 'Proposed Designation' : mergeStage === 'DESC' ? 'Unified Definition' : 'Final Review'}
                                  </span>
                                  <h2 className="text-2xl font-bold text-white font-mono">{mergeProposal.name}</h2>
                              </div>

                              {mergeStage !== 'NAME' && (
                                  <div className="bg-black/50 p-4 rounded-sm border border-white/10 text-xs text-zinc-300 font-mono text-left w-full h-32 overflow-y-auto custom-scrollbar">
                                      {mergeProposal.desc}
                                  </div>
                              )}

                              {mergeStage === 'COMMIT' ? (
                                  <button onClick={commitMerge} className="w-full py-3 bg-violet-500 hover:bg-violet-600 text-white font-bold uppercase tracking-widest text-xs rounded-sm">
                                      Commit to Cortex
                                  </button>
                              ) : (
                                  <div className="w-full">
                                      {!showFeedbackInput ? (
                                          <div className="flex gap-4 w-full">
                                              <button 
                                                  onClick={() => setShowFeedbackInput(true)} 
                                                  className="flex-1 py-3 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 text-rose-500 flex items-center justify-center gap-2 rounded-sm transition-all"
                                              >
                                                  <ThumbsDown size={16} /> Reject
                                              </button>
                                              <button 
                                                  onClick={() => handleFeedbackSubmit(true)} 
                                                  className="flex-1 py-3 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-500 flex items-center justify-center gap-2 rounded-sm transition-all"
                                              >
                                                  <ThumbsUp size={16} /> Approve
                                              </button>
                                          </div>
                                      ) : (
                                          <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2">
                                              <textarea 
                                                  value={feedbackInput}
                                                  onChange={e => setFeedbackInput(e.target.value)}
                                                  placeholder="Reason for rejection (e.g. 'Too vague', 'Missing key detail')..."
                                                  className="w-full bg-black border border-rose-500/30 p-2 text-xs text-white rounded-sm focus:outline-none min-h-[80px]"
                                              />
                                              <div className="flex gap-2">
                                                  <button onClick={() => setShowFeedbackInput(false)} className="px-4 py-2 bg-zinc-800 text-zinc-400 text-xs font-bold uppercase rounded-sm">Cancel</button>
                                                  <button onClick={() => handleFeedbackSubmit(false)} className="flex-1 py-2 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold uppercase rounded-sm">Submit Feedback</button>
                                              </div>
                                          </div>
                                      )}
                                  </div>
                              )}
                          </>
                      )}
                  </div>
              </div>
          </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between px-6 py-4 border-b border-white/5 bg-[#050505]/90 backdrop-blur-md z-20 gap-4">
         <div className="flex items-center gap-4">
            <button onClick={() => onNavigate('TERMINAL')} className="text-zinc-500 hover:text-white transition-colors">
                <ArrowLeft size={18} />
            </button>
            <div className="w-10 h-10 rounded-sm bg-secondary/10 border border-secondary/20 flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.2)] shrink-0">
               <Database size={20} className="text-secondary" />
            </div>
            <div>
               <h2 className="text-lg font-bold text-white tracking-widest uppercase font-mono">Knowledge Base</h2>
               <p className="text-[10px] text-zinc-500 font-mono uppercase">Manage Neural Engrams</p>
            </div>
         </div>

         <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowBackupModal(true)} 
              className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-sm text-[10px] font-bold uppercase tracking-wider text-emerald-500 hover:text-emerald-400 transition-all shadow-glow-sm"
            >
                <Share2 size={12} /> Cloud Uplink
            </button>
            
            {/* SCAN BUTTON */}
            <div className="relative group">
                <button className="flex items-center gap-2 px-3 py-1.5 bg-black border border-white/10 hover:bg-white/5 rounded-sm text-[10px] font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition-all">
                    <Scan size={12} /> Scan
                </button>
                <div className="absolute top-full right-0 mt-2 w-48 bg-zinc-900 border border-white/10 p-2 rounded-sm hidden group-hover:block z-50">
                    <div className="text-[9px] text-zinc-500 mb-2">Simulate Scan (Paste JSON)</div>
                    <input 
                        className="w-full bg-black border border-white/10 text-xs p-1 text-white" 
                        onKeyDown={(e) => {
                            if(e.key === 'Enter') {
                                try {
                                    const obj = JSON.parse((e.target as HTMLInputElement).value);
                                    if(obj.name) storage.saveStrategy(obj); // Assuming strategy for demo
                                    onRefreshDb();
                                    alert('Imported!');
                                    (e.target as HTMLInputElement).value = '';
                                } catch(err) { alert('Invalid JSON'); }
                            }
                        }}
                    />
                </div>
            </div>

            <div onClick={() => importInputRef.current?.click()} className="flex items-center gap-2 px-3 py-1.5 bg-black border border-white/10 hover:bg-white/5 rounded-sm text-[10px] font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition-all cursor-pointer">
                <CloudUpload size={12} /> Import
            </div>
            <input type="file" ref={importInputRef} onChange={handleImportHive} className="hidden" accept=".json" />
         </div>

         <div className="relative w-full md:w-80">
            <div className="flex items-center bg-black/50 border border-white/10 rounded-sm focus-within:border-secondary/50 focus-within:shadow-glow-sm transition-all overflow-hidden">
                <Search size={14} className="ml-3 text-zinc-600" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder={isNeuralSearch ? "Ask Cortex..." : "Semantic Search..."}
                  className="w-full bg-transparent py-2 px-3 text-xs text-white focus:outline-none font-mono placeholder-zinc-700"
                />
                <button 
                    onClick={executeNeuralSearch}
                    disabled={!searchQuery.trim()}
                    className={`p-2 border-l border-white/5 transition-colors ${isNeuralSearch ? 'bg-secondary/10 text-secondary' : 'bg-transparent text-zinc-500 hover:text-white'}`}
                    title="Ask Cortex (Neural Search)"
                >
                    <BrainCircuit size={14} className={isSearching ? "animate-pulse" : ""} />
                </button>
            </div>
         </div>
      </div>

      <div className="px-6 py-2 border-b border-white/5 bg-black/50 overflow-x-auto hide-scrollbar flex items-center justify-between">
         <nav className="flex items-center gap-2">
           {[
             { id: 'NUGGETS', icon: Layers, label: `Nuggets (${filteredNuggets.length})` },
             { id: 'CONCEPTS', icon: Folder, label: `Concepts (${filteredConcepts.length})` },
             { id: 'STRATEGIES', icon: BrainCircuit, label: `Strategies (${filteredStrategies.length})` },
             { id: 'GRAPH', icon: Network, label: 'Constellation' }, 
           ].map((tab) => (
             <button
               key={tab.id}
               onClick={() => { setActiveTab(tab.id as Tab); setIsNeuralSearch(false); }}
               className={`
                 flex items-center gap-2 px-4 py-2 rounded-sm text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap
                 ${activeTab === tab.id && !isNeuralSearch
                   ? 'bg-secondary text-white shadow-[0_0_10px_rgba(139,92,246,0.3)]' 
                   : 'text-zinc-500 hover:text-white hover:bg-white/5'}
               `}
             >
               <tab.icon size={14} />
               {tab.label}
             </button>
           ))}
         </nav>

         {activeTab === 'CONCEPTS' && !isNeuralSearch && (
             <div className="flex items-center gap-2 pl-4 border-l border-white/10">
                 {isSelectionMode ? (
                     <>
                         <span className="text-[9px] font-bold text-violet-500 uppercase">{selectedForMerge.length} Selected</span>
                         <button 
                             onClick={initiateMerge}
                             disabled={selectedForMerge.length !== 2}
                             className={`px-3 py-1.5 rounded-sm text-[9px] font-bold uppercase transition-all ${selectedForMerge.length === 2 ? 'bg-violet-500 text-white shadow-glow' : 'bg-white/5 text-zinc-600 cursor-not-allowed'}`}
                         >
                             Merge
                         </button>
                         <button onClick={() => { setIsSelectionMode(false); setSelectedForMerge([]); }} className="p-1.5 text-zinc-500 hover:text-white"><X size={14}/></button>
                     </>
                 ) : (
                     <button 
                         onClick={() => setIsSelectionMode(true)}
                         className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-sm text-[9px] font-bold text-zinc-400 hover:text-white uppercase transition-all"
                     >
                         <Merge size={12} /> Refine Knowledge
                     </button>
                 )}
             </div>
         )}
      </div>

      <div className={`flex-1 overflow-y-auto custom-scrollbar bg-[#050505] ${activeTab === 'GRAPH' && !isNeuralSearch ? 'p-0 overflow-hidden' : 'p-6'}`}>
           
           {/* NEURAL ANSWER SECTION */}
           {isNeuralSearch && (
               <div className="mb-8">
                   <div className="bg-secondary/5 border border-secondary/20 p-6 rounded-sm shadow-2xl relative overflow-hidden animate-in fade-in slide-in-from-top-4">
                       <div className="absolute top-0 left-0 w-1 h-full bg-secondary"></div>
                       <div className="flex items-center gap-3 mb-4">
                           <BrainCircuit size={24} className="text-secondary" />
                           <h3 className="text-lg font-bold text-white uppercase tracking-widest font-mono">Neural Analysis</h3>
                           <button onClick={() => setIsNeuralSearch(false)} className="ml-auto text-zinc-500 hover:text-white"><X size={18} /></button>
                       </div>
                       {isSearching ? (
                           <ThinkingIndicator label="Scanning Neural Engrams..." />
                       ) : (
                           <div className="prose prose-invert prose-sm max-w-none font-mono text-zinc-300">
                               <ReactMarkdown>{neuralAnswer || "No data retrieved."}</ReactMarkdown>
                           </div>
                       )}
                   </div>
               </div>
           )}

           {!isNeuralSearch && activeTab === 'GRAPH' ? (
               <NeuralGraph db={db} onNodeClick={handleGraphNodeClick} />
           ) : !isNeuralSearch && (
               <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  
                  {activeTab === 'CONCEPTS' && filteredConcepts.map(item => (
                    <div 
                        key={item.id} 
                        className={`group relative bg-black border p-5 rounded-sm transition-all hover:shadow-glow-sm cursor-pointer ${selectedForMerge.includes(item.id) ? 'border-violet-500 bg-violet-500/10' : 'border-white/10 hover:border-secondary/50'}`}
                        onClick={() => { if(isSelectionMode) toggleMergeSelect(item.id); }}
                    >
                       <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex gap-2 transition-opacity">
                          {!isSelectionMode && (
                              <>
                                <button onClick={() => startEdit(item, 'CONCEPTS')} className="p-1.5 bg-white/5 hover:text-white text-zinc-500 rounded-sm"><Edit2 size={12} /></button>
                                <button onClick={() => handleDelete(item.id, 'concept')} className="p-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-sm"><Trash2 size={12} /></button>
                              </>
                          )}
                          {isSelectionMode && <div className={`w-4 h-4 rounded-full border ${selectedForMerge.includes(item.id) ? 'bg-violet-500 border-violet-500' : 'border-zinc-600'}`}></div>}
                       </div>
                       <div className="flex items-center gap-3 mb-3">
                          <Folder size={18} className={selectedForMerge.includes(item.id) ? "text-violet-500" : "text-secondary"} />
                          <h4 className="text-sm font-bold text-white font-mono">{item.name}</h4>
                       </div>
                       <p className="text-xs text-zinc-500 line-clamp-3 leading-relaxed">{item.description}</p>
                    </div>
                  ))}

                  {activeTab === 'NUGGETS' && filteredNuggets.map(item => {
                    const parentConcepts = safeConcepts.filter(c => item.conceptIds?.includes(c.id));
                    return (
                      <div key={item.id} className="group relative bg-black border border-white/10 hover:border-secondary/50 p-4 rounded-sm transition-all hover:shadow-glow-sm flex gap-4">
                         <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex gap-2 transition-opacity z-10">
                            <button onClick={() => startEdit(item, 'NUGGETS')} className="p-1.5 bg-black hover:text-white text-zinc-500 rounded-sm border border-white/10"><Edit2 size={12} /></button>
                            <button onClick={() => handleDelete(item.id, 'nugget')} className="p-1.5 bg-black text-rose-500 hover:bg-rose-500 hover:text-white rounded-sm border border-white/10"><Trash2 size={12} /></button>
                         </div>
                         <div className="shrink-0 w-20 h-20 bg-white/5 border border-white/5 rounded-sm flex items-center justify-center overflow-hidden">
                            {item.imageData ? (
                              <img src={item.imageData} className="w-full h-full object-cover opacity-80" />
                            ) : (
                              <FileImage size={24} className="text-zinc-700" />
                            )}
                         </div>
                         <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-white truncate mb-1">{item.title}</h4>
                            <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">{item.content}</p>
                         </div>
                      </div>
                    );
                  })}

                  {activeTab === 'STRATEGIES' && filteredStrategies.map(item => (
                    <div key={item.id} className={`group relative bg-black border hover:border-secondary/50 p-5 rounded-sm transition-all hover:shadow-[0_0_15px_rgba(139,92,246,0.15)] col-span-1 md:col-span-2 ${item.isActive ? 'border-emerald-500/30' : 'border-white/10'}`}>
                       
                       <div className="absolute top-2 right-2 flex items-center gap-3">
                          <button onClick={() => handleShare(item)} className="text-zinc-500 hover:text-white transition-colors" title="Share QR"><QrCode size={16} /></button>
                          <button 
                             onClick={(e) => handleToggleStrategyActive(item, e)}
                             className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border transition-all ${item.isActive ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 'bg-white/5 border-white/10 text-zinc-500 hover:text-white'}`}
                          >
                             <span className="text-[8px] font-bold uppercase tracking-widest">{item.isActive ? 'ONLINE' : 'OFFLINE'}</span>
                             {item.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                          </button>

                          <div className="opacity-0 group-hover:opacity-100 flex gap-2 transition-opacity">
                            <button onClick={() => startEdit(item, 'STRATEGIES')} className="p-1.5 bg-white/5 hover:text-white text-zinc-500 rounded-sm"><Edit2 size={12} /></button>
                            <button onClick={() => handleDelete(item.id, 'strategy')} className="p-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-sm"><Trash2 size={12} /></button>
                          </div>
                       </div>

                       <div className="flex items-center gap-3 mb-3">
                          <BrainCircuit size={18} className={item.isActive ? 'text-emerald-500' : 'text-secondary'} />
                          <h4 className="text-sm font-bold text-white font-mono">{item.name}</h4>
                          {item.executionStatus === 'ACTIVE' ? (
                              <span className="px-1.5 py-0.5 rounded-sm bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[8px] font-bold uppercase flex items-center gap-1">
                                  <ShieldCheck size={8} /> EXECUTION ENABLED
                              </span>
                          ) : (
                              <span className="px-1.5 py-0.5 rounded-sm bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[8px] font-bold uppercase flex items-center gap-1">
                                  <ShieldAlert size={8} /> INCUBATION MODE
                              </span>
                          )}
                       </div>
                       <div className="bg-[#080808] p-3 rounded-sm border border-white/5 text-xs text-zinc-400 font-mono leading-relaxed mb-2">
                          {item.content}
                       </div>
                       
                       <div className="flex items-center justify-between pt-2">
                          <div className="flex items-center gap-1 text-[9px] text-zinc-500 font-mono">
                              <History size={10} />
                              <span>v{(item.versions?.length || 0) + 1}</span>
                          </div>

                          <button 
                            onClick={() => onValidate(item)}
                            className="flex items-center gap-1.5 px-3 py-1 bg-white/5 hover:bg-purple-500/20 hover:text-purple-500 hover:border-purple-500/50 border border-white/10 rounded-sm text-[9px] font-bold uppercase tracking-wider transition-all"
                            title="Load into Backtest Lab"
                          >
                             <Activity size={10} /> Validate
                          </button>
                       </div>
                    </div>
                  ))}

               </div>
           )}
      </div>

      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-[#050505] border border-white/10 rounded-sm w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between p-4 border-b border-white/5 bg-white/5">
                 <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                   <Edit2 size={12} className="text-secondary" />
                   Editing {editingItem.type.slice(0, -1)}
                 </h3>
                 <button onClick={cancelEdit} className="text-zinc-500 hover:text-white"><X size={16} /></button>
              </div>
              
              <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-4">
                    {/* ... (Existing Edit Forms) ... */}
                    {editingItem.type === 'CONCEPTS' && (
                       <>
                          <div className="space-y-1">
                             <label className="text-[10px] font-mono text-zinc-500 uppercase">Name</label>
                             <input 
                               value={editForm.name} 
                               onChange={e => setEditForm({...editForm, name: e.target.value})}
                               className="w-full bg-black border border-white/10 p-3 text-sm text-white focus:border-secondary/50 focus:outline-none rounded-sm" 
                             />
                          </div>
                          <div className="space-y-1">
                             <label className="text-[10px] font-mono text-zinc-500 uppercase">Description</label>
                             <textarea 
                               value={editForm.description} 
                               onChange={e => setEditForm({...editForm, description: e.target.value})}
                               className="w-full bg-black border border-white/10 p-3 text-sm text-zinc-300 focus:border-secondary/50 focus:outline-none rounded-sm min-h-[100px] resize-none" 
                             />
                          </div>
                       </>
                    )}

                    {editingItem.type === 'NUGGETS' && (
                       <>
                          <div className="space-y-1">
                             <label className="text-[10px] font-mono text-zinc-500 uppercase">Title</label>
                             <input 
                               value={editForm.title} 
                               onChange={e => setEditForm({...editForm, title: e.target.value})}
                               className="w-full bg-black border border-white/10 p-3 text-sm text-white focus:border-secondary/50 focus:outline-none rounded-sm" 
                             />
                          </div>
                          <div className="space-y-1">
                             <label className="text-[10px] font-mono text-zinc-500 uppercase">Associated Concepts</label>
                             <ConceptMultiSelect 
                                selectedIds={editForm.conceptIds || []}
                                concepts={safeConcepts}
                                onChange={(ids) => setEditForm({...editForm, conceptIds: ids})}
                             />
                          </div>
                          <div className="space-y-1">
                             <label className="text-[10px] font-mono text-zinc-500 uppercase">Content</label>
                             <textarea 
                               value={editForm.content} 
                               onChange={e => setEditForm({...editForm, content: e.target.value})}
                               className="w-full bg-black border border-white/10 p-3 text-sm text-zinc-300 focus:border-secondary/50 focus:outline-none rounded-sm min-h-[120px] resize-none" 
                             />
                          </div>
                          <div className="space-y-1">
                             <label className="text-[10px] font-mono text-zinc-500 uppercase">Visual Data</label>
                             <div className="flex gap-4 items-center">
                                <div className="w-16 h-16 bg-black border border-white/10 flex items-center justify-center overflow-hidden rounded-sm">
                                  {editForm.imageData ? <img src={editForm.imageData} className="w-full h-full object-cover" /> : <FileImage size={20} className="text-zinc-700" />}
                                </div>
                                <div 
                                  onClick={() => fileInputRef.current?.click()}
                                  className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 hover:bg-white/10 cursor-pointer rounded-sm text-xs font-mono"
                                >
                                  <Upload size={12} /> Replace Image
                                </div>
                                <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                             </div>
                          </div>
                       </>
                    )}
                    
                    {editingItem.type === 'STRATEGIES' && (
                       <>
                          <div className="space-y-1">
                             <label className="text-[10px] font-mono text-zinc-500 uppercase">Name</label>
                             <input 
                               value={editForm.name} 
                               onChange={e => setEditForm({...editForm, name: e.target.value})}
                               className="w-full bg-black border border-white/10 p-3 text-sm text-white focus:border-secondary/50 focus:outline-none rounded-sm" 
                             />
                          </div>
                          <div className="space-y-1">
                             <label className="text-[10px] font-mono text-zinc-500 uppercase flex items-center gap-2">
                                <Clock size={12} /> Preferred Timeframes
                             </label>
                             <div className="flex flex-wrap gap-2">
                                {['1m','5m','15m','30m','1H','4H','1D','1W','1M'].map((tf) => (
                                   <button
                                     key={tf}
                                     onClick={() => toggleEditTimeframe(tf as Timeframe)}
                                     className={`
                                       px-3 py-1 rounded-sm text-xs font-mono font-bold border transition-all
                                       ${(editForm.timeframes || []).includes(tf)
                                         ? 'bg-primary/20 border-primary text-primary'
                                         : 'bg-black border-white/10 text-zinc-500 hover:border-white/30'}
                                     `}
                                   >
                                     {tf}
                                   </button>
                                ))}
                             </div>
                          </div>
                          
                          <div className="p-4 bg-zinc-900 border border-white/5 rounded-sm flex items-center justify-between">
                              <div>
                                  <div className="text-[10px] font-bold text-white uppercase tracking-widest flex items-center gap-2">
                                      <ShieldCheck size={12} className={editForm.executionStatus === 'ACTIVE' ? 'text-emerald-500' : 'text-zinc-500'} />
                                      Auto-Execution Permission
                                  </div>
                                  <div className="text-[9px] text-zinc-500 mt-1 max-w-[300px]">
                                      Only ACTIVE strategies are permitted to place live/paper orders autonomously by the Sentinel system.
                                  </div>
                              </div>
                              <button 
                                onClick={() => setEditForm({...editForm, executionStatus: editForm.executionStatus === 'ACTIVE' ? 'INCUBATION' : 'ACTIVE'})}
                                className={`px-3 py-1.5 rounded-sm text-[9px] font-bold uppercase transition-all border ${
                                    editForm.executionStatus === 'ACTIVE' 
                                    ? 'bg-emerald-500 text-black border-emerald-500' 
                                    : 'bg-black text-amber-500 border-amber-500/50'
                                }`}
                              >
                                {editForm.executionStatus === 'ACTIVE' ? 'APPROVED (ACTIVE)' : 'INCUBATION ONLY'}
                              </button>
                          </div>

                          <div className="space-y-1">
                             <label className="text-[10px] font-mono text-zinc-500 uppercase">Logic</label>
                             <textarea 
                               value={editForm.content} 
                               onChange={e => setEditForm({...editForm, content: e.target.value})}
                               className="w-full bg-black border border-white/10 p-3 text-sm text-zinc-300 focus:border-secondary/50 focus:outline-none rounded-sm min-h-[150px] resize-none" 
                             />
                          </div>
                          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-sm text-[10px] text-amber-500 font-mono">
                             NOTE: Saving changes will create a new Version History entry (v{(editingItem.versions?.length || 0) + 1}).
                          </div>
                       </>
                    )}
              </div>

              <div className="p-4 border-t border-white/5 bg-black/50 flex justify-end gap-3 shrink-0">
                 <button onClick={cancelEdit} className="px-4 py-2 text-xs font-bold text-zinc-500 hover:text-white uppercase tracking-wider">Cancel</button>
                 <button onClick={handleSaveEdit} className="px-6 py-2 bg-secondary text-white text-xs font-bold uppercase tracking-wider rounded-sm shadow-[0_0_15px_rgba(139,92,246,0.2)] hover:bg-secondary/90">Save Changes</button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};
