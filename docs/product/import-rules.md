# Regras locais de importação

Status: **foundation do evaluator em implementação na #285**.  
Última revisão: **2026-09-05**.

Este contrato complementa `transaction-import.md`. O fluxo financeiro continua sendo arquivo → preview stateless → confirmação explícita. Regras são metadados de automação e não alteram essa fronteira.

## Objetivo do evaluator

O primeiro slice define somente matching determinístico e server-side, sem persistência nem mudança de preview ainda.

Uma regra possui condições simples:

- conta específica ou qualquer conta;
- `INCOME` ou `EXPENSE`;
- descrição por `EQUALS`, `STARTS_WITH` ou `CONTAINS`;
- `minAmountCents`/`maxAmountCents` opcionais e inclusivos;
- prioridade inteira;
- estado ativo/inativo.

A ação produz:

- `categoryId` sugerido;
- descrição normalizada opcional.

A categoria não é considerada válida apenas porque a regra a referencia. No slice de integração, o servidor deve revalidar ownership, `isActive` e compatibilidade de tipo antes de expor/aplicar a sugestão.

## Normalização textual

O matching usa uma representação canônica somente para comparação:

1. Unicode `NFKC`;
2. `trim`;
3. sequências de whitespace viram um único espaço;
4. comparação em minúsculas.

O texto original do extrato não é alterado por essa normalização. Uma substituição de descrição só acontece quando a regra possui ação explícita `normalizedDescription`, e ainda poderá ser sobrescrita manualmente no preview quando a integração de UX existir.

Não existe regex no MVP.

## Ordem determinística

Menor `priority` vence. Empates usam `id` em ordem lexical como desempate estável.

Somente a primeira regra ativa e válida que satisfaz todas as condições produz sugestão. O evaluator não encadeia ações e não modifica a lista de regras recebida.

Regras estruturalmente inválidas — por exemplo faixa negativa, `min > max` ou padrão vazio — não produzem match. A API/CRUD futuro deve rejeitá-las na validação de entrada; o evaluator continua fail-closed como defesa adicional.

## Centavos

Faixas e candidatos usam inteiros não negativos em centavos. Não existe conversão por `float` e nenhum valor é enviado a serviço externo.

## Fronteiras de segurança

Quando o evaluator for conectado ao preview:

- `userId` será derivado exclusivamente da sessão;
- somente regras do usuário autenticado serão carregadas;
- conta/categoria da regra serão revalidadas no servidor;
- item inválido ou duplicado não se torna válido por match;
- preview continua sem escrita financeira;
- confirmação revalida categoria e item, sem confiar no resultado enviado pelo browser;
- descrição/valor do extrato não entram em logs.

## Dependências

O foundation não adiciona `json-rules-engine` nem outra biblioteca. O domínio atual cabe em funções puras pequenas e testáveis; uma engine genérica aumentaria superfície de dependência sem reduzir complexidade comprovada.

Essa decisão pode ser revista somente se requisitos futuros como composição `ALL/ANY` tornarem a implementação local materialmente mais complexa.

## Próximos slices da #285

1. schema Prisma + migration aditiva da entidade de regra;
2. schemas Zod e CRUD autenticado com ownership;
3. carregamento/validação de regras no preview CSV/OFX;
4. provenance da sugestão no DTO (`matchedRuleId`/nome e campos sugeridos);
5. override manual e criação explícita de regra a partir da classificação;
6. UI de listar/editar/ativar/reordenar/remover;
7. regressões completas de fingerprint/token/confirm e multiusuário.

Nenhum desses itens é apresentado como entregue pelo foundation do evaluator.

## Validação do slice

Cobertura dedicada protege:

- os três operadores de descrição;
- normalização de texto;
- conta/tipo/faixa inclusiva;
- regra inativa/malformada;
- prioridade e desempate estável;
- sugestão de descrição sem mutar o item original;
- ausência de match.

O head final do PR deve passar `pnpm check` e auto code review conforme `AGENTS.md`.

Refs #285, #283 e `docs/product/transaction-import.md`.
