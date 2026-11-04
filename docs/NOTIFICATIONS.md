# Avisos proativos

Contrato dos avisos (`app/lib/notifications`); este documento só registra o que precisa continuar verdadeiro.

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

## Interface

- **Central (`/avisos`):** lista paginada (padrão 20) do mais novo para o mais antigo, filtro Todos/Não lidos, "Marcar tudo como lido" e remover. Abrir um aviso (o item é um link para `href`) marca como lido sem travar a navegação; remover dispensa (ver acima).
- **Sino:** aparece na barra lateral (com contador; só um ponto quando recolhida), no menu "Mais" e na barra do topo do mobile (onde ela existe), e como ponto no botão "Mais" da barra inferior. O contador vem de `NotificationsProvider` (`app/context`), que consulta ao carregar, ao voltar para a aba e a cada 5 minutos com a aba visível; a central o atualiza com o valor que a própria lista devolve.
- **Preferências:** Usuário, Preferências, seção "Avisos": três interruptores por tipo que já tem regra (No app, E-mail e, se o servidor tem VAPID, Push) e, no topo, "Notificações neste aparelho" (pede permissão, inscreve e cancela este aparelho). Salvar é otimista e volta ao valor anterior se o servidor recusar.

## Entrega fora do app (e-mail e push)

A central é a fonte da verdade; e-mail e push só espelham o que já foi gravado. Depois de gerar os avisos de um usuário, o cron chama `deliverNotificationsForUser`.

- **Janela e idempotência:** só avisos criados nas últimas 24 h, não dispensados e ainda não entregues pelo canal (`emailedAt`, `pushedAt`). Nada é reenviado. Falha de provedor deixa o aviso na central e a execução seguinte tenta de novo, dentro da janela.
- **E-mail diário:** um único e-mail por usuário por execução, com todos os avisos novos dos tipos em que o usuário ligou "E-mail" (opt-in; padrão desligado). Só vai para e-mail **verificado** e só com `RESEND_API_KEY`, `RESEND_FROM_EMAIL` e `NEXT_PUBLIC_SITE_URL` configurados; sem isso fica desligado em silêncio. Todo texto de dado do usuário (nome de categoria, descrição) passa por `escapeHtml`; os textos já respeitam `showValues`. O rodapé diz onde desligar.
- **Push (Web Push com VAPID):** um push por aviso, para cada aparelho inscrito do usuário, nos tipos com "Push" ligado. Exige `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` e `VAPID_SUBJECT` (gerar com `npx web-push generate-vapid-keys`); sem as três, desligado. O payload leva só título, texto e destino. Resposta 404/410 do serviço de push desativa a inscrição (`disabledAt`); TTL de 24 h.
- **Inscrição (`/api/push/*`):** `GET /api/push/public-key` (sessão obrigatória) devolve `{ configured, publicKey }`; `POST /api/push/subscribe` aceita só endpoint `https://` e chaves base64url, é idempotente por endpoint, **passa o aparelho para quem entrou por último** (o endpoint é único) e mantém no máximo 10 aparelhos por usuário (os mais recentes); `DELETE` remove só o aparelho do próprio usuário.
- **Service worker (`public/sw.js`):** o evento `push` sempre mostra uma notificação (payload ausente ou inválido vira um aviso genérico, porque o navegador exige isso); o clique só abre caminhos do próprio app (`/...`, nunca outro site nem `//host`), reaproveitando a janela aberta. O SW só é registrado em produção, então push não funciona em desenvolvimento.
- **iPhone:** o push só funciona com o app instalado na tela inicial; a tela de preferências explica isso quando o navegador não oferece suporte.

## Retenção

No fim de cada execução do cron: avisos **lidos ou dispensados** com mais de 90 dias são apagados (não lido nunca é apagado) e inscrições de push desativadas há mais de 30 dias também. É seguro para a deduplicação: as chaves carregam a data ou o mês do fato, então um fato antigo não volta a ser candidato.
