"use client";

// importing components
import { PageLoading, PageError } from "@/app/components/feedback";
import { PageHeader } from "@/app/components/pages";
import { ProtectedRoute } from "@/app/components/layout";

interface EditPageProps {
  title?: string;
  description?: string;
  loading?: boolean;
  error?: any;
  backUrl?: string;
  children: React.ReactNode;
  errorRedirectTo?: string;
};

export default function EditPage({
  title,
  description,
  loading,
  error,
  backUrl,
  children,
  errorRedirectTo,
}: EditPageProps) {
  return (
    <ProtectedRoute>
      <div className="mx-auto">
        <PageHeader
          title={title}
          description={description}
          backUrl={backUrl}
          loading={loading}
        />

        {loading ? (
          <PageLoading type="form" />
        ) : error ? (
          <PageError
            message={error}
            buttonText="Voltar"
            redirectTo={errorRedirectTo}
          />
        ) : (
          children
        )}
      </div>
    </ProtectedRoute>
  );
};
