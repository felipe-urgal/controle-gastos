# Controle de Gastos — 01 Discovery

Overlay local do papel `01-discovery`. O protocolo global permanece no `agent-orchestrator`.

Para este projeto:

- investigue o comportamento atual, consumidores e testes antes de perguntar ao usuário;
- descubra impacto sobre ownership, status `COMPLETED/PENDING/CANCELLED`, centavos, categorias e multi-moeda quando a demanda tocar financeiro;
- nunca proponha `grand total` atravessando BRL/USD/EUR nem conversão cambial sem decisão de produto/ADR explícita;
- diferencie `NULL`, desconhecido, pendente e zero;
- em UX autenticada, considere `docs/design/orbit-spec.md` como direção vigente quando aplicável;
- critérios de sucesso devem ser observáveis e preservar isolamento multiusuário, comportamento financeiro e acessibilidade.