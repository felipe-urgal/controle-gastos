"use client";

// importing context
import { useTheme } from "@/app/context";

import { useThemeColors } from '@/app/hook';

import { useMemo } from 'react';

export default function CalendarDaysSkeleton() {
  const { resolvedTheme } = useTheme();
  const colors = useThemeColors();
  
  const skeletonColor = resolvedTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-300';
  const skeletonLightColor = resolvedTheme === 'dark' ? 'bg-gray-600' : 'bg-gray-200';
  
  // Simular diferentes números de semanas para o skeleton
  const numberOfWeeks = 5; // Valor padrão para o skeleton
  
  // Altura dinâmica baseada no número de semanas
  const dayStyle = useMemo(() => {
    // Para mobile: altura fixa
    // Para desktop: altura flexível usando min-height
    const mobileHeight = 'min-h-[80px]'; // Altura mínima para mobile
    const desktopHeight = 'lg:min-h-[100px]'; // Altura mínima maior para desktop
    
    return `${mobileHeight} ${desktopHeight}`;
  }, []);

  return (
    <div 
      className={`
        grid grid-cols-7 gap-px 
        ${resolvedTheme === 'dark' ? 'border-gray-700 bg-gray-700' : 'bg-gray-200'} 
        w-full border-b calendar-grid-dynamic
      `}
      style={{
        // CSS customizado para garantir altura dinâmica (igual ao calendário real)
        gridTemplateRows: `repeat(${numberOfWeeks}, minmax(0, 1fr))`
      }}
    >
      {[...Array(35)].map((_, index) => (
        <div
          key={index}
          className={`
            ${dayStyle} p-2 cursor-pointer transition-all duration-200 
            ${colors.border.primary} relative w-full
            ${colors.calendar.day.bg} ${colors.calendar.day.text}
            flex flex-col items-center justify-start
            /* Garantir que o conteúdo ocupe toda a célula */
            h-full
          `}
        >
          {/* Número do dia - Skeleton */}
          <div className={`
            flex items-center justify-center w-8 h-8 rounded-full mb-1 transition-all duration-200
            ${skeletonColor} animate-pulse
          `}></div>
          
          {/* Resumo financeiro do dia - Skeleton */}
          <div className="space-y-1 w-full flex-1 flex flex-col justify-center min-h-0">
            {/* Linha de receita */}
            <div className={`h-2 ${skeletonLightColor} rounded animate-pulse mb-1`}></div>
            
            {/* Linha de despesa */}
            <div className={`h-2 ${skeletonLightColor} rounded animate-pulse mb-1`}></div>
            
            {/* Linha de contagem de transações */}
            <div className={`h-2 ${skeletonLightColor} rounded animate-pulse mt-2`}></div>
          </div>
        </div>
      ))}
    </div>
  );
}