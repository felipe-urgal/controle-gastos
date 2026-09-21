# Dashboard mobile — Protótipo 1

## Objetivo

Aplicar o protótipo 1 somente em telas mobile, mantendo o dashboard desktop sem alterações visuais.

A versão mobile deixa de empilhar os cards desktop e passa a funcionar como uma home financeira compacta, com saldo, resumo do mês e ações rápidas no primeiro bloco.

## Estrutura mobile

### Controles do período
- período e moeda lado a lado;
- controles compactos, sem criar um segundo cabeçalho visual.

### Saldo principal
O primeiro bloco do conteúdo deve começar por:
- `Saldo disponível`;
- valor em grande destaque;
- conta principal reduzida a uma linha compacta dentro do bloco;
- tipo/moeda da conta;
- saldo da conta na própria linha;
- três métricas compactas:
  - Receitas;
  - Despesas;
  - Saldo.

O mobile não deve repetir os cards desktop de `Conta principal`, `Meu dinheiro` e `Visão do mês`.

### Ações rápidas
Grid 2 × 2:
- Nova transação → abre o composer em Despesa;
- Transferir → abre diretamente o composer de Transferência;
- Pagar → abre o composer em Despesa;
- Adicionar → abre o composer em Receita.

### Próximos compromissos
- card compacto;
- estado vazio curto;
- até três compromissos;
- acesso ao calendário.

### Principais categorias de gastos
- até cinco categorias;
- ícone/cor real;
- valor;
- acesso para Categorias.

### Últimas transações
- até quatro movimentações;
- valor com semântica de entrada/saída;
- data contextual;
- acesso para a listagem completa.

## Desktop

O dashboard atual em desktop permanece intacto:
- mesma composição;
- mesmos grids;
- mesmos cards;
- mesma projeção;
- mesma hierarquia.

A separação acontece apenas por breakpoint de layout.

## Loading

O mobile possui skeleton próprio para evitar a pilha de skeletons desktop.

## Regras preservadas
- período;
- moeda;
- ocultação de valores;
- múltiplas contas;
- forecast;
- categorias reais;
- transações reais;
- bottom navigation existente;
- acessibilidade e targets touch.

## Validação
- `pnpm check`;
- mobile a 320px sem overflow horizontal;
- quick actions abrindo o estado correto do composer;
- desktop sem regressão visual.
