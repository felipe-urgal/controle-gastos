import { motion } from "framer-motion";

export default function InlineLoader() {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
      className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
    />
  );
}