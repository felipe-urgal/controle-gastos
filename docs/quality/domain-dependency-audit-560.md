# Auditoria de dependências entre domínios estabilizados — #560

Data: 2026-09-18  
Roadmap: #290 — Fase 3, item 32  
Baseline: `437377574cd1a03047e1dc30573ad961a7dd4456`

## Objetivo

Revisar dependências entre os módulos estabilizados depois da refatoração #291 e consolidar apenas atalhos que realmente atravessaram fronteiras de domínio.

Não é uma reorganização de diretórios. A regra é manter cada conceito no domínio proprietário e mover para shared somente o que comprovadamente possui mais de um dono funcional.

## Dependências revisadas

| Origem | Dependência | Classificação | Decisão |
| --- | --- | --- | --- |
| Transactions | Accounts ownership | legítima | Account é dona da validação de conta ativa/owned |
| Transactions | Categories ownership | legítima | Category é dona da validação de categoria owned/compatível |
| Dashboard | Accounts balance | legítima | saldo derivado é contrato canônico de Accounts |
| Forecast | Accounts balance | legítima | Forecast consome saldo realizado canônico sem duplicar regra |
| Forecast | Transactions monthly recurrence | atalho transversal | remover dependência; compartilhar somente primitive de data lógica |
| Transfer UI | Transactions monthly recurrence | atalho transversal | usar primitive compartilhada para formatação de data |

As buscas não encontraram dependência reversa material de Accounts → Transactions, Dashboard → Transactions ou Forecast → Transactions que formasse ciclo de aplicação.

## Finding: LogicalDate deixou de ser conceito exclusivo de Transactions

Antes deste recorte, `app/lib/transactions/monthly-recurrence.ts` concentrava duas responsabilidades:

1. primitives de calendário lógico:
   - `LogicalDate`;
   - validação;
   - parsing/formatação;
   - comparação;
   - último dia do mês;
2. regra de recorrência mensal:
   - máximo de ocorrências;
   - cálculo do mês seguinte;
   - geração de série/status.

Forecast precisava apenas do primeiro grupo, mas importava o namespace de Transactions. A UI de transferência também importava formatação pelo mesmo caminho.

A primitive de calendário é usada por mais de um domínio e não depende de Prisma, Next, React ou regra financeira. Ela é, portanto, um conceito transversal legítimo.

## Estrutura final

```text
app/lib/date/logical-date.ts
  -> LogicalDate
  -> compareLogicalDates
  -> getLastDayOfMonth
  -> isValidLogicalDate
  -> parseIsoLogicalDate
  -> formatIsoLogicalDate
  -> formatPtBrLogicalDate

app/lib/transactions/monthly-recurrence.ts
  -> importa primitives
  -> mantém regra mensal
  -> reexporta primitives temporariamente para compatibilidade

app/lib/transactions/logical-recurrence.ts
  -> importa primitives diretamente
  -> mantém regra de recorrência flexível

app/lib/forecast/*
  -> importa LogicalDate/primitives diretamente de app/lib/date

TransferForm
  -> importa somente formatação de app/lib/date
```

O reexport em `monthly-recurrence.ts` não é uma segunda implementação. Ele preserva consumidores internos existentes para evitar mudança ampla sem benefício, enquanto novos consumidores transversais usam o módulo dono do conceito.

## O que não foi movido

### Account balance

`calculateAccountBalanceMap`, `withDerivedAccountBalance(s)` permanecem em Accounts.

Embora Dashboard/Forecast usem o saldo, a regra possui dono claro: saldo de conta. Movê-la para shared apagaria essa responsabilidade.

### Ownership

Guards de Account e Category permanecem em seus domínios. Transactions depende deles porque precisa validar relações owned; duplicar ou mover para shared enfraqueceria a fronteira.

### Recorrência

Limites de ocorrências, presets, frequência, intervalos e geração de séries permanecem em Transactions. Só o calendário lógico básico é compartilhado.

## Circularidade

Na revisão dos imports críticos não foi encontrado ciclo material entre:

- Accounts e Transactions;
- Dashboard e Transactions;
- Forecast e Transactions;
- Category Limits e Transactions.

O recorte reduz uma dependência Forecast → Transactions; não adiciona dependência reversa.

## Testes

`app/lib/date/__tests__/logical-date.test.ts` caracteriza:

- calendário/leap year;
- parsing ISO estrito;
- formatação ISO/PT-BR;
- comparação determinística.

As regressões existentes de recorrência e Forecast continuam provando a semântica de alto nível.

## Decisão sobre item 33

Esta auditoria não encontrou regressões recorrentes de boundary nem ciclos que justifiquem ESLint/import-restrictions adicionais agora.

A direção de dependências continua documentada em `docs/architecture/application-layer-contract.md`. Automatizar boundaries deve continuar condicional a finding real, conforme o item 33 da roadmap.
