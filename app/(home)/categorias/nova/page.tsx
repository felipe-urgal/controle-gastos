"use client";

// components
import { Breadcrumb, ProtectedRoute, CategoryForm } from "@/app/components";

const NewCategory = () => {
  return (
    <ProtectedRoute>
      <Breadcrumb />
      <CategoryForm />
    </ProtectedRoute>
  );
};

export default NewCategory;