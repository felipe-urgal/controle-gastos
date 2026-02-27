"use client";

import { useState, useEffect } from "react";

type GetByIdService<T> = (id: string) => Promise<{
  data: T;
}>;

type UseEditProps<T> = {
  id: string;
  service: {
    getById: GetByIdService<T>;
  };
  backPath: string;
  errorMessage: string;
};

export function useEdit<T>({
  id,
  service,
  backPath,
  errorMessage,
}: UseEditProps<T>) {
  const [entity, setEntity] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const response = await service.getById(String(id));
        setEntity(response.data);

      } catch {
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    }

    if (id) load();
  }, [id]);

  const handleBack = backPath;

  return {
    entity,
    loading,
    error,
    handleBack,
  };
};
