"use client";

import { useRouter } from "next/navigation";
import PageHeader from "./PageHeader";
import ProtectedRoute from "./ProtectedRoute";

interface NewPageProps {
  title?: string;
  description?: string;
  backTo?: string; // opcional: rota fixa
  children: React.ReactNode;
}

export default function NewPage({
  title,
  description,
  backTo,
  children,
}: NewPageProps) {
  const router = useRouter();

  const handleBack = () => {
    if (backTo) {
      router.push(backTo);
    } else {
      router.back();
    }
  };

  return (
    <ProtectedRoute>
      <div className="w-full">
        <PageHeader
          title={title}
          description={description}
          onBack={handleBack}
        />

        {children}
      </div>
    </ProtectedRoute>
  );
}