# Categorias / Limites — Spending Map Orbit (#298)

Status: **integrado em `main`; fluxo/drill-down em correção pela #358 após finding da QA #342**.

> A auditoria estática da #342 detectou divergências entre o fluxo aprovado e a implementação integrada, principalmente na prioridade da administração inline, acesso a receitas e drill-down para transações. A validação visual final continua pendente até a correção #358 e a matriz manual da #342.

## Composição implementada

A área de limites mensais passa de uma lista administrativa para uma leitura operacional de orçamento:

1. **contexto** — mês e moeda;
2. **resumo** — orçamento com limite, realizado em despesas, restante dos limites e quantidade de categorias críticas;
3. **Spending Map** — categorias de despesa ordenadas pelo realizado, com tamanho relativo dentro da mesma moeda;
4. **contexto da categoria** — orçamento, realizado, restante e ação de editar/definir limite;
5. **críticas agora** — categorias a partir de 80% do limite;
6. **lista textual completa** — equivalente acessível do mapa e ponto de edição/remoção.

A lista geral de Categorias da rota continua abaixo dessa área e preserva categorias de receita, despesas, ativas e inativas.

A #358 deve reconciliar a composição para que mapa, atenção e contexto sejam o fluxo operacional principal, deixando a administração completa como camada secundária e mantendo acesso explícito às categorias de receita sem inseri-las falsamente nos agregados de despesas.

## Agregações

Todos os valores do resumo do orçamento são calculados apenas sobre itens retornados pelo endpoint de limites para **uma única moeda selecionada**.

- `Orçamento com limite`: soma dos limites existentes na moeda;
- `Realizado em despesas`: soma do realizado das categorias de despesa no mesmo recorte/moeda;
- `Restante dos limites`: soma do restante apenas das categorias que possuem limite;
- `Categorias críticas`: limite com utilização `>= 80%`.

Não existe conversão cambial nem soma entre BRL/USD/EUR.

## Spending Map

O mapa é uma visualização complementar:

- cada ponto corresponde a uma categoria real retornada pela API;
- o tamanho relativo usa somente `realized` dentro do recorte atual;
- selecionar um ponto abre o contexto da categoria;
- o mapa possui nomes, valores e `aria-label`;
- a lista textual completa permanece acessível e contém as mesmas categorias de despesa, inclusive sem limite e inativas.

A informação não depende da posição, tamanho ou cor do ponto.

## Filtros operacionais

O endpoint de limites mensais trabalha com categorias de despesa. Portanto categorias de receita não entram falsamente no Spending Map ou nos agregados de orçamento.

A experiência da rota, porém, deve manter acesso explícito às categorias de receita conforme a direção aprovada da #298. A #358 é responsável por reconciliar esse acesso sem contaminar a semântica financeira do mapa.

## Edição e remoção

O fluxo existente de definir, editar e remover limites deve ser preservado. O Spending Map direciona para o mesmo contrato de mutation; não deve existir uma segunda implementação de regra financeira.

- valores continuam convertidos para centavos somente na borda do formulário;
- remoção mantém confirmação explícita;
- estados de loading/erro continuam derivados do hook atual;
- `showValues=false` mascara orçamento, realizado e restante nas novas superfícies;
- o contexto da categoria deve oferecer acesso previsível às transações reais relacionadas sem alterar os agregados.

## Semântica Orbit

- roxo identifica seleção e progresso neutro abaixo do nível de atenção;
- amarelo identifica atenção;
- vermelho identifica limite excedido/destrutivo;
- estado não depende apenas de cor;
- touch targets do mapa e filtros permanecem utilizáveis em telas estreitas.

## Validação exigida

A issue #298 só deve ser considerada plenamente validada após `pnpm check` no head final, auto code review, resolução do finding #358 e revisão visual manual quando houver navegador disponível. O resultado final deve ser consolidado em `docs/quality/orbit-first-wave-qa.md`.
