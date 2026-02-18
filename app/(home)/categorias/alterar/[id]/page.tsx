"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { categoryService } from "@/app/services";
import { CategoryModel } from "@/app/types/category";
import { CategoryForm } from "@/app/components";

export default function EditCategoryPage() {
  const { id } = useParams();
  const router = useRouter();

  const [category, setCategory] =
    useState<CategoryModel | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const response =
          await categoryService.getCategoryById(String(id));
        setCategory(response.data);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  return (
    <div className="min-h-screen px-6 py-16">

      <div className="mx-auto">

        {loading && (
          <div className="rounded-3xl p-10 bg-white/5 border border-white/10 animate-pulse h-64" />
        )}

        {!loading && category && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <CategoryForm
              category={category}
              isEditing
              onSubmitSuccess={() =>
                router.push(`/categorias/show/${category.id}`)
              }
              onCancel={() => router.back()}
              submitting={false}
            />
          </motion.div>
        )}

      </div>
    </div>
  );
}