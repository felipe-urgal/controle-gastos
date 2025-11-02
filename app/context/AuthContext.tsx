"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  authService, 
  User, 
  UpdateUserRequest, 
  DeleteAccountResponse,
  RecoverPasswordResponse,
  ResetPasswordResponse,
} from "@/app/services/authService";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authChecked: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (data: UpdateUserRequest) => Promise<void>;
  recoverPassword: (email: string) => Promise<RecoverPasswordResponse>;
  toggleShowValues: () => Promise<void>;
  deleteAccount: () => Promise<DeleteAccountResponse>;
  resetPassword: (token: string, novaSenha: string) => Promise<ResetPasswordResponse>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const userData = await authService.getCurrentUser();
        setUser(userData);
        setIsAuthenticated(true);
      } catch (error) {
        console.error(error)
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
        setAuthChecked(true);
      }
    };
    verifyAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await authService.login({ email, password });
      setUser(response.user);
      setIsAuthenticated(true);
      router.push("/calendario");
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
      await authService.logout();
      setUser(null);
      setIsAuthenticated(false);
      router.push("/login");
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      setIsLoading(true);
      await authService.register({ name, email, password });
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateUser = async (data: UpdateUserRequest) => {
    try {
      const updatedUser = await authService.updateUser(data);
      setUser(updatedUser);
    } catch (error) {
      throw error;
    }
  };

  const recoverPassword = async (email: string): Promise<RecoverPasswordResponse> => {
    try {
      return await authService.recoverPassword(email);
    } catch (error) {
      console.error("Erro ao tentar recuperar senha:", error);
      return { 
        status: 500,
        success: false, 
        message: error instanceof Error ? error.message : "Erro ao tentar recuperar senha" 
      };
    }
  };

  const toggleShowValues = async () => {
    if (!user) return;

    try {
      const newShowValues = !user.showValues;
      const updatedUser = await authService.toggleShowValues(newShowValues);
      setUser(updatedUser);
    } catch (error) {
      console.error("Erro ao alternar visibilidade dos valores:", error);
      throw error;
    }
  };

  const deleteAccount = async (): Promise<DeleteAccountResponse> => {
    try {
      const result = await authService.deleteAccount();
      if (result.success) {
        setUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem('token');
      }
      return result;
    } catch (error) {
      console.error("Erro ao excluir conta:", error);
      return { 
        status: 500,
        success: false, 
        message: error instanceof Error ? error.message : "Erro ao excluir conta" 
      };
    }
  };

  const resetPassword = async (token: string, novaSenha: string): Promise<ResetPasswordResponse> => {
    try {
      return await authService.resetPassword({ token, novaSenha });
    } catch (error) {
      console.error("Erro ao redefinir senha:", error);
      return { 
        status: 500,
        success: false, 
        message: error instanceof Error ? error.message : "Erro inesperado ao redefinir senha" 
      };
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoading, 
      isAuthenticated, 
      authChecked,
      login, 
      logout, 
      register, 
      updateUser, 
      recoverPassword, 
      toggleShowValues, 
      deleteAccount, 
      resetPassword 
    }}>
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
