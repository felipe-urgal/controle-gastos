// app/metas/page.tsx
"use client";

import { ProtectedRoute, GoalsPage } from "@/app/components";

export default function MetasPage() {
  return (
    <ProtectedRoute>
      <GoalsPage />
    </ProtectedRoute>
  );
}