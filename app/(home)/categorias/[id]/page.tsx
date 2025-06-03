"use client";

// Hooks
import { useState, useEffect } from "react";
import { useParams, notFound } from "next/navigation";

// Toast
import 'react-toastify/dist/ReactToastify.css';
import { toast } from "react-toastify";

// Context
import { useAuth } from "@/app/context/AuthContext";

// Components
import Breadcrumb from "@/app/components/Breadcrumb";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import CategoryForm from "@/app/components/categories/CategoryForm";

// Types
import { CategoryModel } from '@/app/types/category'

// Services
import { categoryService } from "@/app/services/categoryService";

const UpdateCategory = () => {
  const { user }   = useAuth();
  const params     = useParams();
  const categoryId = params.id as string;

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [category, setCategory]   = useState<CategoryModel | null>(null);

  useEffect(() => {
    if (!user || !categoryId) return;

    const fetchCategory = async () => {
      setIsLoading(true);
      try {
        const response = await categoryService.getCategoryById(categoryId)

        setCategory(response);
      } catch (error) {
        toast.error((error as Error).message);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCategory();

  }, [user, categoryId]);

  if (!isLoading && !category) {
    notFound();
  }

  return (
    <ProtectedRoute>
      <div className="">
        <Breadcrumb />

        {isLoading ? (
          <div className="max-w-5xl mx-auto p-10 flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" aria-label="Carregando..."></div>
          </div>
        ) : (
          <>
            <CategoryForm category={category} isEdit={true}/>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
};

export default UpdateCategory;