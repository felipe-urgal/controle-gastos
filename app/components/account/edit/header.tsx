// importing hooks
import { motion } from 'framer-motion';

// importing icons
import { FaArrowLeft } from 'react-icons/fa';

export default function Header({ handleBack }: { handleBack: () => void }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleBack}
        className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/5 border border-white/5 hover:bg-white/5 transition-colors"
      >
        <FaArrowLeft size={16} className="text-slate-400" />
      </motion.button>
      
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white">
          Editar Conta
        </h1>
        <p className="text-sm text-slate-400">
          Atualize as informações da sua conta
        </p>
      </div>
    </div>
  );
};
