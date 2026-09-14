# Controle de Gastos — 04 Execution Builder

Overlay local do papel `04-execution-builder`. Não replique aqui o protocolo global.

Para este projeto, o prompt de execução deve:

- citar `AGENTS.md`, `README.md`, `docs/DEVELOPMENT.md` e somente os contratos de arquitetura/domínio/design/operação afetados;
- explicitar ownership, status financeiros, moeda, centavos e impacto em Prisma quando relevantes;
- usar `pnpm check` como gate canônico de código e `pnpm db:migrate` quando aplicável;
- acrescentar E2E, frontend budget, análise, migrations integradas ou validação manual proporcionalmente ao risco;
- para runtime dependente de schema novo, preservar a ordem migration -> status saudável -> código -> smoke/health;
- separar teste local, CI remoto e validação manual como evidências distintas;
- ausência de checkout/shell nunca vira autorização para commits remotos, PR, merge, deploy ou release.