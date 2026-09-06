# Transações — Inbox Financeira Orbit (#294)

Status: **integrado em `main`; fidelidade ao workspace aprovado em correção pela #355 após finding da QA #342**.

> A auditoria estática da #342 detectou divergências de composição e fluxo entre o protótipo aprovado e a implementação integrada. A validação visual final continua pendente até a correção #355 e a matriz manual da #342.

## Fonte visual normativa

O protótipo `ux/294-transactions-inbox-prototype` em `docs/prototypes/transactions-inbox-financeira.html` é a **especificação visual normativa** desta rota e do refinamento de shell registrado na #294.

A implementação final deve reproduzir o que foi desenhado: topo operacional, segmentos, faixa de resumo, board/lista, densidade, sidebar, estados ativos, detalhe contextual desktop, filtros/detalhe em sheet e FAB mobile.

Não basta ficar “próximo”, “equivalente” ou preservar apenas a intenção. Componentes existentes podem ser substituídos, novos componentes podem ser criados e bibliotecas podem ser atualizadas/adicionadas quando necessário para atingir paridade com qualidade de produção.

Qualquer diferença inevitável precisa ser documentada na #355 antes do merge, com motivo e impacto visual. A ausência de origem de importação no contrato continua sendo uma diferença funcional legítima e não autoriza heurística.

## Estrutura aprovada

A rota possui duas visões sobre os mesmos lançamentos e filtros:

- **Inbox** — visão principal, agrupada por situação operacional;
- **Histórico** — lista cronológica, preservada para consulta completa.

A ordem, o topo, a faixa de resumo e a relação visual entre filtros, segmentos e workspace devem seguir o protótipo aprovado.

A Inbox não altera transações. Ela classifica somente os itens retornados pela API usando `status` e a data lógica (`year/month/day`).

### Grupos da Inbox

- **Precisa atenção** — `PENDING` com data anterior ao dia atual;
- **Pendentes de hoje** — `PENDING` com data atual;
- **Agendadas** — `PENDING` com data futura;
- **Concluídas recentes** — `COMPLETED`;
- **Canceladas** — `CANCELLED`, mantidas visíveis para não esconder estado existente.

## Decisão sobre “Importadas recentemente”

O protótipo aprovado mostra um agrupamento “Importadas recentemente”. O `TransactionDTO` atual não expõe origem/importação do lançamento. Portanto a implementação **não tenta inferir** origem por data, descrição ou heurística. Esse grupo fica de fora até existir dado explícito e confiável no contrato.

Essa é uma diferença funcional documentada; não autoriza alterar outras partes do layout aprovado.

## Contratos preservados

- `COMPLETED`, `PENDING` e `CANCELLED` continuam sendo os estados financeiros atuais;
- a Inbox é somente apresentação e não executa writes ao abrir/alternar grupos;
- busca, filtros, paginação, criação, importação, duplicação, detalhe e ações rápidas existentes continuam acessíveis;
- categoria continua sendo a fonte de verdade de receita/despesa;
- moedas não são convertidas nem agregadas silenciosamente;
- nenhuma Transferência, Reconciliação ou regra nova de importação é antecipada.

## Semântica, shell e responsividade

- o seletor Inbox/Histórico usa a identidade roxa Orbit para seleção;
- estados financeiros continuam usando semântica própria;
- sidebar e estado ativo devem reproduzir dimensões/densidade do protótipo aprovado;
- detalhe desktop deve preservar contexto da lista conforme desenhado;
- filtros e detalhe mobile devem usar sheet conforme aprovado;
- FAB/ação móvel deve permanecer acessível e respeitar safe-area;
- estado não depende somente de cor.

## Validação exigida

Concluir somente após:

- comparação visual lado a lado com o protótipo aprovado;
- confirmação da ordem e posição de topo, segmentos, resumo e Inbox;
- confirmação do shell, drawer/sheet e FAB nos breakpoints aprovados;
- documentação de qualquer diferença inevitável;
- `pnpm check` no head final;
- auto code review completo;
- revisão visual manual em 320px/mobile/desktop;
- resolução do finding #355 e consolidação da evidência em `docs/quality/orbit-first-wave-qa.md`.
