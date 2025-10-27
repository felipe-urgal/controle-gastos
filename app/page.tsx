"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { Loading } from "@/app/components";

export default function Home() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const [checkedAuth, setCheckedAuth] = useState(false);

  useEffect(() => {
    if (!isLoading && !checkedAuth) {
      setCheckedAuth(true);
      
      if (isAuthenticated && user) {
        router.push("/calendario");
      } else {
        router.push("/login");
      }
    }
  }, [isAuthenticated, isLoading, router, checkedAuth, user]);

  if (isLoading || !checkedAuth) {
    return (
      <div className="max-w-5xl mx-auto p-4 flex justify-center items-center h-screen">
        <Loading/>
      </div>
    );
  }

  return null;
}