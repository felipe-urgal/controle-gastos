'use client';

import { createContext, useCallback, useContext, useEffect, useReducer } from 'react';
import { useRouter } from 'next/navigation';

import { readOfflineTransactionQueue } from '@/app/lib/pwa/offline-transaction-queue';
import { ApiClientError, SESSION_EXPIRED_EVENT } from '@/app/services/api-client';
import { resolvePostLoginPath, sanitizeNextPath } from '@/app/lib/auth/protected-routes';
import { authService, type UpdateUserRequest } from '@/app/services/auth-service';
import type { User } from '@/app/types/user';
import { mfaService, type VerifyMfaLoginRequest } from '@/app/services/mfa-service';
import { userService } from '@/app/services/user-service';
import {
  clearOfflineTransactionLocalState,
  setOfflineDraftOwner,
  readOfflineTransactionDraft,
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

export type ForgotPasswordResult = {
  success: boolean;
  message: string;
  retryAfterSeconds?: number;
};

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

  forgotPassword: (email: string) => Promise<ForgotPasswordResult>;

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

  useEffect(() => {
    const handleSessionExpired = () => {
      if (state.status !== 'authenticated') return;
      // Sessão revogada/expirada: não descarta rascunhos offline do usuário.
      dispatch({ type: 'LOGOUT' });
      const current = sanitizeNextPath(`${window.location.pathname}${window.location.search}`);
      router.replace(current ? `/login?next=${encodeURIComponent(current)}` : '/login');
    };

    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
  }, [router, state.status]);

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
      router.replace(resolvePostLoginPath(window.location.search));
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
      router.replace(resolvePostLoginPath(window.location.search));
    } catch (err) {
      dispatch({ type: 'LOGOUT' });
      throw err;
    }
  }, [router]);

  const requireReauthentication = useCallback((reason?: 'password-changed') => {
    clearOfflineTransactionLocalState();
    dispatch({ type: 'LOGOUT' });

    if (reason === 'password-changed') {
      window.sessionStorage.setItem('auth-notice', reason);
    }

    window.location.replace(
      reason === 'password-changed'
        ? '/login?reason=password-changed'
        : '/login'
    );
  }, []);

  const logout = useCallback(async () => {
    if (state.user?.id) {
      const hasDraft = Boolean(readOfflineTransactionDraft(state.user.id));
      const pendingCount = readOfflineTransactionQueue(state.user.id).filter(
        (item) => item.status !== 'synced',
      ).length;
      if (hasDraft || pendingCount > 0) {
        const detail = [
          hasDraft ? 'um rascunho offline' : null,
          pendingCount > 0 ? `${pendingCount} lançamento(s) pendente(s) de sincronização` : null,
        ].filter(Boolean).join(' e ');
        const confirmed = window.confirm(
          `Você tem ${detail}. Sair apagará definitivamente esses dados deste dispositivo.\n\n` +
          'Cancelar: voltar para revisar ou sincronizar em Transações.\n' +
          'OK: sair e descartar os dados locais.',
        );
        if (!confirmed) return;
      }
    }
    try {
      await authService.logout();
      dispatch({ type: 'LOGOUT' });
      router.replace('/');
      router.refresh();
    } finally {
      clearOfflineTransactionLocalState();
    }
  }, [router, state.user?.id]);

  // Não alterna o status para 'loading': o ClientLayout desmontaria a página e
  // o estado "Confira seu e-mail" seria perdido.
  const signup = useCallback(async (data: SignupData) => {
    await authService.signup(data);
  }, []);

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

  const forgotPassword = useCallback(async (email: string): Promise<ForgotPasswordResult> => {
    try {
      const response = await authService.forgotPassword(email);
      return { success: true, message: response.message };
    } catch (error) {
      if (error instanceof ApiClientError) {
        return {
          success: false,
          message: error.message,
          retryAfterSeconds: error.retryAfterSeconds,
        };
      }
      return { success: false, message: 'Erro ao tentar recuperar senha.' };
    }
  }, []);

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
