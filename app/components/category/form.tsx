"use client";

// importing hooks
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

// importing icons
import { FaInfoCircle, FaArrowUp, FaArrowDown } from "react-icons/fa";

// importing services
import { categoryService } from "@/app/services/categoryService";

// importing types
import { CategoryModel, CategoryType } from "@/app/types/category";

// importing components
import Input from "@/app/components/ui/Input";
import Select from "@/app/components/ui/Select";
import ColorIconSelector from "@/app/components/ui/ColorIconSelector";
import ActiveToggle from "@/app/components/ui/ActiveToggle";
import FormActions from "@/app/components/ui/FormActions";
import FormContainer from "@/app/components/ui/FormContainer";

// interface
interface CategoryFormProps {
  category?: CategoryModel | null;
  isEditing: boolean;
}

// const
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
    <FormContainer
      onSubmit={handleSubmit}
      error={submitError}
      onClearError={() => setSubmitError(null)}
      className="mt-4"
    >
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

      <FormActions
        isEditing={isEditing}
        loading={loading}
        onCancel={handleRedirect}
        createLabel="Criar Categoria"
        submitLabel="Salvar Alterações"
      />
    </FormContainer>
  );
};
