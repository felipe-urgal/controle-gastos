"use client";

import { motion } from "framer-motion";
import { useTheme } from "@/app/context";

interface LoadingProps {
  size?: "sm" | "md" | "lg";
  text?: string;
  fullscreen?: boolean;
  className?: string;
}

const Loading = ({
  size = "md",
  text = "Carregando...",
  fullscreen = false,
  className = "",
}: LoadingProps) => {
  const { resolvedTheme } = useTheme();

  const sizeMap = {
    sm: 28,
    md: 40,
    lg: 60,
  };

  const spinnerSize = sizeMap[size];

  return (
    <div
      className={`flex flex-col items-center justify-center ${
        fullscreen ? "min-h-screen" : "py-16"
      } ${className}`}
    >
      <div className="relative flex items-center justify-center">

        {/* Glow */}
        <div
          className={`absolute rounded-full blur-2xl opacity-40 ${
            resolvedTheme === "dark"
              ? "bg-purple-500"
              : "bg-purple-400"
          }`}
          style={{
            width: spinnerSize * 1.6,
            height: spinnerSize * 1.6,
          }}
        />

        {/* Spinner */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{
            repeat: Infinity,
            duration: 1,
            ease: "linear",
          }}
          className="rounded-full border-2 border-slate-200 dark:border-slate-700 border-t-purple-600"
          style={{
            width: spinnerSize,
            height: spinnerSize,
          }}
        />
      </div>

      {text && (
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 text-sm text-slate-500 dark:text-slate-400"
        >
          {text}
        </motion.p>
      )}
    </div>
  );
};

export default Loading;
