# Contrato de paginação e ordenação

Issue: #546  
Roadmap: #290 — Fase 2, Performance, item 23  
Baseline: `0d403140e46882e5c0a3aa7e6420e7e1473dd235`

## Contrato compartilhado

O projeto mantém paginação por página, sem introduzir cursor enquanto o volume real não justificar outra estratégia.

- página inicial: `1`;
- page size default no client: `10`;
- opções de UI: `5, 10, 20, 50, 100`;
- máximo aceito pelo servidor para `pageSize` ou `limit`: `100`;
- listas opt-in não paginadas: teto absoluto de `1000`;
- acima do teto não paginado: `400 / PAGINATION_REQUIRED`;
- nunca truncar uma coleção completa silenciosamente.

Os números canônicos ficam em `app/lib/api/pagination-contract.ts` e são consumidos pelo hook genérico, componente de paginação e handler CRUD.

## Superfícies

| Superfície | Estratégia | Ordenação |
| --- | --- | --- |
| Contas | paginada na tela; coleção completa bounded em seletores | `createdAt desc, id desc` |
| Histórico de transações | paginada | `year/month/day desc, createdAt desc, id desc` |
| Inbox de transações | não paginada, filtrada por mês/ano | mesma ordenação estável; teto 1000 |
| Categorias | coleção completa bounded por decisão de produto Orbit | `createdAt desc, id desc` |
| Regras de importação | coleção completa para prioridade/edição | `priority asc, id asc`; teto 1000 |

## Por que manter as exceções

### Inbox de transações

A Inbox agrupa o mês corrente por estado e mostra lanes como atenção, pendentes, concluídas, agendadas e canceladas. Paginar antes do agrupamento mudaria a semântica visual. O backend continua protegido pelo filtro temporal e pelo teto de 1000.

### Contas e categorias em seletores/listas completas

A tela de Contas usa paginação, mas outros fluxos precisam da coleção completa para seletores. Categorias também permanecem completas conforme o Spending Map aprovado. Esses usos não são truncados: ambos optam pelo teto de 1000 e falham com `PAGINATION_REQUIRED` acima dele.

A decisão de produto de Categorias permanece válida; a lista recebe ordenação determinística, mas não é transformada em paginação por conveniência técnica.

### Regras de importação

A tela precisa da coleção completa para calcular a próxima prioridade, ordenar e editar regras localmente. O volume é configuracional, não transacional. Em vez de paginação que quebraria essa semântica, a lista passa a usar o teto explícito de 1000 do item 16.

## Filtros

Filtros exatos permanecem preferenciais onde já existem:

- ownership por `userId`;
- IDs relacionais;
- enums/status;
- `year` e `month`;
- flags booleanas.

Busca textual com `contains` continua disponível em superfícies que precisam dela, mas não gera recomendação automática de índice. Novo índice exige volume representativo e query plan, conforme o baseline #481 e item 22.

## Estabilidade

Toda lista paginada precisa terminar a ordenação em uma chave única. Isso impede itens com a mesma data/`createdAt` de trocarem de posição entre páginas.

O item 23 não altera semântica financeira, ownership, filtros nem a identidade Orbit.
