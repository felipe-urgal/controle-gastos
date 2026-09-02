# Política de dependências, auditoria e proteção da main

Esta política complementa o fluxo obrigatório definido em `AGENTS.md` e fecha o recorte avançado de DX/CI da #133 sem transformar advisories ou checks condicionais em bloqueios cegos.

## Atualizações de dependências

O Dependabot verifica semanalmente:

- dependências da aplicação no diretório raiz;
- o runner Playwright isolado em `tests/e2e`;
- versões das GitHub Actions usadas em `.github/workflows`.

A configuração vive em `.github/dependabot.yml`.

Atualizações `minor` e `patch` são agrupadas por ecossistema para reduzir ruído. Atualizações `major` continuam em PRs separados, pois exigem revisão explícita de breaking changes, migrations, contratos e impacto de bundle/runtime.

Nenhum PR de dependência deve receber auto-merge apenas por ser gerado pelo Dependabot. Ele segue os mesmos gates do projeto e precisa preservar o head final saudável descrito em `AGENTS.md`.

### Triagem

Ao revisar uma atualização:

1. confirmar changelog/release notes quando houver mudança relevante;
2. revisar impacto em runtime, browser, build, Prisma/banco e CI;
3. rodar os gates que o diff acionar;
4. para majors, procurar breaking changes e plano de migração antes do merge;
5. não aumentar budget, afrouxar teste ou ignorar incompatibilidade apenas para aceitar a atualização.

## Auditoria de vulnerabilidades

`.github/workflows/security-audit.yml` executa toda segunda-feira às 11:00 UTC (08:00 em `America/Sao_Paulo`) e também aceita execução manual.

Comando usado:

```bash
pnpm audit --prod --audit-level=high --ignore-registry-errors
```

A auditoria automática olha somente dependências de produção e severidades `high`/`critical`. Ela não roda em `pull_request` e, portanto, não é um required check de merge.

O objetivo é gerar um sinal acionável para triagem, não usar CVSS isoladamente como regra de bloqueio.

### Como tratar um finding

Para cada advisory relevante, avaliar em conjunto:

- se a dependência afetada alcança o runtime de produção;
- se o caminho vulnerável é realmente utilizado pelo produto;
- se há exploração conhecida ou exposição plausível;
- se existe versão corrigida;
- risco de regressão da atualização;
- existência de mitigação temporária segura.

Prioridade prática:

- vulnerabilidade `critical`/`high`, alcançável em produção e com correção disponível: corrigir com prioridade alta e validar gates completos;
- advisory de produção sem caminho alcançável: documentar a análise e acompanhar atualização segura;
- advisory somente de tooling/dev: tratar no fluxo de manutenção, elevando prioridade se afetar CI, geração de artefato ou supply chain;
- advisory sem fix disponível: abrir/atualizar tracking com mitigação e reavaliar periodicamente.

Não usar `pnpm audit --fix` ou overrides automaticamente. Overrides só devem entrar após análise explícita da compatibilidade e com teste de regressão adequado.

Quando uma mudança tocar tooling, dependências de desenvolvimento ou houver advisory específico fora do recorte automático, rodar também uma auditoria completa/manual conforme necessário.

## Política de proteção da `main`

A proteção desejada para `main` é:

- exigir Pull Request para merge;
- exigir aprovação dos status checks configurados como obrigatórios;
- check obrigatório global: `CI / quality`;
- exigir resolução de conversas de review antes do merge, quando a plataforma/conta permitir;
- bloquear force-push e deleção da `main`;
- preservar a regra de que o head final mergeado é o mesmo head validado pelos gates.

### Por que E2E e Lighthouse não são checks obrigatórios globais hoje

Os workflows `E2E` e `Lighthouse baseline` possuem filtros `paths`. Em PRs que não alteram caminhos cobertos, o workflow inteiro não é criado. O GitHub mantém um required check pulado por filtro de caminho em estado pendente, o que pode bloquear merges válidos indefinidamente.

Por isso, enquanto esses workflows continuarem condicionais por `paths`, eles seguem obrigatórios pelo processo quando acionados, mas não devem ser configurados como required status checks globais da branch.

Se no futuro E2E/Lighthouse forem remodelados para sempre criar um job/check e decidir a execução no nível do job, eles podem ser promovidos a checks obrigatórios sem esse risco.

## Estado da configuração administrativa

A política acima é a fonte de verdade no repositório. A configuração administrativa de branch protection deve espelhar esses itens.

Durante a implementação da #133, a integração usada pelo agente não recebeu acesso ao endpoint administrativo de branch protection (`403`), portanto nenhuma configuração de proteção foi declarada como aplicada automaticamente. Essa limitação não altera os gates existentes nem justifica bypass de PR/CI.

Refs #133, #137 e `AGENTS.md`.
