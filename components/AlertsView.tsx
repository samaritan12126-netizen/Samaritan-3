
import React, { useState, useMemo } from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Filter, 
  Activity, 
  Target, 
  TrendingUp,
  BrainCircuit,
  Search,
  Eye,
  Download,
  PlayCircle,
  MoreVertical,
  X,
  Layers,
  ArrowLeft,
  Check,
  Archive,
  Trash2
} from 'lucide-react';
import { Alert, Strategy, View } from '../types';
import { CustomSelect } from './CustomUI'; 
import { ChartContainer } from './ChartContainer';
import { SwipeableRow } from './SwipeableRow';

interface AlertsViewProps {
  alerts: Alert[];
  strategies: Strategy[];
  onReplay?: (pair: string, timestamp: number) => void;
  onUpdateAlert?: (alert: Alert) => void;
  onNavigate: (view: View) => void;
}

export const AlertsView: React.FC<AlertsViewProps> = ({ alerts, strategies, onReplay, onUpdateAlert, onNavigate }) => {
  const [filterStrategy, setFilterStrategy] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSnapshot, setSelectedSnapshot] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  
  // God Mode Override State
  const [editingAlertId, setEditingAlertId] = useState<string | null>(null);
  const [overrideStatus, setOverrideStatus] = useState<Alert['status']>('WIN');
  const [exitPriceInput, setExitPriceInput] = useState('');

  // --- FILTERING ---
  const filteredAlerts = useMemo(() => {
      return alerts
        .filter(a => filterStrategy === 'ALL' || a.strategyName === filterStrategy)
        .filter(a => a.pair.toLowerCase().includes(searchTerm.toLowerCase()) || a.strategyName.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => b.timestamp - a.timestamp); // Newest first
  }, [alerts, filterStrategy, searchTerm]);

  // --- STATISTICS (Based on filtered results) ---
  const stats = useMemo(() => {
    const total = filteredAlerts.length;
    const closed = filteredAlerts.filter(a => a.status !== 'ACTIVE' && a.status !== 'IGNORED');
    const wins = closed.filter(a => a.status === 'WIN').length;
    const losses = closed.filter(a => a.status === 'LOSS').length;
    const winRate = closed.length > 0 ? (wins / closed.length) * 100 : 0;
    
    const rMultiples = closed.map(a => a.rMultiple || 0);
    const avgR = rMultiples.length > 0 ? rMultiples.reduce((a, b) => a + b, 0) / rMultiples.length : 0;

    return { total, wins, losses, winRate, active: total - closed.length, avgR };
  }, [filteredAlerts]);

  // --- EQUITY CURVE DATA ---
  const equityCurveData = useMemo(() => {
      let cumulativeR = 0;
      // Sort oldest to newest for curve calculation
      const chronologic = [...filteredAlerts]
          .filter(a => a.status === 'WIN' || a.status === 'LOSS')
          .sort((a, b) => a.timestamp - b.timestamp);
      
      const data = chronologic.map(a => {
          cumulativeR += (a.rMultiple || 0);
          return { time: Math.floor(a.timestamp / 1000), value: cumulativeR };
      });
      
      // Add start point
      if (data.length > 0) {
          data.unshift({ time: data[0].time - 3600, value: 0 });
      }
      return data;
  }, [filteredAlerts]);

  // Extract unique strategy names
  const strategyOptions = [
      { value: 'ALL', label: 'ALL STRATEGIES' },
      ...Array.from(new Set([...strategies.map(s => s.name), ...alerts.map(a => a.strategyName)])).map(s => ({ value: s, label: s }))
  ];

  const initiateOverride = (alertId: string, status: Alert['status']) => {
      if (status === 'ACTIVE' || status === 'IGNORED') {
          // Direct action
          const alert = alerts.find(a => a.id === alertId);
          if (alert && onUpdateAlert) {
              onUpdateAlert({ ...alert, status, manualOverride: true });
              setOpenMenuId(null);
          }
      } else {
          // Require Input
          setEditingAlertId(alertId);
          setOverrideStatus(status);
          const alert = alerts.find(a => a.id === alertId);
          setExitPriceInput(alert?.exitPrice?.toString() || '');
          setOpenMenuId(null);
      }
  };

  const confirmOverride = (alert: Alert) => {
      const exitPrice = parseFloat(exitPriceInput);
      if (isNaN(exitPrice)) return; // Validation needed?

      // Calculate R-Multiple
      let rMultiple = 0;
      if (alert.sl && alert.entryPrice) {
          const risk = Math.abs(alert.entryPrice - alert.sl);
          const reward = Math.abs(exitPrice - alert.entryPrice);
          if (risk > 0) {
              rMultiple = reward / risk;
              if (overrideStatus === 'LOSS') rMultiple = -rMultiple; // Loss is negative R
          }
      }

      if (onUpdateAlert) {
          onUpdateAlert({ 
              ...alert, 
              status: overrideStatus, 
              exitPrice,
              rMultiple, 
              manualOverride: true 
          });
      }
      setEditingAlertId(null);
  };

  const handleExportCSV = () => {
      const headers = ['ID', 'Timestamp', 'Pair', 'Type', 'Strategy', 'Status', 'Entry', 'TP', 'SL', 'Exit', 'R-Multiple'];
      const rows = filteredAlerts.map(a => [
          a.id,
          new Date(a.timestamp).toISOString(),
          a.pair,
          a.type,
          a.strategyName,
          a.status,
          a.entryPrice,
          a.tp,
          a.sl,
          a.exitPrice || '',
          a.rMultiple || ''
      ]);
      
      const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `samaritan_alerts_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-full bg-[#000000] text-zinc-200 overflow-hidden font-sans relative">
      
      {/* SNAPSHOT MODAL */}
      {selectedSnapshot && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-8 animate-in fade-in">
              <div className="relative max-w-5xl w-full bg-[#050505] border border-white/10 rounded-sm shadow-2xl p-2">
                  <button onClick={() => setSelectedSnapshot(null)} className="absolute -top-10 right-0 text-white hover:text-primary"><X size={24} /></button>
                  <img src={selectedSnapshot} className="w-full h-auto rounded-sm" alt="Snapshot" />
                  <div className="absolute top-4 left-4 bg-black/70 px-3 py-1 text-xs font-mono text-white rounded-sm border border-white/10">BLACK BOX RECORDER</div>
              </div>
          </div>
      )}

      {/* HEADER */}
      <div className="p-6 border-b border-white/5 bg-[#050505]/90 backdrop-blur-md z-20 sticky top-0">
         <div className="flex items-center gap-4 mb-6">
            <button onClick={() => onNavigate('TERMINAL')} className="text-zinc-500 hover:text-white transition-colors">
                <ArrowLeft size={18} />
            </button>
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-sm bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shadow-glow-sm">
                <Activity size={20} className="text-amber-500" />
                </div>
                <div>
                <h2 className="text-lg font-bold text-white tracking-widest uppercase font-mono">System Logs</h2>
                <p className="text-[10px] text-zinc-500 font-mono uppercase">Performance Matrix // Signal Auditing</p>
                </div>
            </div>
         </div>

         <div className="flex gap-4 h-48 mb-4">
             {/* STATS */}
             <div className="w-1/3 grid grid-cols-2 gap-2">
                <div className="bg-black border border-white/10 p-4 rounded-sm flex flex-col items-center justify-center group hover:border-emerald-500/30 transition-colors">
                   <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Win Rate</div>
                   <div className={`text-2xl font-mono font-bold ${stats.winRate >= 50 ? 'text-emerald-500' : 'text-rose-500'}`}>
                     {stats.winRate.toFixed(1)}%
                   </div>
                   <div className="text-[9px] text-zinc-600 font-mono mt-1">{stats.wins} W - {stats.losses} L</div>
                </div>
                <div className="bg-black border border-white/10 p-4 rounded-sm flex flex-col items-center justify-center">
                   <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Expectancy</div>
                   <div className="text-2xl font-mono font-bold text-zinc-300">
                      {stats.avgR.toFixed(2)}R
                   </div>
                   <div className="text-[9px] text-zinc-600 font-mono mt-1">Avg Risk:Reward</div>
                </div>
                <div className="bg-black border border-white/10 p-4 rounded-sm flex flex-col items-center justify-center">
                   <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Total</div>
                   <div className="text-2xl font-mono font-bold text-white">{stats.total}</div>
                </div>
                <div className="bg-black border border-white/10 p-4 rounded-sm flex flex-col items-center justify-center">
                   <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Active</div>
                   <div className="text-2xl font-mono font-bold text-primary">{stats.active}</div>
                </div>
             </div>

             {/* EQUITY CHART */}
             <div className="flex-1 bg-black border border-white/10 rounded-sm relative overflow-hidden">
                 <div className="absolute top-2 left-2 z-10 text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Cumulative Performance (R-Multiple)</div>
                 <div className="w-full h-full">
                     <ChartContainer 
                        pair="EQ"
                        timeframe="1D" // Dummy
                        data={equityCurveData}
                        type="AREA"
                        isDormant={false}
                     />
                 </div>
             </div>
         </div>
      </div>

      {/* TOOLBAR */}
      <div className="px-6 py-3 bg-black/50 border-b border-white/5 flex flex-col sm:flex-row gap-3 items-center justify-between">
         <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter size={14} className="text-zinc-500" />
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Strategy:</span>
            <CustomSelect 
                value={filterStrategy}
                options={strategyOptions}
                onChange={setFilterStrategy}
                className="min-w-[180px]"
                triggerClassName="bg-black border border-white/10 text-xs text-white px-2 py-1.5 rounded-sm outline-none"
            />
         </div>

         <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
                <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search logs..."
                className="w-full bg-black border border-white/10 pl-8 pr-3 py-1.5 text-xs text-white rounded-sm focus:border-primary/50 outline-none"
                />
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600" />
            </div>
            <button 
                onClick={handleExportCSV}
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-sm text-zinc-400 hover:text-white transition-colors"
                title="Export CSV"
            >
                <Download size={14} />
            </button>
         </div>
      </div>

      {/* LOG LIST */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-[#050505]">
         <div className="flex flex-col gap-2">
            {filteredAlerts.map((alert) => (
                <SwipeableRow
                    key={alert.id}
                    onSwipeRight={() => initiateOverride(alert.id, 'IGNORED')}
                    onSwipeLeft={() => initiateOverride(alert.id, 'IGNORED')} // Can be delete logic
                    iconRight={<Trash2 size={18} className="text-white" />}
                    bgRight="bg-rose-900"
                    iconLeft={<Archive size={18} className="text-white" />}
                    bgLeft="bg-zinc-700"
                >
                    <div 
                    className={`
                        relative bg-black border p-4 transition-all group hover:bg-white/5
                        ${alert.status === 'WIN' ? 'border-emerald-500/30' : 
                        alert.status === 'LOSS' ? 'border-rose-500/30' : 
                        alert.status === 'IGNORED' ? 'border-zinc-800 opacity-60' :
                        'border-white/10 hover:border-primary/30'}
                    `}
                    >
                    {/* Status Indicator */}
                    <div className="absolute top-4 right-4 flex flex-col items-end">
                        
                        {editingAlertId === alert.id ? (
                            <div className="flex items-center gap-2 bg-black border border-white/20 p-1 rounded-sm animate-in fade-in slide-in-from-right-2">
                                <input 
                                    type="number" 
                                    value={exitPriceInput}
                                    onChange={e => setExitPriceInput(e.target.value)}
                                    placeholder="Exit Price"
                                    className="w-20 bg-white/5 border border-white/10 text-xs text-white px-2 py-1 rounded-sm focus:outline-none"
                                    autoFocus
                                />
                                <button onClick={() => confirmOverride(alert)} className="p-1 bg-emerald-500 text-black rounded-sm hover:bg-emerald-400"><Check size={12}/></button>
                                <button onClick={() => setEditingAlertId(null)} className="p-1 bg-white/10 text-white rounded-sm hover:bg-white/20"><X size={12}/></button>
                            </div>
                        ) : (
                            <div className={`
                                flex items-center gap-1.5 px-2 py-1 rounded-sm text-[9px] font-bold uppercase tracking-widest border cursor-pointer
                                ${alert.status === 'WIN' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                                alert.status === 'LOSS' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 
                                alert.status === 'IGNORED' ? 'bg-zinc-800 text-zinc-500 border-zinc-700' :
                                'bg-primary/10 text-primary border-primary/20 animate-pulse'}
                            `}
                            onClick={() => setOpenMenuId(openMenuId === alert.id ? null : alert.id)}
                            >
                                {alert.status === 'WIN' && <CheckCircle2 size={10} />}
                                {alert.status === 'LOSS' && <XCircle size={10} />}
                                {alert.status === 'ACTIVE' && <Activity size={10} />}
                                {alert.status === 'IGNORED' && <XCircle size={10} />}
                                {alert.status}
                                {alert.manualOverride && <span title="Manual Override">*</span>}
                            </div>
                        )}
                        
                        {/* GOD MODE MENU */}
                        {openMenuId === alert.id && (
                            <div className="absolute top-full right-0 mt-1 bg-[#080808] border border-white/10 rounded-sm shadow-xl z-50 py-1 min-w-[100px] flex flex-col animate-in fade-in zoom-in-95">
                                <button onClick={() => initiateOverride(alert.id, 'WIN')} className="px-3 py-1.5 text-left text-[9px] font-bold text-emerald-500 hover:bg-white/5 uppercase">Mark Win</button>
                                <button onClick={() => initiateOverride(alert.id, 'LOSS')} className="px-3 py-1.5 text-left text-[9px] font-bold text-rose-500 hover:bg-white/5 uppercase">Mark Loss</button>
                                <button onClick={() => initiateOverride(alert.id, 'IGNORED')} className="px-3 py-1.5 text-left text-[9px] font-bold text-zinc-500 hover:bg-white/5 uppercase">Ignore</button>
                                <button onClick={() => initiateOverride(alert.id, 'ACTIVE')} className="px-3 py-1.5 text-left text-[9px] font-bold text-primary hover:bg-white/5 uppercase">Reactivate</button>
                            </div>
                        )}

                        {alert.exitPrice && (
                            <span className="text-[9px] font-mono text-zinc-500 mt-1">Closed @ {alert.exitPrice}</span>
                        )}
                        {alert.rMultiple !== undefined && (
                            <span className={`text-[9px] font-mono font-bold mt-0.5 ${alert.rMultiple > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {alert.rMultiple > 0 ? '+' : ''}{alert.rMultiple.toFixed(2)}R
                            </span>
                        )}
                    </div>

                    <div className="flex items-start gap-4">
                        <div className={`
                            w-12 h-12 rounded-sm flex items-center justify-center shrink-0 border
                            ${alert.type === 'BULLISH' ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-500' : 'bg-rose-500/5 border-rose-500/20 text-rose-500'}
                        `}>
                            <TrendingUp size={20} className={alert.type === 'BEARISH' ? 'rotate-180' : ''} />
                        </div>
                        
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-bold text-white font-mono">{alert.pair}</span>
                            <span className={`text-[10px] font-bold px-1 rounded-sm ${alert.type === 'BULLISH' ? 'text-emerald-500 bg-emerald-500/10' : 'text-rose-500 bg-rose-500/10'}`}>
                                {alert.type}
                            </span>
                            <span className="text-[9px] text-zinc-500 font-mono ml-2">
                                {new Date(alert.timestamp).toLocaleString()}
                            </span>
                            </div>
                            
                            <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-mono mb-2">
                            <BrainCircuit size={12} className="text-zinc-600" />
                            {alert.strategyName}
                            </div>

                            <div className="flex items-center gap-6 mt-3">
                            <div className="flex flex-col">
                                <span className="text-[8px] text-zinc-600 uppercase tracking-wider">Entry</span>
                                <span className="text-xs font-mono text-zinc-300">{alert.entryPrice}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[8px] text-zinc-600 uppercase tracking-wider">Target</span>
                                <div className="flex items-center gap-1 text-xs font-mono text-emerald-500">
                                    <Target size={10} /> {alert.tp}
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[8px] text-zinc-600 uppercase tracking-wider">Stop</span>
                                <div className="flex items-center gap-1 text-xs font-mono text-rose-500">
                                    <AlertTriangle size={10} /> {alert.sl}
                                </div>
                            </div>
                            </div>

                            {/* ACTIONS ROW */}
                            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
                                {alert.snapshot && (
                                    <button 
                                        onClick={() => setSelectedSnapshot(alert.snapshot!)}
                                        className="flex items-center gap-1.5 px-2 py-1 bg-white/5 hover:bg-white/10 rounded-sm text-[9px] font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition-colors"
                                    >
                                        <Eye size={10} /> Black Box
                                    </button>
                                )}
                                {onReplay && (
                                    <button 
                                        onClick={() => onReplay(alert.pair, alert.timestamp)}
                                        className="flex items-center gap-1.5 px-2 py-1 bg-white/5 hover:bg-white/10 rounded-sm text-[9px] font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition-colors"
                                    >
                                        <PlayCircle size={10} /> Deep Replay
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                    </div>
                </SwipeableRow>
            ))}
         </div>
      </div>
    </div>
  );
};
