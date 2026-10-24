"use client";

// importing components
import { PageHeader } from "@/app/components/base-pages";
import { useMediaQuery } from "@/app/hooks/use-media-query";
import { ProtectedRoute } from "@/app/components/layout";

interface NewPageProps {
  title?: string;
  description?: string;
  backUrl?: string;
  children: React.ReactNode;
  hideHeaderOnMobile?: boolean;
};

export default function NewPage({
  title,
  description,
  backUrl,
  children,
  hideHeaderOnMobile = false,
}: NewPageProps) {
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  return (
    <ProtectedRoute>
      <div className="w-full space-y-6">
        {(!hideHeaderOnMobile || isDesktop) && (
          <PageHeader
            title={title}
            description={description}
            backUrl={backUrl}
          />
        )}

        {children}
      </div>
    </ProtectedRoute>
  );
};
