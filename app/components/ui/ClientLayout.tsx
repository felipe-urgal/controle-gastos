'use client';

import { useAuth } from '@/app/context';
import { AppSidebar, BottomNav } from '@/app/components';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();

  if (!user) {
    return (
      <>
        {children}
      </>
    );
  }

  return (
    <div className="
      min-h-screen
      bg-gradient-to-br
      from-slate-950
      via-purple-950/40
      to-indigo-950/30
    ">

      {/* Sidebar fixa */}
      <div className="hidden lg:block">
        <AppSidebar />
      </div>

      {/* Conteúdo com offset */}
      <main
        className="
          relative
          min-h-screen
          lg:ml-72

          overflow-x-hidden

          pb-24
          lg:pb-0

          transition-all duration-300
        "
      >
        {children}
      </main>

      {/* Mobile */}
      <div className="lg:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
