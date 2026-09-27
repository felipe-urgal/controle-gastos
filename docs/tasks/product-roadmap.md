# Roadmap de Produto — Estado Atual

Atualizado em 27/09/2026.

Este documento resume o estado real das issues de roadmap #598–#607 e serve como referência rápida para continuidade do produto.

## Concluídas

### #598 — Segurança de dependências

Status: **concluída**

- vulnerabilidades transitivas do Prisma tratadas;
- dependency audit validado;
- CI final verde.

PR principal:
- #608

---

### #599 — Cartões de crédito e ciclo de faturas

Status: **concluída**

Entregue:
- domínio de cartão;
- fechamento/vencimento;
- limite utilizado/disponível;
- fatura atual, futuras e histórico;
- parcelamentos por ciclo;
- pagamento atômico e idempotente;
- validação de moeda/ownership;
- UI desktop/mobile;
- Dashboard;
- forecast sem duplicidade;
- E2E crítico versionado.

PRs principais:
- #609
- #610
- #611
- #612
- #613

---

### #600 — Metas financeiras

Status: **concluída**

Entregue:
- domínio e persistência;
- histórico de contribuições/retiradas;
- progresso derivado;
- conclusão/reabertura/arquivamento;
- concorrência protegida;
- central de metas;
- fluxos desktop/mobile;
- sugestão mensal determinística;
- resumo no Dashboard;
- E2E crítico versionado.

PRs principais:
- #614
- #615
- #616

---

### #601 — Planejamento mensal

Status: **concluída**

Entregue:
- orçamento, realizado, comprometido e disponível;
- receita realizada/esperada;
- orçamento zero explícito;
- batch atômico;
- copiar mês anterior;
- UI desktop/mobile;
- Dashboard usando a mesma regra compartilhada;
- E2E crítico versionado.

PRs principais:
- #617
- #618
- #619

## Em andamento

### #602 — Patrimônio e evolução histórica

Status: **em andamento**

Concluído:
- patrimônio derivado de transações `COMPLETED`;
- contas correntes e investimentos;
- cartões excluídos;
- moedas separadas;
- contas inativas preservadas;
- transferências internas neutras;
- histórico mensal;
- API com janela máxima de 60 meses;
- página `/patrimonio`;
- distribuição por conta;
- evolução mensal;
- layout responsivo.

Pendente:
- resumo/atalho compacto no Dashboard;
- E2E da tela Patrimônio;
- validação final;
- fechamento da issue.

PRs principais:
- #620
- #621

## Não iniciadas

### #603 — Central de assinaturas e recorrências
Status: **não iniciada**

### #604 — Busca global financeira
Status: **não iniciada**

### #605 — Regras de importação a partir de correções
Status: **não iniciada**

### #606 — Insights financeiros determinísticos
Status: **não iniciada**

### #607 — Consolidação multi-moeda explícita
Status: **não iniciada**

## Ordem sugerida após #602

1. #603 — Central de assinaturas e recorrências
2. #604 — Busca global financeira
3. #605 — Aprendizado explícito de regras de importação
4. #606 — Insights determinísticos
5. #607 — Consolidação multi-moeda explícita

## Observação sobre E2E

Os fluxos críticos adicionados durante este roadmap estão versionados em `tests/e2e`.

O workflow E2E do projeto usa `workflow_dispatch`; quando não houver ambiente com permissão de dispatch disponível, a ausência de execução manual deve ser tratada como pendência operacional de QA, não como implementação de produto incompleta.
