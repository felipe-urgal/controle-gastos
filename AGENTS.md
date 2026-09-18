# AGENTS.md — Contrato de engenharia do Controle de Gastos

Este arquivo contém as **invariantes duráveis e regras específicas deste repositório**. O protocolo global de execução, handoff, estados terminais e autorizações pode vir do `felipe-urgal/agent-workflow` quando houver uma task ativa.

Estas regras valem para todo o repositório, salvo se um `AGENTS.md` mais específico existir em um subdiretório.

## 1. Princípio principal

A prioridade é entregar mudanças **corretas, simples, seguras e verificáveis**.

Prefira a menor solução que resolva completamente o problema sem criar dívida óbvia. Use KISS e YAGNI como padrão; não crie abstrações, camadas, componentes genéricos ou infraestrutura sem necessidade concreta.

Código existente não é automaticamente fonte de verdade. Preserve as invariantes consolidadas do produto e melhore a estrutura de forma incremental.

## 2. Integração com `agent-workflow` e fontes de verdade

Quando a execução vier de `felipe-urgal/agent-workflow`, leia nesta ordem operacional:

1. `AGENTS-CONTRACT.md` do workflow e a definição do agent atual;
2. a task ativa no caminho canônico registrado pelo workflow;
3. este `AGENTS.md` e qualquer `AGENTS.md` local aplicável;
4. ADRs, contratos de arquitetura/produto/operação/qualidade e design vigentes;
5. código e testes atuais como evidência técnica do estado real.

A responsabilidade de cada fonte é diferente:

- regras de plataforma, segurança e permissões são absolutas;
- este arquivo preserva invariantes do Controle de Gastos, arquitetura, domínio financeiro, segurança, banco, UX, operação e gates;
- a task ativa do `agent-workflow` é a fonte autoritativa para o **escopo e decisões específicas da entrega**, desde que não viole as invariantes duráveis deste repositório;
- issues e docs locais continuam descrevendo backlog e contratos do produto; a task externa descreve a execução ativa e não precisa ser copiada para dentro deste repositório;
- código/testes provam o comportamento atual, mas não podem redefinir silenciosamente decisão de produto já aprovada na task.

Se uma task aprovada alterar intencionalmente uma invariante, ADR ou contrato vigente, trate isso como mudança material: reconcilie as fontes e atualize a documentação correspondente no mesmo trabalho.

Baselines históricos não vencem decisões mais recentes. Na área autenticada, `docs/design/orbit-spec.md` prevalece sobre baselines anteriores quando houver conflito explícito.

### Modos de execução e evidência

O workflow pode operar em `FULL`, `REMOTE`, `PREPARE` ou `BLOCKED`.

- ausência de checkout local não é bloqueio por si só quando existir um caminho `REMOTE` seguro e autorizado;
- nunca confunda `pnpm check` local, CI remoto, inspeção de diff ou validação manual: registre a origem real de cada evidência;
- gate não executado deve ser registrado como **não executado**, com motivo concreto;
- indisponibilidade de um gate no ambiente atual não autoriza aprovação técnica falsa nem enfraquecimento do gate;
- para merge readiness, o head final ainda precisa satisfazer os gates obrigatórios do projeto.

### Autorizações

Capacidade técnica e autorização são coisas diferentes. Em especial, no modo remoto:

- `remote_commits` pode autorizar commits por API em uma branch remota;
- `push` autoriza push Git tradicional;
- nenhuma das duas implica abertura/atualização de PR;
- PR, merge, deploy, release, exclusões e ações destrutivas exigem a autorização correspondente;
- merge e produção nunca são inferidos apenas porque o agente consegue tecnicamente executá-los.

Quando não houver task ativa no `agent-workflow`, issue/escopo atual e o fluxo local continuam sendo a referência operacional.

## 3. Mapa rápido do projeto

```text
app/(pages)     roteamento e composição de telas
app/components  interface e componentes visuais
app/hooks       estado e orquestração do cliente
app/services    adapters HTTP usados pelo cliente
app/api         borda HTTP da aplicação
app/lib         aplicação/domínio/infraestrutura do servidor
app/schemas     validação e parsing (Zod)
app/types       tipos compartilhados sem I/O
app/utils       utilitários realmente genéricos
prisma          schema e migrations
scripts         automações e checks do repositório
tests/e2e       Playwright e fluxos integrados
docs            arquitetura, produto, design, operação e qualidade
```

A direção arquitetural alvo está definida em `docs/architecture/application-layer-contract.md`:

```text
pages/components -> hooks -> services (cliente) -> api -> lib (aplicação/domínio) -> Prisma
                         \________________ schemas/types ________________/
```

Regras centrais:

- dependências devem seguir essa direção;
- componentes e hooks não acessam Prisma nem módulos `server-only`;
- `app/services` é cliente HTTP, não camada de domínio do servidor;
- rotas HTTP não concentram regra de negócio;
- regras de negócio não dependem de `NextRequest`/`NextResponse`;
- schemas e tipos não executam I/O;
- código novo não deve ampliar ambiguidades legadas como `app/lib/services`;
- a migração arquitetural é incremental por domínio; uma task localizada não vira reorganização ampla do repositório.

## 4. Primitives existentes — não reinvente

Antes de criar infraestrutura nova, procure e reutilize os padrões existentes, especialmente:

- autenticação server-side: `app/lib/auth.ts`;
- primitives de autenticação: `app/lib/auth/`;
- respostas HTTP: `app/lib/api-response.ts`;
- erros esperados: `app/lib/http-error.ts`;
- Prisma: `app/lib/prisma.ts`;
- observabilidade/request ID: `app/lib/observability.ts`;
- regras de moeda: `app/lib/currency/`;
- regras de data: `app/lib/date/`;
- adapters HTTP do cliente: `app/services/`;
- schemas compartilhados: `app/schemas/`.

Procure implementação semelhante antes de criar outra abstração.

## 5. Antes de escrever código

Leia proporcionalmente ao escopo:

1. task ativa/issue/objetivo completo;
2. `README.md` e `docs/DEVELOPMENT.md`;
3. `docs/architecture/application-layer-contract.md` se houver mudança de responsabilidade entre camadas;
4. documentação do domínio afetado em `docs/product/`, `docs/adr/`, `docs/design/`, `docs/operations/` ou `docs/quality/`;
5. `docs/PRODUCTION.md` quando a mudança afetar schema, deploy, health ou operação;
6. implementação, consumidores e testes existentes.

Não reabra decisões já aprovadas na task sem contradição nova ou risco real. Preserve contratos consolidados salvo mudança intencional e documentada.

## 6. Regras de domínio financeiro

Estas invariantes são obrigatórias:

- dados são sempre isolados pelo usuário autenticado;
- IDs vindos do cliente **não provam ownership**;
- conta, categoria, transação e relações precisam ser validadas no servidor;
- a fonte de verdade do saldo são transações concretas `COMPLETED`;
- `PENDING` e `CANCELLED` não entram no saldo realizado;
- `Account` não deve voltar a ter saldo autoritativo concorrente;
- categoria é a fonte de verdade do tipo `INCOME`/`EXPENSE`;
- leituras (`GET`, listagens, calendário e dashboard) não criam ou alteram dados;
- recorrências/séries não são fonte financeira: somente ocorrências concretas são;
- valores monetários permanecem inteiros na menor unidade, sem lógica financeira baseada em `float`.

Consulte `docs/adr/0001-account-balance-source-of-truth.md`.

### Multi-moeda

O produto suporta atualmente `BRL`, `USD` e `EUR` e **não possui moeda-base nem conversão cambial automática**.

Portanto:

- nunca some silenciosamente valores de moedas diferentes;
- agregados que atravessam contas permanecem separados por moeda;
- comparações entre períodos usam sempre a mesma moeda;
- percentuais financeiros usam numerador e denominador da mesma moeda;
- saldos de contas não formam um `grand total` transversal entre moedas;
- qualquer futura conversão cambial exige regra de produto e ADR explícito.

Consulte `docs/adr/0002-multi-currency-aggregates.md`.

## 7. Backend, APIs e segurança

Ao alterar backend:

- autentique no servidor;
- revalide ownership de toda relação recebida;
- use schemas Zod/contratos existentes;
- mantenha a route handler como borda de transporte, não como domínio;
- normalize status HTTP corretamente;
- não transforme erro esperado em 500;
- não vaze a existência de recurso pertencente a outro usuário;
- mantenha operações relacionadas atômicas quando necessário;
- considere replay/idempotência em ações repetíveis;
- preserve headers privados/no-store nas respostas autenticadas;
- preserve `x-request-id` e observabilidade onde aplicável;
- evite `$disconnect()` por request.

Nunca:

- confie em `userId` recebido do cliente;
- exponha stack trace ou erro de driver em resposta pública;
- logue credenciais ou payload financeiro sensível;
- coloque segredo em fixture, issue, PR, screenshot ou documentação;
- desative validação para fazer teste passar.

Use placeholders explicitamente falsos em testes e CI.

## 8. Banco e Prisma

### Migrations

- nunca edite migration já aplicada;
- prefira `forward-fix`;
- revise o SQL gerado;
- mudanças destrutivas exigem plano de recuperação;
- prefira migrations aditivas e compatíveis quando possível;
- mudança visual não justifica alteração de schema.
- para additive/backfill/expand-contract/índices, siga `docs/architecture/schema-evolution-strategy.md`.

### Ordem de deploy

O build não executa `prisma migrate deploy` automaticamente.

Quando runtime novo depender de schema novo:

1. validar migration;
2. definir checkpoint/recuperação se necessário;
3. aplicar migration compatível;
4. confirmar `prisma migrate status` saudável;
5. promover o código dependente;
6. executar smoke/health.

Não faça rollback cego para runtime incompatível com o schema já aplicado.

## 9. Frontend, UX e acessibilidade

A área autenticada segue `docs/design/orbit-spec.md` e decisões de UX aprovadas por rota. `docs/design/redesign-v2-spec.md` é baseline histórico e não sobrescreve decisões Orbit posteriores.

Princípios:

- interface simples, rápida e funcional;
- dark como identidade principal;
- superfícies neutras e bordas sutis;
- roxo para navegação, seleção, foco e ações primárias Orbit já existentes;
- verde principalmente para receita, sucesso e estados positivos;
- vermelho para despesa, erro e ação destrutiva;
- sem glow, glassmorphism ou gradiente decorativo sem função;
- não inventar feature para preencher layout ou copiar mockup;
- texto base >= 16px e secundário >= 14px;
- touch target crítico ~44x44px ou maior;
- não reduzir fonte apenas para “fazer caber”;
- adaptar responsivamente em vez de comprimir;
- reutilizar shell/primitives existentes antes de extrair abstração nova.

Landing e autenticação não migram automaticamente para Orbit; mudanças nessas superfícies exigem escopo próprio.

### Acessibilidade é requisito funcional

Revise, quando aplicável:

- teclado completo;
- foco visível e previsível;
- `label`/`htmlFor`;
- `aria-invalid` e mensagem de erro associada;
- nome acessível de icon buttons;
- dialogs/drawers com foco, Escape e restauração;
- estados que não dependam apenas de cor;
- `prefers-reduced-motion`;
- safe areas;
- teclado virtual em mobile.

Prefira HTML semântico a `div` com `role` quando existir elemento nativo apropriado.

## 10. Performance

Evite regressões gratuitas de frontend. Revise dependências/imports grandes, client components desnecessários, imagens/assets, renders/effects redundantes, listeners/timers sem cleanup, layout shifts e bundle/chunks quando houver risco concreto.

O gate obrigatório de código é `pnpm check`, que inclui `pnpm build`.

Use diagnósticos adicionais proporcionalmente ao risco:

```bash
pnpm check:frontend-budget
pnpm analyze
```

Frontend budget, Lighthouse e E2E não são custo fixo de toda entrega sem motivo concreto. Nunca aumente budget apenas para deixar o check verde.

## 11. Testes e validação proporcional ao risco

Bugfix deve ganhar teste de regressão sempre que tecnicamente razoável.

Priorize cobertura para regras financeiras, autenticação/autorização, isolamento multiusuário, ownership/IDOR, create/update/delete, mudanças de status, atomicidade, idempotência, datas/fim de mês, centavos exatos, multi-moeda, contratos HTTP e o comportamento que causou o bug.

Escolha o nível de teste pela responsabilidade:

```text
regra pura de domínio     -> teste próximo de app/lib/<dominio>
route/API                  -> route.test.ts ou route.integration.test.ts
schema/Zod                 -> teste do schema
componente/hook            -> teste da unidade quando houver comportamento relevante
fluxo crítico integrado    -> tests/e2e
```

Gate local canônico:

```bash
pnpm db:migrate   # quando aplicável
pnpm check
```

`pnpm check` executa `lint -> typecheck -> test -> build`.

Checks adicionais, como E2E, frontend budget, análise, migrations integradas ou validação manual, devem acompanhar o risco real.

Se o modo atual não puder executar um gate, registre isso explicitamente e procure evidência remota quando disponível. Não afrouxe teste, lint, typecheck ou build para transformar ausência de capacidade em “verde”.

## 12. Refactor incremental e código legado

Ao tocar em código legado:

- pode melhorar localmente o trecho necessário para entregar a task;
- deve colocar **nova** regra de negócio na camada correta;
- pode remover duplicação diretamente afetada;
- não deve migrar outros domínios “aproveitando” a entrega;
- não crie segunda implementação equivalente em outra camada;
- não perpetue adapters legados quando o consumidor tocado puder migrar com segurança;
- dívida relevante fora do escopo deve virar issue separada.

Prefira mudanças pequenas e orientadas por comportamento a reorganizações estruturais em massa.

## 13. Revisão do diff e findings

Antes de considerar o trabalho pronto, revise o diff completo no head atual com atenção a escopo/arquitetura, autenticação/ownership/IDOR, saldo/status/centavos/moeda, atomicidade/idempotência, contratos HTTP, estados de UI, teclado/foco/responsividade, migrations, ordem de deploy, performance, documentação e testes que possam passar pelo motivo errado.

Quando o `agent-workflow` estiver ativo, quem executa review, classificação de findings, handoff e estados terminais é definido pelo contrato e pelo agent atual. Este arquivo apenas define os riscos locais que não podem ser ignorados.

Finding bloqueante conhecido impede merge. Correção que muda o SHA exige revalidação proporcional ao risco no novo head.

## 14. Git, PR e produção

O repositório continua exigindo trabalho revisável em branch/PR quando aplicável. O `agent-workflow`, quando ativo, controla **quando** cada mutação está autorizada; não duplique aqui o protocolo de handoff entre agents.

Regras locais que permanecem:

- não trabalhar diretamente em `main`;
- não force-push/reset destrutivo sem necessidade e autorização;
- não gerar commit vazio/artificial para disparar CI/deploy;
- não reescrever histórico compartilhado por conveniência;
- CI obrigatório deve corresponder ao head final considerado para merge;
- qualquer correção posterior invalida a validação final anterior;
- produção segue `docs/PRODUCTION.md` e nunca é consequência automática de merge;
- merge, deploy e release exigem autorização explícita.

## 15. Documentação

Entradas canônicas incluem `docs/DEVELOPMENT.md`, `docs/PRODUCTION.md`, `docs/architecture/application-layer-contract.md`, `docs/adr/`, `docs/product/`, `docs/design/`, `docs/operations/` e `docs/quality/`.

Ao alterar comportamento, revise quais fontes precisam mudar. Documentação deve refletir **o que realmente existe**, não intenção futura.

A task externa do `agent-workflow` é estado operacional e não substitui issues/docs como backlog e contrato duradouro do produto.

## 16. Nunca faça

- inventar funcionalidade porque apareceu em mockup;
- antecipar feature sem task/issue/escopo próprio;
- esconder erro com `try/catch` vazio;
- usar `any` como atalho sem justificativa;
- criar interface/abstração sem necessidade real;
- desabilitar lint/typecheck/test para passar CI;
- apagar lockfile ou trocar package manager por conveniência;
- relaxar budget sem análise;
- editar migration aplicada;
- misturar moedas em agregado financeiro;
- usar banco de produção para teste destrutivo;
- expor segredo;
- afirmar que testou algo que não foi testado;
- mergear com finding bloqueante conhecido;
- confundir quota externa com falha do código.

## 17. Definition of Done

Uma **etapa do `agent-workflow`** está concluída quando o agent cumpriu seu papel, revisou o estado/diff aplicável, registrou evidências reais e limitações, e sincronizou a task para um estado terminal válido conforme o contrato global.

Uma mudança está **pronta para merge** no Controle de Gastos somente quando:

- o objetivo foi atendido sem escopo acidental;
- código está simples e na camada correta;
- invariantes financeiras e de ownership foram preservadas ou atualizadas explicitamente;
- testes adequados existem;
- migrations são seguras quando aplicáveis;
- `pnpm check` e o CI obrigatório do head final estão verdes por evidência realmente observada;
- validações adicionais relevantes passaram;
- diff final foi revisado;
- não há finding bloqueante conhecido;
- documentação reflete o estado real;
- o head final é o mesmo head validado para merge;
- merge só ocorre após autorização explícita.

Qualidade final continua sendo responsabilidade da entrega; limitação de ambiente deve ser registrada, nunca escondida.
