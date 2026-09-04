# Estratégia de testes

O Controle de Gastos prioriza testes que protegem comportamento, dados financeiros, autenticação e acessibilidade. A suíte não deve ser reduzida por contagem; um teste só deve sair quando houver redundância ou baixo sinal comprovado.

## Gate normal de PR

O job `quality` cobre o caminho obrigatório e rápido:

```text
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm db:migrate
pnpm test
pnpm build
```

E2E, Lighthouse e verificações de segurança mais pesadas permanecem disponíveis em workflows direcionados/manual/agendado e devem ser executados quando o risco da mudança justificar.

## O que deve ser protegido

Priorize testes para:

- regras de negócio e cálculos financeiros;
- autenticação, autorização e ownership;
- persistência, migrations e compatibilidade de dados;
- contratos de API e regressões reproduzíveis;
- formulários e comportamentos relevantes da UI;
- acessibilidade, incluindo contraste e navegação quando automatizável.

Testes que leem arquivos podem ser válidos quando verificam um contrato material. Exemplo: os testes de `globals.css` calculam contraste WCAG e devem ser tratados como guard de acessibilidade, não como snapshot textual.

## Coverage

Coverage é diagnóstico, não meta percentual nem gate por si só. Não adicionar testes apenas para elevar porcentagem global e não remover cenários relevantes para reduzir tempo artificialmente.

## Checks proporcionais ao risco

- mudanças de fluxo crítico/UI integrada: considerar E2E;
- mudanças visuais/performance: considerar Lighthouse/budgets;
- dependências/supply-chain: security audit;
- migrations: validar banco/schema;
- correções de bug: adicionar teste de regressão no nível mais baixo capaz de reproduzir o problema.

Uma falha real deve ser investigada e corrigida; não afrouxar assertion correta para deixar o CI verde.
