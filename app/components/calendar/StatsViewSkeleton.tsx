// app/components/StatsViewSkeleton.tsx
"use client";

import { useThemeColors } from '@/app/hook/useThemeColors';

export default function StatsViewSkeleton() {
  const colors = useThemeColors();

  return (
    <div className={`flex-1 overflow-y-auto ${colors.bg.primary} p-4`}>
      {/* Cards de estatísticas - Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {[...Array(3)].map((_, index) => (
          <div
            key={index}
            className={`
              p-4 rounded-xl border ${colors.border.primary} ${colors.bg.modal}
              shadow-sm animate-pulse
            `}
          >
            <div className={`h-4 w-20 ${colors.bg.secondary} rounded mb-2`}></div>
            <div className={`h-8 w-24 ${colors.bg.secondary} rounded mb-2`}></div>
            <div className={`h-3 w-32 ${colors.bg.secondary} rounded`}></div>
          </div>
        ))}
      </div>

      {/* Gráfico - Skeleton */}
      <div className={`
        p-4 rounded-xl border ${colors.border.primary} ${colors.bg.modal}
        shadow-sm animate-pulse
      `}>
        <div className={`h-6 w-40 ${colors.bg.secondary} rounded mb-4`}></div>
        
        <div className="space-y-3">
          {[...Array(5)].map((_, index) => (
            <div key={index} className="flex items-center gap-3 p-3">
              <div className="w-12 text-right flex-shrink-0 space-y-1">
                <div className={`h-4 w-8 ${colors.bg.secondary} rounded ml-auto`}></div>
                <div className={`h-3 w-6 ${colors.bg.secondary} rounded ml-auto`}></div>
              </div>
              
              <div className="flex-1">
                <div className={`h-6 w-full ${colors.bg.secondary} rounded-full`}></div>
                <div className="flex justify-between mt-1">
                  <div className={`h-3 w-16 ${colors.bg.secondary} rounded`}></div>
                  <div className={`h-3 w-16 ${colors.bg.secondary} rounded`}></div>
                </div>
              </div>
              
              <div className="w-20 text-right flex-shrink-0 space-y-1">
                <div className={`h-4 w-16 ${colors.bg.secondary} rounded ml-auto`}></div>
                <div className={`h-3 w-10 ${colors.bg.secondary} rounded ml-auto`}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}