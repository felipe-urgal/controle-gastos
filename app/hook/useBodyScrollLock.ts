// app/hook/useBodyScrollLock.ts
import { useCallback } from 'react';

export const useBodyScrollLock = () => {
  const lockScroll = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    const scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    
    return scrollY;
  }, []);

  const unlockScroll = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    const scrollY = document.body.style.top;
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.body.style.overflow = '';
    
    if (scrollY) {
      window.scrollTo(0, parseInt(scrollY || '0') * -1);
    }
  }, []);

  return { lockScroll, unlockScroll };
};