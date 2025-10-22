// app/hooks/usePersistedState.ts
'use client';

import { useState, useEffect, useRef } from 'react';

export function usePersistedState<T>(
  key: string, 
  defaultValue: T,
  storage: 'local' | 'session' = 'session'
): [T, (value: T | ((val: T) => T)) => void] {
  const [state, setState] = useState<T>(defaultValue);
  const isInitialMount = useRef(true);

  useEffect(() => {
    try {
      const storageObj = storage === 'local' ? localStorage : sessionStorage;
      const item = storageObj.getItem(key);
      
      if (item) {
        const parsed = JSON.parse(item);
        // Verificar se é um job ativo
        if (parsed?.jobId && parsed.importing) {
          // Verificar se o job ainda existe no servidor
          checkJobStatus(parsed.jobId).then(isActive => {
            if (isActive) {
              setState(parsed);
            } else {
              storageObj.removeItem(key);
            }
          });
        } else {
          setState(parsed);
        }
      }
    } catch (error) {
      console.warn(`Erro ao carregar estado persistido para ${key}:`, error);
    }
  }, [key, storage]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    try {
      const storageObj = storage === 'local' ? localStorage : sessionStorage;
      
      if (state === null || state === undefined) {
        storageObj.removeItem(key);
      } else {
        storageObj.setItem(key, JSON.stringify(state));
      }
    } catch (error) {
      console.warn(`Erro ao salvar estado persistido para ${key}:`, error);
    }
  }, [key, state, storage]);

  return [state, setState];
}

// Função para verificar se o job ainda está ativo no servidor
async function checkJobStatus(jobId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/import/process?jobId=${jobId}`);
    if (response.ok) {
      const status = await response.json();
      return status.status === 'PROCESSING';
    }
    return false;
  } catch {
    return false;
  }
}