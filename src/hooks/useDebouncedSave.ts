import { useState, useRef, useCallback, useEffect } from 'react';

export type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

interface UseDebouncedSaveOptions {
  delay?: number;
  onError?: (error: Error) => void;
}

interface UseDebouncedSaveReturn<T> {
  status: SaveStatus;
  error: Error | null;
  debouncedSave: (data: T) => void;
  saveNow: (data: T) => Promise<void>;
  cancel: () => void;
  retry: () => void;
}

/**
 * Custom hook for debounced autosave functionality
 * @param saveFunction - The async function to call for saving
 * @param options - Configuration options
 */
export function useDebouncedSave<T>(
  saveFunction: (data: T) => Promise<void>,
  options: UseDebouncedSaveOptions = {}
): UseDebouncedSaveReturn<T> {
  const { delay = 800, onError } = options;
  
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [error, setError] = useState<Error | null>(null);
  const [lastData, setLastData] = useState<T | null>(null);
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const saveFunctionRef = useRef(saveFunction);
  
  // Keep saveFunction ref up to date
  useEffect(() => {
    saveFunctionRef.current = saveFunction;
  }, [saveFunction]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const performSave = useCallback(async (data: T) => {
    setStatus('saving');
    setError(null);
    
    try {
      await saveFunctionRef.current(data);
      setStatus('saved');
      setLastData(null);
      
      // Reset to idle after showing "saved" for 2 seconds
      setTimeout(() => {
        setStatus((current) => current === 'saved' ? 'idle' : current);
      }, 2000);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      setStatus('error');
      setLastData(data);
      
      if (onError) {
        onError(error);
      }
    }
  }, [onError]);

  const debouncedSave = useCallback((data: T) => {
    setLastData(data);
    setStatus('pending');
    setError(null);
    
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      performSave(data);
    }, delay);
  }, [delay, performSave]);

  const saveNow = useCallback(async (data: T) => {
    // Clear any pending debounced save
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    await performSave(data);
  }, [performSave]);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setStatus('idle');
    setLastData(null);
  }, []);

  const retry = useCallback(() => {
    if (lastData !== null) {
      performSave(lastData);
    }
  }, [lastData, performSave]);

  return {
    status,
    error,
    debouncedSave,
    saveNow,
    cancel,
    retry
  };
}

export default useDebouncedSave;
