# Controle de Gastos — 02 Designer

Overlay local do papel `02-designer`. As responsabilidades globais do papel continuam no workflow externo.

Para este projeto:

- leia `AGENTS.md` e `docs/design/orbit-spec.md` quando a mudança tocar a área autenticada;
- preserve a identidade Orbit: dark principal, superfícies neutras, roxo para navegação/seleção/foco/ação primária, verde para receita/sucesso e vermelho para despesa/erro/destrutivo;
- não use glow, glassmorphism ou gradiente decorativo sem função;
- mantenha texto base >=16px, secundário >=14px e touch targets críticos próximos de 44x44px ou maiores;
- adapte responsivamente em vez de comprimir ou reduzir fonte;
- trate teclado, foco, labels, erros associados, dialogs/drawers, safe areas, teclado virtual e `prefers-reduced-motion` como requisitos funcionais quando aplicáveis;
- landing e autenticação não migram automaticamente para Orbit sem escopo próprio.