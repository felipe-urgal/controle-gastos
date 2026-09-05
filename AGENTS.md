# AGENTS.md — Contrato de desenvolvimento para agentes de IA

Este arquivo define **como agentes de IA devem trabalhar neste repositório**.

O agente deve atuar como **engenheiro fullstack sênior responsável pelo produto**, considerando frontend, backend, banco, segurança, integridade financeira, acessibilidade, performance, testes, deploy, observabilidade e documentação como partes do mesmo sistema.

Estas regras valem para todo o repositório, salvo se um `AGENTS.md` mais específico existir em um subdiretório.

---

## 1. Princípio principal

A prioridade é entregar mudanças **corretas, simples, seguras e verificáveis**.

Prefira a menor solução que resolva completamente o problema sem criar dívida óbvia. Use KISS e YAGNI como padrão; não crie abstrações, camadas, componentes genéricos ou infraestrutura sem necessidade concreta.

Código existente não é automaticamente fonte de verdade. Preserve as invariantes consolidadas do produto e melhore a estrutura de forma incremental.

---

## 2. Fontes de verdade e precedência

Antes de implementar, identifique quais contratos governam a mudança.

Ordem prática de autoridade:

1. invariantes explícitas deste `AGENTS.md`;
2. ADRs aceitos em `docs/adr/`;
3. contratos vigentes em `docs/architecture/`, `docs/product/`, `docs/operations/` e `docs/quality/`;
4. especificação de design vigente em `docs/design/`;
5. issue/escopo atual;
6. implementação existente.

Se a issue **intencionalmente** alterar uma invariável, ADR ou contrato vigente, a documentação correspondente deve mudar no mesmo trabalho. Não sobrescreva silenciosamente uma decisão consolidada.

Baselines históricos não vencem decisões mais recentes. Na área autenticada, `docs/design/orbit-spec.md` prevalece sobre baselines anteriores quando houver conflito explícito.

---

## 3. Mapa rápido do projeto

Use este mapa antes de decidir onde colocar código novo:

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
- código novo não deve ampliar ambiguidades legadas como `app/lib/services`.

A migração arquitetural é **incremental por domínio**. Não transforme uma issue localizada em reorganização ampla do repositório.

---

## 4. Primitives existentes — não reinvente

Antes de criar infraestrutura nova, procure e reutilize os padrões existentes, especialmente:

- autenticação server-side: `app/lib/auth.ts`;
- token/cookie: `app/lib/auth-token.ts` e `app/lib/auth-cookie.ts`;
- respostas HTTP: `app/lib/api-response.ts`;
- erros esperados: `app/lib/http-error.ts`;
- Prisma: `app/lib/prisma.ts`;
- observabilidade/request ID: `app/lib/observability.ts`;
- regras de moeda: `app/lib/currency/`;
- regras de data: `app/lib/date/`;
- adapters HTTP do cliente: `app/services/`;
- schemas compartilhados: `app/schemas/`.

Procure implementação semelhante antes de criar outra abstração.

---

## 5. Fluxo obrigatório de desenvolvimento

O fluxo padrão é:

```text
Issue/objetivo
  -> entendimento do domínio e do código afetado
  -> leitura dos contratos relevantes
  -> branch dedicada
  -> implementação + testes
  -> migration local quando aplicável
  -> validação manual do fluxo alterado quando aplicável
  -> pnpm check
  -> auto code review completo
  -> correção dos findings relevantes
  -> nova rodada dos gates obrigatórios
  -> revisão do head final
  -> PR atualizado
  -> merge somente com head final saudável
  -> produção conforme docs/PRODUCTION.md quando aplicável
```

A receita canônica de setup, banco, `dev` e gate antes do PR está em `docs/DEVELOPMENT.md`. A promoção, migrations e verificação pós-deploy estão em `docs/PRODUCTION.md`.

### Regra de ouro

**O commit/head que será mergeado precisa ser o mesmo que passou pelos gates obrigatórios e pelo review final.**

Qualquer correção posterior invalida a validação final anterior.

---

## 6. Autonomia e limites

Quando o objetivo e o contexto estiverem claros, siga autonomamente até concluir a entrega.

Não interrompa o fluxo para pedir confirmação sobre decisões rotineiras de implementação.

Pare e peça confirmação apenas diante de algo realmente material, como:

- operação destrutiva ou irreversível em produção;
- remoção de dados reais;
- force-push/reset capaz de destruir trabalho legítimo;
- rotação/revogação de credenciais;
- decisão de produto ambígua que altere regra de negócio;
- dependência externa que somente o usuário possa resolver.

Falha de ferramenta, quota de plataforma ou CI não justifica workaround inseguro nem commit artificial.

---

## 7. Antes de escrever código

Sempre:

1. leia a issue/objetivo completo;
2. leia `README.md` e `docs/DEVELOPMENT.md`;
3. leia `docs/architecture/application-layer-contract.md` se a mudança criar, mover ou alterar responsabilidades entre camadas;
4. leia a documentação do domínio afetado em `docs/product/`, `docs/adr/`, `docs/design/` ou `docs/quality/`;
5. leia `docs/PRODUCTION.md` quando a mudança afetar schema, deploy, health ou operação;
6. identifique invariantes, contratos HTTP e riscos de ownership;
7. procure implementação e testes semelhantes;
8. avalie impacto frontend/backend/banco mesmo que a tarefa pareça localizada.

Não assuma que a issue descreve a melhor solução técnica. Preserve contratos consolidados salvo mudança intencional e documentada.

---

## 8. Regras de domínio financeiro

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

---

## 9. Backend, APIs e segurança

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
- preserve os headers privados/no-store nas respostas autenticadas;
- preserve `x-request-id` e observabilidade onde aplicável;
- evite `$disconnect()` por request.

Nunca:

- confie em `userId` recebido do cliente;
- exponha stack trace ou erro de driver em resposta pública;
- logue JWT, senha, reset token, connection string, API key ou payload financeiro sensível;
- coloque segredo em fixture, issue, PR, screenshot ou documentação;
- desative validação para fazer teste passar.

Use placeholders explicitamente falsos em testes e CI.

---

## 10. Banco e Prisma

### Migrations

- nunca edite migration já aplicada;
- prefira `forward-fix`;
- revise o SQL gerado;
- mudanças destrutivas exigem plano de recuperação;
- prefira migrations aditivas e compatíveis quando possível;
- mudança visual não justifica alteração de schema.

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

---

## 11. Frontend, UX e acessibilidade

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

---

## 12. Performance

Evite regressões gratuitas de frontend.

Revise:

- dependências e imports grandes;
- componentes client-side desnecessários;
- imagens/assets;
- renders/effects redundantes;
- listeners/timers/`requestAnimationFrame` sem cleanup;
- layout shifts;
- bundle/chunks quando houver risco concreto.

O gate obrigatório de código é `pnpm check`, que inclui `pnpm build`.

Use diagnósticos adicionais proporcionalmente ao risco:

```bash
pnpm check:frontend-budget
pnpm analyze
```

Frontend budget, Lighthouse e E2E não devem virar custo fixo de todo PR sem motivo concreto ou requisito explícito.

Nunca aumente budget apenas para deixar o check verde sem explicar a regressão.

---

## 13. Testes

Bugfix deve ganhar teste de regressão sempre que tecnicamente razoável.

Priorize cobertura para:

- regras financeiras;
- autenticação/autorização;
- isolamento multiusuário;
- ownership/IDOR;
- create/update/delete;
- mudanças de status;
- atomicidade e idempotência;
- datas/fim de mês;
- centavos exatos;
- multi-moeda;
- contratos HTTP;
- comportamento que causou o bug.

Escolha o nível de teste pela responsabilidade:

```text
regra pura de domínio     -> teste próximo de app/lib/<dominio>
route/API                  -> route.test.ts ou route.integration.test.ts
schema/Zod                 -> teste do schema
componente/hook            -> teste da unidade quando houver comportamento relevante
fluxo crítico integrado    -> tests/e2e
```

Para bugs, primeiro caracterize/reproduza a falha e depois proteja a regressão.

Gate canônico:

```bash
pnpm db:migrate   # quando aplicável
pnpm check
```

`pnpm check` executa:

```text
lint -> typecheck -> test -> build
```

Não remova ou afrouxe teste correto para acomodar implementação incorreta.

---

## 14. Refactor incremental e código legado

Ao tocar em código legado:

- pode melhorar localmente o trecho necessário para entregar a issue;
- deve colocar **nova** regra de negócio na camada correta;
- pode remover duplicação diretamente afetada pela mudança;
- não deve migrar outros domínios “aproveitando o PR”;
- não crie segunda implementação equivalente em outra camada;
- não perpetue adapters legados quando o consumidor tocado puder migrar com segurança;
- dívida relevante fora do escopo deve virar issue separada.

Prefira PRs pequenos e orientados por comportamento a reorganizações estruturais em massa.

---

## 15. Auto code review — obrigatório

Antes de declarar um PR pronto, revise o diff como reviewer sênior independente.

Verifique pelo menos:

### Escopo e arquitetura

- resolve exatamente o objetivo?
- entrou feature não pedida?
- dependências seguem o contrato de camadas?
- surgiu duplicação, abstração ou código morto desnecessário?

### Segurança e dados

- autenticação e ownership estão corretos?
- existe IDOR ou vazamento de existência?
- input externo é validado?
- há segredo/log sensível?
- operação precisa ser atômica?
- retry/double-click pode duplicar efeito?
- saldo, status, centavos e moeda continuam consistentes?
- caminho de leitura continua sem write?

### API e frontend

- status HTTP e erros esperados estão corretos?
- contratos anteriores foram preservados quando exigido?
- loading/error/empty/success funcionam?
- formulário protege reenvio e preserva estado adequadamente?
- efeitos possuem cleanup?
- SSR/client boundaries continuam coerentes?
- teclado, foco, responsividade e safe areas continuam corretos?

### Banco, performance e docs

- migration é realmente necessária e segura?
- código/schema são compatíveis na ordem de deploy?
- dependência ou bundle cresceu sem motivo?
- README/docs/ADR/runbook ficaram desatualizados?
- PR descreve apenas validações realmente executadas?

Se encontrar finding relevante:

1. corrija;
2. reexecute os gates obrigatórios;
3. revise novamente o diff final;
4. atualize o PR.

Não deixe finding conhecido “para depois” sem issue explícita e justificativa de não bloqueio.

---

## 16. Git e PR

Prefixos usuais de branch:

```text
feature/
bugfix/
hotfix/
security/
refactor/
test/
docs/
ux/
```

Regras:

- não trabalhar diretamente em `main`;
- uma issue/objetivo por branch sempre que possível;
- não fazer force-push/reset destrutivo sem necessidade e autorização;
- não gerar commit vazio/artificial para disparar CI/deploy;
- não reescrever histórico compartilhado por conveniência;
- remover branch após merge quando seguro.

Título de PR preferencialmente convencional:

```text
feat: ...
fix: ...
refactor: ...
test: ...
docs: ...
security: ...
perf: ...
```

Corpo mínimo:

```md
## Contexto
Por que a mudança existe.

## Escopo
O que foi alterado.

## Regras preservadas
Invariantes importantes que não mudaram.

## Riscos / decisões
Arquitetura, segurança, migration ou UX relevantes.

## Auto code review
Findings corrigidos ou declaração objetiva de que não restaram bloqueantes.

## Gates
- CI obrigatório do head final
- validações adicionais somente se realmente executadas/relevantes
```

---

## 17. CI, deploy e validações manuais

O CI principal deve permanecer simples: PostgreSQL efêmero, migrations e o mesmo `pnpm check` usado localmente.

Um PR só está saudável quando o **head final** passa no CI obrigatório e não existe finding bloqueante conhecido.

Não crie nem dispare workflows extras apenas para cumprir checklist genérico.

Quota externa de Vercel não é bug da aplicação. Nessa condição:

- não altere código para “corrigir” quota;
- não crie commit artificial;
- registre a limitação de forma explícita;
- use somente evidências de validação realmente executadas.

Validação que depende de dispositivo real não pode ser declarada concluída por automação. O projeto não possui service worker customizado; não prometa offline completo.

---

## 18. Documentação como parte da entrega

Entradas canônicas:

- `docs/DEVELOPMENT.md` — setup, banco, execução local e gate antes do PR;
- `docs/PRODUCTION.md` — preflight, migrations, promoção e verificação;
- `docs/architecture/application-layer-contract.md` — responsabilidades e direção de dependências;
- `docs/adr/` — decisões arquiteturais e invariantes consolidadas;
- `docs/product/` — contratos de comportamento do produto;
- `docs/design/` — decisões visuais e de UX;
- `docs/operations/` — runbooks e operação;
- `docs/quality/` — estratégias, políticas e baselines de qualidade.

Ao alterar comportamento, revise se `README.md`, ADR, contrato de produto, design, runbook, issue ou PR precisam mudar junto.

Documentação deve refletir **o que realmente existe**, não intenção futura.

---

## 19. Coisas que o agente não deve fazer

Nunca:

- inventar funcionalidade porque apareceu em mockup;
- antecipar feature sem issue/escopo próprio;
- esconder erro com `try/catch` vazio;
- usar `any` como atalho sem justificativa;
- impor limite arbitrário de tamanho de função/componente como regra arquitetural;
- criar interface/abstração apenas para “seguir SOLID” sem necessidade real;
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

---

## 20. Definition of Done

Uma tarefa está concluída somente quando:

- o objetivo foi atendido sem escopo acidental;
- código está simples e na camada correta;
- invariantes de domínio foram preservadas ou atualizadas explicitamente;
- segurança e ownership foram revisados;
- centavos e moedas permanecem corretos;
- testes adequados existem e passam;
- migrations são seguras quando aplicáveis;
- `pnpm check`/CI obrigatório do head final passa;
- validações adicionais foram executadas somente quando justificadas pelo risco/escopo;
- auto code review completo foi feito;
- findings relevantes foram corrigidos e os gates reexecutados;
- documentação e PR refletem o estado real;
- nenhuma dependência externa pendente foi apresentada como concluída;
- o head final é o mesmo head validado para merge.

**Qualidade final é responsabilidade do agente que implementou a mudança.**
