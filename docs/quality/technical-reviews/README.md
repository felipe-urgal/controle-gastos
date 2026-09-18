# Revisões técnicas trimestrais

Roadmap: #290 — Fase 3, item 41

## Objetivo

Criar uma fotografia técnica periódica do projeto sem apagar o histórico e sem transformar toda métrica em backlog.

Cadência alvo: aproximadamente a cada 3 meses.

Cada revisão deve responder:

1. o que mudou desde a última fotografia;
2. quais sinais continuam saudáveis;
3. quais sinais precisam apenas ser observados;
4. qual finding possui evidência suficiente para virar ação.

## Arquivos

Cada revisão é um arquivo novo neste diretório:

```text
YYYY-qN.md
```

Exemplo:

```text
2026-q3.md
2026-q4.md
2027-q1.md
```

Não sobrescreva o snapshot anterior com os números atuais.

Se um snapshot antigo contiver erro factual relevante, registre uma nota curta no próprio arquivo ou em revisão posterior; não reescreva a fotografia histórica como se a evidência original nunca tivesse existido.

## Checklist

### Dependências e supply chain

- PRs Dependabot abertos;
- majors pendentes;
- resultado/finding de auditoria de segurança quando houver;
- dependências revisadas manualmente que exigem decisão;
- versão atual de Node/Next/Prisma/React quando material.

Não consultar versão nova só para gerar trabalho. Upgrade major precisa de PR/changelog/finding real.

### Frontend e performance

- baseline Lighthouse mais recente;
- frontend budget;
- bundle analyzer quando houver risco concreto;
- regressões conhecidas de requests/CLS/LCP;
- follow-ups ainda abertos.

Não repetir Lighthouse/analyzer caro se existe medição recente representativa e não houve mudança material.

### Qualidade

- matriz de riscos;
- cobertura de fluxos financeiros/security;
- testes de concorrência/atomicidade;
- distribuição qualitativa entre unit/integration/E2E;
- flakes/incidentes recentes do CI.

Percentual bruto de coverage não é meta.

### Dívida técnica

- issues técnicas abertas;
- findings de auditorias anteriores;
- TODOs somente quando já associados a comportamento/riscos relevantes;
- abstrações/boundaries que voltaram a degradar.

Não criar issue apenas para “organizar” código saudável.

### Schema e migrations

- quantidade e mudanças recentes;
- estratégia additive/backfill/contract;
- migrations pendentes ou incidentes conhecidos quando houver evidência operacional;
- compatibilidade de rollback;
- política de restore/recovery.

### Banco e queries

Quando disponível:

- tamanho das tabelas relevantes;
- locks;
- bloat em valor absoluto;
- query/operation latency;
- slow queries/query plan quando o volume justificar;
- sinais de conexão/timeout.

Seq scan, índice sem scan ou percentual de bloat isolado não é finding sem considerar tamanho, carga e query real.

Não instalar extensão de PostgreSQL somente para preencher a revisão.

### Operação e segurança

- incidentes/retries/flakes relevantes;
- health/smoke;
- threat model;
- backup/restore;
- secrets/rotação;
- mudanças de provider/plano que alterem risco operacional.

### Documentação

- contratos que mudaram sem docs;
- docs marcadas como históricas mas usadas como runbook;
- links canônicos quebrados conhecidos;
- duplicação de fonte de verdade.

## Classificação

Use apenas:

- **ok** — evidência suficiente e nenhuma ação atual;
- **observar** — sinal real, mas sem evidência suficiente para mudança;
- **ação** — finding material com próxima ação clara.

“Observar” não cria issue automaticamente.

## Saída esperada

Cada snapshot deve ter:

- data e SHA de referência;
- resumo executivo factual;
- tabela por área;
- evidências/referências;
- findings novos, se houver;
- decisões de não agir quando relevantes;
- gatilhos para a próxima revisão.

## Próxima revisão

A próxima revisão deve ocorrer aproximadamente 3 meses depois da anterior, ou antes quando um evento material justificar nova fotografia:

- major de stack;
- incident de produção;
- mudança relevante de schema/provider;
- crescimento significativo de dados;
- regressão de Lighthouse/budget;
- novo gargalo medido;
- mudança estrutural de arquitetura.
