"use client";

// importing context
import { useTheme } from "@/app/context/ThemeContext";
import { useThemeColors } from '@/app/hook/useThemeColors';

export default function CalendarDaysSkeleton() {
  const { resolvedTheme } = useTheme();

  const colors = useThemeColors();
  
  const skeletonColor = resolvedTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-300';
  const skeletonLightColor = resolvedTheme === 'dark' ? 'bg-gray-600' : 'bg-gray-200';
  
  return (
    <div className={`grid grid-cols-7 gap-px ${resolvedTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} w-full`}>
      {[...Array(42)].map((_, index) => (
        <div
          key={index}
          className={`
            min-h-[11.2vh] p-1 cursor-pointer transition-all duration-200 border-0
            ${colors.state.hover} ${colors.border.primary} relative w-full
            transform hover:scale-101 active:scale-95
            flex flex-col items-center justify-start
          `}
        >
          {/* Número do dia */}
          <div className={`flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full ${skeletonColor} mb-1 sm:mb-2 mx-auto`}></div>
          
          {/* Conteúdo do dia - Desktop */}
          <div className="hidden sm:block space-y-1">
            <div className={`h-3 ${skeletonLightColor} rounded`}></div>
            <div className={`h-3 ${skeletonLightColor} rounded`}></div>
            <div className={`h-3 ${skeletonLightColor} rounded mt-2`}></div>
          </div>
          
          {/* Conteúdo do dia - Mobile (simplificado) */}
          <div className="sm:hidden flex justify-center space-x-1">
            <div className={`h-2 w-2 ${skeletonLightColor} rounded-full`}></div>
            <div className={`h-2 w-2 ${skeletonLightColor} rounded-full`}></div>
          </div>
        </div>
      ))}
    </div>
  );
}