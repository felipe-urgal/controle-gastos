'use client';

import { createContext, useCallback, useContext, useEffect, useReducer } from 'react';
import { useRouter } from 'next/navigation';

import { authService, User, UpdateUserRequest } from '@/app/services/auth-service';
import { userService } from '@/app/services/user-service';

type AuthState = {
  user: User | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
};

type AuthAction =
  | { type: 'SET_USER'; payload: User }
  | { type: 'LOGOUT' }
  | { type: 'LOADING' };

const initialState: AuthState = {
  user: null,
  status: 'loading',
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_USER':
      return { user: action.payload, status: 'authenticated' };
    case 'LOGOUT':
      return { user: null, status: 'unauthenticated' };
    case 'LOADING':
      return { ...state, status: 'loading' };
    default:
      return state;
  }
}

export interface LoginData {
  email: string;
  password: string;
}

export interface SignupData {
  name: string;
  email: string;
  password: string;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (data: LoginData) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  logout: () => Promise<void>;

  forgotPassword: (email: string) => Promise<{ success: boolean; message: string }>;

  updateUser: (data: UpdateUserRequest) => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const user = await authService.getCurrentUser();
        if (mounted) dispatch({ type: 'SET_USER', payload: user });
      } catch {
        if (mounted) dispatch({ type: 'LOGOUT' });
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, []);

  const login = useCallback(async (data: LoginData) => {
    try {
      const response = await authService.login(data);
      dispatch({ type: 'SET_USER', payload: response.user });
      router.replace('/contas');
    } catch (err) {
      dispatch({ type: 'LOGOUT' });
      throw err;
    }
  }, [router]);

  const logout = useCallback(async () => {
    await authService.logout();
    dispatch({ type: 'LOGOUT' });
    router.replace('/');
    router.refresh();
  }, [router]);

  const signup = useCallback(async (data: SignupData) => {
    dispatch({ type: 'LOADING' });

    await authService.signup(data);

    dispatch({ type: 'LOGOUT' });

    router.replace('/login');
  }, [router]);

  const updateUser = useCallback(async (data: UpdateUserRequest) => {
    if (!state.user?.id) {
      throw new Error('Usuário não autenticado');
    }

    const response = await userService.update<UpdateUserRequest>(state.user.id, data);
    dispatch({ type: 'SET_USER', payload: response.data });
  }, [state.user?.id]);

  const forgotPassword = async (email: string) => {
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      return {
        success: response.ok,
        message: data.message || 'Se o e-mail existir, enviaremos instruções.',
      };
    } catch (error) {
      console.error(error);
      return {
        success: false,
        message: 'Erro ao tentar recuperar senha.',
      };
    }
  };

  const deleteAccount = useCallback(async () => {
    await authService.deleteAccount();
    dispatch({ type: 'LOGOUT' });
    router.replace('/login');
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user: state.user,
        isAuthenticated: state.status === 'authenticated',
        isLoading: state.status === 'loading',
        login,
        logout,
        signup,
        updateUser,
        forgotPassword,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
