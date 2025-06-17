"use client";

import { useState, useEffect } from "react";
import { notFound } from "next/navigation";
import { toast } from "react-toastify";
import { useAuth } from "@/app/context/AuthContext";

type UseEditDataOptions<T, U = T> = {
  fetchFunction: (id: string) => Promise<T>;
  id: string;
  transformData?: (data: T) => U;
};

export function useEditData<T, U = T>({
  fetchFunction,
  id,
  transformData,
}: UseEditDataOptions<T, U>) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [data, setData] = useState<U | null>(null);

  useEffect(() => {
    if (!user?.id || !id) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const response = await fetchFunction(id);
        const transformed = transformData ? transformData(response) : (response as unknown as U);

        setData(transformed);
      } catch (error) {
        toast.error((error as Error).message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, id, fetchFunction, transformData]);

  if (!isLoading && !data) {
    notFound();
  }

  return { isLoading, data };
}