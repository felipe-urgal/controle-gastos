# Regras locais de importação

Status: **evaluator, contrato, persistência e CRUD autenticado implementados; integração com preview pendente na #285**.  
Última revisão: **2026-09-05**.

Este contrato complementa `transaction-import.md`. O fluxo financeiro continua arquivo → preview stateless → confirmação explícita. Regras são metadados de automação e não alteram essa fronteira.

## Matching determinístico

O evaluator server-side já define condições simples:

- conta específica ou qualquer conta;
- `INCOME` ou `EXPENSE`;
- descrição por `EQUALS`, `STARTS_WITH` ou `CONTAINS`;
- `minAmountCents`/`maxAmountCents` opcionais e inclusivos;
- prioridade inteira;
- estado ativo/inativo.

A ação produz `categoryId` sugerido e descrição normalizada opcional.

Menor `priority` vence; empate usa `id` em ordem lexical. Somente a primeira regra ativa e válida produz sugestão. O evaluator não encadeia ações nem muta regra/candidato.

## Normalização textual

Matching usa somente para comparação:

1. Unicode `NFKC`;
2. `trim`;
3. whitespace repetido vira um espaço;
4. comparação em minúsculas.

O texto original não é alterado. `normalizedDescription` só substitui descrição quando configurada explicitamente. Não existe regex no MVP.

## Contrato de entrada

`app/schemas/import-rule.schema.ts` é a fronteira canônica para criação/edição.

O payload é completo e explícito:

```text
name
isActive
priority
accountId | null
transactionType
EQUALS | STARTS_WITH | CONTAINS
descriptionPattern
minAmountCents | null
maxAmountCents | null
categoryId
normalizedDescription | null
```

Validações:

- `accountId` e `categoryId` precisam ter formato UUID;
- nome/padrão/descrição normalizada não aceitam texto vazio;
- valores são inteiros não negativos em centavos;
- quando ambos existem, `maxAmountCents >= minAmountCents`;
- prioridade precisa ser inteira, sem faixa artificial de produto.

O schema valida formato, não ownership.

## Persistência

`TransactionImportRule` persiste o mesmo shape do evaluator/contrato, escopado por `userId` e ligado opcionalmente a uma conta e obrigatoriamente a uma categoria.

Decisões de lifecycle:

- excluir usuário remove suas regras;
- excluir categoria remove regras que apontavam para ela;
- excluir uma conta remove suas regras específicas por cascade;
- uma regra de conta específica **nunca** vira regra global por `SET NULL` silencioso.

O PostgreSQL adiciona defesa para `minAmountCents/maxAmountCents`: valores presentes precisam ser não negativos e `min <= max`. A prioridade continua inteira sem range arbitrário.

## CRUD autenticado

Endpoints:

```text
GET    /api/import-rules
POST   /api/import-rules
GET    /api/import-rules/:id
PUT    /api/import-rules/:id
DELETE /api/import-rules/:id
```

Regras server-side:

- `userId` vem sempre da sessão e nunca do payload;
- get/update/delete buscam a regra por `id + userId`, retornando 404 para outro tenant;
- conta específica precisa pertencer ao usuário e estar ativa;
- categoria precisa pertencer ao usuário, estar ativa e ter o mesmo tipo da regra;
- create valida referências e grava na mesma transação;
- update revalida referências e grava na mesma transação;
- listagem é determinística por `priority ASC, id ASC`;
- DTO não expõe `userId`;
- filtros disponíveis: `isActive`, `accountId`, `transactionType`; busca cobre nome/padrão/descrição normalizada.

O CRUD ainda **não aplica regra ao preview**. A fronteira financeira permanece intacta.

## Centavos

Faixas e candidatos usam inteiros. Não existe cálculo financeiro em `float`, conversão monetária ou envio de dados a serviço externo.

## Segurança e integração futura

Quando conectado ao preview:

- apenas regras do usuário autenticado serão carregadas;
- item inválido não se torna válido por match;
- preview continua sem escrita financeira;
- confirmação revalida item/categoria e não confia no browser;
- descrição/valor do extrato não entram em logs.

## Dependências

Não foi adicionada `json-rules-engine`. O domínio cabe em funções puras + Zod já presente no projeto. Uma engine genérica só deve ser reconsiderada se requisitos reais como composição ALL/ANY aumentarem materialmente a complexidade.

## Próximos slices

1. integração no preview CSV/OFX;
2. provenance no DTO (`matchedRuleId`/nome/campos sugeridos);
3. override manual e criação explícita a partir da classificação;
4. UI de listar/editar/ativar/reordenar/remover;
5. regressões de fingerprint/token/confirm e multiusuário.

## Validação

Cobertura protege:

- operadores e normalização do evaluator;
- conta/tipo/faixa/prioridade;
- regra inativa/malformada;
- schema de payload completo;
- bounds em centavos;
- UUIDs e campos textuais;
- ownership de conta/categoria no CRUD;
- incompatibilidade categoria/tipo;
- isolamento get/delete entre usuários;
- DTO sem `userId`.

Cada slice passa PostgreSQL efêmero, `pnpm check` e auto-review do mesmo head final.

Refs #285, #283, PR #318, PR #323, PR #330 e `docs/product/transaction-import.md`.
