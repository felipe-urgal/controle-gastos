"use client";

import { ProtectedRoute, Calendar } from "@/app/components";

export default function CalendarPage() {
  return (
    <ProtectedRoute>
      <Calendar />
    </ProtectedRoute>
  )
}