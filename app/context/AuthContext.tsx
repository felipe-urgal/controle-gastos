"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  name: string;
  email: string;
  showValues: boolean;
}

interface ChangePasswordResponse {
  success: boolean;
  message?: string;
}

interface UpdateUserPayload {
  name?: string;
  email?: string;
  currentPassword?: string;
  newPassword?: string;
  showValues?: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<ChangePasswordResponse>;
  updateUser: (data: UpdateUserPayload) => Promise<void>;
  recoverPassword: (email: string) => Promise<{ success: boolean; message: string }>;
  toggleShowValues: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const verifyAuth = async () => {
      setIsLoading(true);
      try {
        const res = await fetch("/api/auth/me", { 
          credentials: "include",
          cache: 'no-store'
        });
        
        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
          setIsAuthenticated(true);
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error("Erro ao verificar autenticação:", error);
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    verifyAuth();
  }, []);

  const login = async (email: string, password: string) => {
    // setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });

      if (!res.ok) {
        let errorMessage = "Erro ao fazer login.";
        try {
          const errorData = await res.json();
          errorMessage = errorData?.error || errorMessage;
        } catch (jsonError) {
          console.warn("Resposta de erro não é JSON:", jsonError);
        }
        throw new Error(errorMessage);
      }

      const { user: userData } = await res.json();
      setUser(userData);
      setIsAuthenticated(true);
      router.push("/dashboard");
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(error.message);
      } else {
        throw new Error("Erro inesperado no login.");
      }
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await fetch("/api/auth/logout", { 
        method: "POST", 
        credentials: "include" 
      });
      setUser(null);
      setIsAuthenticated(false);
      router.push("/login");
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      const token = localStorage.getItem('token'); // or wherever you store your token
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/auth/mudar-senha', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Password change failed');
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      setIsLoading(true);
      // Aqui você faria a chamada para sua API de registro
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Erro ao registrar");
      }

      // Após registrar, faz login automaticamente
      // await login(email, password);
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateUser = async (data: {
    name?: string;
    email?: string;
    currentPassword?: string;
    newPassword?: string;
  }) => {
    try {
      const response = await fetch('/api/auth/update-user', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data),
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error('Falha ao atualizar usuário');
      }

      const updatedUser = await response.json();
      setUser(updatedUser);
    } catch (error) {
      throw error;
    }
  };

  const recoverPassword = async (email: string) => {
    try {
      const response = await fetch("/api/auth/recuperar-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        throw new Error(`Resposta inesperada: ${text.slice(0, 100)}...`);
      }

      const data = await response.json();

      if (response.ok) {
        return { success: true, message: data.message || "Email enviado com sucesso!" };
      } else {
        return { success: false, message: data.error || "Erro ao processar" };
      }
    } catch (error) {
      console.error("Erro ao tentar recuperar senha:", error);
      return { success: false, message: "Erro ao tentar recuperar senha. Verifique o console." };
    }
  };

  const toggleShowValues = async () => {
    if (!user) return;

    try {
      const newShowValues = !user.showValues;
      
      const response = await fetch('/api/auth/toggle-show-values', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ showValues: newShowValues }),
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error('Falha ao atualizar preferência de visualização');
      }

      // Atualiza o estado local imediatamente para melhor UX
      const updatedUser = await response.json();
      setUser(updatedUser);
      
    } catch (error) {
      console.error("Erro ao alternar visibilidade dos valores:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated, login, logout, changePassword, register, updateUser, recoverPassword, toggleShowValues }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}