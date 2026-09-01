# Baseline de UX, performance e PWA

Data da auditoria original: **2026-08-29 a 2026-08-30**.  
Data da consolidação pós-redesign: **2026-08-30**.  
Última atualização de contexto: **2026-09-01**.

> Este documento preserva medições históricas. Os números não são reescritos retroativamente quando novas rotas entram no produto. Após a #154 / PR #197, `/dashboard` passou a fazer parte do workflow Lighthouse atual e foi validado no Lighthouse #130 do PR. A fotografia consolidada abaixo continua representando o fechamento do redesign em 2026-08-30.

## Escopo monitorado atual

Rotas críticas do workflow:

- `/`
- `/login`
- `/dashboard`
- `/contas`
- `/transacoes`
- `/calendario`

Rotas autenticadas usam usuário/sessão de teste isolados contra PostgreSQL efêmero, evitando medir redirect de login como se fosse a tela protegida.

## Baseline pós-redesign v2 — fotografia histórica

A fotografia consolidada do fechamento do redesign foi coletada no PR #186 sobre o head `8bf8a22e15233b421ecef7c69561713c4e6b68ca`, workflow **Lighthouse baseline #96 / run `33330612996`**. O CI correspondente (**#131 / run `33330612989`**) concluiu lint, typecheck, testes, build e frontend budget com sucesso.

| Rota | Device | Performance | Accessibility | Best Practices | LCP | CLS | TBT |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `/` | mobile | 94 | 100 | 96 | 3.154 ms | 0,000 | 42 ms |
| `/login` | mobile | 93 | 100 | 96 | 3.188 ms | 0,000 | 33 ms |
| `/contas` | mobile | 92 | 100 | 100 | 3.316 ms | 0,005 | 46 ms |
| `/transacoes` | mobile | 91 | 100 | 100 | 3.362 ms | 0,001 | 138 ms |
| `/calendario` | mobile | 91 | 100 | 100 | 3.456 ms | 0,003 | 69 ms |

### Leitura dos resultados

- Accessibility atingiu **100** nas cinco rotas da fotografia;
- Performance ficou entre **91 e 94** nessa execução;
- home/login ficaram com Best Practices 96 pelo comportamento conhecido do bootstrap público de autenticação naquele baseline;
- o CLS de `/contas` (`0,005`) é variação lab pequena;
- Lighthouse é medição de laboratório; TBT é proxy, não INP de campo.

## Dashboard após o baseline do redesign

O Dashboard foi entregue na #154 / PR #197 e passou a integrar as rotas autenticadas medidas pelo workflow.

A entrega registrou:

- Lighthouse #130: ✅;
- `/dashboard` incluído na execução autenticada;
- CI #168: ✅;
- frontend budget: ✅.

Esses resultados comprovam o gate da feature, mas não são misturados à tabela de 2026-08-30 porque representam outro head e outro momento do produto.

## Comparação com o baseline histórico anterior ao redesign

| Rota | Performance antes → depois | LCP antes → depois | CLS antes → depois | TBT antes → depois |
| --- | --- | --- | --- | --- |
| `/` | 46 → 94 | 5.251 → 3.154 ms | 0,061 → 0,000 | 4.665 → 42 ms |
| `/login` | 84 → 93 | 3.334 → 3.188 ms | 0,000 → 0,000 | 354 → 33 ms |
| `/contas` | 90 → 92 | 3.525 → 3.316 ms | 0,000 → 0,005 | 81 → 46 ms |
| `/transacoes` | 88 → 91 | 3.883 → 3.362 ms | 0,003 → 0,001 | 107 → 138 ms |
| `/calendario` | 87 → 91 | 3.761 → 3.456 ms | 0,072 → 0,003 | 117 → 69 ms |

A maior mudança da amostra consolidada ocorreu na landing: Performance 46 → 94 e TBT 4.665 ms → 42 ms.

## Fidelity e QA final

O registro detalhado do fechamento visual está em [`redesign-v2-fidelity-ledger.md`](redesign-v2-fidelity-ledger.md).

No PR #186 foram corrigidos, entre outros pontos:

- gradiente roxo/índigo legado no root layout;
- glassmorphism na error boundary;
- tipografia abaixo da escala mínima nos códigos de erro;
- ARIA inválido no cabeçalho semanal do calendário;
- nome acessível do dia atual sem o texto visível “Hoje”.

## Preview Vercel pós-redesign

O code head funcional do PR #186 teve Preview `Ready` em 2026-08-30 e a landing respondeu HTTP 200. Commits documentais posteriores atingiram temporariamente `api-deployments-free-per-day`, sem mudança de runtime.

A #148 continua responsável por instalação/standalone, safe-area física, teclado virtual, atualização do app instalado e leitor de tela em dispositivo real.

## Baseline técnico antes das correções

| Item | Baseline |
| --- | ---: |
| `public/background.png` | 1.225.762 bytes |
| `public/logo.png` | 172.655 bytes |
| `public/icon-512x512.png` | 101.171 bytes |
| Maior componente de navegação identificado (`dynamic-filters`) | 12.967 bytes de fonte |

`public/background.png` não possuía referência no código e foi removido, eliminando mais de 1,2 MB de asset público sem mudança visual correspondente.

> Tamanho de arquivo-fonte não é tamanho de bundle. Bundle é acompanhado pelo build/analyzer e orçamento automatizado.

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

Overrides:

- `FRONTEND_MAX_ASSET_KB`;
- `FRONTEND_MAX_CHUNK_KB`;
- `FRONTEND_MAX_TOTAL_JS_KB`.

Bundle analyzer:

```bash
pnpm analyze
```

## Reprodutibilidade

A fonte de verdade do package manager é `packageManager: pnpm@10.34.5` no `package.json`.

CI e Vercel instalam pelo lockfile congelado.

## Lighthouse histórico original

A PR #146 adicionou o workflow em perfil mobile com build de produção local, PostgreSQL efêmero e sessão autenticada isolada.

Baseline pós-merge original em `main`, commit `fd4fb23f7c45c4bf0990c728237d6f64c3884757`, workflow run `33306894009`:

| Rota | Device | Performance | Accessibility | Best Practices | LCP | CLS | TBT |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `/` | mobile | 46 | 100 | 96 | 5.251 ms | 0,061 | 4.665 ms |
| `/login` | mobile | 84 | 100 | 96 | 3.334 ms | 0,000 | 354 ms |
| `/contas` | mobile | 90 | 100 | 100 | 3.525 ms | 0,000 | 81 ms |
| `/transacoes` | mobile | 88 | 100 | 100 | 3.883 ms | 0,003 | 107 ms |
| `/calendario` | mobile | 87 | 100 | 100 | 3.761 ms | 0,072 | 117 ms |

## Acessibilidade coberta pela base

- foco visível global;
- associação de label, campo e erro;
- `aria-invalid` e `aria-describedby`;
- navegação com nomes acessíveis e `aria-current`;
- controles do calendário nomeados;
- dialogs com focus trap, Escape e restauração de foco;
- landmarks e skip links;
- `prefers-reduced-motion`;
- touch targets compatíveis com mobile;
- tipografia do redesign com base >= 16px e apoio >= 14px.

## PWA / mobile

Automatizado:

- [x] manifest e ícones versionados;
- [x] `/api/health` com readiness;
- [x] `viewport-fit=cover`;
- [x] shell/bottom navigation tratam safe areas;
- [x] Lighthouse mobile nas rotas críticas;
- [x] frontend budget no CI.

Deliberadamente manual na #148:

- [ ] instalação/standalone em dispositivo ou navegador real;
- [ ] ícones do app instalado;
- [ ] safe-area física;
- [ ] formulários com teclado virtual;
- [ ] atualização observável após novo deployment;
- [ ] smoke de teclado/leitor de tela real.

O projeto não possui service worker customizado e não promete offline completo.

## Referências

#135, #148, #154, #163, #172, PR #186 e PR #197.
