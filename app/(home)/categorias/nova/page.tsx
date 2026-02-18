"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CategoryForm } from "@/app/components";

export default function NewCategoryPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen px-6 py-16">

      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto"
      >
        <CategoryForm
          isEditing={false}
          onSubmitSuccess={() => router.push("/categorias")}
          onCancel={() => router.push("/categorias")}
          submitting={false}
        />
      </motion.div>

    </div>
  );
}
