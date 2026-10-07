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
  errorTitle?: string;
  onRetry?: () => void;
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
  errorTitle,
  onRetry,
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
            title={errorTitle}
            message={error}
            buttonText={onRetry ? "Tentar novamente" : "Voltar"}
            redirectTo={onRetry ? undefined : errorRedirectTo}
            onRetry={onRetry}
          />
        ) : (
          children
        )}
      </div>
    </ProtectedRoute>
  );
};
