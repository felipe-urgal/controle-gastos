# Safe-to-Spend

## Contrato

O **Disponível para gastar** é uma métrica derivada e read-only. Nenhum saldo paralelo é persistido.

Para a moeda e horizonte selecionados no forecast:

```text
saldo realizado elegível
- despesas pendentes conhecidas
- faturas de cartão em aberto
+ efeito líquido de transferências
= disponível para gastar
```

O horizonte padrão é de 30 dias e reutiliza as opções existentes de 30, 60 e 90 dias.

## Semântica

- **Saldo realizado:** somente transações `COMPLETED`, via saldo derivado já existente.
- **PENDING:** despesas `NORMAL` vencidas ou dentro do horizonte reduzem o disponível.
- **CANCELLED:** não entra.
- **Receitas futuras:** não aumentam o disponível antes de serem realizadas.
- **Transferências:** entram pelo efeito assinado nas contas correntes elegíveis. Entre duas contas correntes da mesma moeda o efeito consolidado é zero; para investimento, o caixa diminui/aumenta conforme a direção.
- **Pagamentos de cartão:** o fluxo atual cria `CARD_PAYMENT` como `COMPLETED`, portanto ele já afeta o saldo realizado. Obrigações futuras são representadas pelas faturas abertas e não são descontadas novamente como `CARD_PAYMENT`.
- **Faturas:** compromissos não pagos, vencidos ou com vencimento dentro do horizonte, reduzem o consolidado uma única vez.
- **Recorrências/parcelamentos:** entram somente quando já existem como transações `PENDING` materializadas.
- **Metas e dívidas:** não reduzem o valor diretamente. Só afetam a métrica quando existe um lançamento financeiro concreto correspondente.
- **Contas de investimento:** o saldo realizado não é tratado como caixa disponível para gastar.
- **Contas inativas:** ficam fora do forecast e da métrica.
- **Multi-moeda:** cada cálculo usa uma única moeda; moedas diferentes nunca são agregadas silenciosamente.

## Composição por conta

A API também retorna a composição por conta corrente elegível. Faturas de cartão permanecem no consolidado porque, antes do pagamento, não existe necessariamente uma conta pagadora definida.
