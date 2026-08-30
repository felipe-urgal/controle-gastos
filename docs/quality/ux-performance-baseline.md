# Baseline de UX, performance e PWA

Data da auditoria original: **2026-08-29 a 2026-08-30**.
Data da consolidação pós-redesign: **2026-08-30**.

> Este documento preserva o baseline técnico anterior ao redesign v2 e registra a nova fotografia consolidada do **Redesign v2 — Protótipo 2 / Dark Command Center**. As medições são de laboratório e servem como referência comparativa, não como SLO.

## Escopo monitorado

Rotas críticas:

- `/`
- `/login`
- `/contas`
- `/transacoes`
- `/calendario`

As três últimas exigem sessão autenticada. O workflow de Lighthouse cria usuário e sessão de teste isolados contra PostgreSQL efêmero, evitando medir redirect de login como se fosse a rota protegida.

## Baseline pós-redesign v2

A fotografia consolidada foi coletada no PR #186 sobre o head `8bf8a22e15233b421ecef7c69561713c4e6b68ca`, workflow **Lighthouse baseline #96 / run `33330612996`**. O CI correspondente (**#131 / run `33330612989`**) concluiu com sucesso lint, typecheck, testes, build e frontend budget.

| Rota | Device | Performance | Accessibility | Best Practices | LCP | CLS | TBT |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `/` | mobile | 94 | 100 | 96 | 3.154 ms | 0,000 | 42 ms |
| `/login` | mobile | 93 | 100 | 96 | 3.188 ms | 0,000 | 33 ms |
| `/contas` | mobile | 92 | 100 | 100 | 3.316 ms | 0,005 | 46 ms |
| `/transacoes` | mobile | 91 | 100 | 100 | 3.362 ms | 0,001 | 138 ms |
| `/calendario` | mobile | 91 | 100 | 100 | 3.456 ms | 0,003 | 69 ms |

### Leitura dos resultados

- todas as cinco rotas atingiram **Accessibility 100** após a correção final dos nomes acessíveis do calendário;
- performance ficou entre **91 e 94** nas cinco rotas nessa execução;
- home e login permanecem com Best Practices 96 porque o bootstrap público de autenticação consulta `/api/user` sem sessão e recebe `401`, comportamento já existente no baseline histórico; não há exceção de aplicação associada e o fluxo trata o estado como não autenticado;
- o pequeno CLS de `/contas` (`0,005`) é variação lab mínima e não representa regressão material;
- Lighthouse é medição lab e varia entre runners; TBT é proxy de responsividade e INP real depende de dados de campo.

### Comparação com o baseline histórico

| Rota | Performance antes → depois | LCP antes → depois | CLS antes → depois | TBT antes → depois |
| --- | --- | --- | --- | --- |
| `/` | 46 → 94 | 5.251 → 3.154 ms | 0,061 → 0,000 | 4.665 → 42 ms |
| `/login` | 84 → 93 | 3.334 → 3.188 ms | 0,000 → 0,000 | 354 → 33 ms |
| `/contas` | 90 → 92 | 3.525 → 3.316 ms | 0,000 → 0,005 | 81 → 46 ms |
| `/transacoes` | 88 → 91 | 3.883 → 3.362 ms | 0,003 → 0,001 | 107 → 138 ms |
| `/calendario` | 87 → 91 | 3.761 → 3.456 ms | 0,072 → 0,003 | 117 → 69 ms |

A maior mudança continua na landing: Performance subiu de 46 para 94 e TBT caiu de 4.665 ms para 42 ms na amostra consolidada. A variação de TBT em `/transacoes` continua dentro do caráter lab da medição e não causou falha no workflow.

## Fidelity e QA final

O registro detalhado de divergências encontradas, correções, exceções intencionais e auto code review está em [`docs/quality/redesign-v2-fidelity-ledger.md`](redesign-v2-fidelity-ledger.md).

No fechamento da #172 foram corrigidos, entre outros pontos:

- gradiente roxo/índigo legado ainda aplicado no `body` raiz;
- glassmorphism remanescente na error boundary;
- tipografia de 12px nos códigos de erro;
- atributos ARIA inválidos no cabeçalho semanal do calendário;
- nome acessível do dia atual sem o texto visível “Hoje”.

A busca transversal por `purple-`, `indigo-`, `bg-gradient` e `backdrop-blur` confirmou a remoção dos resíduos decorativos identificados nas superfícies principais. Usos de `text-xs` remanescentes são apenas dimensionamento de ícones, sem texto visível ao usuário.

## Preview Vercel pós-redesign

O code head funcional `19f3dcab` teve Preview **Ready** em 2026-08-30. A rota pública `/` respondeu HTTP 200 e o HTML renderizado confirmou que o `body` não contém mais o gradiente legado.

Os commits posteriores até o fechamento alteram somente documentação. O redeploy documental posterior atingiu a cota `api-deployments-free-per-day`, sem mudança de runtime. A validação automatizada de rotas protegidas permanece coberta pelo Lighthouse com sessão efêmera isolada. O smoke físico de instalação, standalone, safe area, teclado virtual e leitor de tela continua deliberadamente na #148.

## Baseline técnico antes das correções

| Item | Baseline |
| --- | ---: |
| `public/background.png` | 1.225.762 bytes |
| `public/logo.png` | 172.655 bytes |
| `public/icon-512x512.png` | 101.171 bytes |
| Maior componente de navegação identificado (`dynamic-filters`) | 12.967 bytes de fonte |

`public/background.png` não possuía referência no código e foi removido, eliminando mais de 1,2 MB do artefato público sem alterar a UI daquele momento.

> Tamanho de arquivo-fonte não é tamanho de bundle. O bundle é acompanhado pelo build/analyzer e pelo orçamento automatizado.

## Baseline de bundle após a primeira auditoria

Medição da PR #145, Next.js 16.3.3/Turbopack:

| Métrica | Resultado |
| --- | ---: |
| Total de JS em `.next/static/chunks` | 1.019,4 KiB |
| Maior chunk | 227,8 KiB |
| 2º maior chunk | 207,4 KiB |
| 3º maior chunk | 172,8 KiB |
| Limite por chunk | 700 KiB |
| Limite de JS total | 5.120 KiB |
| Limite por asset público | 500 KiB |

Resultado daquele gate: **Frontend budget OK**.

## Orçamento automatizado atual

Após `pnpm build`:

```bash
pnpm check:frontend-budget
```

Limites:

- asset individual em `public/`: até 500 KiB;
- chunk JavaScript individual: até 700 KiB;
- total de `.next/static/chunks/*.js`: até 5 MiB.

Overrides disponíveis:

- `FRONTEND_MAX_ASSET_KB`;
- `FRONTEND_MAX_CHUNK_KB`;
- `FRONTEND_MAX_TOTAL_JS_KB`.

Bundle analyzer:

```bash
pnpm analyze
```

## Reprodutibilidade de build

A fonte de verdade do package manager é `packageManager: pnpm@10.34.5` no `package.json`.

CI e Vercel instalam pelo lockfile; `vercel.json` fixa:

```text
pnpm install --frozen-lockfile
```

## Lighthouse histórico

A PR #146 adicionou o workflow Lighthouse em perfil mobile com build de produção local, PostgreSQL efêmero e sessão autenticada isolada. Relatórios inválidos ou com `runtimeError` são rejeitados e os JSONs ficam disponíveis como artifact por tempo limitado.

Baseline pós-merge original coletado em `main`, commit `fd4fb23f7c45c4bf0990c728237d6f64c3884757`, workflow run `33306894009`:

| Rota | Device | Performance | Accessibility | Best Practices | LCP | CLS | TBT |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `/` | mobile | 46 | 100 | 96 | 5.251 ms | 0,061 | 4.665 ms |
| `/login` | mobile | 84 | 100 | 96 | 3.334 ms | 0,000 | 354 ms |
| `/contas` | mobile | 90 | 100 | 100 | 3.525 ms | 0,000 | 81 ms |
| `/transacoes` | mobile | 88 | 100 | 100 | 3.883 ms | 0,003 | 107 ms |
| `/calendario` | mobile | 87 | 100 | 100 | 3.761 ms | 0,072 | 117 ms |

## Acessibilidade coberta pela base

- foco visível global;
- associação de `label`, campo e erro;
- `aria-invalid` e `aria-describedby`;
- navegação com nomes acessíveis e `aria-current`;
- controles do calendário nomeados;
- modais/dialogs com semântica, focus trap, Escape e restauração de foco;
- landmarks e skip links;
- respeito a `prefers-reduced-motion`;
- touch targets compatíveis com mobile;
- tipografia do redesign com base >= 16px e apoio >= 14px.

## PWA / mobile

Validações automatizadas já existentes:

- [x] `manifest.json` responde corretamente e possui `id`, `scope`, `start_url`, idioma, `display: standalone` e ícones 192/512;
- [x] `/api/health` faz readiness de aplicação/banco;
- [x] viewport usa `viewport-fit=cover`;
- [x] shell/bottom navigation tratam safe areas;
- [x] Lighthouse mobile roda nas cinco rotas críticas;
- [x] frontend budget é gate automatizado;
- [x] Preview funcional do PR #186 atingiu `Ready` e a landing respondeu HTTP 200.

Validações deliberadamente manuais, mantidas na #148:

- [ ] instalação em Android/Chrome ou desktop Chromium abre em standalone;
- [ ] ícones 192/512 renderizam corretamente no app instalado;
- [ ] bottom navigation não colide com a safe area em dispositivo real;
- [ ] formulários funcionam com teclado virtual aberto;
- [ ] atualização para novo deployment é observável após recarregar/reabrir;
- [ ] smoke de teclado/leitor de tela em dispositivo/navegador real.

O projeto não possui service worker customizado; portanto, não promete funcionamento offline completo nem política própria de cache.

## Estado dos gates do fechamento

No head `8bf8a22e15233b421ecef7c69561713c4e6b68ca`, antes deste ajuste documental final:

- CI #131 / run `33330612989`: **success**;
- Lighthouse #96 / run `33330612996`: **success**;
- frontend budget: **success**, como etapa do CI;
- Preview funcional: **Ready**;
- auto code review do agente: **concluído sem finding bloqueante**;
- bot Codex: indisponível por limite de uso da integração, registrado como limitação externa e não como substituto do auto review do `AGENTS.md`;
- smoke físico PWA/dispositivo: continua na #148.

Como este documento foi atualizado após o review para refletir o estado real, o novo head deve passar novamente pelos gates antes do merge.

Refs #135, #148, #163, #172 e PR #186.
