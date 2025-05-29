'use client';

import { useState } from 'react';
import { ToastContainer } from 'react-toastify';
import { FiMenu, FiX } from 'react-icons/fi';
import Sidebar from './Sidebar';
import { useAuth } from "@/app/context/AuthContext";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();

  return (
    <div className="flex bg-gray-900">
      {/* Overlay mobile */}
      {user && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      {user && (
          <div
          className={`fixed h-screen z-30 transition-all duration-300 ease-in-out 
          ${sidebarOpen ? 'left-0' : '-left-64'} lg:left-0 w-64`}
        >
          <Sidebar onClose={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* Conteúdo */}
      <main className={`flex-1 min-h-screen ${user ? "lg:ml-64": "" }`}>
        {/* Botão mobile */}
        {user && (
          <button
            className="lg:hidden fixed bottom-4 right-4 bg-blue-500 text-white p-3 rounded-full z-20 shadow-lg"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>
        )}

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
