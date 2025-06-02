export interface ErrorResponse {
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
}