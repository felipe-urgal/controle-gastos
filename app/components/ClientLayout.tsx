'use client';

import { useState, useEffect } from 'react';
import { ToastContainer } from 'react-toastify';
import { FiMenu, FiX } from 'react-icons/fi';
import Sidebar from './Sidebar';
import { useAuth } from "@/app/context/AuthContext";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
      // Fechar sidebar ao redimensionar para mobile se estiver aberta
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false);
      }
    };

    // Verificar no carregamento inicial
    handleResize();
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex bg-gray-900 min-h-screen">
      {/* Overlay mobile */}
      {user && sidebarOpen && isMobile && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden transition-opacity duration-300" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      {user && (
        <div className={`fixed h-screen z-30 transition-all duration-300 ease-in-out ${
          sidebarOpen ? 'left-0' : '-left-64'
        } lg:relative lg:left-0 lg:z-0 w-64`}>
          <Sidebar onClose={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* Conteúdo */}
      <main className={`flex-1 min-h-screen transition-all duration-300 ${
        user ? "lg:ml-0" : ""
      }`}>
        {/* Botão mobile */}
        {user && isMobile && (
          <button 
            className="lg:hidden fixed bottom-6 right-6 bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-full z-20 shadow-lg transition-colors duration-200"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? "Fechar menu" : "Abrir menu"}
          >
            {sidebarOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>
        )}

        <div className="">
          {children}
        </div>
      </main>

      <ToastContainer
        position="bottom-center"
        autoClose={1500}
        hideProgressBar={true}
        closeOnClick
        pauseOnHover
        draggable
        toastClassName="text-sm px-3 py-2 rounded shadow-md max-w-[90vw] bg-white text-black"
        className="text-sm"
      />
    </div>
  );
}