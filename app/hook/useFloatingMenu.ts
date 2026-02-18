'use client';

import { useState, useEffect, useCallback } from 'react';

const MENU_POSITION_KEY = 'floating-menu-position';

export function useFloatingMenu() {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [moved, setMoved] = useState(false);

  // Load position
  useEffect(() => {
    const saved = localStorage.getItem(MENU_POSITION_KEY);
    if (saved) {
      try {
        setPosition(JSON.parse(saved));
        return;
      } catch {}
    }

    setPosition({
      x: window.innerWidth - 80,
      y: window.innerHeight - 100,
    });
  }, []);

  // Persist
  useEffect(() => {
    localStorage.setItem(MENU_POSITION_KEY, JSON.stringify(position));
  }, [position]);

  const toggle = useCallback(() => {
    setOpen(prev => !prev);
  }, []);

  return {
    open,
    setOpen,
    position,
    setPosition,
    dragStart,
    setDragStart,
    moved,
    setMoved,
    toggle
  };
}
