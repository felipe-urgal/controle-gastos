"use client";

// importing components
import { PageHeader } from "@/app/components/base-pages";
import type { Crumb } from "@/app/components/base-pages/page-bar";
import { useMediaQuery } from "@/app/hooks/use-media-query";
import { ProtectedRoute } from "@/app/components/layout";

interface NewPageProps {
  title?: string;
  description?: string;
  backUrl?: string;
  children: React.ReactNode;
  hideHeaderOnMobile?: boolean;
  sidebarAligned?: boolean;
  breadcrumb?: Crumb[];
};

export default function NewPage({
  title,
  description,
  backUrl,
  children,
  hideHeaderOnMobile = false,
  sidebarAligned = false,
  breadcrumb,
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
            sidebarAligned={sidebarAligned}
            breadcrumb={breadcrumb}
          />
        )}

        {children}
      </div>
    </ProtectedRoute>
  );
};
