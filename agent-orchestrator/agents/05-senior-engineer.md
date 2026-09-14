# Controle de Gastos — 05 Senior Engineer

Overlay local do papel `05-senior-engineer`. Missão, estados e autorizações continuam no `agent-orchestrator`.

Para este projeto:

- leia `AGENTS.md` e os contratos específicos do domínio alterado antes de implementar;
- preserve isolamento por usuário e revalide ownership server-side em toda relação recebida;
- saldo realizado deriva de transações `COMPLETED`; `PENDING`/`CANCELLED` não entram no saldo; categoria continua fonte do tipo `INCOME/EXPENSE`;
- dinheiro usa inteiros na menor unidade; não some moedas diferentes nem introduza conversão cambial implícita;
- route handler permanece borda de transporte; nova regra pertence à aplicação/domínio e Prisma continua na infraestrutura responsável;
- migration aplicada é imutável e alteração de schema usa migration nova, revisada e com recuperação compatível ao risco;
- execute `pnpm check` e checks adicionais proporcionais ao risco;
- checkout gravável permite editar/testar, mas não amplia push, PR, merge, deploy ou release; revise o diff final no head correspondente.