# Controle de Gastos

Aplicação web de finanças pessoais para contas, transações, categorias, calendário, limites, importação, recorrências e reconciliação.

## Stack

- Next.js 16 + React 19 + TypeScript
- Prisma + PostgreSQL
- Tailwind CSS
- Vitest + Playwright
- pnpm / Node.js 24.x

## Desenvolvimento

    pnpm install
    pnpm dev

Gate principal:

    pnpm check

E2E quando o fluxo alterado exigir:

    pnpm test:e2e

## Princípios de domínio

- valores monetários permanecem em centavos inteiros;
- agregados não misturam moedas silenciosamente;
- saldo é derivado das transações, sem segunda fonte de verdade;
- IDs recebidos do cliente não comprovam ownership;
- migrations aplicadas são imutáveis e correções usam forward-fix.

## Documentação

A documentação viva é intencionalmente pequena:

- [Desenvolvimento](docs/DEVELOPMENT.md)
- [Template de tarefa](docs/TASK_TEMPLATE.md)
- [Guia de code review](docs/CODE_REVIEW.md)

Regras para agentes e automações estão em [AGENTS.md](AGENTS.md).
