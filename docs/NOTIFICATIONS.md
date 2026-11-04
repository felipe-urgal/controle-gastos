# Avisos proativos

Contrato do domínio de avisos (`app/lib/notifications`). Cron, API, central no app, e-mail e push chegam em lotes seguintes; este documento só registra o que precisa continuar verdadeiro.

## Regras

- **Fonte única:** faturas de cartão, contas a pagar (transações pendentes e parcelas de dívida) e receitas esperadas vêm de `financial-commitments`; as regras são funções puras (`notification-rules.ts`) e não leem o banco.
- **Estágios por janela, não por dia exato**, para um dia sem cron não perder o aviso: `D3` (faltam 2 ou 3 dias, só faturas), `DUE` (vence hoje ou amanhã) e `OVERDUE`.
- **Atraso antigo não é fato novo:** receita esperada só avisa a partir de 3 dias de atraso; qualquer atraso com mais de 7 dias fica só no Dashboard.
- **Chave de deduplicação:** `PREFIXO:id:AAAAMMDD:estágio` (data do vencimento incluída porque o mesmo id, como uma dívida, tem vários vencimentos). `Notification` tem unique `[userId, dedupeKey]`: a mesma chave nunca gera dois avisos.
- **Limite diário:** no máximo 5 avisos novos por usuário por execução; os mais urgentes e de data mais próxima saem, o excedente vira um único aviso `SUMMARY` (`SUMMARY:AAAAMMDD`) com link para o Dashboard.
- **Privacidade:** com `showValues = false` o texto não traz valores. Valor desconhecido (`null`) nunca vira zero. Moedas diferentes geram avisos separados, nunca somados.
- **Preferências:** uma linha por tipo (`NotificationPreference`); sem linha vale o padrão de `NOTIFICATION_DEFAULTS`. E-mail e push são sempre opt-in. Receita atrasada e meta com prazo vêm desligadas.
- Datas usam a data lógica de Brasília (ver `docs/DEVELOPMENT.md`).
