// importing hooks
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

// importing icons
import { FaArrowLeft } from 'react-icons/fa';

export default function Header() {
  const router = useRouter();

  return (
    <div className="flex items-center gap-3 mb-4">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => router.back()}
        className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/5 border border-white/5 hover:bg-white/5 transition-colors shrink-0"
      >
        <FaArrowLeft size={16} className="text-slate-400" />
      </motion.button>
      
      <div className="min-w-0">
        <h1 className="text-xl sm:text-3xl font-bold text-white truncate">
          Nova Conta
        </h1>
        <p className="text-sm text-slate-400 truncate">
          Configure os detalhes da sua conta financeira
        </p>
      </div>
    </div>
  );
};
