# Baseline de UX, performance e PWA

Data da auditoria: 2026-08-29 a 2026-08-30

## Escopo

Rotas críticas da issue #135:

- `/`
- `/login`
- `/contas`
- `/transacoes`
- `/calendario`

As três últimas exigem sessão autenticada. O workflow de Lighthouse cria usuário e sessão de teste isolados contra PostgreSQL efêmero, evitando medir o redirect de login como se fosse a rota protegida.

## Baseline técnico antes das correções

Inventário do repositório antes deste trabalho:

| Item | Baseline |
| --- | ---: |
| `public/background.png` | 1.225.762 bytes |
| `public/logo.png` | 172.655 bytes |
| `public/icon-512x512.png` | 101.171 bytes |
| Maior componente de navegação identificado (`dynamic-filters`) | 12.967 bytes de fonte |

`public/background.png` não possuía referência no código e foi removido, eliminando mais de 1,2 MB do artefato público sem alterar a UI.

> Tamanho de arquivo-fonte não é tamanho de bundle. O bundle é acompanhado pelo build/analyzer e pelo orçamento automatizado abaixo.

## Baseline de bundle após as correções

Medição do CI da PR #145, build Next.js 16.3.3/Turbopack:

| Métrica | Resultado |
| --- | ---: |
| Total de JS em `.next/static/chunks` | 1.019,4 KiB |
| Maior chunk | 227,8 KiB |
| 2º maior chunk | 207,4 KiB |
| 3º maior chunk | 172,8 KiB |
| Limite por chunk | 700 KiB |
| Limite de JS total | 5.120 KiB |
| Limite por asset público | 500 KiB |

Resultado do gate: **Frontend budget OK**.

## Orçamento automatizado

Após `pnpm build`, execute:

```bash
pnpm check:frontend-budget
```

Limites iniciais, deliberadamente conservadores para evitar regressões grandes enquanto coletamos uma série histórica:

- asset individual em `public/`: até 500 KiB;
- chunk JavaScript individual: até 700 KiB;
- total de `.next/static/chunks/*.js`: até 5 MiB.

Os limites podem ser sobrescritos no CI por `FRONTEND_MAX_ASSET_KB`, `FRONTEND_MAX_CHUNK_KB` e `FRONTEND_MAX_TOTAL_JS_KB`.

Para inspeção visual do bundle:

```bash
pnpm analyze
```

## Reprodutibilidade de build

A fonte de verdade do package manager é `packageManager: pnpm@10.34.5` no `package.json`. O CI e a Vercel instalam pelo lockfile pnpm. O `vercel.json` fixa:

```text
pnpm install --frozen-lockfile
```

## Lighthouse / Core Web Vitals

A PR #146 adicionou o workflow `Lighthouse baseline`, executado em perfil mobile com build de produção local, PostgreSQL efêmero e sessão autenticada isolada. Relatórios inválidos ou com `runtimeError` são rejeitados; uma nova tentativa é feita antes de falhar o gate. Os JSONs ficam anexados como artifact por 14 dias.

Baseline pós-merge coletado em `main`, commit `fd4fb23f7c45c4bf0990c728237d6f64c3884757`, workflow run `33306894009` em 2026-08-30:

| Rota | Device | Performance | Accessibility | Best Practices | LCP | CLS | TBT |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `/` | mobile | 46 | 100 | 96 | 5.251 ms | 0,061 | 4.665 ms |
| `/login` | mobile | 84 | 100 | 96 | 3.334 ms | 0,000 | 354 ms |
| `/contas` | mobile | 90 | 100 | 100 | 3.525 ms | 0,000 | 81 ms |
| `/transacoes` | mobile | 88 | 100 | 100 | 3.883 ms | 0,003 | 107 ms |
| `/calendario` | mobile | 87 | 100 | 100 | 3.761 ms | 0,072 | 117 ms |

Lighthouse é uma medição lab e apresenta variação entre runners. Em execuções da PR #146 a landing apresentou Performance superior ao valor pós-merge; por isso, este número é baseline de referência e não um SLO. TBT é usado como proxy de responsividade; INP real depende de dados de campo.

O ponto de atenção principal é a landing, especialmente LCP/TBT. As rotas autenticadas ficaram entre 87 e 90 de Performance e todas as cinco rotas ficaram em **100 de Accessibility** nesta execução.

## Acessibilidade coberta

- foco visível global para elementos interativos;
- associação de `label`, campo e mensagem de erro nos inputs;
- `aria-invalid` e `aria-describedby` em erros de formulário;
- labels reais nos filtros/selects e nomes/estado nos botões de modo de visualização;
- bottom navigation com nome acessível, `aria-current` e ação de logout nomeada;
- controles do calendário com nomes acessíveis;
- modal de confirmação com `role=dialog`, `aria-modal`, título/descrição associados, foco inicial, restauração de foco e fechamento por `Escape`;
- landmark `<main>` nas telas de autenticação;
- respeito global a `prefers-reduced-motion`;
- canvas decorativo reduz carga em mobile, para animação quando reduced motion está ativo e cancela `requestAnimationFrame` no cleanup;
- Lighthouse/axe automatizado com Accessibility 100 nas cinco rotas críticas em `main`.

## PWA / mobile smoke

Validações automatizadas e de produção concluídas:

- [x] `manifest.json` responde 200 em produção e contém `id`, `scope`, `start_url`, idioma, `display: standalone` e ícones 192/512;
- [x] landing e login respondem 200 no domínio de produção;
- [x] `/api/health` responde 200 com aplicação e banco `ok`;
- [x] viewport usa `viewport-fit=cover` e a UI possui tratamento de safe area;
- [x] Lighthouse mobile das cinco rotas críticas executa em CI com reports persistidos;
- [x] novo deployment de produção ficou `READY` e não apresentou 5xx no smoke pós-merge.

Validações que dependem de navegador/dispositivo real e não devem ser marcadas como concluídas por automação headless:

- [ ] instalação em Android/Chrome ou desktop Chromium abre em modo standalone;
- [ ] ícones 192 e 512 renderizam corretamente no prompt/app instalado;
- [ ] bottom navigation não colide visualmente com a safe area no dispositivo;
- [ ] formulários permanecem utilizáveis com teclado virtual aberto;
- [ ] atualização para um novo deployment é observável após recarregar/fechar e reabrir o app instalado;
- [ ] navegação completa por teclado/leitor de tela recebe smoke manual nas telas críticas.

Não há service worker customizado no projeto neste baseline. Portanto, não prometemos funcionamento offline completo nem uma política de cache própria. Falhas de rede devem continuar apresentando estados explícitos na aplicação; se um service worker for adotado futuramente, a estratégia de atualização e invalidação precisa ser definida junto com ele.
