'use client';

// hooks
import { useState } from 'react';

// components
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify';
import { Navbar } from '@/app/components';

// context
import { useAuth } from "@/app/context/AuthContext";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user } = useAuth();

  return (
    <div className="min-h-dvh bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800">
      <ToastContainer
        position="bottom-center"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        rtl={false}
        pauseOnFocusLoss
        closeOnClick
        pauseOnHover={false}
        draggable
        draggablePercent={60}
        className="mb-4 md:mb-6"
      />
      
      {/* Efeito de partículas sutis */}
      <div className="fixed inset-0 z-0 opacity-20">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-purple-500 rounded-full mix-blend-soft-light filter blur-xl animate-pulse-slow"></div>
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-indigo-500 rounded-full mix-blend-soft-light filter blur-xl animate-pulse-slow animation-delay-2000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-pink-500 rounded-full mix-blend-soft-light filter blur-xl animate-pulse-slow animation-delay-4000"></div>
      </div>

      {/* Navbar */}
      {user && (
        <div className="fixed top-0 left-0 right-0 z-30 backdrop-blur-md bg-black/30 border-b border-white/10 h-10">
          <Navbar 
            onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
            mobileMenuOpen={mobileMenuOpen}
          />
        </div>
      )}

      {/* Conteúdo */}
      <main className={`relative z-10 flex-1 transition-all duration-300 ${user ? "pt-10" : ""}`}>
        <div className="max-w-7xl mx-auto px-3 py-3 lg:px-6 lg:py-4">
          {children}
        </div>
      </main>

      <style jsx global>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.4; }
        }
        .animate-pulse-slow {
          animation: pulse-slow 8s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        
        /* Sobrescrevendo completamente os estilos do Toastify */
        .Toastify__toast {
          background: rgba(0, 0, 0, 0.3) !important;
          backdrop-filter: blur(12px) !important;
          border-radius: 16px !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          color: white !important;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2) !important;
          margin-bottom: 8px;
          min-height: 48px;
        }
        
        .Toastify__toast-body {
          font-size: 14px;
          padding: 8px 12px;
          margin: 0;
        }
        
        .Toastify__progress-bar {
          background: linear-gradient(to right, #a855f7, #ec4899) !important;
          height: 3px;
          border-radius: 0 0 16px 16px;
        }
        
        .Toastify__close-button {
          color: white;
          opacity: 0.7;
        }
        
        .Toastify__close-button:hover {
          opacity: 1;
        }
        
        /* Melhorias específicas para o Toast em mobile */
        @media (max-width: 768px) {
          .Toastify__toast {
            min-height: 48px;
            margin-bottom: env(safe-area-inset-bottom, 0);
            max-width: 95vw;
            margin-left: auto;
            margin-right: auto;
          }
          
          .Toastify__toast-container {
            width: 100%;
            left: 0;
            padding: 0 8px;
          }
        }
        
        /* Feedback visual ao tocar */
        .Toastify__toast:active {
          opacity: 0.9;
          transform: scale(0.98);
          transition: transform 0.2s, opacity 0.2s;
        }
      `}</style>
    </div>
  );
}