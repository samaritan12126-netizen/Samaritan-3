import { useState, useEffect, useRef, useCallback } from 'react';
import { CurrencyPair, WatchlistAsset, SentinelLog, SentinelStatus, Alert } from '../types';
import { audio } from '../services/audio'; 
import { notificationService } from '../services/notification'; 

const SCAN_INTERVAL_MS = 15000; 
const SNAPSHOT_DELAY_MS = 3000; // Time for chart to render after switch

interface UseSentinelProps {
  onSwitchPair: (pair: CurrencyPair) => void;
  onTriggerSnapshot: () => void;
  onAnalyze: (pair: CurrencyPair, image: string | null) => Promise<any>; 
  isEnabled: boolean;
  alerts: Alert[]; 
  watchlistOverride?: string[];
  scanIntervalOverride?: number;
}

export const useSentinel = ({ onSwitchPair, onTriggerSnapshot, onAnalyze, isEnabled, alerts, watchlistOverride, scanIntervalOverride }: UseSentinelProps) => {
  const [assets, setAssets] = useState<WatchlistAsset[]>([]);
  const [logs, setLogs] = useState<SentinelLog[]>([]);
  const [snapshotTrigger, setSnapshotTrigger] = useState(0); 
  const [lastSnapshotImage, setLastSnapshotImage] = useState<string | null>(null);

  // Refs for mutable state in async closures
  const assetsRef = useRef<WatchlistAsset[]>([]);
  const currentIndexRef = useRef(0);
  const statusRef = useRef<SentinelStatus>('IDLE');
  const timerRef = useRef<any>(null);
  const isEnabledRef = useRef(isEnabled);
  const scanIntervalRef = useRef(scanIntervalOverride || SCAN_INTERVAL_MS);

  // --- SYNC REFS ---
  useEffect(() => {
      isEnabledRef.current = isEnabled;
      scanIntervalRef.current = scanIntervalOverride || SCAN_INTERVAL_MS;
      if (!isEnabled) {
          statusRef.current = 'IDLE';
          if (timerRef.current) clearTimeout(timerRef.current);
          setAssets(prev => prev.map(a => ({ ...a, status: 'IDLE' })));
      } else {
          // Start Loop if just enabled
          if (statusRef.current === 'IDLE') {
              runCycle();
          }
      }
  }, [isEnabled, scanIntervalOverride]);

  // --- INITIALIZE ASSETS ---
  useEffect(() => {
      const targetList = watchlistOverride && watchlistOverride.length > 0 
          ? watchlistOverride 
          : ['BTCUSD', 'ETHUSD', 'SOLUSD', 'EURUSD']; // Default fallback

      const newAssets = targetList.map(symbol => ({ 
          symbol: symbol as CurrencyPair, 
          status: 'IDLE' as SentinelStatus, 
          lastScan: 0 
      }));
      
      setAssets(newAssets);
      assetsRef.current = newAssets;
      currentIndexRef.current = 0;
  }, [JSON.stringify(watchlistOverride)]); // Deep compare

  // --- LOGGING ---
  const addLog = (message: string, type: SentinelLog['type'] = 'INFO', assetName: string = 'SYSTEM') => {
    const newLog = { id: Math.random().toString(36).substr(2, 9), timestamp: Date.now(), asset: assetName, message, type };
    setLogs(prev => [newLog, ...prev.slice(0, 50)]); // Keep last 50
  };

  const updateAssetStatus = (symbol: string, status: SentinelStatus) => {
    setAssets(prev => {
        const next = prev.map(a => a.symbol === symbol ? { ...a, status } : a);
        assetsRef.current = next;
        return next;
    });
  };

  // --- CORE LOOP ---
  const runCycle = useCallback(async () => {
      if (!isEnabledRef.current) return;

      const currentAssets = assetsRef.current;
      if (currentAssets.length === 0) {
          timerRef.current = setTimeout(runCycle, 1000);
          return;
      }

      // 1. SELECT TARGET
      let attempts = 0;
      let target = currentAssets[currentIndexRef.current];
      
      // Skip if active alert exists (simple logic)
      while (attempts < currentAssets.length) {
          const hasActiveAlert = alerts.some(a => a.pair === target.symbol && a.status === 'ACTIVE');
          if (!hasActiveAlert) break;
          
          currentIndexRef.current = (currentIndexRef.current + 1) % currentAssets.length;
          target = currentAssets[currentIndexRef.current];
          attempts++;
      }

      if (attempts >= currentAssets.length) {
          // All busy, wait
          timerRef.current = setTimeout(runCycle, 5000);
          return;
      }

      // 2. SWITCH & WAIT
      statusRef.current = 'SCANNING';
      updateAssetStatus(target.symbol, 'SCANNING');
      onSwitchPair(target.symbol);
      
      timerRef.current = setTimeout(() => {
          if (!isEnabledRef.current) return;
          
          // 3. TRIGGER SNAPSHOT
          statusRef.current = 'SNAPSHOT';
          updateAssetStatus(target.symbol, 'SNAPSHOT');
          setSnapshotTrigger(prev => prev + 1); // Triggers ChartContainer
          
          // Note: The loop pauses here. It resumes when processSnapshot is called by the Chart.
      }, SNAPSHOT_DELAY_MS);

  }, [alerts, onSwitchPair]);

  // --- SNAPSHOT HANDLER (Called by ChartContainer) ---
  const processSnapshot = async (image: string) => {
      if (!isEnabledRef.current || statusRef.current !== 'SNAPSHOT') return;

      const target = assetsRef.current[currentIndexRef.current];
      if (!target) return; // Safety

      setLastSnapshotImage(image);
      statusRef.current = 'ANALYZING';
      updateAssetStatus(target.symbol, 'ANALYZING');
      addLog(`Visual Data Acquired. Analyzing...`, 'INFO', target.symbol);

      try {
          const result = await onAnalyze(target.symbol, image);
          
          if (result && result.biasConfidence > 65) {
              addLog(`Pattern Detected: ${result.bias} (${result.biasConfidence}%)`, 'SUCCESS', target.symbol);
              audio.play('SUCCESS');
          } else {
              addLog(`Scan Complete. No clear setup.`, 'INFO', target.symbol);
          }

      } catch (e: any) {
          addLog(`Analysis Error: ${e.message}`, 'ERROR', target.symbol);
      } finally {
          statusRef.current = 'IDLE';
          updateAssetStatus(target.symbol, 'IDLE');
          
          // Advance Index
          currentIndexRef.current = (currentIndexRef.current + 1) % assetsRef.current.length;
          
          // Schedule Next Cycle
          if (isEnabledRef.current) {
              timerRef.current = setTimeout(runCycle, scanIntervalRef.current);
          }
      }
  };

  return {
    assets,
    logs,
    snapshotTrigger, 
    lastSnapshotImage,
    processSnapshot 
  };
};