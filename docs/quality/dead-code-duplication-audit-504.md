# Auditoria de código morto, duplicações e arquivos órfãos — #504

Data: 2026-09-16  
Roadmap: #290  
Base auditada: `377976da15b5a216a45b4687d4725a12b29843a1`  
Branch de evidência: `chore/dead-code-duplication-audit`

## Objetivo

Registrar evidência reproduzível sobre código morto, duplicações e arquivos órfãos sem misturar a auditoria com remoções/refactors de runtime.

A regra usada foi conservadora: um arquivo não é classificado como morto apenas porque parece antigo, pequeno ou não aparece em uma busca superficial. Rotas/convenções do Next.js, testes descobertos pelo runner, assets públicos, CSS global e scripts de automação exigem evidência específica antes de qualquer remoção.

## Método

1. Fixar o head auditado e inspecionar a árvore atual.
2. Revisar os namespaces principais: `app/components`, `app/hooks`, `app/lib`, `app/services`, `app/utils`, `app/schemas`, `app/types`, `app/stylesheets`, `scripts` e `public`.
3. Para candidatos de código morto, combinar:
   - busca pelo caminho de import;
   - busca por símbolo exportado;
   - inspeção dos consumidores encontrados;
   - inspeção do entrypoint atual da feature.
4. Para duplicações, comparar implementações equivalentes e separar duplicação acidental de formatação contextual legítima.
5. Classificar cada finding como:
   - **removível** — sem consumidor real demonstrado;
   - **duplicação a consolidar** — dois caminhos implementam a mesma responsabilidade;
   - **legítimo** — há consumidor/contrato atual comprovado;
   - **inconclusivo** — evidência insuficiente para remoção segura.
6. Separar mudanças de runtime em follow-ups próprios; esta branch versiona somente a evidência.

## Findings

### D01 — Remanescentes de listagens anteriores ao Orbit

**Classificação:** removível  
**Follow-up:** #505

As superfícies atuais não usam mais os componentes antigos de card/grid/lista:

- Contas: `app/components/pages/account/index/index.tsx` reexporta `orbit-accounts`;
- Transações: `app/components/pages/transactions/index/index.tsx` reexporta `orbit-transactions`;
- Categorias: `app/components/pages/category/index/index.tsx` renderiza `CategoryMonthlyLimits`.

No head auditado, as buscas pelos caminhos dos componentes abaixo retornam apenas os barrels correspondentes e/ou referências internas do próprio cluster legado:

```text
app/components/pages/account/index/card/
app/components/pages/account/index/view-card/
app/components/pages/account/index/view-list/

app/components/pages/category/index/card/
app/components/pages/category/index/view-card/
app/components/pages/category/index/view-list/

app/components/pages/transactions/index/card/
app/components/pages/transactions/index/view-card/
app/components/pages/transactions/index/view-list/
app/components/pages/transactions/index/summary/
```

Os tipos exclusivos dessas views também ficam candidatos à remoção:

- `AccountCardProps` e `ViewProps` em `app/lib/interface/accounts.interface.ts`;
- `CategoryCardProps` e `ViewProps` em `app/lib/interface/category.interface.ts`;
- `TransactionCardProps` e `ViewProps` em `app/lib/interface/transaction.interface.ts`.

Os props de formulário/detalhe nos mesmos arquivos continuam legítimos e não pertencem ao finding.

`app/lib/string/highlight-text.tsx` é consumido somente pelos `view-card/view-list` acima. Após a remoção do cluster, deve ficar sem consumidores; a #505 exige uma nova busca no head de implementação antes de apagá-lo.

### D02 — Fluxo modal/apresentação pré-Orbit do Calendário

**Classificação:** removível  
**Follow-up:** #506

A rota atual reexporta `app/components/pages/calendar/calendar/orbit-calendar.tsx`.

A implementação Orbit ainda usa e deve preservar:

- `CalendarGrid`;
- `CalendarDaysSkeleton`;
- `useCalendar`;
- `useCalendarPersistence`.

Por outro lado, as buscas no head auditado mostram somente definição + barrel para:

- `DayModal`;
- `MonthlySummary` e `MonthlySummarySkeleton`;
- `CalendarHeader`;
- `WeekDaysHeader`.

O encadeamento antigo também torna candidatos:

- `app/components/pages/calendar/modals/summary-cards/`;
- `app/components/pages/calendar/modals/transactions-list/`;
- `app/components/pages/calendar/modals/transaction-card/`;
- `app/hooks/calendar/use-day-transactions.ts`;
- `app/hooks/calendar/use-calendar-modal.ts`.

`DayModal` é o consumidor do hook `useDayTransactions` e dos componentes `SummaryCards`/`TransactionsList`; `TransactionsList` usa o `TransactionCard` do mesmo subdiretório. `useCalendarModal` não apresentou consumidor fora da própria definição.

A #506 mantém como guardrail explícito não remover `CalendarGrid`, seu skeleton nem a persistência ainda usada pelo Orbit.

### D03 — Utilitário legado da landing sem consumidor

**Classificação:** removível  
**Follow-up:** #508

`app/utils/home/animation.ts` exporta:

- `ANIMATION_CONFIG`;
- `ROUTES`;
- `MOCK_DATA`.

A busca por `utils/home/animation` não encontrou imports. A busca por `ANIMATION_CONFIG` encontrou somente a própria definição. O follow-up exige repetir as buscas por caminho/símbolo no head de implementação antes da remoção.

### D04 — Formatter de moeda duplicado na Import Inbox

**Classificação:** duplicação a consolidar  
**Follow-up:** #507

O projeto já possui `formatCurrency` em `app/lib/currency/format-currency.ts`, com suporte a `locale`, `currency` e valores em centavos.

`app/components/pages/transactions/import/index.tsx` mantém `formatAmount`, que repete `Intl.NumberFormat('pt-BR', { style: 'currency', currency })` e divide centavos por 100. A responsabilidade adicional local é apenas mascarar o valor quando `showValues=false`.

A consolidação correta é manter a decisão de privacidade local e reutilizar `formatCurrency` apenas para a formatação do valor visível, sem alterar arredondamento, moeda ou fluxo de importação.

## Itens revisados e mantidos

### `app/schemas/transfer.schema.ts`

**Classificação:** legítimo

`createTransferSchema` possui consumidor real em `app/api/transfers/route.ts`; não é schema órfão apesar de ser o único arquivo restante em `app/schemas`.

### `app/services/*`

**Classificação:** legítimo

A camada continua sendo o client API da aplicação. Serviços pequenos como `account-service.ts` possuem múltiplos consumidores em hooks e componentes atuais; tamanho reduzido não é evidência de código morto.

### Stylesheets globais

**Classificação:** legítimo

`globals.css`, `app-shell.css` e `orbit.css` são importados pelo layout da aplicação. Os testes de stylesheets também são descobertos pelo runner e não dependem de import de produção.

### Scripts de qualidade/operação

**Classificação:** legítimo

- `scripts/analyze-bundle.mjs`, `scripts/check-frontend-budget.mjs` e `scripts/prod-check.mjs` são referenciados por scripts do `package.json`;
- `scripts/run-lighthouse.mjs` e `scripts/summarize-lighthouse.mjs` são usados por `.github/workflows/lighthouse.yml`.

### Assets públicos

**Classificação:** legítimo ou conservadoramente mantido

- `icon-192x192.png` e `icon-512x512.png` são referenciados por `public/manifest.json`;
- `logo.png` é usado em metadata/layouts;
- `public/exemplos/` é referenciado pela tela de importação para download de arquivo exemplo;
- favicon/apple-touch-icon são arquivos de convenção/plataforma e não foram classificados como órfãos somente por ausência de import TypeScript.

### Formatação de datas

**Classificação:** legítimo

As ocorrências diretas de `Intl.DateTimeFormat` observadas em Forecast e Transações possuem formatos/contextos diferentes. Não há evidência suficiente de duplicação que justifique helper compartilhado novo.

## Namespaces sem finding material adicional nesta passada

- `app/types`: contratos encontrados possuem consumidores por domínio; nenhum arquivo inteiro foi comprovado como órfão nesta passada;
- `app/services`: consumidores atuais comprovados;
- `app/stylesheets`: imports globais comprovados;
- `scripts`: integração por package/workflow comprovada;
- `public`: referências explícitas e convenções de plataforma preservadas.

Isso não significa que cada símbolo interno desses namespaces seja necessariamente usado; significa apenas que não foi encontrada evidência suficiente para uma remoção segura adicional dentro do recorte desta auditoria.

## Follow-ups abertos

| Issue | Prioridade | Ação |
| --- | --- | --- |
| #505 | P2 | remover remanescentes de listagens substituídas em Contas/Categorias/Transações e dependências exclusivas |
| #506 | P2 | remover fluxo modal/apresentação pré-Orbit do Calendário sem consumidores |
| #507 | P3 | reutilizar formatter canônico de moeda na Import Inbox |
| #508 | P3 | remover `app/utils/home/animation.ts` após reconfirmar zero consumidores |

## Limitações

- A evidência é estática e corresponde ao head registrado acima.
- Busca de código foi usada como prova negativa somente junto de inspeção de entrypoints/consumidores; ausência isolada em busca não foi tratada como suficiente para arquivos por convenção.
- Não houve remoção de runtime nesta branch, portanto não há afirmação de ganho de bundle/performance.
- Não foi executado `pnpm check` localmente neste ambiente; qualquer PR futuro de remoção precisa cumprir o gate canônico no head final.

## Conclusão

A base pós-Orbit contém quatro grupos acionáveis e de baixo risco conceitual, mas com responsabilidades diferentes. Separá-los evita uma PR de limpeza ampla e permite revalidar consumidores no head de cada implementação.

Nenhum contrato financeiro, ownership, auth, API ou comportamento de UI foi alterado nesta auditoria.
