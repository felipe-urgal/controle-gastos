'use client';

import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import {
  authService,
  User,
  UpdateUserRequest,
} from "@/app/services/auth-service";

type AuthState = {
  user: User | null;
  status: "loading" | "authenticated" | "unauthenticated";
};

type AuthAction =
  | { type: "SET_USER"; payload: User }
  | { type: "LOGOUT" }
  | { type: "LOADING" };

const initialState: AuthState = {
  user: null,
  status: "loading",
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "SET_USER":
      return {
        user: action.payload,
        status: "authenticated",
      };

    case "LOGOUT":
      return {
        user: null,
        status: "unauthenticated",
      };

    case "LOADING":
      return {
        ...state,
        status: "loading",
      };

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
      dispatch({ type: "LOADING" });

      try {
        const user = await authService.getCurrentUser();

        if (!mounted) return;

        dispatch({ type: "SET_USER", payload: user });
      } catch {
        if (!mounted) return;

        dispatch({ type: "LOGOUT" });
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, []);

  const login = useCallback(
    async (data: LoginData) => {
      try {
        dispatch({ type: "LOADING" });

        const response = await authService.login(data);

        dispatch({ type: "SET_USER", payload: response.user });

        router.replace("/contas");
        router.refresh();
      } catch (err) {
        dispatch({ type: "LOGOUT" });
        throw err;
      }
    },
    [router]
  );

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      dispatch({ type: "LOGOUT" });
      router.replace("/login");
      router.refresh();
    }
  }, [router]);

  const signup = useCallback(
    async (data: SignupData) => {
      dispatch({ type: "LOADING" });

      try {
        await authService.signup(data);

        dispatch({ type: "LOGOUT" });

        router.replace("/login");
        router.refresh();
      } catch (err) {
        dispatch({ type: "LOGOUT" });
        throw err;
      }
    },
    [router]
  );

  const updateUser = useCallback(async (data: UpdateUserRequest) => {
    const updatedUser = await authService.updateUser(data);
    dispatch({ type: "SET_USER", payload: updatedUser });
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    return authService.forgotPassword(email);
  }, []);

  const deleteAccount = useCallback(async () => {
    try {
      await authService.deleteAccount();
    } finally {
      dispatch({ type: "LOGOUT" });
      router.replace("/login");
      router.refresh();
    }
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user: state.user,
        isAuthenticated: state.status === "authenticated",
        isLoading: state.status === "loading",

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
};

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
};
