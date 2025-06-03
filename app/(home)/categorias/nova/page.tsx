"use client";

import Breadcrumb from "@/app/components/Breadcrumb";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import CategoryForm from "@/app/components/categories/CategoryForm";

const NewCategory = () => {
  return (
    <ProtectedRoute>
      <Breadcrumb />
      <CategoryForm />
    </ProtectedRoute>
  );
};

export default NewCategory;