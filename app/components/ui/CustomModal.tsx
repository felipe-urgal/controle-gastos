"use client";

// hooks
import { useEffect, useRef } from "react";

// icons
import { FaTimes } from "react-icons/fa";

interface ModalProps {
  children: React.ReactNode;
  onClose: () => void;
  isOpen?: boolean;
}

export default function CustomModal({ children, onClose, isOpen = true }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    // Prevent body scrolling when modal is open
    document.body.style.overflow = 'hidden';
    
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);

  // Handle click outside to close
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm transition-opacity duration-300 animate-fadeIn"
      onClick={handleBackdropClick}
      aria-modal="true"
      role="dialog"
    >
      <div 
        ref={modalRef}
        className="relative bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-300 scale-95 animate-scaleIn"
      >
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 z-10 bg-white rounded-full p-2 shadow-lg hover:scale-110 transition-transform duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          aria-label="Fechar modal"
        >
          <FaTimes className="w-4 h-4 text-gray-600" />
        </button>
        
        <div className="max-h-[85vh] overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out forwards;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
}