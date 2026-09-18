# Política de backup e restore

Issue: #558  
Roadmap: #290 — Fase 3, item 31  
Última auditoria do provider: 2026-09-18

## Objetivo

Garantir recuperação de dados sem depender de uma única camada do provedor e sem transformar um projeto pessoal/free-first em uma infraestrutura de backup desnecessariamente complexa.

A política usa duas camadas:

1. **PITR do Neon** para incidentes recentes;
2. **dump PostgreSQL portátil** para uma cópia independente do mecanismo de restore do provedor.

Restore destrutivo nunca é testado diretamente em produção.

## Estado atual do Neon

Auditoria em 2026-09-18:

- projeto: `controle-gastos`;
- plano: Free;
- branch default: `main`;
- history retention configurado: **24 horas**;
- snapshot schedule: **não configurado**;
- snapshots atuais: **nenhum**.

O PITR do Neon consegue reconstruir um ponto dentro da janela de history retention. A aplicação não trata isso como substituto para backup portátil.

Ativar snapshots agendados ou aumentar history retention é uma decisão de plano/custo. Não alterar essa configuração silenciosamente para satisfazer um checklist técnico.

## Objetivos de recuperação

### Camada 1 — PITR

- **janela mínima de lookback:** 24 horas;
- **RPO operacional alvo:** até 15 minutos para um incidente cujo ponto correto esteja dentro da janela retida;
- **RTO operacional alvo:** até 60 minutos para criar/selecionar o ponto de recuperação, validar em branch isolada e tomar a decisão de recuperação.

O RPO de 15 minutos é um objetivo conservador do projeto, não uma promessa/SLA do Neon. O mecanismo do provider preserva histórico mais granular, mas a política inclui margem para localizar o início do incidente.

O RTO de 60 minutos também é objetivo. O drill de 2026-08-29 provou o procedimento, mas não registrou duração; o próximo drill deve medir tempo real e recalibrar este número.

### Camada 2 — dump portátil

- **periodicidade:** mensal e também antes de migration/operação destrutiva de alto risco;
- **retenção mínima:** 90 dias em armazenamento privado e criptografado fora do repositório;
- **RPO de desastre total do provider:** até 31 dias para o último dump mensal, menor quando existir dump pre-change mais recente;
- **RTO alvo:** até 4 horas para provisionar PostgreSQL isolado, restaurar o archive e concluir pós-checks.

A camada portátil é deliberadamente mais espaçada porque o projeto é pessoal/free-first e o PITR cobre o incidente operacional comum. Se a criticidade ou frequência de uso aumentar, reduza o intervalo antes de adicionar infraestrutura mais complexa.

## Exportar backup portátil

Pré-requisitos:

- PostgreSQL client compatível disponível localmente;
- conexão de produção obtida no contexto operacional correto;
- diretório de destino privado, fora do repositório e de artifacts públicos/compartilhados.

Use um shell privado e não ecoe a connection string:

```bash
umask 077
export BACKUP_DATABASE_URL='postgresql://...'
export BACKUP_FILE="controle-gastos-$(date -u +%Y%m%dT%H%M%SZ).dump"

pg_dump "$BACKUP_DATABASE_URL" \
  --format=custom \
  --no-owner \
  --no-acl \
  --file="$BACKUP_FILE"

pg_restore --list "$BACKUP_FILE" >/dev/null
sha256sum "$BACKUP_FILE" > "$BACKUP_FILE.sha256"
```

Regras:

- nunca commitar o dump ou checksum associado a um caminho contendo segredo;
- nunca enviar dump financeiro para GitHub Actions artifact;
- nunca registrar `BACKUP_DATABASE_URL` em issue/PR/log;
- armazenar o arquivo em storage privado com criptografia em repouso;
- remover cópias expiradas conforme retenção de 90 dias;
- falha de `pg_restore --list` torna o backup inválido.

## Restore de dump portátil

Use somente banco isolado e descartável.

Defina uma URL que **não seja** produção:

```bash
export RESTORE_DATABASE_URL='postgresql://...isolated...'
export BACKUP_FILE='controle-gastos-....dump'

sha256sum --check "$BACKUP_FILE.sha256"

pg_restore \
  --exit-on-error \
  --clean \
  --if-exists \
  --no-owner \
  --no-acl \
  --dbname="$RESTORE_DATABASE_URL" \
  "$BACKUP_FILE"
```

`--clean` é destrutivo no destino. A variável `RESTORE_DATABASE_URL` deve apontar exclusivamente para banco criado para o drill/recuperação.

Depois do restore, execute as verificações de schema e aplicação descritas abaixo.

## Restore drill do Neon

O drill canônico usa branch derivada de produção ou ponto histórico, nunca o banco de produção diretamente.

Periodicidade:

- **trimestral**;
- adicionalmente antes de mudança destrutiva relevante se não houver drill verde nos últimos 90 dias;
- depois de mudança material no mecanismo de backup/restore.

Procedimento resumido:

1. escolher checkpoint/timestamp dentro da janela retida;
2. criar branch de recuperação não produtiva;
3. obter connection string temporária sem compartilhá-la;
4. confirmar schema/migrations;
5. executar probes somente na branch isolada;
6. validar health/leitura;
7. registrar duração e resultado;
8. excluir a branch temporária.

A #134 executou esse procedimento em 2026-08-29:

- branch `restore-drill-20260829`;
- probe artificial criada e removida após restore;
- `restore_ok = true`;
- 13 migrations existentes / 13 aplicadas / 0 pendentes ou unfinished;
- branch temporária removida;
- produção não foi modificada.

Essa evidência prova o caminho de restore do provider. O próximo drill deve acrescentar medição de tempo para validar o RTO de 60 minutos.

## Pós-check obrigatório

Após qualquer restore em ambiente isolado:

1. `prisma migrate status` deve indicar schema esperado;
2. conferir a tabela `_prisma_migrations` sem expor conteúdo de negócio;
3. validar presença/shape e contagens agregadas básicas de `users`, `accounts`, `categories` e `transactions`;
4. não exportar nomes, e-mails, descrições ou valores financeiros para evidência;
5. iniciar Preview/aplicação apontando para o banco restaurado quando aplicável;
6. `GET /api/health` deve retornar 200;
7. validar autenticação e leitura de contas/transações com credencial de teste segura quando aplicável;
8. registrar tempo total, resultado e gaps;
9. destruir a branch/banco temporário depois da coleta de evidência.

## Antes de migration destrutiva

A mudança só avança quando:

- history retention atual foi conferido e continua >= 24 h;
- existe recovery point recente;
- dump portátil pre-change foi criado e validado quando a operação puder perder dados;
- ordem de rollout/forward-fix está documentada;
- rollback de aplicação é compatível com o schema ou foi explicitamente descartado.

## Quando revisar esta política

Revisar se ocorrer qualquer um destes eventos:

- mudança do plano Neon;
- redução/aumento do history retention;
- ativação de snapshot schedule;
- banco crescer a ponto de ameaçar os objetivos de RTO;
- drill exceder RTO;
- perda de dados ultrapassar o RPO;
- feature elevar materialmente a criticidade dos dados.

## Limites assumidos

A política não garante recuperação além do que foi realmente retido.

No estado auditado:

- corrupção detectada depois que o ponto correto saiu da janela de 24 h depende do dump portátil;
- entre dumps portáteis, um desastre total do provider pode implicar perda maior do que o RPO da camada PITR;
- não existe snapshot schedule automático configurado.

Essas limitações são explícitas por escolha free-first, não gaps escondidos.
