# Categorias / Limites — Spending Map Orbit (#298)

Status: **integrado em `main`; fidelidade ao Spending Map aprovado em correção pela #358 após finding da QA #342**.

> A auditoria estática da #342 detectou divergências entre o fluxo aprovado e a implementação integrada, principalmente na prioridade da administração inline, acesso a receitas e drill-down para transações. A validação visual final continua pendente até a correção #358 e a matriz manual da #342.

## Fonte visual normativa

O protótipo `ux/298-categories-spending-map-prototype` em `prototypes/298-categories-spending-map/index.html` é a **especificação visual normativa** desta rota.

A implementação final deve reproduzir o que foi desenhado: header e controles, resumo, filtros `Todas / Críticas / Receitas / Sem limite`, Spending Map, dimensões e nodes, categorias críticas, detalhe/drill-down, camada administrativa secundária e comportamento mobile.

Não basta ficar “próximo”, “equivalente” ou preservar apenas a intenção. Componentes administrativos existentes podem ser substituídos/refatorados, novos componentes podem ser criados e bibliotecas podem ser atualizadas/adicionadas quando necessário para alcançar paridade com qualidade de produção.

Qualquer diferença inevitável deve ser documentada na #358 antes do merge, com motivo e impacto visual. Dados demonstrativos não autorizam Forecast, tendência ou regra financeira inexistente.

## Composição aprovada

A área de Categorias/Limites segue a composição do protótipo:

1. **contexto** — mês, moeda e ação principal;
2. **resumo** — orçamento, realizado, restante e categorias críticas;
3. **filtros operacionais** — `Todas / Críticas / Receitas / Sem limite`;
4. **Spending Map** — superfície central de exploração;
5. **categorias críticas** — painel de atenção;
6. **contexto da categoria** — limite, realizado, restante, edição e acesso às transações quando aplicável;
7. **administração completa** — camada secundária, sem dominar a experiência principal.

A ordem, proporções, densidade e relação visual entre essas áreas devem seguir o desenho aprovado.

## Agregações

Todos os valores do resumo do orçamento são calculados apenas sobre itens retornados pelo endpoint de limites para **uma única moeda selecionada**.

- `Orçamento com limite`: soma dos limites existentes na moeda;
- `Realizado em despesas`: soma do realizado das categorias de despesa no mesmo recorte/moeda;
- `Restante dos limites`: soma do restante apenas das categorias que possuem limite;
- `Categorias críticas`: limite com utilização `>= 80%`.

Não existe conversão cambial nem soma entre BRL/USD/EUR.

## Spending Map

O mapa deve reproduzir a experiência aprovada com dados reais:

- cada ponto corresponde a uma categoria real retornada pela API;
- tamanho/posição visual seguem a composição aprovada dentro das limitações dos dados reais;
- selecionar um ponto abre o contexto da categoria;
- nodes possuem nomes acessíveis e estados não dependem somente de cor/geometria;
- existe equivalente textual acessível do mapa.

A lista textual não deve transformar a experiência principal novamente em uma página administrativa longa. Administração completa permanece em camada secundária conforme o protótipo.

## Filtros operacionais

O endpoint de limites mensais trabalha com categorias de despesa. Portanto categorias de receita não entram falsamente no Spending Map ou nos agregados de orçamento.

A experiência deve, porém, reproduzir o acesso explícito a **Receitas** mostrado no protótipo, sem contaminar a semântica financeira do mapa.

## Edição, remoção e drill-down

O fluxo de definir, editar e remover limites preserva o contrato de mutation existente. Não deve existir segunda regra financeira.

- valores continuam convertidos para centavos somente na borda do formulário;
- remoção mantém confirmação explícita;
- loading/erro continuam derivados do contrato real;
- `showValues=false` mascara orçamento, realizado e restante;
- o contexto da categoria oferece `Editar limite` quando aplicável;
- o contexto oferece acesso previsível a `Ver transações` filtradas pela categoria quando o contrato real permitir.

## Semântica Orbit e mobile

- roxo identifica seleção e progresso neutro;
- amarelo identifica atenção;
- vermelho identifica limite excedido/destrutivo;
- estado não depende apenas de cor;
- touch targets do mapa e filtros permanecem utilizáveis;
- mobile deve reproduzir a composição própria aprovada, incluindo prioridade de críticas e detalhe em sheet/tela dedicada, não apenas empilhar editores do desktop.

## Validação exigida

A issue #298 só deve ser considerada plenamente validada após:

- comparação visual lado a lado com o protótipo aprovado;
- confirmação de paridade de resumo, filtros, mapa, críticas, detalhe, administração secundária e mobile;
- documentação de qualquer diferença inevitável;
- `pnpm check` no head final;
- auto code review completo;
- resolução do finding #358;
- revisão visual manual em 320px/mobile/desktop;
- consolidação da evidência em `docs/quality/orbit-first-wave-qa.md`.
