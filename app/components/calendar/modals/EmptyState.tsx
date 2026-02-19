// EmptyState.tsx - Mobile otimizado
"use client";

import { motion } from "framer-motion";
import { HiOutlineReceiptTax, HiPlus } from "react-icons/hi";
import { Button } from "@/app/components";

interface EmptyStateProps {
  title?: string;
  description?: string;
  buttonText?: string;
  onAddClick?: () => void;
  showButton?: boolean;
  icon?: React.ReactNode;
}

export default function EmptyState({
  title = "Nenhuma transação encontrada",
  description = "Adicione sua primeira transação para começar",
  buttonText = "Adicionar Transação",
  onAddClick,
  showButton = true,
  icon = <HiOutlineReceiptTax className="w-6 h-6 sm:w-8 sm:h-8" />,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="
        flex flex-col items-center justify-center
        text-center p-8 sm:p-12
        rounded-xl sm:rounded-2xl
        bg-gradient-to-br from-slate-800/50 to-slate-900/50
        border border-white/10
        backdrop-blur-sm
      "
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", delay: 0.1 }}
        className="
          w-16 h-16 sm:w-20 sm:h-20
          rounded-xl sm:rounded-2xl
          bg-gradient-to-br from-purple-500/20 to-indigo-500/20
          flex items-center justify-center
          mb-4 sm:mb-6
          border border-purple-500/20
        "
      >
        <div className="text-purple-400">
          {icon}
        </div>
      </motion.div>

      <motion.h4 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-lg sm:text-xl font-semibold text-white mb-2 sm:mb-3"
      >
        {title}
      </motion.h4>

      <motion.p 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-xs sm:text-sm text-slate-400 mb-6 sm:mb-8 max-w-sm px-4"
      >
        {description}
      </motion.p>

      {showButton && onAddClick && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="w-full sm:w-auto px-4"
        >
          <Button
            onClick={onAddClick}
            variant="primary"
            size="lg"
            icon={<HiPlus size={14} />}
            className="w-full sm:w-auto rounded-xl shadow-lg shadow-purple-600/20"
          >
            {buttonText}
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}
