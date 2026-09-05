# Transações — Inbox Financeira Orbit (#294)

Status: **implementação em revisão** na branch `ux/294-transactions-inbox-implementation`.

## Estrutura implementada

A rota passa a ter duas visões sobre os mesmos lançamentos e filtros:

- **Inbox** — visão principal, agrupada por situação operacional;
- **Histórico** — lista cronológica existente, preservada para consulta completa.

A Inbox não altera transações. Ela classifica somente os itens retornados pela API usando `status` e a data lógica (`year/month/day`).

### Grupos da Inbox

- **Precisa atenção** — `PENDING` com data anterior ao dia atual;
- **Pendentes de hoje** — `PENDING` com data atual;
- **Agendadas** — `PENDING` com data futura;
- **Concluídas recentes** — `COMPLETED`;
- **Canceladas** — `CANCELLED`, mantidas visíveis para não esconder estado existente.

Os grupos são expansíveis, o que preserva progressive disclosure no mobile. Paginação, filtros e ações rápidas existentes continuam disponíveis.

## Decisão sobre “Importadas recentemente”

O protótipo aprovado mostrava um agrupamento “Importadas recentemente”. O `TransactionDTO` atual não expõe origem/importação do lançamento. Portanto a implementação **não tenta inferir** origem por data, descrição ou heurística. Esse grupo fica de fora até existir dado explícito e confiável no contrato.

Isso evita transformar UX em nova regra de domínio ou classificar manualmente uma transação como importada quando ela não é.

## Contratos preservados

- `COMPLETED`, `PENDING` e `CANCELLED` continuam sendo os únicos estados financeiros atuais;
- a Inbox é somente apresentação e não executa writes ao abrir/alternar grupos;
- busca, filtros, paginação, criação, importação, duplicação, detalhe e ações rápidas existentes continuam acessíveis;
- categoria continua sendo a fonte de verdade de receita/despesa;
- moedas não são convertidas nem agregadas silenciosamente;
- nenhuma Transferência, Reconciliação ou regra nova de importação é antecipada nesta issue.

## Semântica e acessibilidade

- o seletor Inbox/Histórico usa a identidade roxa Orbit para seleção;
- estados financeiros continuam usando semântica própria, não a cor Orbit;
- grupos usam `details/summary`, mantendo operação por teclado sem JavaScript adicional;
- a informação de situação existe em título/texto e não depende somente de cor;
- no mobile os grupos podem ser recolhidos em vez de simplesmente empilhar toda a lista.

## Validação exigida

Concluir somente após `pnpm check` no head final, auto code review e revisão visual manual quando houver navegador disponível. O resultado real dos gates deve ser registrado na issue #294.
