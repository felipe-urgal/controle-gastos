import { buildFinancialAssistantMessages } from "@/app/lib/local-ai/financial-assistant-prompt";
import type { FinancialContext, LocalAssistantProgress } from "@/app/types/local-financial-assistant";

export type LocalAssistantGenerator = {
  isSupported(): Promise<boolean>;
  generate(args: {
    messages: ReturnType<typeof buildFinancialAssistantMessages>;
    onProgress?: (progress: LocalAssistantProgress) => void;
    signal?: AbortSignal;
  }): Promise<string>;
};

export async function explainFinancialContext(
  context: FinancialContext,
  generator: LocalAssistantGenerator,
  onProgress?: (progress: LocalAssistantProgress) => void,
  signal?: AbortSignal,
) {
  if (!(await generator.isSupported())) {
    throw new Error("LOCAL_AI_UNSUPPORTED");
  }

  if (signal?.aborted) throw new DOMException("Operação cancelada", "AbortError");

  const result = await generator.generate({
    messages: buildFinancialAssistantMessages(context),
    onProgress,
    signal,
  });

  const normalized = result.trim();
  if (!normalized) throw new Error("LOCAL_AI_EMPTY_RESPONSE");
  return normalized;
}
