import { formatCurrency } from "@/app/lib/currency/format-money";
import type { TransactionTemplateDTO } from "@/app/types/transaction-template";

export const QUICK_FAVORITES_LIMIT = 3;

export type FavoriteShortcut = {
  id: string;
  title: string;
  subtitle: string;
  /** Abre a tela de nova transação já preenchida pelo modelo; o usuário confirma lá. */
  href: string;
  keywords: string;
};

/**
 * Modelos favoritos como atalhos de um toque na busca global. Só favoritos, no máximo três, na
 * ordem recebida. O valor só aparece no texto se o usuário não oculta valores.
 */
export function favoriteShortcuts(
  templates: readonly TransactionTemplateDTO[],
  options: { showValues: boolean },
): FavoriteShortcut[] {
  return templates
    .filter((template) => template.isFavorite)
    .slice(0, QUICK_FAVORITES_LIMIT)
    .map((template) => {
      const kind = template.type === "INCOME" ? "Receita" : "Despesa";
      const amount =
        options.showValues && template.amount !== null
          ? formatCurrency(template.amount, template.account?.currency ?? "BRL")
          : null;
      return {
        id: template.id,
        title: template.name,
        subtitle: [kind, amount, "modelo favorito"].filter(Boolean).join(" · "),
        href: `/transacoes/nova?template=${encodeURIComponent(template.id)}`,
        keywords: `modelo favorito ${template.name} ${template.description}`,
      };
    });
}
