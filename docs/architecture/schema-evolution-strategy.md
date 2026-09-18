# Estratégia de evolução de schema

Issue: #562  
Roadmap: #290 — Fase 3, Arquitetura & Organização, item 34  
Stack atual: PostgreSQL + Prisma 7

## Objetivo

Definir como o schema evolui sem transformar cada migration em uma decisão ad hoc.

A regra principal é **compatibilidade primeiro**:

1. preferir mudança aditiva;
2. separar transformação de dados do DDL quando houver volume/risco;
3. usar expand/contract para mudanças incompatíveis;
4. declarar a ordem de rollout antes do merge;
5. tratar migration aplicada como imutável;
6. preservar recovery point antes de mudança destrutiva.

Este documento define a escolha da estratégia. A execução operacional continua em:

- `docs/PRODUCTION.md`;
- `docs/operations/runbook.md`;
- `docs/operations/backup-restore-policy.md`.

## Classificação obrigatória

Toda PR que altera `prisma/schema.prisma` ou adiciona `prisma/migrations/*` deve classificar a mudança.

| Classe | Exemplo | Estratégia padrão |
| --- | --- | --- |
| aditiva compatível | coluna nullable, tabela nova, enum ampliado | migration primeiro ou junto, conforme runtime |
| aditiva com default | coluna `NOT NULL DEFAULT` segura para rows existentes | migration antes do runtime dependente |
| backfill | preencher coluna nova a partir de fonte confiável | expand → runtime compatível → backfill → contract |
| incompatível/contract | remover/renomear coluna, tornar obrigatório sem default seguro | expand/contract em migrations separadas |
| constraint | CHECK/UNIQUE/FK nova | validar dados e custo antes de aplicar |
| índice | índice para query comprovadamente relevante | revisar volume/query plan; estratégia proporcional ao lock |
| destrutiva | drop de dado/tabela/constraint incompatível | recovery point + rollout explícito + sem rollback cego |

Se uma PR não souber classificar a migration, ela ainda não está pronta para produção.

## 1. Additive-first

Prefira adicionar estrutura antes de remover ou reinterpretar estrutura existente.

### Exemplos reais

#### `auth_version`

Migration:

```sql
ALTER TABLE "users"
ADD COLUMN "auth_version" INTEGER NOT NULL DEFAULT 0;
```

É aditiva com default compatível:

- rows existentes recebem valor válido;
- runtime antigo ignora a coluna;
- runtime novo pode depender dela depois da migration.

Ordem segura:

```text
migration -> db:status -> runtime novo -> smoke
```

#### Recorrência flexível

A migration ampliou enum e adicionou `interval NOT NULL DEFAULT 1`.

Rows mensais antigas continuam semanticamente válidas sem backfill inventado.

Regra: quando um default representa exatamente o comportamento histórico, ele pode ser usado para preservar compatibilidade.

Não use default apenas para “fazer a migration passar” se ele inventar informação financeira que não existia.

#### Idempotência de transferências

`idempotency_key_hash` e `request_hash` foram adicionados nullable, com constraint que exige ambos nulos ou ambos preenchidos.

Isso permitiu:

- rows históricas continuarem válidas;
- runtime novo gravar o contrato novo;
- ausência de backfill artificial de chaves que nunca existiram.

## 2. Backfill separado

Use backfill quando o schema novo precisa de dados que não podem ser obtidos somente por default seguro.

Fluxo:

```text
A. expand schema
B. runtime compatível lê/escreve formato antigo + novo quando necessário
C. backfill idempotente em etapa explícita
D. verificar convergência
E. contract em migration posterior
```

### Regras

- backfill não roda em boot, build ou request;
- deve ser reexecutável/idempotente;
- registrar apenas contagens/estado técnico, nunca payload financeiro sensível;
- trabalhar em batches quando volume puder gerar timeout/lock prolongado;
- checkpoint/restore proporcional ao risco;
- se a fonte de verdade não permitir reconstrução correta, não inventar valor.

### Financeiro

É proibido preencher dado financeiro por inferência oportunista.

Exemplo: não criar histórico de saldo, câmbio ou categoria retroativa apenas porque uma coluna nova exige valor.

A origem do backfill precisa ser uma fonte já autoritativa no domínio.

## 3. Expand/contract

Use para rename, substituição de coluna ou mudança incompatível.

Exemplo genérico:

### Expand

- adicionar `new_column`;
- manter `old_column`;
- deployar código capaz de conviver com ambas.

### Migrate data

- backfill `new_column` de forma explícita;
- medir rows faltantes/inconsistentes;
- não avançar com divergência desconhecida.

### Switch

- runtime passa a ler a coluna nova;
- escrita dupla só existe temporariamente quando realmente necessária;
- preferir uma fonte autoritativa e adaptação no runtime a criar dual-write permanente.

### Contract

Em PR/migration posterior:

- remover fallback;
- remover coluna/índice/constraint legado;
- confirmar que rollback de runtime antigo já não faz parte do plano.

Nunca fazer expand + backfill grande + contract destrutivo na mesma migration só para reduzir número de arquivos.

## 4. Defaults e NOT NULL

Pergunte:

1. o default representa verdade histórica?
2. é barato e seguro para rows existentes?
3. runtime antigo continua funcionando?
4. a migration pode exigir rewrite/lock significativo no volume atual?

Se a resposta 1 for “não”, prefira nullable + backfill + contract.

Para tabela pequena, uma mudança simples pode continuar simples. Não introduza expand/contract cerimonial quando não existe incompatibilidade real.

## 5. Constraints

Constraints são a última linha de integridade, não substituem validação de domínio.

Antes de adicionar CHECK, UNIQUE ou FK:

- provar que dados existentes satisfazem a regra;
- revisar impacto de lock/scan no volume real;
- testar em PostgreSQL isolado com as migrations completas;
- manter erro de domínio/runtime amigável antes do erro do banco quando aplicável.

Exemplos do projeto:

- recurrence frequency/interval possui CHECK porque a combinação válida é invariante persistente;
- idempotência de transferência possui CHECK de par;
- unique indexes protegem identidade/idempotência além da validação do runtime.

## 6. Índices

Índice novo precisa de motivação concreta:

- query lenta medida;
- query plan;
- cardinalidade/volume;
- constraint/lookup crítico já conhecido.

Não adicionar índice porque uma coluna “parece filtrável”.

### Índice comum

Para tabelas pequenas e baixo risco de lock, uma migration comum pode ser suficiente.

### Índice potencialmente pesado

Quando volume/atividade justificar evitar bloqueio de writes, avaliar `CREATE INDEX CONCURRENTLY`.

PostgreSQL não permite `CREATE INDEX CONCURRENTLY` dentro de transaction block. Portanto:

- não assumir que uma migration Prisma comum é adequada;
- validar o comportamento da versão instalada do Prisma em banco isolado;
- tratar como etapa operacional excepcional se o runner/transaction não for compatível;
- registrar criação, validação e eventual remoção de índice inválido;
- não misturar o índice concurrent com DDL não relacionado.

Hoje não existe finding que justifique converter os índices atuais para concurrent. A decisão permanece orientada por volume/query plan.

## 7. Ordem de rollout

A PR deve declarar uma destas ordens.

### Migration antes do código

Use quando o runtime novo precisa de estrutura aditiva que o runtime antigo ignora.

```text
prod:check -> recovery point se aplicável -> migrate -> db:status -> provider-deploy -> verify
```

### Código antes da migration

Só quando o código novo é compatível com schema antigo e prepara uma transição.

Exemplo: runtime começa a tolerar campo/estado alternativo antes de contract posterior.

### Expand/backfill/contract

```text
PR A: expand + runtime compatível
maintenance: backfill + verificação
PR B: switch final
PR C: contract
```

As etapas podem ser combinadas apenas quando volume e compatibilidade provam que isso continua seguro e revisável.

## 8. Rollback e forward-fix

Migration aplicada é imutável.

Se o problema aparecer:

- não aplicada: corrija a migration antes de aplicar;
- parcialmente aplicada: inspecione estado real antes de qualquer resolução;
- aplicada com bug lógico: crie forward-fix;
- destrutiva com perda/corrupção: interrompa writes e siga recovery coordenado;
- runtime antigo incompatível com schema novo: rollback do deploy não é opção segura.

O plano de rollback deve ser escrito em termos do **estado real do schema**, não apenas do commit Git.

## 9. Recovery point

Mudança destrutiva ou backfill material segue `docs/operations/backup-restore-policy.md`.

Antes de operação com risco real de perda:

- conferir history retention;
- criar recovery point adequado;
- gerar dump portátil pre-change quando aplicável;
- validar o artefato;
- nunca testar restore destrutivo em produção.

## 10. Checklist de PR com migration

### Schema

- [ ] migration classificada;
- [ ] SQL revisado;
- [ ] migration aplicada nunca foi editada;
- [ ] default representa verdade histórica;
- [ ] constraint é satisfeita pelos dados existentes;
- [ ] índice possui finding/query que o justifica.

### Dados

- [ ] backfill é necessário ou explicitamente não necessário;
- [ ] backfill é idempotente;
- [ ] nenhuma informação financeira é inventada;
- [ ] volume/batch/timeout foram considerados.

### Compatibilidade

- [ ] runtime anterior tolera o schema expandido quando isso faz parte do rollout;
- [ ] runtime novo tolera a fase transitória necessária;
- [ ] ordem de rollout está escrita na PR;
- [ ] rollback de aplicação foi classificado como seguro ou inseguro.

### Operação

- [ ] recovery point definido se houver risco destrutivo;
- [ ] `prod:check`/CI validam migration em banco isolado;
- [ ] `prisma migrate status` faz parte do pós-migrate;
- [ ] smoke/health definidos;
- [ ] nenhuma connection string aparece em evidência compartilhada.

## 11. Exemplos do repositório

| Migration | Padrão | Observação |
| --- | --- | --- |
| `20260916164500_add_auth_version` | additive + default | rows existentes preservadas |
| `20260905142500_add_flexible_recurrence_persistence` | enum expand + default + CHECK | comportamento mensal legado permanece válido |
| `20260907121500_add_transfer_idempotency` | nullable expand + unique/CHECK | histórico não recebe idempotency key inventada |
| `20260902103000_add_currency_to_category_monthly_limits` | additive + mudança de índices/chave | exigiu rollout migration → status → runtime |
| `20260829133000_remove_account_balance` | contract de fonte de verdade antiga | mudança de domínio protegida por ADR e recuperação |

## Regra final

A melhor migration é a menor mudança que mantém dados corretos e rollout reversível onde possível.

Não usar expand/contract, backfill, concurrent index ou infraestrutura adicional por cerimônia. Use quando o risco concreto exige.
