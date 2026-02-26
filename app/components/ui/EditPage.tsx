"use client";

import PageHeader from "./PageHeader";
import PageLoading from "./PageLoading";
import PageError from "./PageError";
import ProtectedRoute from "./ProtectedRoute";

interface EditPageProps {
  title?: string;
  description?: string;
  loading?: boolean;
  error?: any;
  onBack?: () => void;
  children: React.ReactNode;
  errorRedirectTo?: string;
}

export default function EditPage({
  title,
  description,
  loading,
  error,
  onBack,
  children,
  errorRedirectTo,
}: EditPageProps) {
  return (
    <ProtectedRoute>
      <div className="mx-auto">
        <PageHeader
          title={title}
          description={description}
          onBack={onBack}
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
}