
import React, { useState, useRef, useEffect } from 'react';
import { 
  BrainCircuit, Upload, Save, Cpu, X, Folder, Layers,
  CheckCircle2, Plus, Search, Check, Clock, MessageSquare, Send,
  AlertTriangle, ArrowLeft, PenTool, GitBranch, Sparkles
} from 'lucide-react';
import { NeuralDB, Concept, Timeframe, Nugget, Strategy, Message, Role, View } from '../types';
import { storage } from '../services/storage';
import { generateSemanticTags, sendMessageToGemini, verifyKnowledgeInput } from '../services/geminiService';
import { MentionsInput } from './MentionsInput';
import { MessageBubble } from './MessageBubble';
import { ThinkingIndicator } from './ThinkingIndicator';

type Tab = 'NUGGETS' | 'CONCEPTS' | 'STRATEGIES';
type BuilderMode = 'TEXT' | 'VISUAL';

interface NeuralNetworkProps {
  db: NeuralDB;
  onRefreshDb: () => Promise<void>;
  onNavigate: (view: View) => void;
}

const ConceptMultiSelect: React.FC<{
  selectedIds: string[];
  concepts: Concept[];
  onChange: (ids: string[]) => void;
  onCreateConcept: (name: string) => void;
}> = ({ selectedIds, concepts, onChange, onCreateConcept }) => {
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
  const exactMatch = safeConcepts.find(c => c.name.toLowerCase() === search.toLowerCase());

  const toggleSelection = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(sid => sid !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const handleCreate = () => {
    if (search.trim()) {
      onCreateConcept(search.trim());
      setSearch('');
    }
  };

  return (
    <div className="relative" ref={wrapperRef}>
       <div 
         onClick={() => setIsOpen(true)}
         className={`w-full bg-black border border-white/10 p-4 text-sm text-white rounded-sm min-h-[50px] cursor-text flex flex-wrap gap-2 transition-all ${isOpen ? 'border-primary/50 shadow-glow-sm' : ''}`}
       >
         {selectedIds.length === 0 && <span className="text-zinc-500 self-center">Select or create concepts...</span>}
         {selectedIds.map(id => {
           const concept = safeConcepts.find(c => c.id === id);
           return concept ? (
             <span key={id} className="bg-primary/20 text-primary border border-primary/30 px-2 py-0.5 rounded-sm text-xs font-bold flex items-center gap-1">
               {concept.name}
               <button onClick={(e) => { e.stopPropagation(); toggleSelection(id); }} className="hover:text-white"><X size={12} /></button>
             </span>
           ) : null;
         })}
       </div>

       {isOpen && (
         <div className="absolute top-full left-0 w-full bg-[#050505] border border-white/10 mt-1 z-50 shadow-2xl rounded-sm max-h-60 overflow-y-auto custom-scrollbar flex flex-col">
            <div className="p-2 border-b border-white/5 flex items-center gap-2 sticky top-0 bg-[#050505] z-10">
               <Search size={14} className="text-zinc-500" />
               <input 
                 autoFocus
                 type="text" 
                 value={search}
                 onChange={(e) => setSearch(e.target.value)}
                 placeholder="Search or name new..."
                 className="bg-transparent border-none text-xs text-white focus:outline-none w-full font-mono placeholder-zinc-700"
               />
            </div>
            <div className="flex-1">
               {filtered.map(c => (
                 <div 
                   key={c.id} 
                   onClick={() => toggleSelection(c.id)}
                   className="px-3 py-2 text-xs text-zinc-300 hover:bg-white/5 cursor-pointer flex items-center justify-between group"
                 >
                   <span>{c.name}</span>
                   {selectedIds.includes(c.id) && <Check size={14} className="text-primary" />}
                 </div>
               ))}
               {filtered.length === 0 && !search && (
                 <div className="p-3 text-[10px] text-zinc-600 font-mono text-center">Type to search or create</div>
               )}
            </div>
            {search && !exactMatch && (
               <button 
                 onClick={handleCreate}
                 className="p-3 bg-primary/10 text-primary hover:bg-primary/20 text-xs font-bold border-t border-primary/20 flex items-center justify-center gap-2 transition-colors sticky bottom-0"
               >
                 <Plus size={14} />
                 Create Concept "{search}"
               </button>
            )}
         </div>
       )}
    </div>
  );
};

export const NeuralNetwork: React.FC<NeuralNetworkProps> = ({ 
  db, 
  onRefreshDb,
  onNavigate
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('NUGGETS');
  const [builderMode, setBuilderMode] = useState<BuilderMode>('TEXT');
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Forms
  const [conceptForm, setConceptForm] = useState({ name: '', description: '' });
  const [nuggetForm, setNuggetForm] = useState({ title: '', content: '', conceptIds: [] as string[], imageData: null as string | null });
  const [strategyForm, setStrategyForm] = useState({ name: '', content: '', timeframes: [] as Timeframe[] });

  // Verification State
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationMessages, setVerificationMessages] = useState<Message[]>([]);
  const [verificationInput, setVerificationInput] = useState('');
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [conflictItem, setConflictItem] = useState<{ id: string, type: 'NUGGET' | 'CONCEPT', item: any } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Safety wrappers for db arrays
  const safeConcepts = db?.concepts || [];
  const safeNuggets = db?.nuggets || [];
  const safeStrategies = db?.strategies || [];

  useEffect(() => {
     if (isVerifying && chatBottomRef.current) {
         chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
     }
  }, [verificationMessages, isVerifying, conflictItem]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setNuggetForm(prev => ({ ...prev, imageData: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (overwriteId?: string) => {
    setIsSaving(true);
    try {
        if (activeTab === 'CONCEPTS') {
            const tags = await generateSemanticTags(conceptForm.description);
            const newItem: Concept = {
                id: overwriteId || Math.random().toString(36).substr(2, 9),
                name: conceptForm.name,
                description: conceptForm.description,
                semanticTags: tags,
                timestamp: Date.now()
            };
            await storage.saveConcept(newItem);
            setConceptForm({ name: '', description: '' });
        } else if (activeTab === 'NUGGETS') {
            const tags = await generateSemanticTags(nuggetForm.content);
            const newItem: Nugget = {
                id: overwriteId || Math.random().toString(36).substr(2, 9),
                title: nuggetForm.title,
                content: nuggetForm.content,
                conceptIds: nuggetForm.conceptIds,
                imageData: nuggetForm.imageData || undefined,
                semanticTags: tags,
                timestamp: Date.now()
            };
            await storage.saveNugget(newItem);
            setNuggetForm({ title: '', content: '', conceptIds: [], imageData: null });
        } else {
            const newItem: Strategy = {
                id: overwriteId || Math.random().toString(36).substr(2, 9),
                name: strategyForm.name,
                content: strategyForm.content,
                requiredTimeframes: strategyForm.timeframes,
                isActive: false,
                executionStatus: 'INCUBATION',
                timestamp: Date.now(),
                versions: []
            };
            await storage.saveStrategy(newItem);
            setStrategyForm({ name: '', content: '', timeframes: [] });
        }
        await onRefreshDb();
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
        setIsVerifying(false); 
        setVerificationMessages([]);
        setConflictItem(null);
    } catch (e) {
        console.error("Save failed", e);
    } finally {
        setIsSaving(false);
    }
  };

  const startVerification = async () => {
      setIsVerifying(true);
      setVerificationMessages([]);
      setVerificationLoading(true);
      setConflictItem(null);
      const title = activeTab === 'NUGGETS' ? nuggetForm.title : activeTab === 'CONCEPTS' ? conceptForm.name : strategyForm.name;
      const content = activeTab === 'NUGGETS' ? nuggetForm.content : activeTab === 'CONCEPTS' ? conceptForm.description : strategyForm.content;
      const image = activeTab === 'NUGGETS' ? nuggetForm.imageData : null;
      try {
          const result = await verifyKnowledgeInput({ type: activeTab, title, content, image }, db);
          setVerificationMessages([{ role: Role.MODEL, text: result.text, timestamp: Date.now(), isThinking: true }]);
          if (result.conflictId) {
              const nugget = safeNuggets.find(n => n.id === result.conflictId);
              const concept = safeConcepts.find(c => c.id === result.conflictId);
              if (nugget) setConflictItem({ id: nugget.id, type: 'NUGGET', item: nugget });
              else if (concept) setConflictItem({ id: concept.id, type: 'CONCEPT', item: concept });
          }
      } catch (e) {
          setVerificationMessages([{ role: Role.MODEL, text: "Error initializing verification.", timestamp: Date.now() }]);
      } finally {
          setVerificationLoading(false);
      }
  };

  const handleVerificationSend = async () => {
      if (!verificationInput.trim()) return;
      const userMsg: Message = { role: Role.USER, text: verificationInput, timestamp: Date.now() };
      setVerificationMessages(prev => [...prev, userMsg]);
      setVerificationInput('');
      setVerificationLoading(true);
      try {
          const response = await sendMessageToGemini({ message: verificationInput, history: verificationMessages, isThinkingMode: false });
          setVerificationMessages(prev => [...prev, { role: Role.MODEL, text: response.text, timestamp: Date.now() }]);
      } catch (e) { console.error(e); } finally { setVerificationLoading(false); }
  };

  const handleCreateConceptInline = async (name: string) => {
    const newItem: Concept = { id: Math.random().toString(36).substr(2, 9), name: name, description: "Auto-generated concept", timestamp: Date.now() };
    await storage.saveConcept(newItem);
    await onRefreshDb();
  };

  const isValid = () => {
    if (activeTab === 'CONCEPTS') return conceptForm.name.trim().length > 0;
    if (activeTab === 'NUGGETS') return nuggetForm.title.trim().length > 0 && nuggetForm.conceptIds.length > 0;
    if (activeTab === 'STRATEGIES') return strategyForm.name.trim().length > 0;
    return false;
  };

  const toggleStrategyTimeframe = (tf: Timeframe) => {
    setStrategyForm(prev => {
      if (prev.timeframes.includes(tf)) return { ...prev, timeframes: prev.timeframes.filter(t => t !== tf) };
      return { ...prev, timeframes: [...prev.timeframes, tf] };
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#000000] text-zinc-200 overflow-y-auto custom-scrollbar font-sans relative">
      
      {/* SUCCESS NOTIFICATION */}
      {showSuccess && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 px-6 py-2 rounded-full backdrop-blur-md shadow-glow-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 size={16} />
          <span className="text-xs font-bold tracking-widest uppercase">Integrated to Cortex</span>
        </div>
      )}

      {/* HEADER */}
      <div className="w-full bg-[#050505] border-b border-white/5 p-6 sticky top-0 z-10 backdrop-blur-xl bg-opacity-90">
         <div className="max-w-4xl mx-auto w-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => onNavigate('TERMINAL')} className="text-zinc-500 hover:text-white transition-colors">
                        <ArrowLeft size={18} />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-sm bg-primary/10 border border-primary/20 flex items-center justify-center shadow-glow-sm shrink-0">
                        <Cpu size={20} className="text-primary animate-pulse-slow" />
                        </div>
                        <div>
                        <h2 className="text-lg font-bold text-white tracking-widest uppercase font-mono">Neural Training</h2>
                        <p className="text-[10px] text-zinc-500 font-mono uppercase">Teach the Model // Input Mode</p>
                        </div>
                    </div>
                </div>

                <nav className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 hide-scrollbar">
                  {[
                    { id: 'NUGGETS', icon: Layers, label: 'Nuggets' },
                    { id: 'CONCEPTS', icon: Folder, label: 'Concepts' },
                    { id: 'STRATEGIES', icon: BrainCircuit, label: 'Strategies' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as Tab)}
                      className={`
                        flex items-center gap-2 px-4 py-2 rounded-sm text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap
                        ${activeTab === tab.id 
                          ? 'bg-primary text-black shadow-glow' 
                          : 'bg-white/5 text-zinc-500 hover:text-white hover:bg-white/10'}
                      `}
                    >
                      <tab.icon size={14} />
                      {tab.label}
                    </button>
                  ))}
                </nav>
            </div>
         </div>
      </div>

      {/* FORM CONTENT */}
      <div className="flex-1 p-6 w-full max-w-4xl mx-auto flex flex-col gap-6 pb-32">
           
           <div className="bg-[#020202] border border-white/10 p-6 md:p-8 rounded-sm shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden group animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* HEADER DECORATION */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

              {/* SECTION HEADER */}
              <div className="mb-8 flex items-start justify-between">
                <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-[0.2em] mb-1 flex items-center gap-2">
                    <Sparkles size={14} className="text-primary" />
                    {activeTab === 'CONCEPTS' && 'Define New Concept'}
                    {activeTab === 'NUGGETS' && 'Inject Knowledge Nugget'}
                    {activeTab === 'STRATEGIES' && 'Formulate Strategy'}
                    </h3>
                    <p className="text-[10px] text-zinc-500 font-mono">
                    {activeTab === 'CONCEPTS' && 'Create a categorization container for future knowledge.'}
                    {activeTab === 'NUGGETS' && 'Input specific definitions (e.g. "The Eugo Flip") for the AI to learn.'}
                    {activeTab === 'STRATEGIES' && 'Combine concepts into executable trading logic.'}
                    </p>
                </div>
                
                {activeTab === 'STRATEGIES' && (
                    <div className="flex bg-black border border-white/10 rounded-sm p-1">
                        <button 
                            onClick={() => setBuilderMode('TEXT')}
                            className={`p-2 rounded-sm transition-all ${builderMode === 'TEXT' ? 'bg-primary/20 text-primary' : 'text-zinc-500 hover:text-white'}`}
                            title="Natural Language Mode"
                        >
                            <PenTool size={16} />
                        </button>
                        <button 
                            onClick={() => setBuilderMode('VISUAL')}
                            className={`p-2 rounded-sm transition-all ${builderMode === 'VISUAL' ? 'bg-secondary/20 text-secondary' : 'text-zinc-500 hover:text-white'}`}
                            title="Visual Graph Mode"
                        >
                            <GitBranch size={16} />
                        </button>
                    </div>
                )}
              </div>

              {/* CONCEPT FORM */}
              {activeTab === 'CONCEPTS' && (
                 <div className="flex flex-col gap-5">
                    <div className="space-y-2">
                       <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Concept Identifier</label>
                       <input 
                         type="text" 
                         list="existing-concepts"
                         value={conceptForm.name}
                         onChange={e => setConceptForm({...conceptForm, name: e.target.value})}
                         placeholder="e.g. Liquidity, Order Blocks, Market Structure"
                         className="w-full bg-black border border-white/10 p-4 text-sm text-white focus:border-primary/50 focus:outline-none rounded-sm transition-all focus:shadow-glow-sm"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Description</label>
                       <MentionsInput 
                         db={db}
                         value={conceptForm.description}
                         onChange={val => setConceptForm({...conceptForm, description: val})}
                         placeholder="Describe this category... (Use @ to reference existing items)"
                         minHeight="150px"
                       />
                    </div>
                 </div>
              )}

              {/* NUGGET FORM */}
              {activeTab === 'NUGGETS' && (
                 <div className="flex flex-col gap-5">
                    <div className="bg-emerald-900/10 border border-emerald-500/20 p-4 rounded-sm flex gap-3">
                        <Layers size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                        <div>
                            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider block mb-1">Knowledge Injection</span>
                            <p className="text-[10px] text-zinc-400 font-mono leading-relaxed">
                                Does the AI not know what "The Eugo Flip" is? Define it here. Once saved, you can reference it in any strategy using the <strong className="text-white">@</strong> symbol.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Nugget Title</label>
                       <input 
                         type="text" 
                         list="existing-nuggets"
                         value={nuggetForm.title}
                         onChange={e => setNuggetForm({...nuggetForm, title: e.target.value})}
                         placeholder="e.g. The Eugo Flip Pattern"
                         className="w-full bg-black border border-white/10 p-4 text-sm text-white focus:border-primary/50 focus:outline-none rounded-sm transition-all focus:shadow-glow-sm"
                       />
                    </div>
                    
                    <div className="space-y-2">
                       <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Associated Concepts</label>
                       <ConceptMultiSelect 
                         selectedIds={nuggetForm.conceptIds}
                         concepts={safeConcepts}
                         onChange={(ids) => setNuggetForm({...nuggetForm, conceptIds: ids})}
                         onCreateConcept={handleCreateConceptInline}
                       />
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Knowledge Data</label>
                       <MentionsInput 
                         db={db}
                         value={nuggetForm.content}
                         onChange={val => setNuggetForm({...nuggetForm, content: val})}
                         placeholder="Explain the pattern or concept in detail..."
                         minHeight="150px"
                       />
                    </div>

                    <div 
                       onClick={() => fileInputRef.current?.click()}
                       className="border border-dashed border-white/10 bg-white/5 rounded-sm p-6 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all group/upload relative"
                    >
                       {nuggetForm.imageData ? (
                         <div className="relative w-full h-48 bg-black/50 rounded-sm overflow-hidden flex items-center justify-center">
                            <img src={nuggetForm.imageData} className="h-full object-contain" />
                            <button 
                             onClick={(e) => { e.stopPropagation(); setNuggetForm({...nuggetForm, imageData: null}); }}
                             className="absolute top-2 right-2 p-1.5 bg-black text-rose-500 rounded-sm hover:bg-rose-500 hover:text-white z-20"
                            >
                              <X size={14} />
                            </button>
                         </div>
                       ) : (
                         <>
                           <div className="p-3 bg-black rounded-full border border-white/10 group-hover/upload:border-primary/50 transition-colors">
                              <Upload size={20} className="text-zinc-500 group-hover/upload:text-primary" />
                           </div>
                           <div className="text-center">
                              <span className="text-xs font-bold text-zinc-400 block group-hover/upload:text-white">UPLOAD VISUAL DATA</span>
                           </div>
                         </>
                       )}
                       <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                    </div>
                 </div>
              )}

              {/* STRATEGY FORM */}
              {activeTab === 'STRATEGIES' && (
                 <div className="flex flex-col gap-5">
                    <div className="space-y-2">
                       <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Strategy Name</label>
                       <input 
                         type="text" 
                         list="existing-strategies"
                         value={strategyForm.name}
                         onChange={e => setStrategyForm({...strategyForm, name: e.target.value})}
                         placeholder="e.g. London Breakout Protocol"
                         className="w-full bg-black border border-white/10 p-4 text-sm text-white focus:border-primary/50 focus:outline-none rounded-sm transition-all focus:shadow-glow-sm"
                       />
                    </div>
                    
                    <div className="space-y-2">
                       <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                          <Clock size={12} /> Preferred Timeframes
                       </label>
                       <div className="flex flex-wrap gap-2">
                          {['1m','5m','15m','30m','1H','4H','1D','1W','1M'].map((tf) => (
                             <button
                               key={tf}
                               onClick={() => toggleStrategyTimeframe(tf as Timeframe)}
                               className={`
                                 px-3 py-1 rounded-sm text-xs font-mono font-bold border transition-all
                                 ${strategyForm.timeframes.includes(tf as Timeframe)
                                   ? 'bg-primary/20 border-primary text-primary'
                                   : 'bg-black border-white/10 text-zinc-500 hover:border-white/30'}
                               `}
                             >
                               {tf}
                             </button>
                          ))}
                       </div>
                    </div>

                    <div className="space-y-2">
                       <div className="flex justify-between items-center">
                           <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Logic & Execution</label>
                           <span className="text-[9px] text-zinc-500 font-mono uppercase">{builderMode} MODE</span>
                       </div>
                       
                       {builderMode === 'TEXT' ? (
                           <MentionsInput 
                             db={db}
                             value={strategyForm.content}
                             onChange={val => setStrategyForm({...strategyForm, content: val})}
                             placeholder="Describe the rules. Use @ to reference specific Nuggets (like 'The Eugo Flip') that the AI might not know."
                             minHeight="200px"
                           />
                       ) : (
                           <div className="w-full h-[300px] bg-black border border-white/10 rounded-sm relative overflow-hidden flex flex-col items-center justify-center p-4">
                               {/* VISUAL BUILDER PLACEHOLDER */}
                               <div className="absolute inset-0 opacity-20 pointer-events-none" 
                                    style={{ backgroundImage: 'radial-gradient(#8b5cf6 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                               </div>
                               
                               <div className="bg-secondary/10 border border-secondary/30 p-6 rounded-lg text-center max-w-sm backdrop-blur-md">
                                   <GitBranch size={48} className="mx-auto text-secondary mb-4" />
                                   <h4 className="text-lg font-bold text-white mb-2">Visual Logic Builder</h4>
                                   <p className="text-xs text-zinc-400 mb-4">
                                       Drag and drop logic gates (AND, OR, IF) to construct strategies without code. 
                                       <br/><br/>
                                       <span className="text-secondary">Note:</span> Logic built here is compiled into text for the AI.
                                   </p>
                                   <button 
                                     onClick={() => setBuilderMode('TEXT')}
                                     className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase rounded-sm"
                                   >
                                       Switch to Text Editor
                                   </button>
                               </div>
                           </div>
                       )}
                    </div>
                 </div>
              )}

              {/* ACTION BUTTONS */}
              <div className="mt-8 grid grid-cols-2 gap-4">
                  <button 
                    onClick={startVerification}
                    disabled={!isValid() || isSaving}
                    className="py-4 flex items-center justify-center gap-2 font-mono text-xs font-bold uppercase tracking-widest rounded-sm transition-all bg-secondary/10 border border-secondary/30 text-secondary hover:bg-secondary/20"
                  >
                    <MessageSquare size={14} />
                    <span>Verify with Samaritan</span>
                  </button>
                  
                  <button 
                    onClick={() => handleSave()}
                    disabled={!isValid() || isSaving}
                    className={`
                      py-4 flex items-center justify-center gap-2 font-mono text-xs font-bold uppercase tracking-widest rounded-sm transition-all
                      ${!isValid() 
                        ? 'bg-white/5 text-zinc-600 cursor-not-allowed' 
                        : 'bg-primary hover:bg-primary/90 text-black shadow-glow hover:shadow-glow-lg'}
                    `}
                  >
                    {isSaving ? (
                       <>
                         <Cpu size={14} className="animate-spin" />
                         <span>Processing...</span>
                       </>
                    ) : (
                       <>
                         <Save size={14} />
                         <span>Save</span>
                       </>
                    )}
                  </button>
              </div>

           </div>

           {/* VERIFICATION CHAT INTERFACE */}
           {isVerifying && (
               <div className="bg-[#050505] border border-white/10 rounded-sm shadow-2xl overflow-hidden flex flex-col mt-4 animate-in slide-in-from-bottom-10 max-w-3xl mx-auto w-full">
                   <div className="p-3 border-b border-white/5 bg-secondary/10 flex items-center justify-between">
                       <div className="flex items-center gap-2">
                           <BrainCircuit size={16} className="text-secondary" />
                           <span className="text-xs font-bold text-white uppercase tracking-widest">Student Verification Protocol</span>
                       </div>
                       <button onClick={() => setIsVerifying(false)} className="text-zinc-500 hover:text-white"><X size={16}/></button>
                   </div>
                   
                   <div className="p-4 flex flex-col gap-4 max-h-[400px] overflow-y-auto custom-scrollbar bg-black/50">
                       {verificationMessages.map((msg, idx) => <MessageBubble key={idx} message={msg} />)}
                       {conflictItem && (
                           <div className="border border-rose-500/30 bg-rose-500/5 rounded-sm p-4 animate-in fade-in slide-in-from-bottom-2">
                               {/* ... (Conflict Resolution UI) ... */}
                               <div className="flex items-center gap-2 text-rose-500 mb-3 border-b border-rose-500/20 pb-2">
                                   <AlertTriangle size={16} />
                                   <span className="text-xs font-bold uppercase tracking-widest">Logic Conflict Detected</span>
                               </div>
                               <div className="text-[10px] text-zinc-300 mb-4">
                                   Conflict with existing item: <strong>{conflictItem.type === 'NUGGET' ? conflictItem.item.title : conflictItem.item.name}</strong>
                               </div>
                               <div className="flex gap-2 justify-end">
                                   <button onClick={() => handleSave(conflictItem.id)} className="px-3 py-2 bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-bold uppercase rounded-sm">Overwrite</button>
                                   <button onClick={() => handleSave()} className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-black text-[10px] font-bold uppercase rounded-sm">Keep Duplicate</button>
                               </div>
                           </div>
                       )}
                       {verificationLoading && <ThinkingIndicator />}
                       <div ref={chatBottomRef} />
                   </div>
                   
                   <div className="p-3 border-t border-white/5 bg-black flex gap-2">
                       <input 
                         value={verificationInput}
                         onChange={e => setVerificationInput(e.target.value)}
                         onKeyDown={e => e.key === 'Enter' && handleVerificationSend()}
                         placeholder="Reply to the student..."
                         className="flex-1 bg-white/5 border border-white/10 px-3 py-2 text-sm text-white rounded-sm focus:border-secondary/50 focus:outline-none"
                         autoFocus
                       />
                       <button onClick={handleVerificationSend} className="p-2 bg-secondary text-white rounded-sm hover:bg-secondary/80">
                           <Send size={16} />
                       </button>
                   </div>
               </div>
           )}
      </div>
    </div>
  );
};
