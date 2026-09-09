# Orbit — contrato visual da área autenticada

Status: **direção atual da área autenticada; fundação #302 integrada**. A validação visual/acessível da primeira onda permanece coordenada pela #342.

A linguagem Orbit substitui o redesign v2 como fonte visual para o shell e para as rotas autenticadas à medida que cada issue de UX aprovada é implementada. O redesign v2 permanece preservado em [`redesign-v2-spec.md`](redesign-v2-spec.md) como baseline histórico.

Este documento define linguagem visual e composição. Ele **não altera regras financeiras, APIs ou domínio** e não autoriza funcionalidades que existam apenas em protótipos.

## Precedência

Para a área autenticada:

1. contrato funcional e invariantes continuam definidos pelo domínio, `AGENTS.md`, ADRs e docs de produto;
2. esta especificação define a linguagem visual compartilhada Orbit;
3. a issue aprovada de cada rota e seu protótipo aprovado definem sua composição específica;
4. o redesign v2 serve como evidência histórica quando não houver conflito com Orbit.

Landing e autenticação não são recoloridas automaticamente pela adoção de Orbit. Mudanças nessas superfícies exigem escopo próprio.

## Fidelidade obrigatória aos protótipos aprovados

Quando uma rota possui protótipo explicitamente aprovado, esse protótipo é **especificação visual normativa** para a implementação. Ele não deve ser tratado como inspiração, referência aproximada ou direção genérica.

A implementação deve reproduzir, com dados e contratos reais do produto:

- hierarquia visual;
- ordem e agrupamento das regiões;
- proporções e densidade;
- espaçamentos e superfícies;
- tipografia e pesos visuais;
- navegação e controles;
- interações e progressive disclosure;
- shell compartilhado quando representado no protótipo;
- comportamento responsivo de desktop e mobile.

O objetivo de implementação é **paridade com o que foi desenhado e aprovado**. Expressões como “parecido”, “aproximado”, “equivalente”, “inspirado em” ou “mantém a intenção” não substituem fidelidade visual e não são critério suficiente para encerrar uma issue.

Reuso é uma ferramenta, não uma restrição. É permitido e esperado:

- criar novos componentes;
- dividir ou substituir componentes existentes;
- criar primitives quando houver necessidade real;
- refatorar o shell;
- ajustar tokens;
- atualizar ou adicionar bibliotecas quando tecnicamente justificadas para reproduzir corretamente o desenho.

Nenhum componente legado deve ser mantido apenas por conveniência se ele impedir a composição aprovada.

### Diferenças permitidas

Uma diferença em relação ao protótipo só pode permanecer quando houver incompatibilidade concreta com:

- regra de domínio ou contrato funcional real;
- segurança ou privacidade;
- acessibilidade;
- performance ou restrição técnica demonstrável;
- ausência de dado/feature que exista apenas como demonstração no protótipo.

Toda diferença deve ser registrada **antes do merge** na issue da rota e no documento correspondente, com motivo, impacto visual e solução adotada. Desvio silencioso por preferência de implementação não é permitido.

Dados fictícios de protótipo não autorizam inventar regra financeira ou funcionalidade. Quando o dado demonstrativo não existir no produto, a implementação deve preservar a composição visual usando dado real, estado vazio ou ausência explícita, conforme aplicável.

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

### Primitives e componentes

Reutilizar componentes existentes **somente quando o reuso não comprometer a fidelidade ao protótipo aprovado**.

Componentes atuais como `PageHeader`, `Button`, `Input`, `Select`, `RadioGroup`, `ActiveToggle`, feedbacks e overlays continuam sendo candidatos de reuso, mas não são obrigatórios quando sua estrutura impedir a composição aprovada.

Segmented controls, tabs, badges, drawers, sheets ou novas abstrações podem e devem ser criados quando forem necessários para reproduzir corretamente a experiência aprovada. A extração genérica continua devendo ter responsabilidade clara e qualidade de produção; o objetivo não é criar abstração por estética, mas também não é deformar o protótipo para caber em abstrações antigas.

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
- rotas controlam sua composição interna, não recriam navegação;
- quando o protótipo aprovado define colunas/proporções específicas, a implementação deve reproduzi-las salvo restrição documentada.

### Mobile

- topbar e bottom navigation compartilhados;
- safe-area superior, inferior e lateral respeitada;
- conteúdo recebe padding inferior suficiente para não ficar coberto pela navegação;
- controles focados recebem scroll margin para não ficarem escondidos pelo shell;
- em larguras muito estreitas, labels podem ficar visualmente ocultas somente quando o nome acessível continuar íntegro;
- mobile deve reproduzir a composição mobile aprovada; não é aceitável apenas empilhar ou miniaturizar o desktop quando o protótipo define comportamento próprio.

#### Overlays, drawers e sheets

A `BottomNav` é uma camada de navegação do shell e **não pode ficar acima de um overlay modal ativo**.

- backdrop, dialog, drawer ou bottom sheet ativo deve cobrir a navegação inferior quando a interação de fundo estiver bloqueada;
- ações de confirmação, aplicação ou cancelamento do overlay precisam permanecer visíveis e acionáveis acima da navegação e da chrome do navegador;
- superfícies altas devem limitar altura com `dvh`, respeitar `env(safe-area-inset-*)` e usar scroll interno em vez de deixar conteúdo inacessível fora do viewport;
- overlays com conteúdo rolável devem conter overscroll para evitar que o documento de fundo seja deslocado por acidente;
- a hierarquia de camadas é responsabilidade compartilhada do shell: correções de `z-index` não devem ser repetidas por rota quando uma regra transversal resolve o problema;
- validar pelo menos 320px e um mobile comum; quando o finding vier de navegador/dispositivo real, a correção só deve ser considerada visualmente encerrada após nova evidência nesse ambiente.

Esse contrato foi explicitado após o finding #389, em que a `BottomNav` competia com sheets de período/filtros e com o detalhe mobile de Contas.

## Regras para implementar as rotas Orbit

Cada rota deve:

- começar pela comparação direta com o protótipo aprovado;
- implementar a estrutura do protótipo antes de adaptar detalhes ao domínio real;
- reutilizar shell/primitives apenas quando isso não alterar a composição aprovada;
- criar ou refatorar componentes quando necessário para paridade;
- preservar ordem DOM, teclado e foco coerentes com a prioridade mobile;
- validar desktop, 320px e mobile comum;
- fazer comparação visual lado a lado entre protótipo e implementação candidata;
- não adicionar dados fictícios para sustentar a composição;
- não misturar realizado e projetado;
- não transformar cor de identidade em semântica financeira;
- migrar usos antigos de `--primary` que representem receita/sucesso para tokens semânticos apropriados antes de aplicar a identidade Orbit ao conteúdo da rota correspondente;
- preservar performance por revisão de código e pelo build obrigatório;
- documentar qualquer diferença inevitável antes do merge;
- não encerrar a issue enquanto houver desvio visual não documentado do protótipo aprovado.

Dependências de UI ou gráficos podem ser adicionadas/atualizadas quando a fidelidade ou interação aprovada realmente exigir. A decisão deve considerar manutenção, bundle, acessibilidade e compatibilidade; evitar dependência pesada sem necessidade continua sendo regra, mas “não adicionar biblioteca” não é objetivo em si.

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

- comparação visual lado a lado com o protótipo aprovado é gate de fidelidade;
- auto code review completo deve ser feito no head final;
- documentação e issue devem refletir o que foi realmente validado;
- qualquer desvio visual deve estar explicitamente documentado antes do merge;
- frontend budget, Lighthouse e análise de bundle são usados quando houver motivo concreto ou requisito explícito;
- não criar ou disparar workflows extras apenas para cumprir checklist genérico.

Validações que dependam de dispositivo/navegador real não devem ser declaradas concluídas por automação.

## Referências

- #292 — roadmap de exploração UX;
- #293–#301 — decisões por rota;
- #302 — fundação Orbit;
- #342 — QA de fidelidade da primeira onda Orbit;
- #389 — finding transversal de fidelidade/overlays mobile;
- [`redesign-v2-spec.md`](redesign-v2-spec.md) — baseline histórico anterior;
- `AGENTS.md`.
