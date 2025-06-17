'use client';

// hooks
import { useState } from 'react';

// components
import { ToastContainer } from 'react-toastify';
import { Navbar } from '@/app/components';

// context
import { useAuth } from "@/app/context/AuthContext";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user } = useAuth();

  return (
    <div className="flex flex-col bg-gray-900 min-h-screen">
      {/* Navbar */}
      {user && (
        <div className="fixed top-0 left-0 right-0 z-30">
          <Navbar 
            onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
            mobileMenuOpen={mobileMenuOpen}
          />
        </div>
      )}

      {/* Conteúdo */}
      <main className={`flex-1 min-h-screen transition-all duration-300 ${user ? "pt-16" : ""}`}>
        {children}
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