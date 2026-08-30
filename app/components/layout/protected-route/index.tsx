'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/app/context';
import { SplashScreen } from '@/app/components/feedback';

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return <SplashScreen />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-[1480px] space-y-6 px-4 py-6 sm:px-6 sm:py-8 xl:px-8">
      {children}
    </div>
  );
}
