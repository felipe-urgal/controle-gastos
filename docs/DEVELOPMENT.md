# Desenvolvimento

## Preparação

Requisitos principais:

- Node.js 24.x
- pnpm
- PostgreSQL conforme a configuração do projeto

Instalação:

    pnpm install

Ambiente local:

    pnpm dev

## Relação com o agent-workflow-browser

Quando uma mudança for coordenada pelo `agent-workflow-browser`, este documento continua sendo a fonte local para preparação, desenvolvimento e validação do projeto. Ele não substitui a task canônica nem define workflow, handoff ou autorizações.

## Fluxo de alteração

1. Entenda o comportamento atual e localize o owner da responsabilidade.
2. Defina critérios de aceite antes de implementar quando a mudança não for trivial.
3. Faça a menor alteração coerente com a arquitetura atual.
4. Adicione ou ajuste testes no mesmo nível em que o comportamento é garantido.
5. Execute o gate principal e revise o diff.

## Validação

Gate canônico:

    pnpm check

Comandos úteis:

    pnpm lint
    pnpm typecheck
    pnpm test
    pnpm build

## Cron de resumo financeiro

O resumo financeiro semanal usa o Vercel Cron em `/api/cron/periodic-summary`. Configure `CRON_SECRET` no ambiente da aplicação; o endpoint aceita somente `Authorization: Bearer <CRON_SECRET>`.

O cron roda diariamente às 06:00 UTC, mas a materialização é idempotente por usuário, semana lógica concluída e moeda. A frequência do produto continua semanal; a execução diária permite retry sem fila ou worker dedicado. `periodicSummaryFrequency` só aceita `WEEKLY` (campo mantido para evolução futura; a UI não oferece seletor).

Contrato do snapshot (`PeriodicFinancialSummary.content`):

- É um retrato imutável do que foi apurado na geração; correções posteriores de transações não o alteram, e a UI informa isso junto de `generatedAt`.
- `contentVersion` identifica o formato/algoritmo (`PERIODIC_SUMMARY_CONTENT_VERSION`). Linhas sem versão são a v1 legada e permanecem como estão; versão desconhecida é rejeitada, nunca reinterpretada. Ao mudar a regra financeira, incremente a versão: semanas novas usam a regra nova e as antigas continuam históricas.
- O snapshot contém apenas totais e categorias do período fechado. Compromissos/forecast pertencem ao Dashboard e à fonte canônica de Compromissos, não são materializados aqui.
- Valores monetários ficam estruturados (centavos); nenhum texto livre persistido carrega valor, então `showValues=false` mascara todo o conteúdo.
- Snapshots v1 (sem versão) são exibidos com aviso de regra anterior; não há rebuild automático, pois o produto trata o resumo como histórico imutável.
- Crédito/estorno de cartão sem categoria reduz o total, mas não gera categoria nem bucket em `topCategories`.
- A geração faz uma única query de transações por moeda (sem forecast, insights ou compromissos); duração por usuário e do lote vai para os logs do cron.
- O cron emite `periodic_summary.alert` (somente contagens e idade agregada, sem identificadores) em falha de usuário/marcador, deadline, cobertura em risco ou usuário parado há mais de 9 dias.
- O cron só avança `periodicSummaryLastProcessedAt` após o usuário concluir todas as moedas ativas.

## Cotações de investimentos

A atualização de cotações B3 usa a brapi somente no servidor. Configure `BRAPI_TOKEN` para consultar ativos além dos símbolos públicos de teste oferecidos pela API. O token deve permanecer apenas no ambiente do servidor e é enviado no header `Authorization`.

Sem token, o fluxo continua funcionando para ativos aceitos publicamente pela brapi; falhas externas preservam a última cotação conhecida e não bloqueiam operações de investimento.

## Banco e segurança

- Não commite segredos ou credenciais reais.
- Não altere migrations já aplicadas; crie forward-fix.
- Valide ownership de recursos no servidor.
- Não misture moedas em agregados sem regra explícita de conversão.

## Política de documentação

Mantenha somente documentação viva. Decisões concluídas, planos antigos e relatórios pontuais ficam no histórico Git, issues e PRs. Novos documentos devem existir apenas quando forem necessários para operar, desenvolver ou revisar o sistema no presente.

## Layout mobile e guardrails de design

- `scripts/__tests__/design-ratchet.test.ts`: limites por arquivo para overlays `fixed inset-0` fora do `ModalShell` e cores hex literais. Ao migrar um arquivo, reduza ou remova a entrada.
- **Teclado virtual:** formulários longos e telas de autenticação usam `useVisualViewportInset` (`scroll-padding-bottom` no `<html>` enquanto o teclado está aberto); a busca global é uma sheet de tela cheia no mobile (`h-dvh`) e reserva o inset do teclado no fim da lista. Ao adicionar um formulário mobile, teste com a viewport reduzida (ver `shell-visual`, teste "360×640 com teclado aberto").

## Design: breakpoints, camadas e tokens

- **Breakpoints:** `sm` 640, `md` 768, `lg` 1024 (shell desktop: sidebar), `xl` 1280, `2xl` 1536. Mais um único ponto "compacto" de telefone: `min-[360px]:` / `max-[359px]:`. Nenhum outro `min-[Npx]`/`max-[Npx]` (teste em `scripts/__tests__/design-guardrails.test.ts`). `tailwind.config.js` não existe: o Tailwind v4 usa os padrões acima.
- **Camadas (z-index):** use sempre os tokens de `globals.css`: `--z-popover` 20 < `--z-nav` 30 (bottom-nav) < `--z-header` 40 (topbar/sidebar/filtros) < `--z-sheet` 50 < `--z-detail` 60 < `--z-modal` 70 (`ModalShell`) < `--z-search` 80 < `--z-toast` 90. Ex.: `z-[var(--z-sheet)]`. `z-10`/`z-20`/`z-[1]` só para empilhamento local dentro de um componente.
- **Cores de marca em duas camadas com papéis fixos:** `--primary*` é a identidade e a semântica financeira do produto (o shell **não** a redefine — teste em `orbit.test.ts`); `--orbit-*` é o acento da interface autenticada (navegação, botões de ação, foco). Receita/despesa usam `--income`/`--expense`; avisos usam `--warning`/`--warning-subtle`. Cores literais (hex/paleta Tailwind) só para dado escolhido pelo usuário (cor de conta/categoria).
- **Overlays:** `ModalShell` (variantes `sheet` e `fullscreen-sheet`) e o atributo `data-overlay-hide-nav` (o shell oculta a bottom-nav sem conhecer telas específicas).

## Primitivos de UI (`app/components/ui`)

- **`Button`**: `variant` `primary` (identidade do produto), `accent` (ação principal da UI autenticada, tokens `--orbit-*`), `secondary`, `outline`, `ghost`, `danger`, `success`, `warning`, `info`, `link`; `size` `xs`/`sm`/`md`/`cta`/`lg`/`xl` (todos ≥ 44px de altura em telas estreitas; `xs` volta a 36px em ≥ 640px; `cta` = 56px, rodapé de fluxo mobile); `pill` para formato de pílula; `isLoading`/`disabled`.
- **`IconButton` / `IconLink`**: só ícone, 44×44, `label` (aria-label) obrigatório. **`Chip` / `ChipRow`**: pílulas de filtro/aba com `aria-pressed` e esmaecimento nas bordas quando a linha rola.
- **`Input`/`Select`**: 44px e 16px (a regra global de 16px em telas estreitas evita o zoom do iOS); `Input bare` e `FormContainer bare` para visuais próprios sem `!important` (guardrail proíbe modificadores `!` do Tailwind).
- `node scripts/count-raw-controls.mjs` mede os controles crus (`<button>`/`<input>`/…) por módulo; `scripts/__tests__/raw-controls.test.ts` impede aumentá-los. Ao migrar para os primitivos, rode com `--write` para baixar o baseline.

## Performance (baseline mobile)

- **Importe pelos módulos, não pelo barrel** (`pages/transactions/index.ts` etc.): o barrel arrastava formulário, edição e detalhe para a listagem e para as outras rotas do módulo (-16% a -19% de JS). As páginas em `app/(pages)` importam o componente direto.
- `next/dynamic` só vale quando a medição mostra ganho: o modal de importação de investimentos (-2 KiB) e o painel de projeção do Dashboard (dentro do ruído de ±50 KiB por prefetch) não compensaram e ficaram estáticos.
- Listas: paginadas (240 itens = ~1300 nós DOM, LCP ~1 s); virtualização não é necessária com esse volume.
- `BackgroundParticles` só existe na splash e no 404; já usa 24 partículas com `prefers-reduced-motion` (desenho estático) e 50 em telas estreitas.
- Nenhum arquivo de componente passa de 1200 linhas (`find app/components -name '*.tsx' | xargs wc -l | sort -rn | head`).
