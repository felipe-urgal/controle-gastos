'use client';

import { useAuth } from '@/app/context';
import { AppSidebar, BackgroundParticles, BottomNav } from '@/app/components';
import { useEffect, useState } from 'react';

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

  if (!mounted) {
    return null; // Evita hidratação incorreta
  }

  if (user === undefined) {
    return null; // Loading state
  }

  if (!user) {
    return children;
  }

  return (
    <div className="
      min-h-screen
      w-full
      overflow-x-hidden
      bg-gradient-to-br
      from-slate-950
      via-purple-950/40
      to-indigo-950/30
      relative
    ">
      {/* Background particles com container próprio */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <BackgroundParticles />
      </div>

      {/* Sidebar fixa */}
      <div className="hidden lg:block fixed left-0 top-0 h-full z-40">
        <AppSidebar />
      </div>

      {/* Conteúdo com offset */}
      <main
        className="
          relative
          min-h-screen
          w-full
          lg:pl-72
          overflow-x-hidden
          pb-24
          lg:pb-0
          transition-all duration-300
        "
      >
        <div className="w-full max-w-full">
          {children}
        </div>
      </main>

      {/* Mobile Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
        <BottomNav />
      </div>
    </div>
  );
}
