'use client';

import { createContext, useContext, useState, useCallback } from 'react';

export type ModalType =
  | 'accounts'
  | 'categories'
  | 'goals'
  | 'import'
  | null;

interface UIContextType {
  activeModal: ModalType;
  openModal: (modal: Exclude<ModalType, null>) => void;
  closeModal: () => void;
  isModalOpen: boolean;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  const openModal = useCallback((modal: Exclude<ModalType, null>) => {
    setActiveModal(modal);
  }, []);

  const closeModal = useCallback(() => {
    setActiveModal(null);
  }, []);

  return (
    <UIContext.Provider
      value={{
        activeModal,
        openModal,
        closeModal,
        isModalOpen: activeModal !== null,
      }}
    >
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  const context = useContext(UIContext);
  if (!context) throw new Error('useUI must be used within UIProvider');
  return context;
}
