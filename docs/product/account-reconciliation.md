# Reconciliação de contas por extrato

Status: **concluída na #286: domínio, conferência, preview, fechamento, undo auditável, UI e regressão E2E integrados**.  
Última revisão: **2026-09-11**.

Reconciliação é metadata de conferência e não uma fonte financeira paralela. O saldo realizado continua derivado exclusivamente das transações `COMPLETED`, conforme ADR 0001 e ADR 0004.

## Estados

```text
UNCLEARED
CLEARED
RECONCILED
```

- `UNCLEARED`: ainda não conferida contra extrato;
- `CLEARED`: conferida no extrato em revisão;
- `RECONCILED`: pertence a um fechamento confirmado.

Somente transações `COMPLETED` podem avançar além de `UNCLEARED`.

`reconciledAt` só existe em `RECONCILED`. O PostgreSQL possui constraint para impedir combinações inválidas entre `status`, `reconciliationStatus` e timestamp.

## Endpoint de conferência

```text
PATCH /api/transactions/:id/reconciliation
```

Payload:

```json
{ "status": "CLEARED" }
```

ou:

```json
{ "status": "UNCLEARED" }
```

Regras:

- `userId` vem sempre da sessão;
- busca usa `id + userId`; outro tenant recebe 404;
- somente `COMPLETED` pode ser conferida;
- repetir o mesmo estado é idempotente;
- gravação usa condição sobre o estado observado e falha com conflito se houver mudança concorrente;
- o endpoint básico não aceita produzir nem desfazer `RECONCILED`;
- nenhum valor, tipo, categoria, conta, data ou status financeiro é alterado.

## Preview e fechamento por extrato

O mesmo recurso de conta possui leitura e confirmação explícitas:

```text
GET  /api/accounts/:id/reconciliation
POST /api/accounts/:id/reconciliation
```

O `GET` recebe data de corte lógica e `statementBalance` em centavos, não executa writes e deriva:

- conta/moeda;
- data de corte;
- saldo realizado até a data;
- saldo conferido (`CLEARED` + `RECONCILED`) até a data;
- diferença exata entre saldo do extrato e saldo conferido;
- itens `COMPLETED + UNCLEARED` do recorte;
- itens `COMPLETED + CLEARED` ainda reversíveis antes do fechamento;
- quantidade já reconciliada no recorte;
- metadados do fechamento ativo mais recente quando disponíveis.

O `POST` reutiliza o mesmo contrato de data/saldo e confirma o fechamento somente quando a diferença calculada dentro da transação é exatamente zero. A operação roda com isolamento `SERIALIZABLE`, promove apenas os itens ainda `CLEARED` elegíveis para `RECONCILED` e grava um único `reconciledAt` para o lote promovido.

Se o estado mudar durante o fechamento, a operação falha com `409` sem estado parcial. Repetir a confirmação depois que os itens já foram reconciliados é seguro: nenhum item é regravado e `reconciledCount` retorna zero.

## Auditoria e desfazer fechamento

A migration `20260911113000_add_reconciliation_audit` adiciona `AccountReconciliationEvent` sem criar nova fonte financeira. O evento registra somente metadata operacional do fechamento:

- ação `CONFIRMED` ou `UNDONE`;
- `batchReconciledAt`, que identifica o lote lógico;
- quantidade de transações;
- data de corte;
- saldo do extrato informado;
- usuário, conta e timestamp do evento.

O fechamento cria o evento `CONFIRMED` na **mesma** transação serializável que promove `CLEARED → RECONCILED`.

O undo é explícito:

```text
POST /api/accounts/:id/reconciliation/undo
```

Payload:

```json
{ "reconciledAt": "2026-09-11T12:34:56.789Z" }
```

Regras do undo:

- conta continua escopada por `id + userId`;
- somente o fechamento `RECONCILED` ativo mais recente pode ser desfeito;
- o timestamp precisa identificar exatamente o lote esperado;
- o lote volta atomicamente para `CLEARED` e `reconciledAt=null`;
- `amount`, `type`, `kind`, categoria, conta, data, descrição e `Transaction.status` não mudam;
- um evento `UNDONE` é gravado com a mesma identidade de lote;
- retry do mesmo undo é idempotente e não atinge um fechamento posterior;
- pedido antigo enquanto outro fechamento mais recente estiver ativo retorna `409`;
- lote legado sem evento `CONFIRMED` ainda pode ser desfeito; nesse caso a auditoria de undo existe, mas metadata histórica que nunca foi persistida permanece nula.

O parent de auditoria não persiste saldo reconciliado nem snapshot financeiro concorrente. Ele serve para explicar a mutation explícita e impedir que o undo dependa de heurística.

## UI na visão de Conta

O detalhe da Conta expõe `Reconciliação do extrato` como fluxo explícito, sem poluir a leitura padrão:

1. abrir o painel;
2. escolher data final do extrato;
3. informar saldo final na moeda da conta;
4. calcular a diferença;
5. marcar/desmarcar individualmente lançamentos concluídos como `Conferida`;
6. confirmar somente com diferença exatamente zero;
7. visualizar `Conferida`/`Reconciliada` também na lista recente da conta;
8. desfazer o último fechamento em confirmação de duas etapas quando necessário.

Não existe ação em lote implícita neste slice: a mutation existente é por transação e o produto prefere ações individuais previsíveis a uma sequência cliente parcial. Um bulk futuro só deve existir com contrato atômico próprio.

A UI não depende apenas de cor: estados usam texto e ícone. O painel restaura foco ao gatilho ao fechar, leva foco ao primeiro campo quando abre e publica resultados/erros em região viva.

### `showValues=false`

Com a preferência de valores ocultos:

- saldo da conta continua mascarado;
- saldos derivados do preview (`statement`, `cleared`, `realized`, `difference`) ficam mascarados;
- valores dos lançamentos no painel e na lista recente ficam mascarados;
- o campo `Saldo final do extrato` inicia vazio, em vez de revelar o saldo atual;
- o valor digitado explicitamente pelo usuário nesse campo permanece visível enquanto ele realiza a ação.

Assim, entrar no fluxo de reconciliação não vira um caminho alternativo para vazar valores derivados que a preferência mandou ocultar.

## DTO e listagem

DTO de transação expõe:

```text
reconciliationStatus
reconciledAt
```

A listagem comum aceita `reconciliationStatus` como filtro, sem alterar summary ou demais agregados.

## Proteção de item reconciliado

Uma transação já `RECONCILED` não pode ser editada ou removida pelo CRUD normal. Ela também não pode voltar a `CLEARED/UNCLEARED` pelo endpoint básico.

Quando uma alteração legítima for necessária, o fechamento precisa ser desfeito explicitamente pelo endpoint da conta; só então o item volta ao estado `CLEARED` e os fluxos normais podem seguir suas próprias regras.

Transferências seguem a mesma proteção por perna: lifecycle do par bloqueia mutation quando alguma perna está reconciliada até o undo explícito da conta correspondente.

## Saldo e agregados

Mudar `UNCLEARED ↔ CLEARED`, confirmar `CLEARED → RECONCILED` ou desfazer `RECONCILED → CLEARED` não participa de:

- saldo da conta;
- Dashboard;
- summary de transações;
- limites;
- forecast.

Não existe `reconciledBalance` persistido. Preview e fechamento derivam os totais das transações da conta até a data de corte; reconciliação não cria uma segunda fonte monetária.

## Transferências

SOURCE e DESTINATION são transações concretas em contas distintas e possuem estados independentes.

Conferir ou reconciliar SOURCE não altera DESTINATION e vice-versa. Essa independência é necessária porque cada conta é comparada com o próprio extrato.

## Importação

CSV/OFX não marca automaticamente itens como `CLEARED`. Novas transações continuam `UNCLEARED` por default até decisão de produto explícita sobre semântica de fonte bancária.

## Cobertura entregue

As regressões de domínio/PostgreSQL cobrem:

- `COMPLETED → CLEARED` e retorno para `UNCLEARED`;
- retry idempotente da conferência;
- saldo realizado numericamente idêntico antes/depois da conferência;
- rejeição de `PENDING`;
- isolamento multiusuário e conta errada;
- independência das pernas de transferência;
- bloqueio de mutation/edição/remoção comum em `RECONCILED`;
- preview por conta/data de corte sem writes;
- diferença zero e não-zero em centavos exatos;
- confirmação atômica `CLEARED → RECONCILED`;
- retry do fechamento sem regravação ou estado parcial;
- criação da auditoria `CONFIRMED` no fechamento;
- undo apenas do lote ativo mais recente;
- `RECONCILED → CLEARED` atômico no undo;
- evento `UNDONE`, retry idempotente e isolamento multiusuário do undo.

O spec permanente `tests/e2e/reconciliation-flow.spec.mjs` cobre a experiência final em navegador:

- Conta com saldo realizado conhecido e uma transação `PENDING` fora do realizado;
- diferença não-zero bloqueando a confirmação;
- marcação `UNCLEARED → CLEARED` pela UI;
- fechamento com diferença zero;
- badges textuais `Conferida` / `Reconciliada`;
- saldo da conta numericamente idêntico antes/depois do fechamento e undo;
- desfazer o último fechamento pela confirmação explícita;
- desktop e viewport 320x740 sem overflow horizontal;
- abertura/fechamento por teclado com foco previsível;
- `showValues=false` sem exposição dos valores derivados.

## QA final da #286

A rodada dedicada `34591107826`, executada em **2026-09-11** com PostgreSQL efêmero, migrations e build de produção, passou integralmente em:

- Chromium;
- Firefox;
- WebKit.

O mesmo run executou `pnpm check:frontend-budget` com sucesso em todos os jobs. As capturas finais de desktop/mobile foram revisadas em Chromium e o mobile com valores ocultos foi também conferido em WebKit.

WebKit/Linux fornece evidência da engine usada pelo Safari, mas não equivale a Safari/iOS físico nem tecnologia assistiva real. Lighthouse não foi acionado porque o contrato do repositório o mantém como diagnóstico manual sob demanda para mudança de bundle/asset/performance ou risco concreto; o frontend budget obrigatório desta issue passou.

O workflow dedicado da QA é temporário e não faz parte do estado final da `main`; a regressão permanece no spec E2E canônico.

Com domínio, auditoria, undo, UI, testes de integração e QA multi-engine concluídos, a #286 está pronta para encerramento.

Refs #286, #283, #284, ADR 0001, ADR 0003 e ADR 0004.
