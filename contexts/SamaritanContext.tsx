import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { brokerService } from '../services/execution';

interface SamaritanContextType {
  isBioLocked: boolean;
  unlockBio: () => void;
  lockBio: () => void;
  shadowModeEnabled: boolean;
  toggleShadowMode: () => void;
  tokenUsage: number;
  incrementTokenUsage: () => void;
  bioLockEnabled: boolean;
  setBioLockEnabled: (enabled: boolean) => void;
}

const SamaritanContext = createContext<SamaritanContextType | undefined>(undefined);

export const SamaritanProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isBioLocked, setIsBioLocked] = useState(false); 
  const [shadowModeEnabled, setShadowModeEnabled] = useState(false);
  const [tokenUsage, setTokenUsage] = useState(0);
  const [bioLockEnabled, setBioLockEnabledState] = useState(false);

  useEffect(() => {
      const savedBio = localStorage.getItem('samaritan_bio_lock_enabled');
      if (savedBio) setBioLockEnabledState(JSON.parse(savedBio));
      
      const savedShadow = localStorage.getItem('samaritan_shadow_mode');
      if (savedShadow) {
          const isEnabled = JSON.parse(savedShadow);
          setShadowModeEnabled(isEnabled);
          brokerService.toggleShadowMode(isEnabled);
      }
  }, []);

  const setBioLockEnabled = (val: boolean) => {
      setBioLockEnabledState(val);
      localStorage.setItem('samaritan_bio_lock_enabled', JSON.stringify(val));
  };

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && bioLockEnabled) {
        setTimeout(() => {
            if (document.hidden) setIsBioLocked(true);
        }, 1000); 
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [bioLockEnabled]);

  const unlockBio = () => { setIsBioLocked(false); };
  const lockBio = () => { setIsBioLocked(true); };

  const toggleShadowMode = () => {
      setShadowModeEnabled(prev => {
          const newState = !prev;
          brokerService.toggleShadowMode(newState);
          localStorage.setItem('samaritan_shadow_mode', JSON.stringify(newState));
          return newState;
      });
  };

  const incrementTokenUsage = () => { setTokenUsage(prev => prev + 1); };

  return (
    <SamaritanContext.Provider value={{ 
        isBioLocked, unlockBio, lockBio, shadowModeEnabled, toggleShadowMode, tokenUsage, incrementTokenUsage, bioLockEnabled, setBioLockEnabled
    }}>
      {children}
    </SamaritanContext.Provider>
  );
};

export const useSamaritan = () => {
  const context = useContext(SamaritanContext);
  if (!context) throw new Error('useSamaritan must be used within a SamaritanProvider');
  return context;
};