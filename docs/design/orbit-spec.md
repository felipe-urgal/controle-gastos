# Orbit — contrato visual da área autenticada

Status: **direção atual da área autenticada**. A fundação é rastreada pela #302 e só deve ser considerada concluída depois do CI obrigatório e merge do head validado.

A linguagem Orbit substitui o redesign v2 como fonte visual para o shell e para as rotas autenticadas à medida que cada issue de UX aprovada é implementada. O redesign v2 permanece preservado em [`redesign-v2-spec.md`](redesign-v2-spec.md) como baseline histórico.

Este documento define linguagem visual e composição. Ele **não altera regras financeiras, APIs ou domínio** e não autoriza funcionalidades que existam apenas em protótipos.

## Precedência

Para a área autenticada:

1. contrato funcional e invariantes continuam definidos pelo domínio, `AGENTS.md`, ADRs e docs de produto;
2. esta especificação define a linguagem visual compartilhada Orbit;
3. a issue aprovada de cada rota define sua composição específica;
4. o redesign v2 serve como evidência histórica quando não houver conflito com Orbit.

Landing e autenticação não são recoloridas automaticamente pela adoção de Orbit. Mudanças nessas superfícies exigem escopo próprio.

## Princípios visuais

- interface simples, rápida e funcional;
- dark continua sendo a identidade principal;
- superfícies neutras, hierarquia por espaçamento e bordas sutis;
- **roxo** é a identidade de navegação, seleção, foco e ações primárias Orbit quando a ação já existe no produto;
- **verde** permanece semântico para receita, sucesso e estados positivos;
- **vermelho** permanece semântico para despesa, erro e ações destrutivas;
- amarelo/laranja permanecem reservados a alerta ou estado semântico real;
- sem glassmorphism, glow ou gradiente decorativo sem função;
- nenhum mockup autoriza atalhos, alertas, insights ou features inexistentes.

## Fundação compartilhada

A #302 consolida somente o que já possui uso transversal comprovado.

### Shell

- `AppSidebar`: navegação desktop, estado ativo, tema, perfil e logout;
- `MobileTopbar`: marca compacta, tema, perfil e logout;
- `BottomNav`: cinco destinos primários existentes, estado ativo e safe-area;
- `ClientLayout`: composição única do shell autenticado;
- `ProtectedRoute`: autenticação e container padrão das páginas autenticadas.

Os tokens Orbit são declarados dentro de `.authenticated-shell`, mas **não substituem `--primary` no shell inteiro**. A navegação recebe aliases locais somente em `.orbit-navigation-surface`. Isso evita que estados financeiros legados que ainda usam o `--primary` do v2 sejam recoloridos antes da migração da rota correspondente.

Assim, a fundação também não altera por acidente landing, login, cadastro ou outras superfícies públicas.

### Primitives já consolidados

Reutilizar antes de criar alternativas:

- `PageHeader` para título, descrição e ações de página;
- `Button`, `Input`, `Select`, `RadioGroup` e `ActiveToggle` para controles existentes;
- feedback compartilhado de loading, vazio e erro;
- overlays existentes para confirmação e fluxos modais já suportados.

Segmented controls, tabs, badges, drawers ou novas abstrações só devem ser extraídos quando a implementação das rotas provar repetição real. Não criar componentes genéricos apenas porque aparecem nos protótipos.

## Tokens e semântica

A fundação usa tokens dedicados:

- `--orbit-primary`;
- `--orbit-primary-hover`;
- `--orbit-primary-subtle`;
- `--orbit-on-primary`;
- `--orbit-focus`;
- tokens próprios das superfícies de navegação e do container de página.

Na fundação, aliases `--primary`, `--primary-hover`, `--primary-subtle`, `--on-primary` e `--focus` são aplicados **somente dentro de `.orbit-navigation-surface`**, permitindo que sidebar/topbar/bottom nav reutilizem os componentes existentes sem mudar a semântica das rotas.

Consequências:

- navegação e seleção do shell usam a identidade roxa Orbit;
- componentes financeiros continuam usando os tokens atuais até a issue da rota migrá-los conscientemente;
- receita/sucesso não viram roxo por consequência indireta da troca de identidade;
- uma ação destrutiva continua usando a família de danger/expense adequada;
- estados precisam de texto, ícone ou semântica além da cor quando necessário.

## Tipografia e interação

- texto base: **16px mínimo**;
- texto secundário/caption: **14px mínimo**;
- não reduzir fonte para fazer conteúdo caber;
- touch target crítico em torno de **44×44px** ou maior;
- foco visível em teclado;
- `aria-current` nos destinos ativos de navegação;
- labels acessíveis mesmo quando compactados visualmente em 320px;
- `prefers-reduced-motion` respeitado;
- estados hover/focus/active/disabled/loading/error preservados nas primitives.

## Responsividade e safe areas

### Desktop

- sidebar compartilhada e fixa;
- conteúdo usa o mesmo deslocamento/largura do shell;
- rotas controlam sua composição interna, não recriam navegação.

### Mobile

- topbar e bottom navigation compartilhados;
- safe-area superior, inferior e lateral respeitada;
- conteúdo recebe padding inferior suficiente para não ficar coberto pela navegação;
- controles focados recebem scroll margin para não ficarem escondidos pelo shell;
- em larguras muito estreitas, labels podem ficar visualmente ocultas somente quando o nome acessível continuar íntegro.

## Regras para implementar as rotas Orbit

Cada rota deve:

- reutilizar shell e primitives antes de criar componente novo;
- preservar ordem DOM, teclado e foco coerentes com a prioridade mobile;
- validar desktop, 320px e mobile comum;
- não adicionar dados fictícios para sustentar a composição;
- não misturar realizado e projetado;
- não transformar cor de identidade em semântica financeira;
- migrar usos antigos de `--primary` que representem receita/sucesso para tokens semânticos apropriados antes de aplicar a identidade Orbit ao conteúdo da rota;
- evitar dependência pesada de UI ou gráficos sem evidência de necessidade;
- preservar performance por revisão de código e pelo build obrigatório;
- usar frontend budget, Lighthouse ou análise de bundle somente como diagnóstico manual quando houver risco concreto ou escopo explícito.

## Ordem de evolução registrada

A fundação #302 antecede as implementações específicas:

1. #293 — Dashboard;
2. #294 — Transações;
3. #295 — Contas;
4. #296 — Calendário;
5. #298 — Categorias/Limites;
6. #299 — Importação;
7. #300 — Nova/Editar/Detalhe de transação;
8. #301 — Configurações.

A ordem pode mudar quando dependências funcionais reais justificarem, sem implementar feature de produto por antecipação.

## Gates

Toda mudança Orbit relevante segue `AGENTS.md`.

O **CI obrigatório** permanece simples e usa somente o workflow principal existente, com:

- lint;
- typecheck;
- migrations em banco isolado quando configuradas no workflow;
- testes;
- build.

Além disso:

- auto code review completo deve ser feito no head final;
- documentação e issue devem refletir o que foi realmente validado;
- frontend budget, Lighthouse e análise de bundle são opcionais e manuais, usados somente quando houver motivo concreto ou requisito explícito;
- não criar ou disparar workflows extras apenas para cumprir checklist genérico.

Validações que dependam de dispositivo/navegador real não devem ser declaradas concluídas por automação.

## Referências

- #292 — roadmap de exploração UX;
- #293–#301 — decisões por rota;
- #302 — fundação Orbit;
- [`redesign-v2-spec.md`](redesign-v2-spec.md) — baseline histórico anterior;
- `AGENTS.md`.
