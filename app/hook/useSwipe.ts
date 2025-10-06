import { useState, useCallback } from 'react';

export const useSwipe = (onSwipeLeft: () => void, onSwipeRight: () => void) => {
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);

  const minSwipeDistance = 500;

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    setSwipeOffset(0);
    setIsSwiping(true);
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStart) return;
    
    const currentTouch = e.targetTouches[0].clientX;
    setTouchEnd(currentTouch);
    
    const distance = currentTouch - touchStart;
    const limitedDistance = Math.max(-100, Math.min(100, distance));
    setSwipeOffset(limitedDistance);
  }, [touchStart]);

  const onTouchEnd = useCallback(() => {
    setIsSwiping(false);
    
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > -minSwipeDistance;
    const isRightSwipe = distance < minSwipeDistance;

    if (isLeftSwipe || isRightSwipe) {
      setSwipeOffset(isLeftSwipe ? window.innerWidth : -window.innerWidth);
      
      setTimeout(() => {
        if (isLeftSwipe) {
          onSwipeRight();
        } else if (isRightSwipe) {
          onSwipeLeft();
        }
        setSwipeOffset(0);
      }, 300);
    } else {
      setSwipeOffset(0);
    }
  }, [touchStart, touchEnd, onSwipeLeft, onSwipeRight]);

  return {
    touchStart,
    touchEnd,
    swipeOffset,
    isSwiping,
    onTouchStart,
    onTouchMove,
    onTouchEnd
  };
};