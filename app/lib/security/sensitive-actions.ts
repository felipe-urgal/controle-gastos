export const SENSITIVE_ACTIONS = {
  USER_EMAIL_CHANGE: "user-email-change",
  USER_PASSWORD_CHANGE: "user-password-change",
  USER_DELETE: "user-delete",
  MFA_ENROLL_START: "mfa-enroll-start",
  MFA_ENROLL_CONFIRM: "mfa-enroll-confirm",
  MFA_DISABLE: "mfa-disable",
  MFA_RECOVERY_REGENERATE: "mfa-recovery-regenerate",
  MCP_TOKEN_CREATE: "mcp-token-create",
} as const;

export type SensitiveAction =
  (typeof SENSITIVE_ACTIONS)[keyof typeof SENSITIVE_ACTIONS];

export type StepUpRequirement =
  | "PASSWORD"
  | "PASSWORD_MFA_IF_ENABLED"
  | "ENROLLMENT_PROOF";

export const SENSITIVE_ACTION_POLICIES: Record<
  SensitiveAction,
  { requirement: StepUpRequirement; rateLimit: "STEP_UP" }
> = {
  [SENSITIVE_ACTIONS.USER_EMAIL_CHANGE]: {
    requirement: "PASSWORD",
    rateLimit: "STEP_UP",
  },
  [SENSITIVE_ACTIONS.USER_PASSWORD_CHANGE]: {
    requirement: "PASSWORD",
    rateLimit: "STEP_UP",
  },
  [SENSITIVE_ACTIONS.USER_DELETE]: {
    requirement: "PASSWORD_MFA_IF_ENABLED",
    rateLimit: "STEP_UP",
  },
  [SENSITIVE_ACTIONS.MFA_ENROLL_START]: {
    requirement: "PASSWORD",
    rateLimit: "STEP_UP",
  },
  [SENSITIVE_ACTIONS.MFA_ENROLL_CONFIRM]: {
    requirement: "ENROLLMENT_PROOF",
    rateLimit: "STEP_UP",
  },
  [SENSITIVE_ACTIONS.MFA_DISABLE]: {
    requirement: "PASSWORD_MFA_IF_ENABLED",
    rateLimit: "STEP_UP",
  },
  [SENSITIVE_ACTIONS.MFA_RECOVERY_REGENERATE]: {
    requirement: "PASSWORD_MFA_IF_ENABLED",
    rateLimit: "STEP_UP",
  },
  [SENSITIVE_ACTIONS.MCP_TOKEN_CREATE]: {
    requirement: "PASSWORD_MFA_IF_ENABLED",
    rateLimit: "STEP_UP",
  },
};

export function sensitiveActionRequirement(action: SensitiveAction) {
  return SENSITIVE_ACTION_POLICIES[action].requirement;
}
