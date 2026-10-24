# Padrão de telas autenticadas

**Referência: Contas** (`/contas`, `/contas/show/[id]`, `/contas/nova`, `/contas/alterar/[id]`). Toda tela nova ou revisada segue este padrão; as demais áreas migram para ele uma a uma.

## Estrutura

- **Mobile:** barra superior, conteúdo no meio, barra inferior flutuante (Início, Transações, Contas, Mais). Lista/central usa a barra global (`MobileTopbar`); detalhe e formulário usam `MobileAppBar` (fixa, com voltar, título e ações). O conteúdo reserva o espaço da barra inferior por `--app-mobile-bottom-nav-height`.
- **Desktop (`lg`+):** a faixa do título é o `PageBar`: encostada na sidebar, na cor dela, com a altura do bloco do logo (`--app-sidebar-header-height`, a linha de baixo é uma só) e fixa ao rolar.
- Telas com sidebar ligam `sidebarAligned` em `PageTitle`, `ShowPage`, `NewPage` e `EditPage` e informam `breadcrumb`: níveis acima são links e o último é o `h1`. No modo faixa a descrição é ignorada; não use eyebrow.
- Detalhe, criação e edição escondem o cabeçalho no mobile (`hideHeaderOnMobile` / `ShowBelow`) e usam `MobileAppBar`.

## Ações

- Na faixa, os botões usam `pageBarButtonProps` (40px no desktop). No celular a ação principal da lista é só o ícone, na linha do título (`size="compact"` com `ShowBelow`/`ShowFrom`).
- Ações da entidade ficam ao lado de **Editar** no cabeçalho (Inativar, Excluir), com `ShowPage` `headerActions`. Excluir desabilitado quando o servidor não permite, com `deleteHint` explicando. Não há "zona de risco" nem atalhos de ação dentro do card de resumo.
- Formulários: ações no fim do conteúdo, sem barra fixa. No celular, `FormActions` com `iconsOnMobile` (compactos, cancelar num canto e salvar no outro).
- Detalhe: passe `loadingSkeleton` no formato da tela para o carregamento não "pular" (no mobile inclui a `MobileAppBar`).

## Tokens e regras

- Uma só cor primária (`--primary`); receita/despesa só em `--income`/`--expense`. Sem hex solto em componentes.
- Raios por `--radius-sm|md|lg` (8/12/16) e pílula nos botões; tipografia na escala do Tailwind. Os guardrails em `scripts/__tests__/design-guardrails.test.ts` falham com `text-[Npx]` e `rounded-[Npx]`.
- Valores monetários em `.money` (JetBrains Mono); texto em Plus Jakarta Sans.
- Botões: `primary`, `secondary`, `outline`, `ghost`, `danger`; tamanhos `compact`, `xs`, `sm`, `md`.

## Adoção

- Concluído: Contas.
- Pendente (usam cabeçalho próprio ou o padrão anterior): Transações, Categorias, Dashboard, Calendário, Metas, Dívidas, Investimentos, Patrimônio, Fechamento, Comparar, Compromissos, Modelos, Recorrências, Rendimentos, Estabelecimentos, Tags, Usuário.
- Ao migrar uma tela, ligue `sidebarAligned` e `breadcrumb`, remova a descrição e o eyebrow, mova ações para o cabeçalho e atualize esta lista.
