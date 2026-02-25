"use client";

import { useRouter } from "next/navigation";
import Button from "@/app/components/ui/Button";

interface PageErrorProps {
  title?: string;
  message?: string;
  buttonText?: string;
  redirectTo?: string;
  onAction?: () => void;
  fullScreen?: boolean;
}

export default function PageError({
  title = "Erro ao carregar",
  message,
  buttonText,
  redirectTo,
  onAction,
  fullScreen = false,
}: PageErrorProps) {
  const router = useRouter();

  const handleAction = () => {
    if (onAction) return onAction();
    if (redirectTo) return router.push(redirectTo);
  };

  return (
    <div
      className={`mt-4 ${
        fullScreen ? "min-h-screen flex items-center justify-center" : ""
      } rounded-2xl bg-white/5 border border-white/5 p-6 text-center`}
    >
      <div className="w-full">
        <h3 className="text-xl font-medium text-white mb-2">
          {title}
        </h3>

        {message && (
          <p className="text-slate-400 mb-6">
            {message}
          </p>
        )}

        {buttonText && (redirectTo || onAction) && (
          <Button variant="primary" onClick={handleAction}>
            {buttonText}
          </Button>
        )}
      </div>
    </div>
  );
}