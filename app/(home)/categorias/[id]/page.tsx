"use client";

// hook
import { useParams } from "next/navigation";
import { useEditData } from "@/app/hook/useEditData";

// services
import { categoryService } from "@/app/services/categoryService";

// components
import Breadcrumb from "@/app/components/Breadcrumb";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import CategoryForm from "@/app/components/categories/CategoryForm";

// Types
import { CategoryModel } from '@/app/types/category';

const UpdateCategory = () => {
  const params = useParams();
  const categoryId = params.id as string;

  const { isLoading, data: category } = useEditData<CategoryModel>({
    fetchFunction: categoryService.getCategoryById,
    id: categoryId
  });

  return (
    <ProtectedRoute>
      <div className="">
        <Breadcrumb />

        {isLoading ? (
          <div className="max-w-5xl mx-auto p-10 flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" aria-label="Carregando..."></div>
          </div>
        ) : (
          <CategoryForm category={category!} isEdit={true}/>
        )}
      </div>
    </ProtectedRoute>
  );
};

export default UpdateCategory;