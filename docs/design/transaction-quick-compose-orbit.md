# Transação — Quick Compose e Transaction Detail Orbit (#300)

Status: **implementação concluída e integrada pela PR #353**.  
Última revisão: **2026-09-05**.

## Direções aprovadas

A implementação segue as decisões registradas na #300:

- **Quick Compose Orbit** para criar/editar;
- **Transaction Detail Orbit** para detalhe.

O objetivo é reduzir a carga visual sem alterar os contratos financeiros já maduros.

## Quick Compose

A hierarquia real passa a ser:

1. valor como campo principal;
2. conta e categoria;
3. descrição;
4. data e status;
5. opções avançadas progressivas;
6. resumo contextual no desktop;
7. ação sticky no mobile.

A UI identifica `Receita` ou `Despesa` a partir da categoria selecionada. Isso é apenas feedback visual: o backend continua derivando `type` da categoria persistida e não confia no cliente para essa decisão.

### Opções avançadas

Recorrência mensal e parcelamento foram movidos para `details/summary`, mas continuam usando os mesmos serviços, builders e validações existentes.

- recorrência continua finita e materializada no write;
- parcelas continuam despesas e preservam distribuição exata em centavos;
- a primeira ocorrência/parcela usa o status escolhido;
- ocorrências futuras continuam pendentes conforme o contrato atual;
- edição continua alterando somente a ocorrência atual, sem inventar edição de série.

Nenhuma regra foi reimplementada no componente para “simplificar” o layout.

## Resumo contextual

No desktop, uma coluna sticky mostra:

- receita/despesa;
- valor;
- conta/moeda;
- categoria;
- data;
- status;
- descrição;
- forma de criação;
- resumo de série/parcelamento quando aplicável.

O resumo não é uma nova etapa nem executa cálculo financeiro autoritativo. O backend continua validando o write.

## Mobile

O CTA fica sticky acima da bottom navigation/safe area. O formulário mantém labels reais e controles existentes, evitando transformar o fluxo em wizard ou exigir passos extras.

As opções avançadas permanecem recolhidas na criação básica para reduzir scroll e competição com teclado virtual.

## Transaction Detail Orbit

O detalhe foi reorganizado em:

- hero do lançamento com tipo, status, descrição, data e valor;
- contexto lateral sticky no desktop;
- empilhamento natural no mobile;
- informação de série/parcelamento quando existir;
- conta, moeda, categoria e criação em um bloco compacto.

Não foram adicionadas ações sem backend real, como comprovante, edição em massa da série ou transferência artificial.

O detalhe agora também respeita `showValues=false` e mascara o valor, alinhando privacidade ao restante da experiência Orbit.

## Transferência

A direção aprovada prevê `Transferência` como modo distinto **quando o lifecycle do domínio estiver pronto**. Este slice não expõe esse modo.

A #284 já possui criação atômica do par, mas ainda registra slices pendentes de idempotência/retry e lifecycle completo. A UI não deve prometer uma operação antes desses guardrails.

## Contratos preservados

- categoria é fonte de verdade do tipo para transação normal;
- `COMPLETED`, `PENDING` e `CANCELLED` mantêm semântica atual;
- valores continuam inteiros em centavos;
- moedas não são convertidas nem agregadas;
- recorrência/parcelamento reutilizam serviços atuais;
- nenhuma transferência é criada por categoria artificial;
- nenhuma leitura do detalhe executa write.

Refs #300, #284, #289, #294 e Orbit spec.
