'use client';

import { useEffect, useState } from 'react';

import { useAuth } from '@/app/context';
import {
  AppSidebar,
  BottomNav,
  MobileTopbar,
} from '@/app/components/layout';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || user === undefined) {
    return null;
  }

  if (!user) {
    return children;
  }

  return (
    <div className="min-h-screen w-full bg-[var(--background)] text-[var(--foreground)]">
      <AppSidebar />

      <div className="min-h-screen lg:pl-[264px]">
        <MobileTopbar />

        <main
          className="min-h-screen w-full overflow-x-hidden pb-[calc(68px+env(safe-area-inset-bottom))] lg:pb-0"
          id="main-content"
        >
          {children}
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
