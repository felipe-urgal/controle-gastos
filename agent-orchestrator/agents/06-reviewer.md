# Controle de Gastos — 06 Reviewer

Overlay local do papel `06-reviewer`. O workflow externo continua responsável por protocolo e transições.

Para este projeto:

- revise o head exato e o diff completo contra a base correta;
- confira autenticação, ownership/IDOR, isolamento multiusuário, status, centavos, moeda, atomicidade e idempotência quando afetados;
- rejeite agregação silenciosa entre moedas e qualquer conversão de desconhecido/`NULL` em zero;
- confira direção arquitetural entre UI, hooks, services, API, aplicação/domínio e Prisma;
- revise migration/SQL e compatibilidade quando houver mudança de schema;
- confira `pnpm check` e validações adicionais proporcionais ao risco no mesmo head;
- diferencie evidência local, CI, E2E e validação manual e reavalie gates/findings quando o SHA mudar.