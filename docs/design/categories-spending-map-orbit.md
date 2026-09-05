# Categorias / Limites — Spending Map Orbit (#298)

Status: **implementação em revisão** na branch `ux/298-categories-spending-map-implementation`.

## Composição implementada

A área de limites mensais passa de uma lista administrativa para uma leitura operacional de orçamento:

1. **contexto** — mês e moeda;
2. **resumo** — orçamento com limite, realizado em despesas, restante dos limites e quantidade de categorias críticas;
3. **Spending Map** — categorias de despesa ordenadas pelo realizado, com tamanho relativo dentro da mesma moeda;
4. **contexto da categoria** — orçamento, realizado, restante e ação de editar/definir limite;
5. **críticas agora** — categorias a partir de 80% do limite;
6. **lista textual completa** — equivalente acessível do mapa e ponto de edição/remoção.

A lista geral de Categorias da rota continua abaixo dessa área e preserva categorias de receita, despesas, ativas e inativas.

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
- a lista textual completa permanece logo abaixo e contém as mesmas categorias, inclusive sem limite e inativas.

A informação não depende da posição, tamanho ou cor do ponto.

## Filtros operacionais

A seção de orçamento oferece:

- Todas;
- Críticas;
- Sem limite.

O endpoint de limites mensais trabalha com categorias de despesa. Por isso “Receitas” não é falsamente inserido no Spending Map; categorias de receita continuam acessíveis pela listagem geral da rota, que mantém o contrato existente de categorias.

## Edição e remoção

O fluxo existente de definir, editar e remover limites foi preservado. O Spending Map apenas direciona para o mesmo editor; não existe uma segunda implementação de mutation.

- valores continuam convertidos para centavos somente na borda do formulário;
- remoção mantém confirmação explícita;
- estados de loading/erro continuam derivados do hook atual;
- `showValues=false` mascara orçamento, realizado e restante nas novas superfícies.

## Semântica Orbit

- roxo identifica seleção e progresso neutro abaixo do nível de atenção;
- amarelo identifica atenção;
- vermelho identifica limite excedido/destrutivo;
- estado não depende apenas de cor;
- touch targets do mapa e filtros permanecem utilizáveis em telas estreitas.

## Validação exigida

A issue #298 só deve ser concluída após `pnpm check` no head final, auto code review e revisão visual manual quando houver navegador disponível. O resultado real dos gates deve ser registrado na issue.
