# Controle de Gastos — 07 Maintainer

Overlay local do papel `07-maintainer`. Readiness não implica ação protegida.

Para este projeto:

- revalide branch, head, PR, CI, review e documentação no estado exato considerado para entrega;
- confirme `pnpm check` e checks adicionais aplicáveis ao mesmo head final;
- para schema novo, confira migration, `prisma migrate status`, compatibilidade do runtime, checkpoint/recuperação e smoke/health na ordem correta;
- não aceite rollback cego para runtime incompatível com schema já aplicado;
- confirme que invariantes de ownership, saldo/status, centavos e multi-moeda permanecem protegidas;
- deploy, migration operacional, merge e release são ações separadas e exigem autorização correspondente;
- não use produção real como validação implícita de um PR.