"use client";

import { FaSpinner } from "react-icons/fa";

interface DeleteOverlayProps {
  isOpen: boolean;
  entityName: string; // ex: "conta", "categoria"
  title?: string;
  description?: string;
}

export default function DeleteOverlay({
  isOpen,
  entityName,
  title,
  description,
}: DeleteOverlayProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center"
    >
      <div
        className="bg-slate-900 rounded-2xl p-8 text-center max-w-sm mx-4 border border-white/10"
      >
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 rounded-full border-4 border-red-500/30" />
          <div className="absolute inset-0 rounded-full border-4 border-red-500 border-t-transparent animate-spin" />
        </div>

        <h3 className="text-xl font-bold text-white mb-2">
          {title ?? `Excluindo ${entityName}`}
        </h3>

        <p className="text-slate-400 mb-6">
          {description ??
            `Por favor, aguarde enquanto excluímos ${entityName}...`}
        </p>

        <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
          <FaSpinner className="animate-spin" />
          <span>Processando</span>
        </div>
      </div>
    </div>
  );
}