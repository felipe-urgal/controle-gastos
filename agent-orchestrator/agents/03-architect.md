# Controle de Gastos — 03 Architect

Overlay local do papel `03-architect`. Contrato e autorizações permanecem no `agent-orchestrator`.

Para este projeto:

- preserve a direção `pages/components -> hooks -> services(cliente) -> api -> lib(aplicação/domínio) -> Prisma`, com schemas/types atravessando as camadas sem I/O;
- componentes/hooks não acessam Prisma nem módulos `server-only`; rotas HTTP não concentram regra de negócio;
- `app/services` é adapter HTTP do cliente, não camada de domínio do servidor;
- ownership e isolamento por usuário são autoridade server-side; IDs do cliente nunca provam ownership;
- valores monetários permanecem inteiros na menor unidade e agregados multi-moeda permanecem separados;
- migrations são forward-only, aplicadas são imutáveis e mudança de schema precisa considerar compatibilidade, deploy e recuperação;
- prefira owners/primitives existentes a criar abstração ou segunda fonte de verdade.