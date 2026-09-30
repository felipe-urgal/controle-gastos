# Roadmap de Produto — Estado Atual

Atualizado em 30/09/2026.

Este documento resume os ciclos de produto concluídos e serve como referência rápida para continuidade do produto.

## Status geral

As issues #598–#607 e #657–#666 estão concluídas. A issue #667 foi usada como roadmap agregadora do ciclo mais recente e pode ser encerrada junto com a validação final da #666.

## Concluídas

## Ciclo #667 — evolução free-first

O ciclo organizado pela #667 foi concluído nas issues #657–#666:

- #657 — split de transações;
- #658 — fechamento mensal;
- #659 — comparação entre períodos;
- #660 — central de compromissos;
- #661 — templates de lançamento rápido;
- #662 — anomalias determinísticas;
- #663 — simulador de cenários;
- #664 — tags em transações;
- #665 — dívidas e financiamentos;
- #666 — PWA/offline com shell seguro, rascunho local e fila idempotente.

A última entrega do ciclo fechou a validação PWA com:
- idempotência server-side;
- fila local com estados explícitos;
- retry seguro;
- tratamento de sessão expirada e conflito;
- cobertura E2E de instalação, modo offline, refresh offline, reconexão, retry e cleanup;
- execução automática do workflow E2E em PRs que alterem o fluxo PWA.

---

### #598 — Segurança de dependências

Entregue:
- vulnerabilidades transitivas do Prisma tratadas;
- dependency audit validado;
- CI final verde.

PR principal:
- #608

---

### #599 — Cartões de crédito e ciclo de faturas

Entregue:
- domínio de cartão, fechamento e vencimento;
- limite utilizado/disponível;
- fatura atual, futuras e histórico;
- parcelamentos por ciclo;
- pagamento atômico e idempotente;
- validação de moeda/ownership;
- UI desktop/mobile;
- integração com Dashboard e forecast;
- E2E crítico versionado.

PRs principais:
- #609
- #610
- #611
- #612
- #613

---

### #600 — Metas financeiras

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

---

### #602 — Patrimônio e evolução histórica

Entregue:
- patrimônio derivado de transações `COMPLETED`;
- contas correntes e investimentos;
- cartões excluídos;
- moedas separadas;
- contas inativas preservadas;
- transferências internas neutras;
- histórico mensal com janela de até 60 meses;
- página `/patrimonio`;
- distribuição por conta e evolução mensal;
- resumo/atalho no Dashboard;
- layout responsivo;
- E2E da tela e do resumo.

PRs principais:
- #620
- #621
- #625

---

### #603 — Central de assinaturas e recorrências

Entregue:
- leitura de séries recorrentes formais;
- equivalentes mensal/anual por moeda;
- detector determinístico de candidatos;
- confirmação explícita antes de persistir;
- ação de ignorar sem infraestrutura adicional;
- central responsiva em `/recorrencias`;
- edição da série sem reescrever histórico concluído;
- ownership e exclusão de transferências;
- E2E de detectar → confirmar → editar.

PRs principais:
- #626
- #627
- #628
- #629

---

### #604 — Busca global financeira

Entregue:
- busca por transações, contas, categorias e regras;
- limites explícitos e ownership;
- sem infraestrutura externa de busca;
- UI global com debounce e cancelamento de respostas obsoletas;
- navegação por teclado;
- acesso desktop/mobile;
- E2E completo.

PRs principais:
- #630
- #631

---

### #605 — Regras de importação a partir de correções

Entregue:
- criação de regra sempre explícita;
- geração segura de candidato;
- detecção de equivalência e conflito;
- proteção contra padrões amplos;
- reutilização das validações atuais;
- importação independente da criação opcional da regra;
- E2E de correção → criação explícita → reutilização posterior.

PR principal:
- #632

---

### #606 — Insights financeiros determinísticos

Entregue:
- contrato fechado de insights explicáveis;
- fórmulas determinísticas e omissão por dados insuficientes;
- sem percentuais inválidos;
- composição em lote usando Dashboard, forecast e recorrências;
- API dedicada;
- seção compacta desktop/mobile;
- ocultação de valores e links de contexto;
- E2E.

PRs principais:
- #633
- #634
- #635

---

### #607 — Consolidação multi-moeda explícita

Entregue:
- valores nominais preservados como fonte original;
- taxa representada por razão inteira, sem float como fonte de verdade;
- taxas manuais por usuário;
- nenhuma cotação externa;
- nenhuma inversão/fallback silencioso;
- consolidação opcional em BRL/USD/EUR;
- seleção histórica da taxa em ou antes da data de referência;
- resultado incompleto quando falta taxa;
- metadata auditável de taxa, origem e data;
- gestão simples de taxas manuais na tela Patrimônio;
- ocultação de valores;
- E2E de taxa ausente → cadastro manual → consolidação completa.

PRs principais:
- #636
- #637
- #639
- #640

## Próxima continuidade

Com #657–#666 concluídas, não há atividade de produto pendente na #667. A próxima iniciativa deve nascer como uma nova issue com escopo e critérios de aceite próprios, em vez de reutilizar artificialmente uma issue concluída.

## Observação sobre E2E

Os fluxos críticos adicionados durante estes ciclos estão versionados em `tests/e2e`.

O workflow E2E continua disponível por `workflow_dispatch` e também é executado automaticamente em pull requests que alterem o fluxo PWA ou seu teste E2E.
