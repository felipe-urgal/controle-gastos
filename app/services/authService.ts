import { apiClient } from "./apiClient";

export interface User {
  id: string;
  name: string;
  email: string;
  showValues: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  status: number;
  success: boolean;
  message: string;
  user: User;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface RegisterResponse {
  status: number;
  success: boolean;
  message: string;
  user: User;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  currentPassword?: string;
  newPassword?: string;
  showValues?: boolean;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ChangePasswordResponse {
  status: number;
  success: boolean;
  message: string;
}

export interface RecoverPasswordRequest {
  email: string;
}

export interface RecoverPasswordResponse {
  status: number;
  success: boolean;
  message: string;
}

export interface ResetPasswordRequest {
  token: string;
  novaSenha: string;
}

export interface ResetPasswordResponse {
  status: number;
  success: boolean;
  message: string;
}

export interface DeleteAccountResponse {
  status: number;
  success: boolean;
  message: string;
}

export interface AuthMeResponse {
  status: number;
  success: boolean;
  message: string;
  user: User;
}

export interface ApiResponse<T = any> {
  status: number;
  success: boolean;
  message: string;
  data?: T;
  user?: User;
}

// Erro customizado para autenticação
export class AuthError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export const authService = {
  /**
   * Verifica se o usuário está autenticado
   * Retorna o usuário se autenticado, lança AuthError se não autenticado
   */
  async getCurrentUser(): Promise<User> {
    try {
      const response = await apiClient<AuthMeResponse>("/api/auth/me", {
        method: "GET",
        credentials: "include",
      });
      
      if (!response.success) {
        // Para erro 401 (Não autenticado), não lançamos erro, apenas retornamos null
        if (response.status === 401) {
          throw new AuthError(response.message, response.status, 'NOT_AUTHENTICATED');
        }
        throw new AuthError(response.message, response.status);
      }
      
      return response.user!;
    } catch (error) {
      // Se for erro de autenticação (401), relançamos como AuthError
      if (error instanceof Error && error.message.includes('Não autenticado')) {
        throw new AuthError('Não autenticado', 401, 'NOT_AUTHENTICATED');
      }
      throw error;
    }
  },

  /**
   * Realiza login do usuário
   */
  async login({ email, password }: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient<LoginResponse, LoginRequest>("/api/auth/login", {
      method: "POST",
      body: { email, password },
      credentials: "include",
    });
    
    if (!response.success) {
      throw new AuthError(response.message, response.status);
    }
    
    return response;
  },

  /**
   * Realiza logout do usuário
   */
  async logout(): Promise<{ message: string }> {
    const response = await apiClient<ApiResponse>("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    
    if (!response.success) {
      throw new AuthError(response.message, response.status);
    }
    
    return { message: response.message };
  },

  /**
   * Registra um novo usuário
   */
  async register({ name, email, password }: RegisterRequest): Promise<RegisterResponse> {
    const response = await apiClient<RegisterResponse, RegisterRequest>("/api/auth/register", {
      method: "POST",
      body: { name, email, password },
    });
    
    if (!response.success) {
      throw new AuthError(response.message, response.status);
    }
    
    return response;
  },

  /**
   * Atualiza dados do usuário
   */
  async updateUser(data: UpdateUserRequest): Promise<User> {
    const response = await apiClient<ApiResponse, UpdateUserRequest>("/api/auth/update-user", {
      method: "PUT",
      body: data,
      credentials: "include",
    });
    
    if (!response.success) {
      throw new AuthError(response.message, response.status);
    }
    
    return response.user!;
  },

  /**
   * Altera a senha do usuário
   */
  async changePassword({ currentPassword, newPassword }: ChangePasswordRequest): Promise<ChangePasswordResponse> {
    const response = await apiClient<ChangePasswordResponse, ChangePasswordRequest>("/api/auth/change-password", {
      method: "PUT",
      body: { currentPassword, newPassword },
      credentials: "include",
    });
    
    if (!response.success) {
      throw new AuthError(response.message, response.status);
    }
    
    return response;
  },

  /**
   * Solicita recuperação de senha
   */
  async recoverPassword(email: string): Promise<RecoverPasswordResponse> {
    const response = await apiClient<RecoverPasswordResponse, RecoverPasswordRequest>("/api/auth/recuperar-senha", {
      method: "POST",
      body: { email },
    });
    
    // Não lançamos erro aqui para permitir tratamento específico no UI
    return response;
  },

  /**
   * Redefine a senha com token
   */
  async resetPassword({ token, novaSenha }: ResetPasswordRequest): Promise<ResetPasswordResponse> {
    const response = await apiClient<ResetPasswordResponse, ResetPasswordRequest>("/api/auth/redefinir-senha", {
      method: "POST",
      body: { token, novaSenha },
    });
    
    // Não lançamos erro aqui para permitir tratamento específico no UI
    return response;
  },

  /**
   * Alterna a preferência de mostrar valores
   */
  async toggleShowValues(showValues: boolean): Promise<User> {
    const response = await apiClient<ApiResponse, { showValues: boolean }>("/api/auth/toggle-show-values", {
      method: "PUT",
      body: { showValues },
      credentials: "include",
    });
    
    if (!response.success) {
      throw new AuthError(response.message, response.status);
    }
    
    return response.user!;
  },

  /**
   * Exclui a conta do usuário
   */
  async deleteAccount(): Promise<DeleteAccountResponse> {
    const response = await apiClient<DeleteAccountResponse>("/api/auth/delete-account", {
      method: "DELETE",
      credentials: "include",
    });
    
    // Não lançamos erro aqui para permitir tratamento específico no UI
    return response;
  },

  /**
   * Verifica se o token de redefinição é válido
   */
  async validateResetToken(token: string): Promise<{ valid: boolean; message?: string }> {
    try {
      // Esta função pode precisar ser implementada na API
      const response = await apiClient<ApiResponse>("/api/auth/validate-reset-token", {
        method: "POST",
        body: { token },
      });
      
      return { valid: response.success, message: response.message };
    } catch (error) {
      return { valid: false, message: error instanceof Error ? error.message : "Token inválido" };
    }
  },
};