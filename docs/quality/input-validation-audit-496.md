# Auditoria de validação de input nas mutations — #496

Data: 2026-09-16  
Head auditado: `075231cce3d10b4c6b69dd10b5e4240c03b94283`  
Roadmap: #290  
Issue: #496

## Objetivo

Inventariar as bordas de escrita atuais e verificar, com base no código do head auditado, como cada input externo é autenticado, parseado, validado e revalidado antes de persistência ou outra ação sensível.

A auditoria é deliberadamente **audit-first**. Ela não altera contratos de runtime nem tenta corrigir todos os findings em uma única entrega. Gaps materiais foram separados em follow-ups pequenos e independentes.

## Metodologia

1. Enumerar todos os `route.ts` sob `app/api/**` no head auditado.
2. Selecionar mutations `POST`, `PUT`, `PATCH` e `DELETE`.
3. Seguir wrappers finos até o handler/use case real em `app/lib/**`.
4. Revisar inputs de body, path, query, header e multipart/form-data.
5. Verificar:
   - parsing seguro de input não confiável;
   - Zod ou validação equivalente;
   - limites de strings, coleções, arquivos e intervalos;
   - números/centavos inteiros e limites explícitos;
   - ownership de relações recebidas;
   - comportamento de erro esperado;
   - idempotência/replay quando aplicável.
6. Classificar cada mutation como `OK`, `GAP` ou `N/A` para validação de payload.

A inspeção foi estática via GitHub conectado. Não houve checkout executável disponível neste ambiente; portanto, nenhum gate local é declarado como executado nesta auditoria.

## Resumo

Foram inventariadas **40 mutations**.

Findings materiais abertos:

- #497 — centavos inteiros e datas lógicas no contrato compartilhado de transações;
- #498 — JSON malformado deve retornar `400` no `baseCrudHandler`;
- #499 — JSON malformado deve retornar `400` nas mutations especializadas;
- #500 — parsing/tipos/limites dos payloads legados de autenticação;
- #501 — limite real de body no endpoint público de observabilidade.

Pontos positivos recorrentes:

- CRUD compartilhado escopa leitura/mutação por `userId` antes de update/delete;
- relações financeiras relevantes são revalidadas server-side por ownership;
- transferências usam UUIDs, centavos inteiros, data inteira + data lógica real, mesma moeda e idempotência;
- limites mensais usam período inteiro, moeda enum e centavos inteiros;
- importação possui limite de arquivo de 2 MB, máximo de 1000 itens, parser monetário sem `float` financeiro intermediário e revalidação na confirmação;
- reconciliação usa centavos inteiros, data lógica real e transições explícitas;
- MFA trata body como `unknown` e o domínio restringe TOTP a 6 dígitos e recovery code ao formato previsto.

## Inventário

| # | Mutation | Inputs externos | Validação / ownership observado | Classificação |
|---:|---|---|---|---|
| 1 | `POST /api/accounts` | JSON body | `createAccountSchema`; `userId` injetado pelo servidor | GAP #498; nota baixa: `icon` sem limite explícito |
| 2 | `PUT /api/accounts/[id]` | path `id`, JSON body | `updateAccountSchema`; lookup por `id + userId` | GAP #498; path sem validação sintática, mas escopado |
| 3 | `DELETE /api/accounts/[id]` | path `id` | lookup/delete por `id + userId`; bloqueia conta com transações | OK |
| 4 | `POST /api/accounts/[id]/reconciliation` | path `id`, JSON body | Zod; período inteiro; saldo em centavos inteiros; data lógica; ownership no caso de uso | GAP #499 |
| 5 | `POST /api/accounts/[id]/reconciliation/undo` | path `id`, JSON body | Zod; `reconciledAt` ISO datetime com offset; ownership no caso de uso | GAP #499 |
| 6 | `POST /api/auth/forgot-password` | JSON body, IP | resposta genérica e rate limit; cast legado assume `email` string | GAP #500 |
| 7 | `POST /api/auth/login` | JSON body, IP | JSON malformado já é 400; rate limit; cast legado assume tipos de `email/password` | GAP #500 |
| 8 | `POST /api/auth/logout` | request/HTTPS para cookie | não consome body; limpa cookie | N/A |
| 9 | `POST /api/auth/mfa/enrollment/start` | JSON body | body como `unknown`; `currentPassword` só aceita string; auth; validação forte no domínio | OK |
| 10 | `POST /api/auth/mfa/enrollment/confirm` | JSON body | body como `unknown`; strings checadas; enrollment assinado; TOTP validado no domínio | OK |
| 11 | `DELETE /api/auth/mfa/settings` | JSON body, IP | tipos checados; exatamente um fator; rate limit; senha + TOTP/recovery no domínio | OK |
| 12 | `POST /api/auth/mfa/verify` | JSON body, IP | object guard; challenge assinado; rate limit; TOTP 6 dígitos/recovery code validado no domínio | OK |
| 13 | `POST /api/auth/reset-password` | JSON body, IP | JSON malformado é 400; token rate-limited/atômico; cast legado assume tipos | GAP #500 |
| 14 | `POST /api/auth/signup` | JSON body | validação manual de campos; cast implícito e JSON malformado podem cair em 500 | GAP #500 |
| 15 | `POST /api/categories` | JSON body | `createCategorySchema`; `userId` injetado | GAP #498; nota baixa: `icon` sem máximo explícito |
| 16 | `PUT /api/categories/[id]` | path `id`, JSON body | `updateCategorySchema`; lookup por `id + userId` | GAP #498 |
| 17 | `DELETE /api/categories/[id]` | path `id` | lookup/delete por `id + userId` | OK |
| 18 | `PUT /api/category-limits` | JSON body | Zod; UUID; período/moeda; centavos inteiros; categoria EXPENSE do usuário | GAP #499 |
| 19 | `DELETE /api/category-limits` | query | Zod sobre `categoryId/year/month/currency`; delete por `userId` | OK |
| 20 | `POST /api/import-rules` | JSON body | Zod; UUID/enums/strings limitadas/centavos inteiros; conta/categoria revalidadas | GAP #498 |
| 21 | `PUT /api/import-rules/[id]` | path `id`, JSON body | Zod; regra por `id + userId`; referências revalidadas em transação | GAP #499 |
| 22 | `DELETE /api/import-rules/[id]` | path `id` | CRUD compartilhado escopado por `userId` | OK |
| 23 | `POST /api/observability/client-error` | body, `Content-Length` | digest opcional 1..128 e não loga payload; limite de 1 KB depende do header | GAP #501 |
| 24 | `POST /api/transactions` | JSON body | UUIDs e ownership de conta/categoria; schema não exige inteiros/data lógica | GAP #497 + #498 |
| 25 | `PUT /api/transactions/[id]` | path `id`, JSON body | Zod parcial; transação/conta/categoria por `userId`; bloqueios de transfer/reconciled | GAP #497 + #498 |
| 26 | `DELETE /api/transactions/[id]` | path `id` | `id + userId`; bloqueia transfer/reconciled; delete condicional | OK |
| 27 | `POST /api/transactions/[id]/complete` | path `id` | sem body; `updateMany` exige `id + userId + NORMAL + PENDING` | OK |
| 28 | `PATCH /api/transactions/[id]/reconciliation` | path `id`, JSON body | Zod enum; `id + userId`; somente COMPLETED; update condicional | GAP #499 |
| 29 | `POST /api/transactions/import/confirm` | JSON body | Zod; 1..1000 itens; centavos inteiros; token assinado; conta/categoria revalidadas | GAP #499; validação de domínio forte |
| 30 | `POST /api/transactions/import/preview` | multipart: `accountId`, arquivo | File obrigatório; 2 MB; até 1000 itens; conta ativa do usuário; parser seguro de data/moeda | OK |
| 31 | `POST /api/transactions/installments` | JSON body | Zod; quantidade inteira/limitada; ownership; reutiliza `createTransactionSchema` | GAP #497 + #499 |
| 32 | `POST /api/transactions/recurring` | JSON body | Zod; ocorrências inteiras/limitadas; ownership; reutiliza `createTransactionSchema` | GAP #497 + #499 |
| 33 | `POST /api/transactions/recurring/flexible` | JSON body | Zod; frequência/intervalo/ocorrências limitados; ownership; reutiliza `createTransactionSchema` | GAP #497 + #499 |
| 34 | `POST /api/transfers` | header `Idempotency-Key`, JSON body | Zod; UUIDs; centavos/data inteiros; data lógica; chave <=128; ownership; mesma moeda | GAP #499; domínio OK |
| 35 | `PATCH /api/transfers/[id]` | path `id`, JSON body | Zod; pelo menos um campo; ownership e lifecycle no domínio | GAP #499 |
| 36 | `DELETE /api/transfers/[id]` | path `id` | ownership e remoção lógica/atômica no domínio | OK |
| 37 | `PATCH /api/user` | JSON body | `updateUserSchema`; `selfRoute`; senha atual para dado sensível | GAP #498; nota baixa: e-mail sem máximo explícito |
| 38 | `DELETE /api/user` | sessão | `selfRoute`; remove exclusivamente usuário autenticado | OK |
| 39 | `PUT /api/user/[id]` | path `id`, JSON body | mesmo `userCrud` com `selfRoute`; path `id` não seleciona outro usuário | GAP #498; rota legada ignora `id` |
| 40 | `DELETE /api/user/[id]` | path `id` | `selfRoute`; path `id` não seleciona outro usuário | OK; rota legada ignora `id` |

## Findings materiais

### 1. Contrato financeiro de transações — #497

`createTransactionSchema` usa `z.number()` para `amount`, `year`, `month` e `day`, enquanto Prisma persiste esses campos como `Int`. O schema também não valida a combinação completa da data.

Efeito do gap:

- centavos fracionários podem atravessar a borda Zod;
- componentes fracionários de data podem atravessar a borda;
- datas impossíveis como `31/02` podem ser aceitas pelo contrato;
- parcelamentos e recorrências herdam o mesmo schema.

Transferências e reconciliação já contêm o padrão que deve servir de referência, sem necessidade de nova abstração.

### 2. JSON malformado no CRUD compartilhado — #498

`baseCrudHandler.create/update` executa `request.json()`, mas o mapeamento de erro compartilhado não classifica `SyntaxError` como input inválido. Assim, JSON malformado pode virar `500`.

A correção pode permanecer localizada no handler compartilhado e em testes, sem alterar schemas ou domínios.

### 3. JSON malformado em handlers especializados — #499

O mesmo comportamento aparece em handlers que fazem `schema.parse(await request.json())` fora do CRUD compartilhado. Eles tratam `ZodError`, porém não a falha sintática do parser JSON.

O follow-up cobre apenas status/contrato de borda; não deve virar refactor arquitetural.

### 4. Payloads legados de auth — #500

Login, signup, forgot-password e reset-password assumem tipos após cast do JSON. Payload sintaticamente válido com `email`, `name`, `token` ou senha em tipo inesperado pode disparar método de string ou caminho de crypto/bcrypt e terminar em `500`.

Os fluxos MFA mais novos já demonstram a abordagem segura: manter body como `unknown`, confirmar object shape e checar tipos antes do domínio.

A correção deve preservar explicitamente:

- anti-enumeração de forgot-password/login;
- rate limiting existente;
- consumo atômico do reset token;
- regras atuais de senha, salvo mudança decidida separadamente.

### 5. Body limit de observabilidade — #501

O endpoint declara máximo de 1 KB, mas usa `Content-Length` apenas como early reject. Sem header confiável, o body completo ainda é parseado.

O endpoint já possui dois controles corretos que devem permanecer: digest restrito por regex/tamanho e ausência de logging do payload.

## Observações de baixa severidade

Não foram abertas issues independentes para estes pontos porque não há risco material demonstrado no recorte atual:

- vários path params `id` não passam por `z.uuid()` antes do banco; as queries continuam escopadas por `userId`, então isso não constitui IDOR por si só;
- `account.icon` e `category.icon` não possuem máximo explícito no Zod; o caso merece endurecimento oportunista se houver evidência/contrato de UI, mas não bloqueia esta auditoria;
- `account.name` não usa `.trim()` no schema atual;
- `updateUserSchema.email` não possui máximo explícito;
- confirmação de importação limita coleção a 1000 itens e usa preview assinado, porém alguns campos internos (`date`, `errors`, `previewToken`) não têm máximo individual explícito; a assinatura/revalidação reduz o risco material;
- `/api/user/[id]` reutiliza `userCrud` com `selfRoute=true`, portanto o `id` do path é ignorado e não permite selecionar outro usuário; é uma ambiguidade de contrato/limpeza, não um finding de ownership desta auditoria.

Essas observações podem ser reavaliadas em uma futura rodada de contratos HTTP/limites de abuso se surgirem evidências concretas.

## Ownership / IDOR

Nenhum bypass de ownership foi confirmado neste recorte.

Padrões verificados:

- CRUD compartilhado procura entidades por `id + userId` antes de update/delete;
- transações revalidam conta/categoria com `userId` autenticado;
- transferências carregam as duas contas por `userId` e não revelam qual ID era de outro usuário;
- limites mensais exigem categoria EXPENSE do usuário;
- regras de importação revalidam conta/categoria ativa e compatível;
- importação revalida conta e todas as categorias selecionadas na confirmação;
- reconciliação e ações de status usam `userId` nos filtros de leitura/mutação;
- user settings/delete usam `selfRoute` e derivam identidade da sessão.

A auditoria #304 continua sendo a referência dedicada para ownership CRUD; #496 não reabre essa decisão sem evidência nova.

## Parsing monetário

Foram revisados os caminhos principais de valores financeiros:

- transação normal: gap de `.int()` separado na #497;
- transferências: `amountCents` inteiro e limitado;
- limites mensais: `amount` inteiro e limitado;
- regras de importação: faixas em centavos inteiros;
- importação CSV/OFX: parser textual usa validação explícita e `BigInt` para montar centavos, rejeitando overflow além de `Number.MAX_SAFE_INTEGER` antes da conversão;
- confirmação da importação: `amountCents` inteiro, limitado e revalidado.

Não foi encontrado parsing financeiro via `parseFloat` ou cálculo monetário de borda baseado em `float` nos fluxos auditados.

## Gates e evidência

- inspeção estática remota do head auditado: concluída;
- inventário de 40 mutations: concluído;
- follow-ups materiais: #497, #498, #499, #500, #501;
- mudança de runtime/schema/migration: nenhuma;
- `pnpm check`: **não executado neste ambiente**, pois não há checkout com dependências/rede disponível;
- CI: o workflow canônico roda em `pull_request` para `main` ou push em `main`; um commit isolado nesta branch não dispara esse gate;
- Lighthouse/frontend budget: não aplicáveis ao diff documental desta auditoria.

Antes de mergear a documentação, o head final ainda deve receber o gate exigido pelo fluxo do repositório, sem declarar GREEN antecipadamente.

## Conclusão

O estado geral de validação é melhor nos domínios financeiros adicionados mais recentemente: transferências, reconciliação, importação, limites e MFA possuem contratos explícitos e revalidação de ownership.

Os gaps materiais estão concentrados em quatro padrões legados/transversais e um controle de abuso:

1. schema compartilhado de transações sem inteiro/data lógica;
2. mapeamento de JSON malformado no CRUD compartilhado;
3. mapeamento de JSON malformado em handlers especializados;
4. casts de payload nos fluxos legados de autenticação;
5. limite de body de observabilidade dependente de `Content-Length`.

A #496 pode permanecer documental: as correções já estão isoladas em #497–#501 para execução e revisão independentes.