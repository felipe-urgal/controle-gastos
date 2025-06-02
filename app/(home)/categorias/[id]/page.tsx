"use client";

// Hooks
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

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

const UpdateCategory = () => {
  const { user }   = useAuth();
  const params     = useParams();
  const categoryId = params.id as string;

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [category, setCategory]    = useState<CategoryModel | null>(null);

  useEffect(() => {
    if (user?.id) {
      const fetchCategory = async () => {
        setIsLoading(true);
        try {
          const data = await fetch(`/api/category/${categoryId}`);
          
          if (!data.ok) {
            let errorMessage = 'Falha ao carregar categoria';
            
            try {
              const errorData = await data.json();
              errorMessage = errorData.error || errorData.message || errorMessage;
            } catch (e) {
              console.log(e)
              errorMessage = `Erro ${data.status}: ${data.statusText}`;
            }
            
            throw new Error(errorMessage);
          }
          
          const category: CategoryModel = await data.json();
          setCategory(category);
        } catch (error) {
          toast.error((error as Error).message);
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchCategory();
    }
  }, [user, categoryId]);

  return (
    <ProtectedRoute>
      <div className="max-w-7xl">
        <Breadcrumb />

        {isLoading ? (
          <div className="max-w-5xl mx-auto p-4 flex justify-center items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            {category && (
              <CategoryForm category={category} isEdit={true}/>
            )}
          </>
        )}
      </div>
    </ProtectedRoute>
  );
};

export default UpdateCategory;