"use client"

// app/hooks/useFileReader.ts (Hook auxiliar opcional)
import { useState, useCallback } from 'react';

export function useFileReader() {
  const [reading, setReading] = useState(false);

  const readFile = useCallback(async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      setReading(true);
      
      const reader = new FileReader();
      
      reader.onload = (e) => {
        setReading(false);
        resolve(e.target?.result as string);
      };
      
      reader.onerror = () => {
        setReading(false);
        reject(new Error('Erro ao ler arquivo'));
      };
      
      reader.readAsText(file, 'UTF-8');
    });
  }, []);

  return {
    reading,
    readFile
  };
}