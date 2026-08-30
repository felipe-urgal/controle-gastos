# Baseline de UX, performance e PWA

Data da auditoria original: **2026-08-29 a 2026-08-30**.

> Este documento preserva o baseline técnico coletado **antes do redesign v2 completo**. Ele continua útil como referência histórica, mas não deve ser tratado como SLO nem como baseline final do produto redesenhado. A issue #172 deve registrar a nova fotografia pós-redesign quando Auth (#175 / PR #185) estiver concluído.

## Escopo monitorado

Rotas críticas:

- `/`
- `/login`
- `/contas`
- `/transacoes`
- `/calendario`

As três últimas exigem sessão autenticada. O workflow de Lighthouse cria usuário e sessão de teste isolados contra PostgreSQL efêmero, evitando medir redirect de login como se fosse a rota protegida.

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

Lighthouse é medição **lab** e varia entre runners. TBT é proxy de responsividade; INP real depende de dados de campo.

## O que mudou depois desse baseline

Depois da fotografia acima, o roadmap #163 redesenhou progressivamente:

- Foundation (#165);
- shell (#166);
- Transações (#167);
- Contas (#168);
- Categorias (#174);
- Calendário (#169);
- Perfil/configurações (#170);
- Landing (#171);
- Autenticação (#175, em PR #185 no momento desta atualização).

Cada slice passou ou passa por CI, Lighthouse e frontend budget antes do merge. Isso prova ausência de regressão contra os gates configurados, mas **não substitui uma nova tabela numérica consolidada**.

A #172 é responsável por:

1. reexecutar e registrar o baseline pós-redesign;
2. comparar implementação com o protótipo aprovado;
3. revisar desktop/mobile, contraste, foco e reduced motion;
4. procurar resíduos do visual legado;
5. manter o frontend budget monitorado.

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
- [x] frontend budget é gate automatizado.

Validações deliberadamente manuais, mantidas na #148:

- [ ] instalação em Android/Chrome ou desktop Chromium abre em standalone;
- [ ] ícones 192/512 renderizam corretamente no app instalado;
- [ ] bottom navigation não colide com a safe area em dispositivo real;
- [ ] formulários funcionam com teclado virtual aberto;
- [ ] atualização para novo deployment é observável após recarregar/reabrir;
- [ ] smoke de teclado/leitor de tela em dispositivo/navegador real.

O projeto não possui service worker customizado; portanto, não promete funcionamento offline completo nem política própria de cache.

## Limitação temporária de Preview Vercel

Durante o redesign, a conta atingiu a cota `api-deployments-free-per-day`. Essa falha é de **limite externo de deployment** e não deve ser confundida com regressão de build.

Enquanto a cota estiver ativa:

- CI + Lighthouse + frontend budget continuam sendo os gates de código;
- não se deve gerar commits/redeploys artificiais para contornar a cota;
- Preview/produção devem ser revisitados quando a cota resetar;
- a #172 deve registrar a validação final real quando disponível.

Refs #135, #148, #163 e #172.
