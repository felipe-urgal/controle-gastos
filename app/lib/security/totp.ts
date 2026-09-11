import {
  generateSecret,
  generateURI,
  verify,
} from "otplib";

const TOTP_ALGORITHM = "sha1" as const;
const TOTP_DIGITS = 6 as const;
const TOTP_PERIOD_SECONDS = 30;
const TOTP_EPOCH_TOLERANCE_SECONDS: [number, number] = [30, 30];
const TOTP_SECRET_BYTES = 20;

export const TOTP_POLICY = {
  algorithm: TOTP_ALGORITHM,
  digits: TOTP_DIGITS,
  periodSeconds: TOTP_PERIOD_SECONDS,
  epochToleranceSeconds: TOTP_EPOCH_TOLERANCE_SECONDS,
  secretBytes: TOTP_SECRET_BYTES,
} as const;

export type TotpVerificationResult =
  | { valid: false }
  | { valid: true; timeStep: bigint };

function normalizeSecret(secret: string) {
  const normalized = secret.replace(/\s+/g, "").toUpperCase();
  if (!normalized) {
    throw new Error("Segredo TOTP inválido");
  }
  return normalized;
}

function normalizeToken(token: string) {
  return token.replace(/\s+/g, "");
}

function toOtplibTimeStep(value: bigint | null | undefined) {
  if (value === null || value === undefined) return undefined;
  if (value < BigInt(0) || value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error("Time-step TOTP persistido inválido");
  }
  return Number(value);
}

export function generateTotpSecret() {
  return generateSecret({ length: TOTP_SECRET_BYTES });
}

export function generateTotpProvisioningUri(args: {
  secret: string;
  label: string;
  issuer?: string;
}) {
  const label = args.label.trim();
  const issuer = args.issuer?.trim() || "Controle de Gastos";

  if (!label) {
    throw new Error("Identificador TOTP inválido");
  }

  return generateURI({
    strategy: "totp",
    issuer,
    label,
    secret: normalizeSecret(args.secret),
    algorithm: TOTP_ALGORITHM,
    digits: TOTP_DIGITS,
    period: TOTP_PERIOD_SECONDS,
  });
}

export async function verifyTotpToken(args: {
  secret: string;
  token: string;
  at?: Date;
  afterTimeStep?: bigint | null;
}): Promise<TotpVerificationResult> {
  const token = normalizeToken(args.token);
  if (!/^\d{6}$/.test(token)) {
    return { valid: false };
  }

  const epoch = Math.floor((args.at?.getTime() ?? Date.now()) / 1000);
  const afterTimeStep = toOtplibTimeStep(args.afterTimeStep);
  const maxCandidateTimeStep = Math.floor(
    (epoch + TOTP_EPOCH_TOLERANCE_SECONDS[1]) / TOTP_PERIOD_SECONDS
  );

  if (afterTimeStep !== undefined && afterTimeStep > maxCandidateTimeStep) {
    return { valid: false };
  }

  const result = await verify({
    strategy: "totp",
    secret: normalizeSecret(args.secret),
    token,
    algorithm: TOTP_ALGORITHM,
    digits: TOTP_DIGITS,
    period: TOTP_PERIOD_SECONDS,
    epoch,
    epochTolerance: TOTP_EPOCH_TOLERANCE_SECONDS,
    afterTimeStep,
  });

  if (!result.valid || !("timeStep" in result)) {
    return { valid: false };
  }

  return {
    valid: true,
    timeStep: BigInt(result.timeStep),
  };
}
