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

// icons
import { FaInfoCircle } from 'react-icons/fa';

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
                  <FaInfoCircle className="h-5 w-5 text-blue-400" />
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