"use client";

import { useEffect, useState } from "react";

type GetByIdService<T> = (id: string) => Promise<{ data: T }>;

type UseShowProps<T> = {
  id: string;
  service: {
    getById: GetByIdService<T>;
  };
};

export function useShow<T>({
  id,
  service,
}: UseShowProps<T>) {
  const [entity, setEntity] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const response = await service.getById(String(id));
        setEntity(response.data);
      } finally {
        setLoading(false);
      }
    }

    if (id) load();
  }, [id, service]);

  return {
    entity,
    setEntity,
    loading,
  };
};
