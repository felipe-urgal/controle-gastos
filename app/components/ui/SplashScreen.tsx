"use client";

import { motion } from "framer-motion";

export default function SplashScreen() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-slate-950">

      {/* Glow */}
      <div className="absolute w-[600px] h-[600px] bg-purple-500/20 blur-[140px] rounded-full" />

      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="relative text-center"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          className="mx-auto w-14 h-14 rounded-full border-2 border-slate-200 dark:border-slate-700 border-t-purple-600"
        />

        <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
          Inicializando sua experiência...
        </p>
      </motion.div>
    </div>
  );
}