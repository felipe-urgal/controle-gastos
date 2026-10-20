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
    pnpm test:e2e

Não execute E2E indiscriminadamente; use-o para fluxos relevantes ou antes de mudanças com maior risco de regressão.

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

- `pnpm test:e2e layout-smoke --project=chromium`: percorre as rotas autenticadas em 360 e 390 px e falha em rolagem horizontal, mais de um `h1` visível ou aumento de alvos de toque menores que 44×44 px. As listas `KNOWN_*` do spec só podem diminuir; `LAYOUT_SMOKE_REPORT=1` imprime o detalhe dos alvos pequenos.
- `scripts/__tests__/design-ratchet.test.ts`: limites por arquivo para overlays `fixed inset-0` fora do `ModalShell` e cores hex literais. Ao migrar um arquivo, reduza ou remova a entrada.
- `VISUAL_REVIEW=1 SHOTS_DIR=/tmp/shots pnpm test:e2e visual-review --project=chromium`: gera capturas das telas principais a 360px (claro/escuro, com dados semeados) para revisão visual; não roda por padrão.

## Design: breakpoints, camadas e tokens

- **Breakpoints:** `sm` 640, `md` 768, `lg` 1024 (shell desktop: sidebar), `xl` 1280, `2xl` 1536. Mais um único ponto "compacto" de telefone: `min-[360px]:` / `max-[359px]:`. Nenhum outro `min-[Npx]`/`max-[Npx]` (teste em `scripts/__tests__/design-guardrails.test.ts`). `tailwind.config.js` não existe: o Tailwind v4 usa os padrões acima.
- **Camadas (z-index):** use sempre os tokens de `globals.css`: `--z-popover` 20 < `--z-nav` 30 (bottom-nav) < `--z-header` 40 (topbar/sidebar/filtros) < `--z-sheet` 50 < `--z-detail` 60 < `--z-modal` 70 (`ModalShell`) < `--z-search` 80 < `--z-toast` 90. Ex.: `z-[var(--z-sheet)]`. `z-10`/`z-20`/`z-[1]` só para empilhamento local dentro de um componente.
- **Cores de marca em duas camadas com papéis fixos:** `--primary*` é a identidade e a semântica financeira do produto (o shell **não** a redefine — teste em `orbit.test.ts`); `--orbit-*` é o acento da interface autenticada (navegação, botões de ação, foco). Receita/despesa usam `--income`/`--expense`; avisos usam `--warning`/`--warning-subtle`. Cores literais (hex/paleta Tailwind) só para dado escolhido pelo usuário (cor de conta/categoria).
- **Overlays:** `ModalShell` (variantes `sheet` e `fullscreen-sheet`) e o atributo `data-overlay-hide-nav` (o shell oculta a bottom-nav sem conhecer telas específicas).
