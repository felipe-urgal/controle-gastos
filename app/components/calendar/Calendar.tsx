"use client";

import { Suspense, useState, useMemo, useCallback, useEffect, useRef } from 'react';

import { useCalendar, useThemeColors } from '@/app/hook';

import { useTheme } from "@/app/context";

import { 
  DayModal, 
  CalendarGrid, 
  WeekDaysHeader, 
  CalendarHeader, 
  MonthlySummary, 
  MonthlySummarySkeleton, 
  CalendarDaysSkeleton,
  ListView,
  StatsView 
} from '@/app/components';

import { CalendarDay } from '@/app/types/calendar';

type ViewMode = 'month' | 'list' | 'stats';

export default function Calendar() {
  const { resolvedTheme } = useTheme();
  const colors = useThemeColors();
  
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentView, setCurrentView] = useState<ViewMode>('month');
  const [isScrolling, setIsScrolling] = useState(false);

  const {
    currentDate,
    selectedAccount,
    accounts,
    calendarDays,
    isLoading,
    additionalData,
    goToPreviousMonth,
    goToNextMonth,
    goToToday,
    goToDate,
    handleAccountChange,
    fetchMonthTransactions,
    refreshAccounts
  } = useCalendar();

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Navegação por scroll - Wheel (Desktop)
  useEffect(() => {
    if (currentView !== 'month' || !scrollContainerRef.current) return;

    const container = scrollContainerRef.current;

    const handleWheel = (e: WheelEvent) => {
      if (isLoading || isScrolling) return;

      // Detecta scroll significativo
      if (Math.abs(e.deltaY) > 30) {
        setIsScrolling(true);

        // Verifica se está no topo ou no fundo com uma margem maior
        const isAtTop = container.scrollTop <= 50;
        const isAtBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 50;

        if (e.deltaY < 0 && isAtTop) {
          // Scroll para cima no topo - mês anterior
          e.preventDefault();
          goToPreviousMonth();
        } else if (e.deltaY > 0 && isAtBottom) {
          // Scroll para baixo no fundo - próximo mês
          e.preventDefault();
          goToNextMonth();
        }

        setTimeout(() => {
          setIsScrolling(false);
        }, 300);
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [currentView, isLoading, isScrolling, goToPreviousMonth, goToNextMonth]);

  // Navegação por scroll horizontal (Mobile)
  useEffect(() => {
    if (currentView !== 'month' || !scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    let touchStartX = 0;
    let touchStartY = 0;
    let isHorizontalSwipe = false;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      isHorizontalSwipe = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isLoading || isScrolling) return;

      const touchCurrentX = e.touches[0].clientX;
      const touchCurrentY = e.touches[0].clientY;
      
      const diffX = touchStartX - touchCurrentX;
      const diffY = touchStartY - touchCurrentY;

      // Detecta se é um swipe horizontal (movimento lateral)
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 10) {
        isHorizontalSwipe = true;
        e.preventDefault(); // Previne scroll vertical durante swipe horizontal
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (isLoading || isScrolling || !isHorizontalSwipe) return;

      const touchEndX = e.changedTouches[0].clientX;
      const diffX = touchStartX - touchEndX;

      if (Math.abs(diffX) > 50) {
        setIsScrolling(true);

        if (diffX > 0) {
          // Swipe para esquerda - próximo mês
          goToNextMonth();
        } else {
          // Swipe para direita - mês anterior
          goToPreviousMonth();
        }

        setTimeout(() => setIsScrolling(false), 300);
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    
    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [currentView, isLoading, isScrolling, goToPreviousMonth, goToNextMonth]);

  const getDayTransactions = useCallback((date: Date): any[] => {
    if (!date) return [];
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    
    const dayData = calendarDays.find(day => {
      if (!day.date) return false;
      const dayDate = new Date(day.date);
      dayDate.setHours(0, 0, 0, 0);
      return dayDate.getTime() === targetDate.getTime();
    });
    
    return dayData?.transactions || [];
  }, [calendarDays]);

  const handleDayClick = async (day: CalendarDay) => {
    const safeDate = day.date || new Date();
    setSelectedDate(safeDate);
    
    if (!day.isCurrentMonth) {
      goToDate(safeDate);
      setTimeout(() => {
        setIsModalOpen(true);
      }, 100);
      return;
    }
    
    setIsModalOpen(true);
  };

  const handleTransactionsChange = () => {
    if (selectedDate) {
      fetchMonthTransactions(currentDate, selectedAccount);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedDate(null);
  };

  const dayTransactions = useMemo(() => {
    if (!selectedDate) return [];
    return getDayTransactions(selectedDate);
  }, [selectedDate, getDayTransactions]);

  const renderCurrentView = () => {
    switch (currentView) {
      case 'list':
        return (
          <ListView 
            calendarDays={calendarDays} 
            onDayClick={handleDayClick}
            isLoading={isLoading}
          />
        );
      
      case 'stats':
        return (
          <StatsView 
            calendarDays={calendarDays}
            onDayClick={handleDayClick}
            isLoading={isLoading}
          />
        );
      
      case 'month':
      default:
        return (
          <>
            <WeekDaysHeader resolvedTheme={resolvedTheme} />
            <div 
              ref={scrollContainerRef}
              className="flex-1 overflow-auto min-h-0 lg:h-full smooth-scroll scroll-container relative"
            >
              <CalendarGrid
                isLoading={isLoading}
                calendarDays={calendarDays}
                resolvedTheme={resolvedTheme}
                onDayClick={handleDayClick}
              />
            </div>
          </>
        );
    }
  };

  return (
    <Suspense fallback={
      <div className={`${colors.calendar.bg} rounded-lg shadow-md w-full h-screen`}>
        <div className={`p-4 sm:p6 border-b ${colors.border.primary}`}>
          <div className={`h-6 sm:h-8 ${colors.calendar.skeleton.bg} rounded w-48 sm:w-64 mb-4`}></div>
          <MonthlySummarySkeleton />
        </div>
        <div className={`grid grid-cols-7 gap-px ${resolvedTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}>
          {[...Array(7)].map((_, index) => (
            <div key={index} className={`${colors.calendar.header.bg} p-2 sm:p-4 text-center`}>
              <div className={`h-3 sm:h-4 ${colors.calendar.skeleton.bg} rounded mx-auto w-3/4`}></div>
            </div>
          ))}
        </div>
        <CalendarDaysSkeleton />
      </div>
    }>
      <div className={`
        fixed inset-0 flex items-end justify-center z-50 p-0 animate-fade-in safe-area-container 
        lg:relative lg:inset-auto lg:bg-transparent lg:animate-none lg:p-0 lg:z-auto lg:items-center
      `}>
        
        <div className="status-bar-bg lg:hidden" />
        
        <div className={`
          ${colors.bg.modal} rounded-t-3xl lg:shadow-xl w-full h-full
          overflow-hidden flex flex-col 
          animate-slide-up-mobile
          modal-fullscreen-mobile calendar-mobile-fullscreen
          lg:rounded-none lg:shadow-none lg:h-screen lg:max-h-none
          lg:w-full lg:animate-slide-up-desktop
          lg:calendar-full-height-desktop
          relative
        `}>
          <CalendarHeader
            isLoading={isLoading}
            currentDate={currentDate}
            selectedAccount={selectedAccount}
            accounts={accounts}
            onGoToPreviousMonth={goToPreviousMonth}
            onGoToNextMonth={goToNextMonth}
            onGoToToday={goToToday}
            onAccountChange={handleAccountChange}
            onViewChange={setCurrentView}
            currentView={currentView}
          />

          {currentView === 'month' && (
            <MonthlySummary
              isLoading={isLoading}
              additionalData={additionalData}
            />
          )}

          {renderCurrentView()}
        </div>

        <DayModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          selectedDate={selectedDate}
          transactions={dayTransactions}
          investments={[]}
          isLoading={false}
          onTransactionsChange={handleTransactionsChange}
          refreshAccounts={refreshAccounts}
        />
      </div>
    </Suspense>
  );
}