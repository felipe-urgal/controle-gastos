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
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800">
      <ToastContainer
        position="top-right"
        autoClose={1500}
        hideProgressBar={false}
        newestOnTop={false}
        rtl={false}
        pauseOnFocusLoss
        closeOnClick
        pauseOnHover
        draggable
        toastClassName="text-sm px-4 py-3 rounded-xl shadow-lg max-w-[90vw] bg-gradient-to-r from-gray-800 to-gray-900 text-white border border-white/10 backdrop-blur-md"
        progressClassName="bg-gradient-to-r from-purple-500 to-pink-500"
        className="text-sm"
      />
      
      {/* Efeito de partículas sutis */}
      <div className="fixed inset-0 z-0 opacity-20">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-purple-500 rounded-full mix-blend-soft-light filter blur-xl animate-pulse-slow"></div>
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-indigo-500 rounded-full mix-blend-soft-light filter blur-xl animate-pulse-slow animation-delay-2000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-pink-500 rounded-full mix-blend-soft-light filter blur-xl animate-pulse-slow animation-delay-4000"></div>
      </div>

      {/* Navbar */}
      {user && (
        <div className="fixed top-0 left-0 right-0 z-30 backdrop-blur-md bg-black/30 border-b border-white/10">
          <Navbar 
            onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
            mobileMenuOpen={mobileMenuOpen}
          />
        </div>
      )}

      {/* Conteúdo */}
      <main className={`relative z-10 flex-1 min-h-screen transition-all duration-300 ${user ? "pt-16" : ""}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </div>
      </main>

      {/* Footer sutil */}
      {user && (
        <footer className="relative z-10 py-4 text-center text-white/60 text-xs backdrop-blur-md bg-black/20 mt-auto">
          <div className="max-w-7xl mx-auto px-4">
            <p>© {new Date().getFullYear()} Finanças Pessoais · Gerencie seu dinheiro com elegância</p>
          </div>
        </footer>
      )}

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
      `}</style>
    </div>
  );
}
