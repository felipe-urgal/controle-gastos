# Convenção de documentação por domínio

Issue: #552  
Roadmap: #290 — Fase 2, Qualidade, item 28

## Objetivo

Manter documentação curta, não duplicada e ligada ao comportamento que realmente existe no código e nos testes.

Cada diretório em `docs/` tem uma responsabilidade diferente. Ao alterar uma feature, atualize a fonte que é dona da decisão em vez de copiar a mesma regra para vários lugares.

## Fontes e responsabilidade

| Fonte | Use para | Não use para |
| --- | --- | --- |
| `docs/product/` | contrato funcional, invariantes e comportamento público de uma feature/domínio | decisões visuais detalhadas, logs de auditoria ou alternativas arquiteturais extensas |
| `docs/adr/` | decisão arquitetural ou de domínio durável, com alternativas relevantes e consequências | decisão local/reversível, detalhe de implementação ou histórico de uma PR |
| `docs/design/` | comportamento visual/UX aprovado, interação, responsividade e acessibilidade da superfície | redefinir regra financeira, ownership ou semântica de API |
| `docs/quality/` | auditorias, matrizes de risco, baselines, regressões, evidências e políticas técnicas | contrato funcional primário de uma feature |
| `docs/operations/` | deploy, runbook, rollback, backup/restore, incidentes e procedimentos operacionais | regra de produto ou layout |
| `docs/architecture/` | fronteiras transversais entre camadas e responsabilidades de aplicação | detalhar uma única feature quando a regra não é transversal |
| `README.md` | visão geral, descoberta e links para fontes canônicas | especificação detalhada de domínio |

`AGENTS.md` preserva invariantes duráveis e o contrato de engenharia do repositório. Ele aponta para as fontes canônicas, mas não substitui documentos específicos de produto, ADR ou operação.

## Precedência

Quando duas fontes parecem falar da mesma coisa, use a responsabilidade da decisão para resolver o conflito:

1. invariantes duráveis do repositório e regras de segurança permanecem obrigatórias;
2. contrato funcional do domínio fica em `docs/product/`;
3. decisão arquitetural durável fica no ADR correspondente;
4. experiência visual aprovada fica em `docs/design/`;
5. `docs/quality/` registra evidência, baseline e auditoria do estado real;
6. `docs/operations/` define como operar o sistema;
7. README apenas resume e direciona.

Uma evidência histórica em `docs/quality/` não deve sobrescrever uma decisão de produto ou design posterior. Da mesma forma, design não pode redefinir uma invariante financeira documentada em produto/ADR.

## Quando criar um ADR

Crie ou atualize ADR quando a decisão:

- altera uma fonte de verdade;
- muda uma invariante financeira transversal;
- define uma representação de domínio difícil de reverter;
- afeta vários fluxos/domínios;
- possui alternativas plausíveis com trade-offs relevantes;
- precisa continuar compreensível depois que a issue/PR for encerrada.

Exemplos atuais:

- saldo derivado de transações concretas: `0001-account-balance-source-of-truth.md`;
- agregados separados por moeda sem conversão implícita: `0002-multi-currency-aggregates.md`;
- transferências como duas pernas vinculadas: `0003-account-transfers-as-linked-transactions.md`;
- reconciliação ortogonal ao status financeiro: `0004-reconciliation-is-orthogonal-to-financial-status.md`.

Não crie ADR para:

- renomear componente;
- escolher helper local;
- ajustar texto/estilo;
- trocar uma implementação interna reversível sem impacto de contrato;
- registrar o resultado de uma auditoria;
- documentar um bugfix isolado.

Nesses casos, prefira código/teste, `docs/design/`, `docs/quality/` ou a própria issue, conforme a natureza da mudança.

## Contrato de produto e testes

Cada feature financeira relevante deve ter um documento canônico em `docs/product/` quando existir comportamento próprio que precise sobreviver à issue/PR.

O documento deve registrar somente invariantes observáveis, por exemplo:

- quais registros são fonte financeira;
- estados que entram ou não em saldo/agregado;
- ownership e isolamento;
- política de moeda;
- atomicidade/idempotência;
- limites de contrato;
- leitura versus mutation;
- comportamento público relevante da API.

Invariantes críticas devem apontar para regressões automatizadas existentes. Não é necessário listar todos os testes; cite os que provam a regra principal.

Exemplos:

| Domínio | Contrato funcional | Decisão durável | Evidência representativa |
| --- | --- | --- | --- |
| Transferências | `docs/product/account-transfers.md` | ADR 0003 | `app/lib/transfers/__tests__/create-transfer.integration.test.ts` e lifecycle tests |
| Forecast | `docs/product/forecast.md` | ADR 0001 + ADR 0002 | `app/lib/forecast/__tests__/forecast.integration.test.ts` |
| Reconciliação | `docs/product/account-reconciliation.md` | ADR 0004 | testes de confirm/undo/reconciliation |
| Dashboard mensal | `docs/product/monthly-dashboard.md` | ADR 0001 + ADR 0002 | `app/lib/dashboard/__tests__/monthly-dashboard.integration.test.ts` |
| Importação | `docs/product/transaction-import.md` | ADRs financeiros aplicáveis | testes de import preview/confirm/rules |

## Status e referências

Quando um documento de produto ou operação possuir status, mantenha-o curto e factual:

- estado atual;
- data da última revisão quando útil;
- issue/PR que materializou a mudança;
- referências canônicas relacionadas.

Não use o documento como changelog de todas as PRs. Histórico detalhado fica melhor na issue, PR ou evidência de qualidade específica.

## Checklist para nova feature financeira

Antes de concluir uma feature financeira relevante:

- [ ] existe um documento de produto canônico, ou foi justificado por que o contrato já cabe em uma fonte existente;
- [ ] invariantes de ownership, moeda, status e centavos estão explícitas quando aplicáveis;
- [ ] decisão arquitetural durável nova recebeu ADR; decisão local não recebeu ADR desnecessário;
- [ ] comportamento visual específico está em `docs/design/`, sem redefinir regra de domínio;
- [ ] auditoria/baseline/evidência técnica está em `docs/quality/` quando necessário;
- [ ] mudança operacional está refletida em `docs/operations/` ou `docs/PRODUCTION.md`;
- [ ] invariantes críticas possuem regressão automatizada e a documentação aponta para a evidência representativa;
- [ ] README continua somente como visão geral/índice;
- [ ] documentação descreve o estado implementado, não intenção futura não entregue.

## Regra de manutenção

Não atualize documentação por volume. Atualize apenas as fontes cuja responsabilidade realmente mudou.

Se uma mudança exigir repetir a mesma regra em três lugares, primeiro verifique qual fonte deveria ser canônica e transforme as demais em links/referências curtas.
