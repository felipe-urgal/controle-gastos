# QA — Primeira onda Orbit

Status: **correções implementadas e gates técnicos verdes; QA visual pós-integração permanece em andamento na #342**.

Issue de coordenação: #342.

## Regra de aceite

Os protótipos explicitamente aprovados são especificações visuais normativas. A implementação deve reproduzir hierarquia, ordem, agrupamentos, proporções, densidade, superfícies, interações e comportamento responsivo usando contratos reais do produto.

CI verde não substitui execução em navegador/dispositivo. Da mesma forma, protótipo não autoriza inventar feature, dado ou semântica financeira.

Uma diferença só é aceitável quando houver incompatibilidade concreta com domínio, contrato funcional, segurança, privacidade ou acessibilidade e ela estiver documentada antes do merge.

## Baseline auditado

Auditoria estática inicial: 06/09/2026 sobre `main` em:

`e52e4b28f5ca5bc6e77ffd4c1f435e327192f790`

A rodada abriu cinco correções P1:

- #354 / PR #363 — Dashboard;
- #355 / PR #361 — Transações + shell/sidebar;
- #356 / PR #362 — Contas;
- #357 / PR #360 — Calendário;
- #358 / PR #364 — Categorias/Limites.

## Estado técnico pré-merge

Todos os heads abaixo passaram o workflow CI com `pnpm check` completo no head indicado:

| Rota | PR | Head validado | Gate técnico |
| --- | ---: | --- | --- |
| Calendário | #360 | `a1a7b89735b26400f8ec17ee04f14af0296d7c36` | ✅ |
| Transações | #361 | `e205e184abcb3d222dc0c69a92726944b9fa7738` | ✅ |
| Contas | #362 | `fc71f1069e5324371d6748573ccd7c76ac33f984` | ✅ |
| Dashboard | #363 | `3db832ef80c9b74d90f1ac33c9ccb3da48a9730e` | ✅ |
| Categorias | #364 | `82f388e1a865f94cdf3ec705fcb4b7719aff6ce6` | ✅ |

O PR documental #359 também deve passar CI novamente após esta atualização antes do merge.

## Findings corrigidos no review final

### Dashboard

- restaurada navegação interna e Mapa do mês como hero;
- mobile usa composição própria;
- Forecast deixou de ser tratado como fictício após confirmação de `/api/forecast`, serviço, hook e tipos reais;
- saldo projetado, atenção e próximos compromissos usam apenas o contrato real;
- erro de tipagem de `showPicker` e imports mortos foram removidos antes do head verde.

### Transações

- topo/resumo/Inbox/Histórico foram reorganizados conforme a referência;
- detalhe contextual desktop e bottom sheet mobile preservam o workspace;
- efeito síncrono de seleção do Histórico e código morto apontados pelo lint foram removidos;
- `Importadas recentemente` permanece fora porque `importSource` é persistido, mas não é exposto pelo `TransactionDTO` público.

### Contas

- master-detail, lista densa, resumo e detalhe mobile restaurados;
- `showValues=false` foi corrigido também no detalhe e movimentações recentes;
- efeito síncrono de seleção foi eliminado;
- protótipo separa Bancos/Carteiras, mas o domínio só possui `CREDIT_DEBIT` e `INVESTMENT`; a UI usa `Bancos e carteiras` em vez de heurística;
- Transferências têm backend parcial, porém a documentação da #284 proíbe habilitar UI antes dos guardrails restantes.

### Calendário

- mini-calendário passou a ser contexto e timeline voltou a ser superfície principal;
- finding de interação corrigido: clicar no dia só seleciona/atualiza timeline; clicar no evento abre detalhe;
- navegação continua read-only e `showValues` é preservado.

### Categorias/Limites

- Spending Map e atenção voltaram a ser superfície principal;
- Receitas ficaram acessíveis sem contaminar agregados de despesas/limites;
- administração completa foi movida para camada secundária;
- findings de TypeScript/efeitos foram corrigidos;
- cliente HTTP omite query params `null`/`undefined` em vez de serializá-los.

## Invariantes preservadas

- `COMPLETED` continua sendo o único realizado;
- `PENDING` e `CANCELLED` não entram silenciosamente no realizado;
- saldos permanecem derivados das transações elegíveis;
- BRL/USD/EUR não são somados nem convertidos implicitamente;
- `showValues=false` cobre as novas superfícies monetárias;
- navegação/seleção não executa write;
- diferenças do protótipo não são preenchidas com heurísticas ou dados fictícios.

## Matriz visual pós-integração — ainda pendente

Não há preview navegável dos branches corretivos disponível nesta rodada. Portanto nenhuma célula abaixo deve ser marcada como validada apenas por inspeção estática ou CI.

| Rota | 320px | 360/390px | 768px | desktop | dark/light | showValues | teclado/foco | lado a lado | status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dashboard | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | pós-integração |
| Transações | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | pós-integração |
| Contas | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | pós-integração |
| Calendário | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | pós-integração |
| Categorias | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | pós-integração |

Também validar após integração:

- comparação protótipo × implementação;
- zoom/reflow 200%;
- valores e nomes longos;
- loading/error/empty quando reproduzíveis;
- `prefers-reduced-motion`;
- touch targets críticos;
- nenhuma informação financeira dependente somente de cor/geometria;
- nenhuma regressão nas ações existentes.

## Critério de encerramento da #342

A #342 permanece aberta após o merge técnico. Ela só deve ser encerrada quando:

- a revision integrada final estiver identificada;
- a matriz visual/acessível tiver evidência real;
- houver comparação lado a lado por rota/breakpoint relevante;
- documentação refletir a implementação integrada;
- nenhum P0/P1 conhecido ficar sem correção ou issue explícita;
- health de produção permanecer saudável após promoção.