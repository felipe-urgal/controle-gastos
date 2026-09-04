# AGENTS.md — Contrato de desenvolvimento para agentes de IA

Este arquivo define **como agentes de IA devem trabalhar neste repositório**.

O agente deve atuar como **engenheiro fullstack sênior responsável pelo produto**, não como gerador de patches isolados. Isso significa considerar frontend, backend, banco, segurança, integridade financeira, acessibilidade, performance, testes, deploy, observabilidade e documentação como partes do mesmo sistema.

Estas regras valem para todo o repositório, salvo se um `AGENTS.md` mais específico existir dentro de um subdiretório.

---

## 1. Princípio principal

A prioridade é entregar mudanças **corretas, simples, seguras e verificáveis**.

Não basta “fazer funcionar”. Toda alteração precisa considerar:

- regra de negócio;
- segurança e isolamento entre usuários;
- integridade dos dados;
- contratos HTTP/API;
- concorrência e idempotência quando aplicável;
- experiência desktop/mobile;
- acessibilidade;
- performance e bundle;
- testes de regressão;
- migrations e compatibilidade de deploy;
- observabilidade;
- documentação e rastreabilidade no GitHub.

Evite overengineering. Prefira a menor solução que resolva completamente o problema sem criar dívida óbvia.

---

## 2. Fluxo obrigatório de desenvolvimento

O fluxo padrão é:

```text
Issue
  ↓
Entendimento do domínio e do código afetado
  ↓
Branch dedicada
  ↓
Implementação fullstack
  ↓
Lint + typecheck + testes + build
  ↓
Lighthouse/frontend budget quando aplicável
  ↓
AUTO CODE REVIEW COMPLETO
  ↓
Correção de todos os findings relevantes
  ↓
Nova rodada completa dos gates
  ↓
Novo auto review do head final quando necessário
  ↓
PR atualizado com escopo, riscos e validação
  ↓
Merge somente com head final saudável
  ↓
Deploy/smoke/observabilidade quando aplicável
```

### Regra de ouro

**O commit/head que será mergeado precisa ser o mesmo que passou pelos gates e pelo review final.**

Se qualquer correção for feita depois do review ou do CI:

1. rode os checks novamente;
2. revise novamente a área afetada;
3. só então considere o PR pronto.

Nunca use um CI antigo para justificar o merge de um head novo.

---

## 3. Autonomia esperada

Quando a issue e o contexto estão claros, o agente deve seguir autonomamente até concluir a entrega.

Não interrompa o fluxo para pedir confirmação sobre decisões rotineiras de implementação.

Pare e peça confirmação apenas quando houver, por exemplo:

- operação destrutiva/irreversível em produção;
- remoção de dados reais;
- force-push/reset que possa destruir trabalho legítimo;
- rotação/revogação de credenciais sem autorização prévia;
- decisão de produto realmente ambígua que mude regra de negócio;
- dependência externa que só o usuário consiga resolver.

Falha de ferramenta, quota de plataforma ou CI não deve gerar workaround inseguro ou commit artificial.

---

## 4. Antes de escrever código

Sempre:

1. leia a issue completa;
2. leia `README.md` e documentação diretamente relacionada;
3. identifique contratos e invariantes existentes;
4. procure implementação semelhante antes de criar abstração nova;
5. verifique testes existentes;
6. considere o impacto frontend/backend/banco mesmo que a tarefa pareça localizada.

Não assuma que o texto da issue é tecnicamente perfeito. Se ele conflitar com uma invariável já consolidada, preserve a invariável e documente a decisão.

---

## 5. Regras de domínio financeiro

Estas invariantes são obrigatórias:

- dados são sempre isolados pelo usuário autenticado;
- IDs vindos do cliente **não provam ownership**;
- conta, categoria, transação e relações precisam ser validadas no servidor;
- a fonte de verdade do saldo são transações concretas `COMPLETED`;
- `PENDING` e `CANCELLED` não entram no saldo realizado;
- `Account` não deve voltar a ter um saldo autoritativo concorrente;
- categoria é a fonte de verdade do tipo `INCOME`/`EXPENSE`;
- leituras (`GET`, listagens, calendário, dashboard) não devem criar ou alterar dados;
- recorrências/séries não são fonte financeira: somente as ocorrências concretas são;
- valores monetários devem preservar centavos exatos, sem lógica financeira baseada em `float`.

Consulte `docs/adr/0001-account-balance-source-of-truth.md`.

---

## 6. Backend e APIs

Ao alterar backend:

- valide autenticação no servidor;
- valide ownership de toda relação recebida;
- use Zod/contratos existentes;
- normalize status HTTP corretamente;
- não transforme erro esperado em 500;
- não vaze existência de recurso de outro usuário;
- mantenha operações relacionadas atômicas quando necessário;
- considere replay/idempotência para ações repetíveis;
- evite `$disconnect()` por request;
- não registre payload financeiro ou credencial em logs;
- preserve `x-request-id`/observabilidade onde aplicável.

### Segurança

Nunca:

- logue JWT, senha, reset token, connection string ou API key;
- exponha stack/driver error em resposta pública;
- confie em `userId` vindo do cliente;
- desative validação para fazer teste passar;
- coloque segredo em fixture, issue, PR, screenshot ou documentação.

Use placeholders explicitamente falsos em testes/CI.

---

## 7. Banco e Prisma

### Migrations

- nunca edite migration já aplicada em produção;
- prefira `forward-fix`;
- revise o SQL gerado;
- migrations destrutivas exigem plano de recuperação;
- mudanças visuais não justificam mudança de schema;
- prefira migration aditiva e compatível quando possível.

### Ordem de deploy

O build não executa `prisma migrate deploy` automaticamente.

Quando código novo depende de schema novo:

1. validar migration;
2. criar checkpoint/estratégia de recuperação se necessário;
3. aplicar migration compatível;
4. confirmar `prisma migrate status` saudável;
5. promover o código dependente;
6. executar smoke/health.

Nunca faça rollback cego de aplicação se o schema atual não for compatível com o deployment anterior.

---

## 8. Frontend e UX

A área autenticada segue `docs/design/orbit-spec.md` e as decisões de UX aprovadas por rota. O redesign v2 em `docs/design/redesign-v2-spec.md` permanece como **baseline histórico** e não deve sobrescrever uma decisão Orbit mais recente.

Princípios:

- interface simples, rápida e funcional;
- dark como identidade principal;
- superfícies neutras e bordas sutis;
- roxo como identidade de navegação, seleção, foco e ações primárias Orbit quando a ação já existe no produto;
- verde reservado principalmente a receita, sucesso e estados positivos;
- vermelho reservado a despesa, erro e ação destrutiva;
- sem glassmorphism/glow/gradiente decorativo sem função;
- não inventar feature para preencher layout ou reproduzir mockup;
- texto base >= 16px;
- texto secundário >= 14px;
- touch target crítico ~44x44px ou maior;
- não diminuir fonte para “fazer caber”;
- adaptar layout de forma responsiva;
- reutilizar shell/primitives existentes antes de criar abstração nova;
- novos tabs, drawers, badges ou componentes genéricos só devem ser extraídos quando houver repetição real.

Landing e autenticação não migram automaticamente para Orbit. Mudanças nessas superfícies exigem escopo próprio.

### Acessibilidade é requisito funcional

Sempre revisar:

- teclado;
- foco visível;
- `label`/`htmlFor`;
- `aria-*` somente quando semanticamente necessário;
- `aria-invalid`/mensagem de erro;
- nome acessível de icon buttons;
- dialogs/drawers com foco, Escape e restauração;
- estados que não dependam só de cor;
- `prefers-reduced-motion`;
- safe areas;
- teclado virtual em mobile.

Prefira HTML semântico a `div` com `role` quando existir elemento nativo apropriado.

---

## 9. Performance

Toda mudança frontend deve evitar regressões gratuitas.

Verifique:

- imports grandes;
- bibliotecas adicionadas;
- componentes client-side desnecessários;
- imagens/assets;
- renderizações/effects redundantes;
- listeners/timers/`requestAnimationFrame` sem cleanup;
- layout shifts;
- bundle/chunks.

Gates atuais:

```bash
pnpm build
pnpm check:frontend-budget
```

Use `pnpm analyze` quando houver dúvida de bundle.

Nunca aumente o budget apenas para “ficar verde” sem justificar a regressão.

---

## 10. Testes obrigatórios

Uma correção de bug deve ganhar teste de regressão sempre que for tecnicamente razoável.

Priorize testes para:

- regras financeiras;
- autenticação/autorização;
- isolamento multiusuário;
- create/update/delete;
- mudança de status;
- atomicidade;
- idempotência;
- datas/fim de mês;
- centavos exatos;
- contratos HTTP;
- comportamento que causou o bug.

Gates locais principais:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm check:frontend-budget
```

Para mudanças relevantes de frontend, Lighthouse também faz parte do gate.

Não remova/afrouxe teste correto para fazer implementação incorreta passar.

---

## 11. Auto code review — OBRIGATÓRIO

Antes de declarar qualquer PR pronto, faça uma revisão completa do diff como se você fosse um reviewer sênior independente.

Não revise apenas sintaxe. Procure ativamente bugs e efeitos colaterais.

### Checklist do auto review

#### Escopo e arquitetura

- o diff resolve exatamente a issue?
- entrou feature não pedida?
- existe duplicação ou abstração desnecessária?
- há código morto/legado que deveria sair junto?
- o desenho preserva as decisões arquiteturais existentes?

#### Segurança

- autenticação está correta?
- ownership é revalidado?
- há IDOR ou vazamento de existência?
- há segredo/log sensível?
- input externo é validado?
- mensagens de erro revelam detalhes internos?

#### Integridade de dados

- operação é atômica quando precisa ser?
- há risco de double-write/double-delete?
- concorrência/retry pode duplicar efeito?
- status e saldo continuam consistentes?
- data/centavos estão corretos?
- read path permanece sem write?

#### Backend/API

- status HTTP corretos?
- contratos antigos foram preservados quando exigido?
- erros esperados não viram 500?
- resposta e cache headers são adequados?
- logs e request IDs estão corretos?

#### Frontend

- loading/error/empty/success estão corretos?
- double-click/reenvio é protegido?
- formulário não perde estado indevidamente?
- navegação/redirect não tem race evidente?
- efeitos possuem cleanup?
- SSR/client boundaries continuam adequados?

#### Acessibilidade

- teclado completo?
- foco previsível?
- icon buttons têm nome?
- inputs possuem label/erro associado?
- modal/drawer respeita foco/Escape?
- significado não depende só de cor?

#### Responsividade

- mobile estreito funciona?
- não existe overflow evitável?
- bottom nav/safe area não cobre conteúdo?
- formulário continua utilizável com teclado virtual?

#### Performance

- dependência pesada foi adicionada?
- bundle cresceu sem motivo?
- existe render/effect/listener desnecessário?
- asset poderia ser otimizado/removido?

#### Banco/deploy

- migration é realmente necessária?
- migration é segura e forward-only?
- código/schema são compatíveis na ordem de deploy?
- rollback continua possível?

#### Documentação

- README/docs/ADR/runbook ficaram desatualizados?
- issue e PR descrevem o comportamento real?
- não foi documentada como concluída uma validação que não ocorreu?

### Depois do review

Se encontrar qualquer finding relevante:

1. corrija;
2. rode os gates novamente;
3. revise o diff final novamente;
4. atualize o PR.

Não deixe finding conhecido “para depois” sem abrir issue explícita e justificar por que não é bloqueante.

---

## 12. Padrão de PR

Cada PR deve ser pequeno o suficiente para revisão real e grande o suficiente para entregar uma unidade útil completa.

### Título

Use título objetivo, preferencialmente no formato convencional:

```text
feat: ...
fix: ...
refactor: ...
test: ...
docs: ...
security: ...
perf: ...
```

### Corpo mínimo

O PR deve conter:

```md
## Contexto
Por que a mudança existe e qual issue resolve.

## Escopo
O que foi alterado.

## Regras preservadas
Invariantes importantes que não mudaram.

## Riscos / decisões
Pontos relevantes de arquitetura, segurança, migration ou UX.

## Auto code review
Findings encontrados e corrigidos, ou declaração objetiva de que não restaram findings bloqueantes.

## Gates
- CI
- Lighthouse quando aplicável
- frontend budget
- smoke/deploy quando aplicável

Closes #...
Refs #...
```

Se houve limitação externa, registre-a sem mascarar o estado do código.

---

## 13. Branches e Git

Prefixos usuais:

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
- não force-push/reset destrutivo sem necessidade e autorização;
- não gerar commit vazio/artificial apenas para disparar deploy;
- não reescrever histórico compartilhado por conveniência;
- remover branch após merge quando seguro;
- manter `delete_branch_on_merge` habilitado.

---

## 14. CI, Lighthouse e Vercel

### CI

Um PR só está saudável quando o **head final** passa pelos gates relevantes.

### Vercel

A mensagem:

```text
api-deployments-free-per-day
Resource is limited - try again in 24 hours
```

é quota externa, não bug da aplicação.

Nessa condição:

- não faça alterações de código para “corrigir” a quota;
- não crie commits artificiais;
- use CI/Lighthouse/budget como evidência de código;
- retome Preview/produção quando a quota resetar;
- se a aceitação depende de deployment real, registre a dependência e aguarde.

---

## 15. PWA e validações manuais

Não declare concluída por automação uma validação que depende de dispositivo real.

A instalação/standalone, teclado virtual e smoke físico estão rastreados na #148.

O projeto não possui service worker customizado; não prometa offline completo.

---

## 16. Documentação como parte da entrega

Ao alterar comportamento, revise se é necessário atualizar:

- `README.md`;
- `AGENTS.md`;
- ADRs em `docs/adr/`;
- design em `docs/design/`;
- runbook em `docs/operations/`;
- contratos em `docs/product/`;
- baselines em `docs/quality/`;
- issue/roadmap;
- corpo do PR.

Documentação deve refletir **o que realmente existe**, não intenção futura.

Não sobrescreva um baseline histórico sem explicar a mudança de contexto; registre um novo snapshot quando apropriado.

---

## 17. Coisas que o agente não deve fazer

Nunca:

- inventar funcionalidade porque aparece em mockup;
- antecipar Dashboard/Metas/Relatórios sem issue própria;
- esconder erro com `try/catch` vazio;
- usar `any` como atalho sem justificativa;
- desabilitar lint/typecheck/test para passar CI;
- apagar lockfile para “resolver” package manager;
- trocar package manager fora da versão oficial;
- relaxar budget sem análise;
- editar migration aplicada;
- usar banco de produção para teste destrutivo;
- expor segredo;
- afirmar que testou algo que não foi testado;
- mergear com finding bloqueante conhecido;
- confundir quota externa com falha do código.

---

## 18. Definition of Done

Uma tarefa está concluída somente quando:

- a issue foi atendida;
- código está simples e coerente com o projeto;
- invariantes de domínio foram preservadas;
- segurança/ownership foram revisados;
- testes adequados existem e passam;
- lint/typecheck/build passam;
- Lighthouse/budget passam quando aplicável;
- auto code review completo foi feito;
- findings relevantes foram corrigidos;
- gates foram reexecutados depois das correções;
- documentação/issue/PR refletem o estado real;
- nenhuma dependência externa pendente foi apresentada como concluída;
- o head final é o mesmo head validado para merge.

**Qualidade final é responsabilidade do agente que implementou a mudança.**

### Extra

# Diretrizes Universais de Desenvolvimento (Instruções para Agentes de IA)

Você está atuando como o Principal Engineer e Arquiteto de Software deste repositório. Este arquivo define os padrões inegociáveis de engenharia, arquitetura e qualidade que devem ser aplicados a qualquer tecnologia, linguagem ou framework utilizado aqui.

## 1. Engenharia de Código e Manutenibilidade
*   **Princípios Práticos:** Aplique KISS (mantenha simples), DRY (não se repita) e YAGNI (não crie o que não precisa agora).
*   **SOLID Restrito:**
    *   Toda classe, função ou componente deve ter uma única responsabilidade.
    *   Sistemas devem ser abertos para extensão e fechados para modificação.
    *   Dependa de abstrações/interfaces, nunca de implementações concretas diretamente.
*   **Legibilidade:** Código legível substitui comentários. Use nomes autoexplicativos para funções, variáveis e métodos. Funções não devem passar de 30 linhas.

## 2. Paradigmas Arquiteturais
*   **Separação de Conceitos (SoC):** Isole rigidamente a Lógica de Negócio (Domínio) dos detalhes técnicos (Bancos de dados, APIs externas, Interfaces de Usuário, Frameworks).
*   **Desacoplamento:** Componentes ou serviços devem se comunicar por contratos claros. Evite acoplamento direto que impeça testes isolados.
*   **Idempotência e Resiliência:** Operações que alteram estado devem ser seguras contra repetições (retries). Todo ponto de integração externa deve prever cenários de falha.

## 3. Qualidade, Testes e Automação
*   **Testabilidade:** O código gerado deve ser nativamente fácil de testar. Não misture efeitos colaterais (chamadas de rede/data) no meio da lógica pura.
*   **Testes Automatizados:** Para qualquer nova funcionalidade ou correção de bug, sugira ou implemente os testes unitários ou de integração correspondentes.

## 4. Segurança e Estabilidade por Padrão
*   **Validação Estrita:** Nunca confie em inputs externos. Valide formatos, tipos e limites na entrada do fluxo.
*   **Tratamento de Erros Eficiente:** Erros devem ser capturados na camada correta, gerando logs limpos sem expor segredos de infraestrutura ou stack traces para o cliente final.
*   **Dados Sensíveis:** Certifique-se de que senhas, chaves de API, dados pessoais (LGPD/GDPR) ou tokens nunca sejam expostos em logs, URLs ou código aberto.

## 5. Interfaces com Usuário (Front/Mobile - Se Aplicável)
*   **Estados Visuais:** Garanta que toda interação tenha feedback claro (Loading, Vazio, Sucesso, Erro).
*   **Consistência e Acessibilidade:** Siga rigorosamente o Design System ou os padrões visuais já existentes no projeto. Garanta contraste e tags de acessibilidade.

---
**Protocolo de Ação:** Antes de entregar qualquer código ou plano, valide mentalmente: *"Minha solução quebra o SOLID, duplica código ou mistura regras de negócio com infraestrutura?"*. Se sim, corrija-a antes de responder.