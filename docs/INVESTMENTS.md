# Domínio de investimentos

Issue: #694

## Decisões de domínio

O domínio de investimentos é separado de `Transaction`.

Uma `InvestmentOperation` registra a aquisição ou venda de uma quantidade de um ativo em uma conta do tipo `INVESTMENT`. Criar ou excluir uma operação **não cria, altera nem exclui transações financeiras automaticamente**.

Essa separação é intencional: o saldo atual das contas continua derivado exclusivamente de `Transaction`. Somar posições ao patrimônio atual sem modelar também o caixa da corretora e a origem dos aportes causaria dupla contagem.

Portanto, neste primeiro escopo:

- contas de investimento continuam no patrimônio existente pelo saldo derivado de transações;
- posições aparecem apenas na superfície de investimentos;
- o total exibido em investimentos é **custo investido**, não valor de mercado;
- posições não são adicionadas ao patrimônio consolidado neste PR;
- #695 poderá introduzir valuation por cotação, mas deverá definir explicitamente como caixa + posições substituem ou complementam o saldo da conta.

## Precisão de quantidade

Quantidade não usa `float`.

O banco armazena `quantity_units BIGINT` com escala fixa de 8 casas:

```text
1 unidade       = 100000000
0,125 unidade   = 12500000
0,00000001      = 1
```

A API recebe e devolve quantidade como string decimal. Isso evita perda de precisão em JavaScript/JSON e cobre ações fracionárias e cripto sem introduzir `Decimal` no contrato HTTP.

## Valores monetários

- preço unitário: centavos inteiros;
- taxas: centavos inteiros;
- custo da posição: centavos inteiros derivados;
- valor bruto fracionário é arredondado para o centavo mais próximo (half-up).

Taxas de compra entram no custo da posição. Taxas de venda não alteram o custo remanescente.

## Posição derivada

Não existe tabela de holding.

A posição é recalculada das operações em ordem lógica:

1. `BUY`: aumenta quantidade e custo pelo valor bruto + taxas;
2. `SELL`: reduz quantidade;
3. o custo removido numa venda é proporcional ao custo acumulado antes da venda;
4. venda maior que a posição disponível é rejeitada;
5. excluir uma compra é rejeitado quando deixaria uma venda histórica sem quantidade suficiente.

Isso mantém operações como única fonte de verdade da posição.

## Ownership e moeda

- ativo pertence a um usuário;
- operação pertence ao mesmo usuário do ativo e da conta;
- a conta deve ser `INVESTMENT`;
- moeda do ativo e da conta deve ser idêntica;
- contas com operações não podem mudar tipo/moeda;
- conta com operações não pode ser excluída.

## Fora deste escopo

- cotação de mercado;
- rentabilidade/realized P&L;
- dividendos;
- split/agrupamento;
- imposto;
- ordens reais;
- integração com corretora;
- geração automática de `Transaction`.
