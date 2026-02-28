"use client";

// importing components
import { PageHeader } from "@/app/components/base-pages";
import { ProtectedRoute } from "@/app/components/layout";

interface NewPageProps {
  title?: string;
  description?: string;
  backUrl?: string;
  children: React.ReactNode;
};

export default function NewPage({
  title,
  description,
  backUrl,
  children,
}: NewPageProps) {
  return (
    <ProtectedRoute>
      <div className="w-full">
        <PageHeader
          title={title}
          description={description}
          backUrl={backUrl}
        />

        {children}
      </div>
    </ProtectedRoute>
  );
};
