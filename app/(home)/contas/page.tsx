"use client";

// Hooks
import { Suspense } from "react";
// Components
import { ProtectedRoute } from "@/app/components";

function AccountsPage() {
  return (
    <ProtectedRoute>
      <div>Conta</div>
    </ProtectedRoute>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AccountsPage />
    </Suspense>
  );
}