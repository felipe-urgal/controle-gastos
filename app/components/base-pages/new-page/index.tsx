"use client";

// importing components
import { PageHeader } from "@/app/components/base-pages";
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
  return (
    <ProtectedRoute>
      <div className="w-full">
        <div className={hideHeaderOnMobile ? 'hidden lg:block' : undefined}>
          <PageHeader
            title={title}
            description={description}
            backUrl={backUrl}
          />
        </div>

        {children}
      </div>
    </ProtectedRoute>
  );
};
