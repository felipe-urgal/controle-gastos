"use client";

// importing hooks
import { useEffect, useState } from "react";

// importing libs
import { motion } from "framer-motion";

// importing components
import { BackgroundParticles } from "@/app/components/layout";

export default function SplashScreen() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center text-center"
      role="status"
      aria-label="Carregando aplicação"
    >
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <BackgroundParticles />
      </div>

      <div className="relative flex flex-col items-center w-fit">
        <motion.div
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="text-4xl text-center font-bold bg-gradient-to-r from-purple-600 to-indigo-500 bg-clip-text text-transparent"
        >
          Controle Financeiro
        </motion.div>

        <div className="mt-4 w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-purple-600 to-indigo-500 text-center"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        <p className="mt-3 text-sm text-slate-500 text-center">
          {progress}% Carregando...
        </p>
      </div>
    </motion.div>
  );
};
