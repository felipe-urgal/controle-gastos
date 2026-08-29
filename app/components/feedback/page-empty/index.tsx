"use client";

import { Button } from "@/app/components/ui";
import Link from "next/link";

interface PageEmptyProps {
  title: string;
  description?: string;
  buttonText?: string;
  redirectTo?: string;
};

export default function PageEmpty({
  title,
  description,
  buttonText,
  redirectTo,
}: PageEmptyProps) {
  return (
    <div className="rounded-2xl bg-white/5 border border-white/5 p-6 text-center">
      <h2 className="text-xl font-medium text-white mb-2">
        {title}
      </h2>

      {description && (
        <p className="text-slate-400 mb-4">
          {description}
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
  );
};
