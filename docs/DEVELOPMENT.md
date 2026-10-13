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
