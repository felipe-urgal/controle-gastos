# Dashboard — read model e budget de custo

O Dashboard usa `GET /api/dashboard/home` como composição principal. O objetivo deste baseline é impedir recomputações acidentais sem acoplar o CI a um tempo absoluto de banco.

## Baseline de composição

Uma leitura do Dashboard Home deve executar no máximo uma vez cada fonte principal:

1. resumo mensal;
2. Forecast de 30 dias;
3. transações recentes da moeda selecionada;
4. snapshot de Patrimônio;
5. Compromissos derivados do Forecast já carregado;
6. Insights derivados do Dashboard + Forecast já carregados.

O teste `dashboard-home-budget.test.ts` fixa esse budget em **6 source reads**. Ele não representa seis queries SQL: cada domínio pode possuir suas próprias consultas internas. O objetivo é impedir que a composição volte a recalcular o mesmo domínio.

## Regras de aquisição

- transações recentes filtram usuário, período e moeda no servidor antes de `take: 5`;
- saldo de caixa usa somente contas `CREDIT_DEBIT`;
- consultas específicas de fatura/cartão são puladas quando não existe cartão elegível na moeda;
- Compromissos reutiliza o Forecast adquirido pelo Dashboard;
- Insights reutiliza Dashboard + Forecast adquiridos pelo Dashboard;
- o resumo periódico também reutiliza seu Dashboard + Forecast ao construir Insights.

## Latência e investigação

A rota já registra o evento `dashboard_home` via `logServerOperation`, incluindo `durationMs`, status e estado das seções. Esse dado é o baseline de latência real por ambiente; não há threshold fixo em milissegundos no CI porque isso seria sensível à infraestrutura.

Ao investigar regressão, revisar primeiro:

- aumento do source-read budget;
- consultas de cartão em usuário/moeda sem cartões;
- filtros de período/moeda aplicados depois da leitura;
- recomputação de Forecast, Dashboard ou Patrimônio em consumidores derivados;
- aumento do payload de transações recentes.

Não introduzir cache complexo sem uma regressão medida.
