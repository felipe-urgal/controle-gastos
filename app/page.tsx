"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";

export default function Home() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const [checkedAuth, setCheckedAuth] = useState(false);

  useEffect(() => {
    if (!isLoading && !checkedAuth) {
      setCheckedAuth(true);
      console.log(isAuthenticated)
      console.log(user)
      
      if (isAuthenticated && user) {
        router.push("/contas");
      } else {
        router.push("/login");
      }
    }
  }, [isAuthenticated, isLoading, router, checkedAuth, user]);

  if (isLoading || !checkedAuth) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return null;
}