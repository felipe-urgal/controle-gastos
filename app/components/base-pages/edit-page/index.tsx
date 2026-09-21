"use client";

// importing components
import { PageLoading, PageError } from "@/app/components/feedback";
import { PageHeader } from "@/app/components/base-pages";
import { ProtectedRoute } from "@/app/components/layout";

interface EditPageProps {
  title?: string;
  description?: string;
  loading?: boolean;
  error?: any;
  backUrl?: string;
  children: React.ReactNode;
  errorRedirectTo?: string;
  hideHeaderOnMobile?: boolean;
};

export default function EditPage({
  title,
  description,
  loading,
  error,
  backUrl,
  children,
  errorRedirectTo,
  hideHeaderOnMobile = false,
}: EditPageProps) {
  return (
    <ProtectedRoute>
      <div className="mx-auto">
        <div className={hideHeaderOnMobile ? 'hidden lg:block' : undefined}>
          <PageHeader
            title={title}
            description={description}
            backUrl={backUrl}
            loading={loading}
          />
        </div>

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
