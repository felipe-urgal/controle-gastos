import { failure, success } from "@/app/lib/api-response";
import { runNotificationsCron } from "@/app/lib/notifications/notification-cron";
import { isCronAuthorized } from "@/app/lib/security/cron-auth";

export const maxDuration = 60;

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return failure("Não autorizado", 401, "UNAUTHORIZED");
  }

  try {
    return success(await runNotificationsCron());
  } catch {
    return failure("Erro ao gerar avisos", 500);
  }
}
