"use client";

import { motion } from "framer-motion";

interface Props {
  count?: number;
}

export default function LoadingSkeleton({ count = 4 }: Props) {
  return (
    <div className="flex flex-col gap-4">
      {[...Array(count)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="
            h-20
            rounded-2xl
            bg-gradient-to-r from-slate-800/50 to-slate-700/50
            border border-white/5
            animate-pulse
            relative overflow-hidden
          "
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
        </motion.div>
      ))}
      
      <style jsx>{`
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
}
