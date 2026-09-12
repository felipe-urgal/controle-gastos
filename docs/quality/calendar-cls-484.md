# Calendário Orbit — investigação de CLS (#484)

Data: **2026-09-12**.  
Issue: **#484**.  
Baseline de origem: **#481**.  
Roadmap técnica: **#290**.

Este documento registra a investigação focada do layout shift observado em `/calendario` no baseline pós-Orbit. O snapshot histórico em `post-orbit-performance-baseline.md` permanece inalterado.

## Sintoma reproduzido

A medição foi repetida no `main` já contendo a correção de restauração de sessão da #483, para separar a hipótese de remount de autenticação do problema do Calendário.

Run RED: **34708712347**.

Três execuções autenticadas, no mesmo harness Lighthouse mobile usado pelo baseline, reproduziram o mesmo resultado:

| Execução | CLS | Performance |
| --- | ---: | ---: |
| 1 | 0,15265387 | 65 |
| 2 | 0,15265387 | 86 |
| 3 | 0,15265387 | 85 |

O maior layout shift foi **0,14982695** nas três amostras e continuou associado ao workspace principal do Calendário. Portanto, a #483 não era a causa deste CLS.

## Causa raiz

`useCalendar` iniciava com estas duas condições simultâneas:

- `calendarDays = []`;
- `isLoading = false`.

O fetch do mês é agendado com atraso de 100 ms. Assim, o primeiro paint do mini-calendário compacto renderizava a grade sem nenhum dia. Quando o fetch começava, `fetchMonthTransactions` mudava `isLoading` para `true` e o mesmo componente passava a renderizar o skeleton existente de **35 células / 5 linhas**.

Essa transição de uma grade praticamente vazia para o skeleton completo aumentava a altura do mini-calendário após o primeiro paint e deslocava a timeline e a agenda abaixo. O comportamento corresponde ao shift grande e determinístico de ~0,14983 observado no Lighthouse.

## Correção

A correção é deliberadamente mínima: `useCalendar` passa a iniciar com `isLoading = true`.

Com isso, o primeiro paint já usa o skeleton que o próprio Calendário possuía. Não foi adicionada altura fixa arbitrária, placeholder novo, cache, mudança de composição Orbit ou alteração de contrato de dados.

## Evidência depois da correção

Run GREEN focado: **34708914435**.

As três execuções caíram para:

```text
CLS = 0,0028269235
```

em **3/3 amostras**. O shift de ~0,14983 desapareceu; permaneceu apenas o shift residual de ~0,00283, já muito abaixo do limite bom de 0,10.

Run consolidado com budget: **34709096985**.

- 80 arquivos de teste / 286 testes: ✅;
- build Next.js/Turbopack: ✅;
- frontend budget: ✅;
- JS total: **1.302,6 KiB**;
- maior chunk: **227,7 KiB**;
- Lighthouse `/calendario` 3x: **CLS 0,0028269235 em 3/3**;
- Performance nas três amostras: **71 / 92 / 91**.

A variação do score de Performance reforça que ele não deve ser tratado como benchmark determinístico isolado. O CLS, que era o objeto desta issue, foi estável antes e depois da correção.

## 320px, loading, empty e foco

Foi executada uma QA Chromium específica para o Calendário no run **34709581004**, usando viewport **320×740** e atraso controlado de 800 ms no request de transações para tornar o loading observável.

Resultado: **1/1 teste passou**.

O teste verificou:

- skeleton compacto com 35 células durante o loading;
- controles de mês desabilitados enquanto os dados carregam e habilitados depois;
- transição para o estado vazio real sem transações;
- ausência de overflow horizontal em 320px;
- foco programático e navegação por `Tab` entre controles mensais;
- ativação de um dia por teclado (`Enter`) e atualização de `aria-pressed`.

O harness usado apenas para essa validação foi removido antes do PR final.

## Finding fora do escopo

Uma tentativa anterior de reutilizar o `financial-flow.spec.mjs` completo parou antes da etapa do Calendário por um overlap determinístico de **1 px** no Quick Compose móvel (`672 > 671`) no run `34709309750`.

Esse finding é independente da mudança de loading do Calendário e foi separado na **#489** para evitar scope creep. A asserção não foi afrouxada nesta issue.

## Decisão

A causa do CLS foi identificada e eliminada sem alterar a composição visual Orbit. O estado inicial passa a representar corretamente que a primeira leitura ainda está pendente e reutiliza o skeleton já existente para preservar a geometria desde o primeiro paint.

O critério de CLS móvel da #484 fica atendido com margem ampla: **0,15265 → 0,00283**, reproduzido três vezes antes e três vezes depois no mesmo tipo de harness.

## Referências

- #484 — investigação e correção deste documento;
- #481 — baseline pós-Orbit;
- #483 — restauração de sessão/fetches duplicados, hipótese descartada como causa deste CLS;
- #489 — finding independente do Quick Compose móvel;
- #290 — roadmap técnica;
- `docs/quality/post-orbit-performance-baseline.md` — snapshot histórico;
- `app/hooks/calendar/use-calendar.ts`;
- `app/components/pages/calendar/calendar-grid/index.tsx`;
- `app/components/pages/calendar/calendar/orbit-calendar.tsx`.
