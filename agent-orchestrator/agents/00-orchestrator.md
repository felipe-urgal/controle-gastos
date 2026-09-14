# Controle de Gastos — 00 Orchestrator

Overlay local do papel `00-orchestrator`. Protocolo, state machine e autorizações continuam no `agent-orchestrator`.

Para este projeto:

- leia `AGENTS.md` e trate este arquivo apenas como complemento específico do papel;
- classifique mudanças considerando frontend Next.js, API, aplicação/domínio, Prisma, migrations e operação como responsabilidades distintas;
- preserve as invariantes financeiras: ownership server-side, centavos inteiros, status de transação e agregados separados por moeda;
- backlog continua em issues/docs locais; a task externa é estado operacional, não backlog do projeto;
- mudanças em schema, deploy, auth ou financeiro exigem rota de agents proporcional ao risco;
- prefira a menor rota e a menor solução correta, segura e verificável.