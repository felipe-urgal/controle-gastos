# Categorias / Limites — Spending Map Orbit (#298)

Status: **correção de fidelidade implementada na PR #364; gate técnico verde no head final. QA visual pós-integração permanece na #342**.

## Fonte visual normativa

O protótipo `ux/298-categories-spending-map-prototype` em `prototypes/298-categories-spending-map/index.html` é a especificação visual normativa desta rota.

A composição aprovada é:

1. contexto de mês/moeda;
2. resumo de orçamento;
3. filtros `Todas / Críticas / Receitas / Sem limite`;
4. Spending Map;
5. categorias críticas;
6. contexto/drill-down da categoria;
7. administração completa em camada secundária.

## Correção #358 / PR #364

A correção:

- restaura o Spending Map como superfície principal de exploração;
- mantém categorias críticas em destaque;
- adiciona acesso explícito a Receitas sem misturá-las nos agregados de despesas/limites;
- oferece contexto da categoria com ações reais `Editar limite` e `Ver transações` quando aplicável;
- move a administração completa para uma camada secundária;
- evita que o mobile vire uma página longa de editores empilhados;
- corrige o carregamento contextual sem efeitos síncronos de estado e ajusta o cliente HTTP para omitir parâmetros `null`/`undefined` em vez de serializá-los na URL.

## Agregações preservadas

Todos os valores de orçamento permanecem isolados por uma única moeda selecionada.

- `Orçamento com limite`: soma dos limites existentes na moeda;
- `Realizado em despesas`: somente despesas realizadas elegíveis;
- `Restante dos limites`: somente categorias com limite;
- `Categorias críticas`: utilização `>= 80%`;
- Receitas não entram no Spending Map de despesas nem contaminam orçamento/realizado/restante.

Não existe conversão cambial nem soma entre BRL/USD/EUR.

## Contratos preservados

- somente `COMPLETED` entra no realizado;
- mutations de limite seguem o contrato existente;
- remoção continua exigindo confirmação;
- `showValues=false` mascara orçamento, realizado e restante;
- selecionar/explorar categoria é read-only;
- filtros de Receitas são de navegação/exploração, não uma mudança na semântica dos limites.

## Validação

O head final da PR #364 passou `pnpm check` no CI após os findings de TypeScript/efeitos serem corrigidos no mesmo branch.

Ainda é obrigatório na #342, após integração:

- comparação visual lado a lado com o protótipo;
- 320px, mobile comum, 768px e desktop;
- dark/light;
- `showValues=true/false` em navegador;
- teclado/foco, zoom/reflow e touch;
- registro da evidência em `docs/quality/orbit-first-wave-qa.md`.

CI verde não é evidência de paridade visual completa.