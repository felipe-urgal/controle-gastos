"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  FaExclamationTriangle, 
  FaTimes, 
  FaTrash, 
  FaInfoCircle,
  FaBan
} from "react-icons/fa";
import { Button } from "@/app/components";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  isLoading?: boolean;
  showCancelButton?: boolean;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirmar ação",
  message = "Tem certeza que deseja realizar esta ação?",
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "danger",
  isLoading = false,
  showCancelButton = true,
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const variantConfig = {
    danger: {
      icon: FaExclamationTriangle,
      iconColor: "text-red-500",
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/20",
      buttonColor: "danger",
      titleColor: "text-red-400"
    },
    warning: {
      icon: FaExclamationTriangle,
      iconColor: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
      borderColor: "border-yellow-500/20",
      buttonColor: "warning",
      titleColor: "text-yellow-400"
    },
    info: {
      icon: FaInfoCircle,
      iconColor: "text-blue-500",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/20",
      buttonColor: "primary",
      titleColor: "text-blue-400"
    },
  };

  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60]">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className={`
                w-full max-w-md
                rounded-2xl
                bg-gradient-to-br from-slate-900 to-slate-800
                border ${config.borderColor}
                shadow-2xl
                overflow-hidden
              `}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header with accent color */}
              <div className={`h-2 w-full ${config.bgColor}`} />

              <div className="p-6">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`
                    w-12 h-12 rounded-xl
                    ${config.bgColor} border ${config.borderColor}
                    flex items-center justify-center shrink-0
                  `}>
                    <Icon className={`w-6 h-6 ${config.iconColor}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <h3 className={`text-lg font-semibold ${config.titleColor} mb-2`}>
                      {title}
                    </h3>
                    
                    <p className="text-sm text-slate-300 leading-relaxed">
                      {message}
                    </p>

                    {/* Extra warning for dangerous actions */}
                    {variant === "danger" && (
                      <div className="mt-4 p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                        <p className="text-xs text-red-400 flex items-start gap-2">
                          <FaBan className="shrink-0 mt-0.5" size={12} />
                          <span>Esta ação é irreversível e removerá permanentemente todos os dados associados.</span>
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Close button */}
                  <button
                    onClick={onClose}
                    disabled={isLoading}
                    className="p-2 rounded-lg hover:bg-white/5 transition-colors disabled:opacity-50"
                  >
                    <FaTimes className="w-4 h-4 text-slate-400" />
                  </button>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-6">
                  {showCancelButton && (
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={onClose}
                      disabled={isLoading}
                      className="flex-1 rounded-xl h-12 text-base"
                    >
                      {cancelText}
                    </Button>
                  )}

                  <Button
                    variant={config.buttonColor as any}
                    size="lg"
                    onClick={onConfirm}
                    isLoading={isLoading}
                    disabled={isLoading}
                    className={`flex-1 rounded-xl h-12 text-base ${
                      !showCancelButton ? 'w-full' : ''
                    }`}
                    icon={variant === "danger" ? <FaTrash size={14} /> : undefined}
                  >
                    {confirmText}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
