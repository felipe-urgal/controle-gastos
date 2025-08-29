"use client";

// hook
import { useParams } from "next/navigation";
import { useEditData } from "@/app/hook/useEditData";

// services
import { categoryService } from "@/app/services/categoryService";

// components
import { Breadcrumb, ProtectedRoute, CategoryForm, Loading } from "@/app/components";

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
        <div className="">
          <Breadcrumb />
          
          <div className="">
            <div className="">
              {isLoading ? (
                <Loading />
              ) : (
                <CategoryForm category={category} isEdit={true} />
              )}
            </div>
          </div>

          {!isLoading && category && (
            <div className="mt-4 bg-blue-900/20 border border-blue-800/30 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-300">
                    Alterações em categorias 
                    existentes podem afetar a organização das transações associadas. 
                    Certifique-se de que as mudanças são consistentes com seu histórico financeiro.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default UpdateCategory;