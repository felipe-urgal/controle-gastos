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
    
    // Removemos a lógica de scroll que estava bloqueando o comportamento normal
    // A barra de navegação do navegador será gerenciada pelo próprio navegador
  }, []);

  return (
    // Alteramos para uma div que cobre toda a altura mínima necessária
    // e aplicamos o gradiente em um elemento fixo de fundo
    <div className="relative w-full overflow-auto">
      
      {/* Conteúdo com scroll livre */}
      <div className="relative">
        {children}
      </div>
    </div>
  );
};

export default MobileView;