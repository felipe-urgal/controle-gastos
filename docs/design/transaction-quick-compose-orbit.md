# Transação — Quick Compose e Transaction Detail Orbit (#300)

Status: **implementação concluída e integrada pela PR #353; correção de fidelidade visual em #378; recorrência flexível integrada pela PR #401**.  
Última revisão: **2026-09-09**.

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

- `Transferência` continua fora deste composer enquanto a integração visual/full-stack específica da #284 não for implementada; os guardrails de backend e leitura/contraparte já estão prontos;
- descrição continua obrigatória enquanto o schema real exigir valor;
- `Modelos` e outras ações sem contrato real não são adicionados;
- o shell compartilhado continua sendo o Orbit vigente das demais rotas autenticadas.

### Opções avançadas

Status, recorrência flexível e parcelamento ficam em `details/summary`, reutilizando serviços, builders e validações de domínio existentes.

A recorrência oferece cinco presets públicos:

- semanal;
- quinzenal;
- mensal;
- trimestral;
- anual.

O preview usa o motor de `LogicalDate` compartilhado com o backend e a criação chama `/api/transactions/recurring/flexible`. O endpoint mensal legado permanece disponível para compatibilidade, mas não é o caminho do formulário atual para novas recorrências.

Além disso:

- recorrência continua finita e materializada no write;
- parcelas continuam despesas e preservam distribuição exata em centavos;
- a primeira ocorrência/parcela usa o status escolhido;
- ocorrências futuras continuam pendentes conforme o contrato atual;
- edição continua alterando somente a ocorrência atual, sem inventar edição de série.

Nenhuma regra financeira foi reimplementada no componente para “simplificar” o layout.

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

A direção aprovada continua prevendo `Transferência` como modo distinto. O domínio da #284 já entrega:

- criação atômica e idempotente;
- lifecycle update/cancel/delete do par;
- guards contra mutação isolada e orphan leg;
- leitura de coleção/detalhe filtrando tombstones;
- DTO com `source`, `destination` e `counterpartAccount`.

O modo ainda não aparece no Quick Compose porque a integração de produto final continua pendente: geração/reuso da `Idempotency-Key` por tentativa lógica no cliente, campos origem/destino, apresentação da contraparte e regressões mobile/desktop/a11y. A UI não deve improvisar esse fluxo dentro do modo Receita/Despesa.

## Contratos preservados

- categoria é fonte de verdade do tipo para transação normal;
- `COMPLETED`, `PENDING` e `CANCELLED` mantêm semântica atual;
- valores continuam inteiros em centavos;
- moedas não são convertidas nem agregadas;
- recorrência/parcelamento reutilizam serviços atuais;
- nenhuma transferência é criada por categoria artificial;
- nenhuma leitura do detalhe executa write.

Refs #300, #353, #378, #284, #289, #294, PR #399, PR #401 e Orbit spec.
