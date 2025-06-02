"use client";

import Breadcrumb from "@/app/components/Breadcrumb";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import CategoryForm from "@/app/components/categories/CategoryForm";

const NewCategory = () => {
  return (
    <ProtectedRoute>
      <div className="">
        <Breadcrumb />
        <CategoryForm />
      </div>
    </ProtectedRoute>
  );
};

export default NewCategory;