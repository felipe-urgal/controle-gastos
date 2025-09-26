// app/components/ClientLayout.tsx
'use client';

import { useState } from 'react';
import { useAuth } from "@/app/context/AuthContext";
import { useMobileDetection } from '@/app/hook/useMobileDetection';
import { MobileView } from '@/app/components';
import { FaSignOutAlt, FaEllipsisH, FaTimes } from 'react-icons/fa';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [floatingMenuOpen, setFloatingMenuOpen] = useState(false);
  const { logout } = useAuth();
  const isMobile = useMobileDetection();

  const handleLogout = () => {
    logout();
    setFloatingMenuOpen(false);
  };

  // Conteúdo principal
  const content = (
    <div className="min-h-dvh w-full overflow-hidden bg-gray-50 relative">
      {children}
      
      {/* Menu Flutuante Avançado */}
      <div className="fixed bottom-6 right-6 z-50">
        {/* Menu de opções com animação */}
        {floatingMenuOpen && (
          <div className="absolute bottom-14 right-0 space-y-1">
            {/* Opção Perfil */}
            {/*<button
              onClick={() => {
                // Navegar para perfil ou abrir modal
                setFloatingMenuOpen(false);
              }}
              className="flex items-center justify-end w-full bg-white rounded-lg shadow-md px-4 py-3 hover:bg-blue-50 transition-all duration-200 transform hover:scale-105 animate-slide-up"
              style={{ animationDelay: '0.1s' }}
            >
              <span className="text-sm text-gray-700 mr-2">Perfil</span>
              <FaUser className="text-blue-500" size={14} />
            </button>

            <button
              onClick={() => {
                // Navegar para configurações
                setFloatingMenuOpen(false);
              }}
              className="flex items-center justify-end w-full bg-white rounded-lg shadow-md px-4 py-3 hover:bg-gray-50 transition-all duration-200 transform hover:scale-105 animate-slide-up"
              style={{ animationDelay: '0.2s' }}
            >
              <span className="text-sm text-gray-700 mr-2">Configurações</span>
              <FaCog className="text-gray-500" size={14} />
            </button>*/}

            {/* Opção Sair */}
            <button
              onClick={handleLogout}
              className="flex items-center justify-end w-full bg-white rounded-lg shadow-md px-4 py-3 hover:bg-red-50 transition-all duration-200 transform hover:scale-105 animate-slide-up"
              style={{ animationDelay: '0.3s' }}
            >
              <span className="text-sm text-red-600 mr-2">Sair</span>
              <FaSignOutAlt className="text-red-500" size={14} />
            </button>
          </div>
        )}

        {/* Botão principal flutuante */}
        <button
          onClick={() => setFloatingMenuOpen(!floatingMenuOpen)}
          className={`w-10 h-10 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 ${
            floatingMenuOpen 
              ? 'bg-red-500 hover:bg-red-600 rotate-45' 
              : 'bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600'
          }`}
        >
          {floatingMenuOpen ? (
            <FaTimes className="text-white text-lg" />
          ) : (
            <FaEllipsisH className="text-white text-lg" />
          )}
        </button>
      </div>

      {/* Overlay para fechar o menu */}
      {floatingMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/85 bg-opacity-20 animate-fade-in"
          onClick={() => setFloatingMenuOpen(false)}
        />
      )}
    </div>
  );

  // Adicione estas animações no seu CSS global ou tailwind.config.js
  const style = `
    @keyframes fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes slide-up {
      from { 
        opacity: 0; 
        transform: translateY(10px); 
      }
      to { 
        opacity: 1; 
        transform: translateY(0); 
      }
    }
    .animate-fade-in {
      animation: fade-in 0.2s ease-out;
    }
    .animate-slide-up {
      animation: slide-up 0.3s ease-out forwards;
    }
  `;

  return (
    <>
      <style jsx>{style}</style>
      {isMobile ? <MobileView>{content}</MobileView> : content}
    </>
  );
}