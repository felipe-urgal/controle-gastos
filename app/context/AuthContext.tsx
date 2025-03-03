"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });

        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
        } else {
          setUser(null); // Apenas define o usuário como null, sem redirecionar imediatamente
        }
      } catch (error) {
        console.error("Erro ao buscar usuário:", error);
      }
    };

    fetchUser();
  }, []);


  const login = async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });

    console.log(res)

    if (res.ok) {
      const userData = await res.json();
      setUser(userData.user);
      router.push("/");
    } else {
      console.error("Erro no login");
    }
  };

  const logout = () => {
    fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setUser(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
