# Baseline de UX, performance e PWA

Data da auditoria: 2026-08-29

## Escopo

Rotas críticas da issue #135:

- `/`
- `/login`
- `/contas`
- `/transacoes`
- `/calendario`

As três últimas exigem sessão autenticada e, por isso, o baseline Lighthouse delas deve ser coletado com uma sessão de teste válida. Não registramos pontuações inventadas nem auditamos o redirect de login como se fosse a rota protegida.

## Baseline técnico antes das correções

Inventário do repositório antes deste trabalho:

| Item | Baseline |
| --- | ---: |
| `public/background.png` | 1.225.762 bytes |
| `public/logo.png` | 172.655 bytes |
| `public/icon-512x512.png` | 101.171 bytes |
| Maior componente de navegação identificado (`dynamic-filters`) | 12.967 bytes de fonte |

`public/background.png` não possui referência no código atual e é removido nesta alteração, eliminando mais de 1,2 MB do artefato público sem alterar a UI.

> Tamanho de arquivo-fonte não é tamanho de bundle. O bundle deve ser acompanhado pelo build/analyzer e pelo orçamento automatizado abaixo.

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

## Lighthouse / Core Web Vitals

O baseline deve ser coletado em mobile e desktop, sempre registrando URL, commit/deployment e data. Para páginas públicas, pode ser usado Lighthouse em produção ou Preview. Para páginas protegidas, autentique uma conta de teste antes da captura.

Registrar para cada rota:

| Rota | Device | Performance | Accessibility | Best Practices | LCP | CLS | INP/TBT | Evidência |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| `/` | mobile | pendente | pendente | pendente | pendente | pendente | pendente | coletar no Preview |
| `/login` | mobile | pendente | pendente | pendente | pendente | pendente | pendente | coletar no Preview |
| `/contas` | mobile | pendente | pendente | pendente | pendente | pendente | pendente | requer sessão de teste |
| `/transacoes` | mobile | pendente | pendente | pendente | pendente | pendente | pendente | requer sessão de teste |
| `/calendario` | mobile | pendente | pendente | pendente | pendente | pendente | pendente | requer sessão de teste |

Pontuações permanecem como **pendentes** até a execução real. Isso evita confundir baseline documental com medição inexistente.

## Acessibilidade coberta no código

- foco visível global para elementos interativos;
- associação de `label`, campo e mensagem de erro nos inputs;
- `aria-invalid` e `aria-describedby` em erros de formulário;
- bottom navigation com nome acessível, `aria-current` e ação de logout nomeada;
- modal de confirmação com `role=dialog`, `aria-modal`, título/descrição associados, foco inicial, restauração de foco e fechamento por `Escape`;
- respeito global a `prefers-reduced-motion`;
- canvas decorativo reduz carga em mobile, para animação quando reduced motion está ativo e cancela `requestAnimationFrame` no cleanup.

## PWA / mobile smoke

Checklist para Preview e produção:

- [ ] manifest responde 200 e contém `id`, `scope`, `start_url`, idioma e ícones;
- [ ] instalação em Android/Chrome ou desktop Chromium abre em modo standalone;
- [ ] ícones 192 e 512 renderizam corretamente no prompt/app instalado;
- [ ] bottom navigation não colide com safe area;
- [ ] formulários permanecem utilizáveis com teclado virtual aberto;
- [ ] atualização para um novo deployment é observável após recarregar/fechar e reabrir o app;
- [ ] falha de rede apresenta erro explícito nos fluxos críticos, sem spinner infinito;
- [ ] navegação de teclado alcança ações críticas e foco permanece visível.

Não há service worker customizado no projeto neste baseline. Portanto, não prometemos funcionamento offline completo nem uma política de cache própria; qualquer adoção futura deve definir explicitamente estratégia de atualização e invalidação.
