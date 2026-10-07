'use client';

import { createContext, useCallback, useContext, useEffect, useReducer } from 'react';
import { useRouter } from 'next/navigation';

import { authService, type UpdateUserRequest } from '@/app/services/auth-service';
import type { User } from '@/app/types/user';
import { mfaService, type VerifyMfaLoginRequest } from '@/app/services/mfa-service';
import { userService } from '@/app/services/user-service';
import {
  clearOfflineTransactionLocalState,
  setOfflineDraftOwner,
} from '@/app/lib/pwa/offline-transaction-draft';

type AuthState = {
  user: User | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
};

type AuthAction =
  | { type: 'SET_USER'; payload: User }
  | { type: 'LOGOUT' }
  | { type: 'LOADING' };

export type LoginResult =
  | { mfaRequired: false }
  | { mfaRequired: true; challenge: string; expiresInSeconds: number };

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

  login: (data: LoginData) => Promise<LoginResult>;
  verifyMfa: (data: VerifyMfaLoginRequest) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  logout: () => Promise<void>;
  requireReauthentication: (reason?: 'password-changed') => void;

  forgotPassword: (email: string) => Promise<{ success: boolean; message: string }>;

  updateUser: (data: UpdateUserRequest) => Promise<{ reauthRequired: boolean }>;
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
        if (mounted) {
          setOfflineDraftOwner(user.id);
          dispatch({ type: 'SET_USER', payload: user });
        }
      } catch {
        if (mounted) dispatch({ type: 'LOGOUT' });
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, []);

  const login = useCallback(async (data: LoginData): Promise<LoginResult> => {
    try {
      const response = await authService.login(data);

      if (response.mfaRequired) {
        if (!response.mfaChallenge) {
          throw new Error('Não foi possível iniciar a verificação em duas etapas.');
        }

        dispatch({ type: 'LOGOUT' });
        return {
          mfaRequired: true,
          challenge: response.mfaChallenge,
          expiresInSeconds: response.expiresInSeconds ?? 300,
        };
      }

      if (!response.user) {
        throw new Error('Resposta de autenticação inválida.');
      }

      setOfflineDraftOwner(response.user.id);
      dispatch({ type: 'SET_USER', payload: response.user });
      router.replace('/dashboard');
      return { mfaRequired: false };
    } catch (err) {
      dispatch({ type: 'LOGOUT' });
      throw err;
    }
  }, [router]);

  const verifyMfa = useCallback(async (data: VerifyMfaLoginRequest) => {
    try {
      const response = await mfaService.verifyLogin(data);
      setOfflineDraftOwner(response.user.id);
      dispatch({ type: 'SET_USER', payload: response.user });
      router.replace('/dashboard');
    } catch (err) {
      dispatch({ type: 'LOGOUT' });
      throw err;
    }
  }, [router]);

  const requireReauthentication = useCallback((reason?: 'password-changed') => {
    clearOfflineTransactionLocalState();
    dispatch({ type: 'LOGOUT' });
    window.location.replace(
      reason === 'password-changed'
        ? '/login?reason=password-changed'
        : '/login'
    );
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
      dispatch({ type: 'LOGOUT' });
      router.replace('/');
      router.refresh();
    } finally {
      clearOfflineTransactionLocalState();
    }
  }, [router]);

  const signup = useCallback(async (data: SignupData) => {
    dispatch({ type: 'LOADING' });

    try {
      await authService.signup(data);
      dispatch({ type: 'LOGOUT' });
      router.replace('/login');
    } catch (err) {
      dispatch({ type: 'LOGOUT' });
      throw err;
    }
  }, [router]);

  const updateUser = useCallback(async (data: UpdateUserRequest) => {
    if (!state.user?.id) {
      throw new Error('Usuário não autenticado');
    }

    const response = await userService.updateCurrent<UpdateUserRequest>(data);

    if (response.reauthRequired) {
      requireReauthentication('password-changed');
      return { reauthRequired: true };
    }

    dispatch({ type: 'SET_USER', payload: response.data });
    return { reauthRequired: false };
  }, [requireReauthentication, state.user]);

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

  return (
    <AuthContext.Provider
      value={{
        user: state.user,
        isAuthenticated: state.status === 'authenticated',
        isLoading: state.status === 'loading',
        login,
        verifyMfa,
        logout,
        requireReauthentication,
        signup,
        updateUser,
        forgotPassword,
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
