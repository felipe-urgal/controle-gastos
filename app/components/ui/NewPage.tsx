"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import PageHeader from "./PageHeader";

interface NewPageProps {
  title: string;
  description?: string;
  backTo?: string; // opcional: rota fixa
  children: React.ReactNode;
}

export default function NewPage({
  title,
  description,
  backTo,
  children,
}: NewPageProps) {
  const router = useRouter();

  const handleBack = () => {
    if (backTo) {
      router.push(backTo);
    } else {
      router.back();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full"
    >
      <PageHeader
        title={title}
        description={description}
        onBack={handleBack}
      />

      {children}
    </motion.div>
  );
}