"use client";

// importing components
import { Button } from "@/app/components/ui";
import Link from "next/link";

interface PageErrorProps {
  title?: string;
  message?: string;
  buttonText?: string;
  redirectTo?: string;
  fullScreen?: boolean;
};

export default function PageError({
  title = "Erro ao carregar",
  message,
  buttonText,
  redirectTo,
  fullScreen = false,
}: PageErrorProps) {
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

        {buttonText && redirectTo && (
          <Link href={redirectTo}>
            <Button variant="primary">
              {buttonText}
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
};
