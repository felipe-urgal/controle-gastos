"use client";

import { motion } from "framer-motion";

interface LoadingActionProps {
  message?: string;
}

export default function LoadingAction({
  message = "Processando...",
}: LoadingActionProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex items-center gap-3"
    >
      <div className="relative w-5 h-5">
        <div className="absolute inset-0 rounded-full border-2 border-purple-500/30" />
        <div className="absolute inset-0 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
      </div>
      <span className="text-sm text-slate-300">
        {message}
      </span>
    </motion.div>
  );
}
