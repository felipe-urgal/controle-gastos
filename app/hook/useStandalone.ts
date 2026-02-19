"use client";

import { useState, useEffect } from "react";

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean;
};

export function useStandalone() {
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const nav = window.navigator as NavigatorWithStandalone;

    // Detecta iOS
    const iOS =
      /iPad|iPhone|iPod/.test(nav.userAgent) &&
      !(window as Window & { MSStream?: unknown }).MSStream;

    setIsIOS(iOS);

    // Detecta modo standalone (PWA)
    const checkStandalone = () =>
      window.matchMedia("(display-mode: standalone)").matches ||
      nav.standalone === true ||
      document.referrer.includes("android-app://");

    setIsStandalone(checkStandalone());

    // Monitora mudanças
    const mediaQuery = window.matchMedia("(display-mode: standalone)");

    const handleChange = (e: MediaQueryListEvent) => {
      setIsStandalone(e.matches);
    };

    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  return { isStandalone, isIOS };
}