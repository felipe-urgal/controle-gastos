# Regras locais de importação

Status: **evaluator, contrato, persistência, CRUD autenticado, integração server-side com preview e consumo visual de sugestões implementados; UI de gestão das regras permanece pendente na #285**.  
Última revisão: **2026-09-05**.

Este contrato complementa `transaction-import.md`. O fluxo financeiro continua arquivo → preview stateless → confirmação explícita. Regras são metadados de automação e não alteram essa fronteira.

## Matching determinístico

O evaluator server-side define condições simples:

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

O texto original não é alterado. `normalizedDescription` é uma **sugestão** para o preview quando configurada; a origem permanece intacta no token assinado. Não existe regex no MVP.

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

## Persistência e CRUD autenticado

`TransactionImportRule` persiste o mesmo shape do evaluator/contrato, escopado por `userId` e ligado opcionalmente a uma conta e obrigatoriamente a uma categoria.

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
- get/update/delete buscam a regra por `id + userId`;
- conta específica precisa pertencer ao usuário e estar ativa;
- categoria precisa pertencer ao usuário, estar ativa e ter o mesmo tipo da regra;
- create/update revalidam referências na transação;
- listagem é determinística por `priority ASC, id ASC`;
- DTO não expõe `userId`.

Lifecycle: excluir usuário/categoria remove regras relacionadas; excluir conta remove regras específicas por cascade, nunca as transforma silenciosamente em globais.

## Integração com preview

`POST /api/transactions/import/preview` continua executando primeiro o parser/fingerprint/token existente e só depois enriquece a resposta com regras persistidas.

Para cada linha válida e não duplicada, a resposta pode incluir:

```text
matchedRuleId
matchedRuleName
suggestedCategoryId
suggestedDescription
```

O carregamento considera somente:

- `userId` autenticado;
- regras ativas;
- regras globais ou da conta selecionada;
- categoria ainda ativa.

Itens inválidos ou duplicados não recebem automação.

### Token e override manual

Os campos de provenance/sugestão **não entram no token assinado**. O token continua cobrindo os dados originais do preview: data, valor, tipo, descrição, fingerprint e demais campos importados.

Isso é proposital:

1. criar/editar uma regra depois do preview não reescreve silenciosamente o arquivo que foi revisado;
2. a confirmação continua recebendo a categoria escolhida pelo usuário;
3. override manual tem precedência sobre a sugestão;
4. o backend revalida categoria, tipo, ownership, fingerprint e token antes de criar `Transaction`.

A integração expõe as sugestões no contrato do preview sem transformar automação em mutação financeira automática.

## Consumo visual na Import Inbox

A implementação Orbit da #299/PR #352 consome o provenance real do preview sem mudar o contrato assinado:

- categoria sugerida é pré-selecionada somente quando continua ativa e compatível com o tipo;
- nome da regra aplicada fica visível no detalhe da linha;
- descrição sugerida é exibida apenas como informação, sem substituir a descrição assinada;
- o usuário pode sobrescrever manualmente a categoria antes da confirmação;
- campos de sugestão/provenance são removidos do payload de confirmação;
- duplicatas e itens inválidos continuam sem automação;
- `showValues=false` mascara valores também na revisão.

A UI usa estados `Precisa revisar`, `Pronta`, `Duplicada` e `Ignorada`. A confirmação permanece bloqueada enquanto existir pendência de decisão; o backend continua sendo a autoridade final sobre token, ownership, categoria, tipo e deduplicação.

## Centavos e privacidade

Faixas e candidatos usam inteiros. Não existe cálculo financeiro em `float`, conversão monetária ou envio de dados a serviço externo.

Descrição/valor do extrato não entram em logs de regras. Falhas operacionais registram apenas metadata técnica não sensível já usada pelo fluxo de importação.

## Dependências

Não foi adicionada `json-rules-engine`. O domínio cabe em funções puras + Zod já presente no projeto. Uma engine genérica só deve ser reconsiderada se requisitos reais como composição ALL/ANY aumentarem materialmente a complexidade.

## Próximos slices

1. UI de listar/editar/ativar/reordenar/remover regras;
2. criação explícita de regra a partir de uma classificação manual;
3. regressões E2E do fluxo completo preview → override → confirmação.

## Validação

Cobertura protege evaluator, normalização, conta/tipo/faixa/prioridade, schema, bounds em centavos, ownership do CRUD e também:

- provenance determinística no preview;
- ausência de sugestão para duplicata/item inválido;
- preservação dos dados originais usados pelo token e pela confirmação manual;
- consumo visual sem inserir provenance no payload final.

Cada slice passa PostgreSQL efêmero, `pnpm check` e auto-review do mesmo head final.

Refs #285, #299, #283, PR #318, PR #323, PR #330, PR #348, PR #352, `app/lib/transactions/import-rules.ts`, `app/lib/transactions/import/rule-preview.ts`, `docs/design/import-inbox-orbit.md` e `docs/product/transaction-import.md`.
