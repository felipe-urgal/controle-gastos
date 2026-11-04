# Avisos proativos

Contrato dos avisos (`app/lib/notifications`). A central no app, o e-mail e o push chegam em lotes seguintes; este documento só registra o que precisa continuar verdadeiro.

## Regras

- **Fonte única:** faturas de cartão, contas a pagar (transações pendentes e parcelas de dívida) e receitas esperadas vêm de `financial-commitments`; as regras são funções puras (`notification-rules.ts`) e não leem o banco.
- **Estágios por janela, não por dia exato**, para um dia sem cron não perder o aviso: `D3` (faltam 2 ou 3 dias, só faturas), `DUE` (vence hoje ou amanhã) e `OVERDUE`.
- **Atraso antigo não é fato novo:** receita esperada só avisa a partir de 3 dias de atraso; qualquer atraso com mais de 7 dias fica só no Dashboard.
- **Chave de deduplicação:** `PREFIXO:id:AAAAMMDD:estágio` (data do vencimento incluída porque o mesmo id, como uma dívida, tem vários vencimentos). `Notification` tem unique `[userId, dedupeKey]`: a mesma chave nunca gera dois avisos.
- **Limite diário:** no máximo 5 avisos novos por usuário por execução; os mais urgentes e de data mais próxima saem, o excedente vira um único aviso `SUMMARY` (`SUMMARY:AAAAMMDD`) com link para o Dashboard.
- **Privacidade:** com `showValues = false` o texto não traz valores. Valor desconhecido (`null`) nunca vira zero. Moedas diferentes geram avisos separados, nunca somados.
- **Preferências:** uma linha por tipo (`NotificationPreference`); sem linha vale o padrão de `NOTIFICATION_DEFAULTS`. E-mail e push são sempre opt-in. Receita atrasada e meta com prazo vêm desligadas.
- Datas usam a data lógica de Brasília (ver `docs/DEVELOPMENT.md`).

## Tipos e fontes

| Tipo | Fonte | Chave de deduplicação |
|---|---|---|
| `CARD_STATEMENT_DUE`, `COMMITMENT_DUE`, `INCOME_OVERDUE` | `financial-commitments` | `PREFIXO:id:AAAAMMDD:estágio` |
| `BUDGET_LIMIT` | `category-limits` (consumo = realizado + comprometido) | `BUDGET_LIMIT:categoria:AAAAMM01:P80` ou `:P100` |
| `FORECAST_NEGATIVE` | `forecast` (só conta corrente; menor saldo previsto em 30 dias) | `FORECAST_NEGATIVE:conta:AAAAMM01:LOW` (uma vez por conta e mês) |
| `SUMMARY` | cota diária excedida | `SUMMARY:AAAAMMDD` |

`GOAL_DEADLINE` existe no enum mas ainda não tem regra (vem desligado por padrão).

## Geração e cron

- `generateNotificationsForUser(userId, now)` é idempotente: só calcula o que as preferências ligam, ignora chaves já gravadas (inclusive dispensadas) e grava com `createMany(skipDuplicates)`. A cota diária conta por `createdAt`, gravado com o `now` da execução; rodar de novo no mesmo dia só completa o que faltou da cota, nunca a reabre.
- `GET /api/cron/notifications` (`CRON_SECRET` como no resumo semanal) roda às **11:00 UTC (08:00 em Brasília)**; no plano Hobby a Vercel pode atrasar até 59 minutos. Processa até 200 usuários ativos em até 48 s, isola falhas por usuário e emite `notifications.cron` e, se parcial, `notifications.alert` (só contagens).
- A projeção de saldo e os compromissos saem de uma única chamada de `forecast` por moeda; nada é somado entre moedas.

## API (todas exigem sessão; dono validado no servidor)

- `GET /api/notifications?page&pageSize&unreadOnly` (padrão 20, máximo 50) devolve `items`, `total`, `totalPages` e `unreadCount`; do mais novo para o mais antigo.
- `POST /api/notifications/{id}/read` é idempotente; `POST /api/notifications/read-all`.
- `DELETE /api/notifications/{id}` **dispensa** (`dismissedAt`): o aviso some, mas a linha fica para a chave de deduplicação continuar valendo e o cron não recriar. Aviso de outro usuário é sempre 404.
- `GET /api/notification-preferences` devolve os 7 tipos, mesclando o padrão (`isDefault`); `PUT` aceita a lista de tipos (sem repetir) e faz upsert.
