// app/context/UIContext.tsx
'use client';

import React, { createContext, useContext, useState } from 'react';

interface UIContextType {
  isAnyModalOpen: boolean;
  setModalOpen: (open: boolean) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [isAnyModalOpen, setIsAnyModalOpen] = useState(false);

  const setModalOpen = (open: boolean) => {
    setIsAnyModalOpen(open);
  };

  return (
    <UIContext.Provider value={{ isAnyModalOpen, setModalOpen }}>
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
}