// app/components/ListViewSkeleton.tsx
"use client";

import { useThemeColors } from '@/app/hook/useThemeColors';

export default function ListViewSkeleton() {
  const colors = useThemeColors();

  return (
    <div className={`flex-1 overflow-y-auto ${colors.bg.primary}`}>
      <div className="p-4 space-y-3">
        {[...Array(6)].map((_, index) => (
          <div
            key={index}
            className={`
              p-4 rounded-xl border ${colors.border.primary} ${colors.bg.modal}
              shadow-sm animate-pulse
            `}
          >
            {/* Cabeçalho do dia - Skeleton */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`
                  w-10 h-10 rounded-full ${colors.bg.secondary}
                `} />
                <div className="space-y-2">
                  <div className={`h-4 w-24 ${colors.bg.secondary} rounded`}></div>
                  <div className={`h-3 w-16 ${colors.bg.secondary} rounded`}></div>
                </div>
              </div>
              
              {/* Saldo do dia - Skeleton */}
              <div className="text-right space-y-2">
                <div className={`h-3 w-16 ${colors.bg.secondary} rounded mx-auto`}></div>
                <div className={`h-5 w-20 ${colors.bg.secondary} rounded`}></div>
              </div>
            </div>

            {/* Transações - Skeleton */}
            <div className="space-y-2">
              {[...Array(2)].map((_, transIndex) => (
                <div key={transIndex} className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-2 h-2 rounded-full ${colors.bg.secondary}`} />
                    <div className={`h-3 flex-1 ${colors.bg.secondary} rounded`}></div>
                  </div>
                  <div className={`h-3 w-12 ${colors.bg.secondary} rounded ml-2`}></div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}