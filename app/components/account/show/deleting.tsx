// importing hooks
import { motion, AnimatePresence } from "framer-motion";

// importing icons
import { FaSpinner } from "react-icons/fa";

export default function Deleting() {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-slate-900 rounded-2xl p-8 text-center max-w-sm mx-4 border border-white/10"
        >
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-red-500/30" />
            <div className="absolute inset-0 rounded-full border-4 border-red-500 border-t-transparent animate-spin" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Excluindo conta</h3>
          <p className="text-slate-400 mb-6">
            Por favor, aguarde enquanto excluímos a conta...
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
            <FaSpinner className="animate-spin" />
            <span>Processando</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
