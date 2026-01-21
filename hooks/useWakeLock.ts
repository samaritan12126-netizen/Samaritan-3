
import { useState, useRef, useCallback, useEffect } from 'react';

export const useWakeLock = () => {
  const [isLocked, setIsLocked] = useState(false);
  const wakeLock = useRef<any>(null);
  
  // Track user intent separately from actual lock state.
  // If the browser auto-releases (tab switch), we want to know if we *should* re-acquire when back.
  const shouldBeLocked = useRef(false);

  const requestLock = useCallback(async () => {
    // Feature check
    if (!('wakeLock' in navigator)) {
        console.warn("Wake Lock API not supported on this browser.");
        return;
    }

    try {
      const lock = await (navigator as any).wakeLock.request('screen');
      wakeLock.current = lock;
      setIsLocked(true);
      console.log("Wake Lock Active: Screen will remain on.");
      
      lock.addEventListener('release', () => {
        setIsLocked(false);
        console.log("Wake Lock Released (System/User).");
      });
    } catch (err: any) {
      // Specific handling for Policy errors
      if (err.name === 'NotAllowedError') {
          console.warn("Wake Lock denied: Policy, Battery Saver, or missing permissions.");
      } else {
          console.error(`Wake Lock Error: ${err.name}, ${err.message}`);
      }
      setIsLocked(false);
      // If denied, we reset intent so we don't loop trying to acquire
      shouldBeLocked.current = false;
    }
  }, []);

  const releaseLock = useCallback(async () => {
    shouldBeLocked.current = false;
    if (wakeLock.current) {
      try {
        await wakeLock.current.release();
      } catch(e) {
          // Ignore if already released
      }
      wakeLock.current = null;
      setIsLocked(false);
    }
  }, []);

  const toggleLock = useCallback(async () => {
      if (isLocked) {
          await releaseLock();
      } else {
          shouldBeLocked.current = true;
          await requestLock();
      }
  }, [isLocked, requestLock, releaseLock]);

  // Auto-reacquire logic
  useEffect(() => {
    const handleVisibilityChange = async () => {
      // If the tab becomes visible AND the user wanted the lock (shouldBeLocked) AND we aren't currently locked
      if (document.visibilityState === 'visible' && shouldBeLocked.current && !wakeLock.current) {
         // Add a small delay to ensure document is fully active
         setTimeout(() => requestLock(), 500);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [requestLock]);

  return { isLocked, toggleLock };
};
