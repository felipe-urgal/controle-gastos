"use client";

import { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Alert } from "@/app/components";

interface FormContainerProps {
  children: ReactNode;
  onSubmit: (e: React.FormEvent) => void;
  error?: string | null;
  onClearError?: () => void;
  className?: string;
}

export default function FormContainer({
  children,
  onSubmit,
  error,
  onClearError,
  className = "",
}: FormContainerProps) {
  return (
    <form
      onSubmit={onSubmit}
      className={`relative flex flex-col gap-3 
                  bg-white/5 rounded-2xl 
                  border border-white/5 
                  p-4 ${className}`}
    >
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Alert
              variant="error"
              message={error}
              onClose={onClearError}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {children}
    </form>
  );
};
