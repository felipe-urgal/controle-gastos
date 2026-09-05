# Regras locais de importação

Status: **evaluator, contrato de entrada e persistência base implementados; CRUD/integração pendentes na #285**.  
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

`app/schemas/import-rule.schema.ts` é a fronteira canônica para criação/edição futura.

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

O schema valida formato, não ownership. O serviço futuro deve carregar conta/categoria com `userId` derivado da sessão e revalidar estado/tipo.

## Persistência

`TransactionImportRule` persiste o mesmo shape do evaluator/contrato, escopado por `userId` e ligado opcionalmente a uma conta e obrigatoriamente a uma categoria.

Decisões de lifecycle:

- excluir usuário remove suas regras;
- excluir categoria remove regras que apontavam para ela;
- excluir uma conta remove suas regras específicas por cascade;
- uma regra de conta específica **nunca** vira regra global por `SET NULL` silencioso;
- conta/categoria de outra pessoa ainda devem ser rejeitadas pelo serviço autenticado; FK simples não substitui autorização server-side.

O PostgreSQL adiciona defesa para `minAmountCents/maxAmountCents`: valores presentes precisam ser não negativos e `min <= max`. A prioridade continua inteira sem range arbitrário.

A migration é aditiva: não altera transações, fingerprints, tokens de confirmação ou previews já existentes.

## Centavos

Faixas e candidatos usam inteiros. Não existe cálculo financeiro em `float`, conversão monetária ou envio de dados a serviço externo.

## Segurança e integração futura

Quando conectado ao preview:

- `userId` vem somente da sessão;
- apenas regras do usuário autenticado são carregadas;
- conta/categoria são revalidadas por ownership e estado;
- categoria precisa ter o mesmo tipo da transação;
- item inválido não se torna válido por match;
- preview continua sem escrita financeira;
- confirmação revalida item/categoria e não confia no browser;
- descrição/valor do extrato não entram em logs.

## Dependências

Não foi adicionada `json-rules-engine`. O domínio cabe em funções puras + Zod já presente no projeto. Uma engine genérica só deve ser reconsiderada se requisitos reais como composição ALL/ANY aumentarem materialmente a complexidade.

## Próximos slices

1. CRUD autenticado com ownership, estado/tipo e ordenação;
2. integração no preview CSV/OFX;
3. provenance no DTO (`matchedRuleId`/nome/campos sugeridos);
4. override manual e criação explícita a partir da classificação;
5. UI de listar/editar/ativar/reordenar/remover;
6. regressões de fingerprint/token/confirm e multiusuário.

## Validação

Cobertura atual protege:

- operadores e normalização do evaluator;
- conta/tipo/faixa/prioridade;
- regra inativa/malformada;
- schema de payload completo;
- bounds em centavos;
- UUIDs e campos textuais;
- ausência de limite arbitrário de prioridade.

A migration deve passar no PostgreSQL efêmero do CI e `pnpm check` no mesmo head final. O CRUD futuro adicionará integração explícita de ownership/cascade em nível de aplicação.

Refs #285, #283, PR #318, PR #323 e `docs/product/transaction-import.md`.
