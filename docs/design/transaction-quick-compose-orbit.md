# Transação — Quick Compose e Transaction Detail Orbit (#300)

Status: **implementação concluída e integrada pela PR #353; correção de fidelidade visual em #378**.  
Última revisão: **2026-09-08**.

## Direções aprovadas

A implementação segue as decisões registradas na #300:

- **Quick Compose Orbit** para criar/editar;
- **Transaction Detail Orbit** para detalhe.

O objetivo é reduzir a carga visual sem alterar os contratos financeiros já maduros.

## Quick Compose

A hierarquia real passa a ser:

1. tipo visual no topo como orientação/filtro de categoria;
2. valor como campo principal;
3. conta, categoria, data e descrição em composição compacta;
4. status e opções avançadas em progressive disclosure;
5. resumo contextual no desktop;
6. ação sticky no mobile;
7. revisão antes da confirmação na criação em página dedicada.

O controle visual `Despesa`/`Receita` não é fonte de verdade financeira. Ele apenas orienta/filtra as categorias disponíveis. O backend continua derivando `type` da categoria persistida e não confia no cliente para essa decisão.

### Fidelidade do protótipo

A #378 corrige o desvio visual remanescente da implementação inicial e trata `prototypes/300-transaction-quick-compose/index.html` como especificação normativa, conforme `docs/design/orbit-spec.md`.

A composição deve preservar:

- segmented control de tipo no topo;
- valor em destaque visual;
- grid compacto de conta/categoria/data/descrição;
- detalhes avançados recolhidos por padrão;
- resumo lateral com tipo, valor, conta, categoria, data e status;
- ação primária roxa Orbit;
- `Cancelar` + `Revisar e criar` no desktop;
- barra fixa de ações no mobile acima da bottom navigation/safe area;
- revisão curta antes da persistência.

Diferenças obrigatórias em relação ao HTML demonstrativo do protótipo:

- `Transferência` continua fora deste composer até o domínio completar os guardrails da #284;
- descrição continua obrigatória enquanto o schema real exigir valor;
- `Modelos` e outras ações sem contrato real não são adicionados;
- o shell compartilhado continua sendo o Orbit vigente das demais rotas autenticadas.

### Opções avançadas

Status, recorrência mensal e parcelamento ficam em `details/summary`, mas continuam usando os mesmos serviços, builders e validações existentes.

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
- forma de criação quando não for uma transação única.

O resumo não executa cálculo financeiro autoritativo. O backend continua validando o write.

## Mobile

O CTA fica sticky acima da bottom navigation/safe area e reproduz a barra de ações aprovada no protótipo. O formulário mantém labels reais e controles existentes, evitando transformar o fluxo em wizard técnico.

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

Refs #300, #353, #378, #284, #289, #294 e Orbit spec.
