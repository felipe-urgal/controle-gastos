// app/components/MobileView.tsx
'use client';

import { useEffect, ReactNode } from 'react';

interface MobileViewProps {
  children: ReactNode;
}

const MobileView = ({ children }: MobileViewProps) => {
  useEffect(() => {
    // Função para forçar modo fullscreen em alguns dispositivos
    const hideAddressBar = () => {
      window.scrollTo(0, 1);
    };

    // Timeout para garantir que o DOM está carregado
    setTimeout(hideAddressBar, 100);
    
    // Esconder barra de navegação quando o usuário rolar
    let lastScrollTop = 0;
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      
      if (scrollTop > lastScrollTop) {
        // Scroll para baixo - esconder barra
        document.documentElement.style.setProperty('--scrollbar-width', '0px');
      } else {
        // Scroll para cima - mostrar barra
        document.documentElement.style.setProperty('--scrollbar-width', 'auto');
      }
      
      lastScrollTop = scrollTop;
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="w-full h-[100dvh] h-[--mobile-fill-available] overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800">
      {children}
    </div>
  );
};

export default MobileView;