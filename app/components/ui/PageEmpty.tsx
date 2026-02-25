"use client";

import { useRouter } from "next/navigation";
import Button from "@/app/components/ui/Button";

interface PageEmptyProps {
  title: string;
  description?: string;
  buttonText?: string;
  redirectTo?: string;
  onAction?: () => void;
}

export default function PageEmpty({
  title,
  description,
  buttonText,
  redirectTo,
  onAction,
}: PageEmptyProps) {
  const router = useRouter();

  const handleAction = () => {
    if (onAction) return onAction();
    if (redirectTo) return router.push(redirectTo);
  };

  return (
    <div className="rounded-2xl bg-white/5 border border-white/5 p-6 text-center">
      <h3 className="text-xl font-medium text-white mb-2">
        {title}
      </h3>

      {description && (
        <p className="text-slate-400 mb-4">
          {description}
        </p>
      )}

      {buttonText && (redirectTo || onAction) && (
        <Button variant="primary" onClick={handleAction}>
          {buttonText}
        </Button>
      )}
    </div>
  );
}