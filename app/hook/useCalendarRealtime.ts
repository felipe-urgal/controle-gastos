// app/hook/useCalendarRealtime.ts
"use client"

import { useEffect } from "react";

export function useCalendarRealtime(
  refetch: () => void
) {
  useEffect(() => {
    window.addEventListener("transactionsUpdated", refetch);
    window.addEventListener("forceReloadTransactions", refetch);

    return () => {
      window.removeEventListener("transactionsUpdated", refetch);
      window.removeEventListener("forceReloadTransactions", refetch);
    };
  }, [refetch]);
}