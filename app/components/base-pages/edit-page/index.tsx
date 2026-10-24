"use client";

// importing components
import { PageLoading, PageError } from "@/app/components/feedback";
import { PageHeader } from "@/app/components/base-pages";
import type { Crumb } from "@/app/components/base-pages/page-bar";
import { useMediaQuery } from "@/app/hooks/use-media-query";
import { MobileAppBar, ProtectedRoute } from "@/app/components/layout";
import { ShowBelow } from "@/app/components/ui";

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
  sidebarAligned?: boolean;
  breadcrumb?: Crumb[];
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
  sidebarAligned = false,
  breadcrumb,
}: EditPageProps) {
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  return (
    <ProtectedRoute>
      <div className="mx-auto space-y-6">
        {sidebarAligned && (
          <ShowBelow breakpoint="lg">
            <MobileAppBar title={title ?? ''} backHref={backUrl} />
          </ShowBelow>
        )}

        {(!(hideHeaderOnMobile || sidebarAligned) || isDesktop) && (
          <PageHeader
            title={title}
            description={description}
            backUrl={backUrl}
            sidebarAligned={sidebarAligned}
            breadcrumb={breadcrumb}
            loading={loading}
          />
        )}

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
