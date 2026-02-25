"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaSave,
  FaTimes,
  FaInfoCircle,
  FaArrowUp,
  FaArrowDown,
  FaSpinner
} from "react-icons/fa";

import { categoryService } from "@/app/services";
import { CategoryModel, CategoryType } from "@/app/types/category";

import { 
  Input, 
  Select, 
  ColorIconSelector, 
  ActiveToggle,
  Alert,
  Button,
} from "@/app/components";

interface CategoryFormProps {
  category?: CategoryModel | null;
  isEditing: boolean;
}

const categoryTypeOptions = [
  { value: "EXPENSE", label: "Despesa", icon: <FaArrowDown /> },
  { value: "INCOME", label: "Receita", icon: <FaArrowUp /> },
];

const initialFormData = {
  name: "",
  type: "EXPENSE" as CategoryType,
  color: "#3B82F6",
  icon: "tag",
  description: "",
  isActive: true,
};

export default function CategoryForm({ category, isEditing }: CategoryFormProps) {
  const router = useRouter();

  const [formData, setFormData] = useState(initialFormData);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isEditing && category) {
      setFormData({
        name: category.name ?? "",
        type: category.type,
        color: category.color ?? "#3B82F6",
        icon: category.icon ?? "tag",
        description: category.description ?? "",
        isActive: category.isActive,
      });
    } else {
      setFormData(initialFormData);
    }
  }, [category, isEditing]);

  function handleRedirect() {
    if (isEditing && category?.id) {
      router.replace(`/categorias/show/${category.id}`);
    } else {
      router.replace("/categorias");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        ...formData,
        description: formData.description || null,
      };

      if (isEditing && category) {
        await categoryService.update(category.id, payload);
      } else {
        await categoryService.create(payload);
      }

      handleRedirect();

    } catch (err: any) {
      const apiMessage =
        err?.response?.data?.error?.message ||
        err?.message;

      setSubmitError(apiMessage || "Erro ao salvar categoria");
    } finally {
      setIsSubmitting(false);
    }
  }

  const loading = isSubmitting;

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 relative flex flex-col gap-3 bg-white/5 rounded-2xl border border-white/5 p-4"
    >
      <AnimatePresence>
        {submitError && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-6"
          >
            <Alert
              variant="error"
              message={submitError}
              onClose={() => setSubmitError(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <Input
        label="Nome da Categoria"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        disabled={loading}
        required
        icon={<FaInfoCircle />}
      />

      <Select
        label="Tipo de Categoria"
        value={formData.type}
        onChange={(value) =>
          setFormData({ ...formData, type: value as CategoryType })
        }
        options={categoryTypeOptions}
        disabled={loading}
      />

      <ColorIconSelector
        color={formData.color}
        icon={formData.icon}
        onColorChange={(color) => setFormData({ ...formData, color })}
        onIconChange={(icon) => setFormData({ ...formData, icon })}
        disabled={loading}
      />

      <Input
        label="Descrição"
        value={formData.description}
        onChange={(e) =>
          setFormData({ ...formData, description: e.target.value })
        }
        disabled={loading}
        multiline
        rows={3}
      />

      {isEditing && (
        <ActiveToggle
          isActive={formData.isActive}
          onToggle={(isActive) =>
            setFormData({ ...formData, isActive })
          }
          disabled={loading}
          label="Categoria ativa"
        />
      )}

      <div className="flex gap-3 mt-1 justify-between">
        <Button
          type="button"
          onClick={handleRedirect}
          variant="secondary"
          disabled={loading}
          icon={<FaTimes />}
        >
          Cancelar
        </Button>

        <Button
          type="submit"
          disabled={loading}
          icon={loading ? <FaSpinner className="animate-spin" /> : <FaSave />}
        >
          {loading
            ? isEditing
              ? "Salvando..."
              : "Criando..."
            : isEditing
            ? "Salvar Alterações"
            : "Criar Categoria"}
        </Button>
      </div>
    </form>
  );
};
