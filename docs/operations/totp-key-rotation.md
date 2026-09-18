# Rotação da chave de criptografia TOTP

Issue: #556  
Roadmap: #290 — Fase 3, Segurança, item 30

## Objetivo

Rotacionar `TOTP_ENCRYPTION_KEY` sem tornar segredos TOTP existentes indecifráveis e sem recriptografia destrutiva em um único deploy.

A aplicação usa:

- chave ativa: `TOTP_ENCRYPTION_KEY`;
- versão ativa: `TOTP_ENCRYPTION_KEY_VERSION`;
- versões antigas somente para decrypt: `TOTP_ENCRYPTION_PREVIOUS_KEYS`.

Nenhuma chave é persistida no PostgreSQL. A versão fica no envelope criptográfico.

## Formatos

Legado:

```text
v1.<iv>.<ciphertext>.<tag>
```

Todo envelope `v1` usa **key version 1**.

Atual:

```text
v2.<keyVersion>.<iv>.<ciphertext>.<tag>
```

A versão entra no AAD AES-GCM. Alterar o número sem a chave/tag correspondentes falha fechado.

## Primeiro rollout — sem trocar a chave

Antes da primeira rotação, publique o código compatível mantendo a chave atual:

```text
TOTP_ENCRYPTION_KEY=<chave-atual>
TOTP_ENCRYPTION_KEY_VERSION=1
TOTP_ENCRYPTION_PREVIOUS_KEYS=
```

Isso preserva todos os envelopes `v1` existentes e faz novos enrollments passarem a gravar `v2.1`.

Confirme login MFA/step-up em ambiente não produtivo antes de iniciar uma rotação real.

## Preparar uma nova versão

Exemplo conceitual para rotacionar de versão 1 para 2:

1. gere uma nova chave randômica de 32 bytes;
2. mantenha a chave antiga disponível como versão anterior;
3. configure:

```text
TOTP_ENCRYPTION_KEY=<nova-chave-64-hex>
TOTP_ENCRYPTION_KEY_VERSION=2
TOTP_ENCRYPTION_PREVIOUS_KEYS=1:<chave-antiga-64-hex>
```

Não coloque valores reais em issue, PR, log ou documentação.

Depois do deploy, novas ativações usam `v2.2`; envelopes `v1`/`v2.1` continuam legíveis pela chave anterior.

## Preflight obrigatório

Primeiro em banco isolado/restaurado; depois no ambiente alvo:

```bash
pnpm security:rotate-totp-key
```

Sem `--apply`, o comando:

- percorre somente usuários com TOTP ativo;
- identifica a versão de cada envelope;
- tenta decifrar todo envelope que não usa a versão ativa;
- não grava nada;
- imprime somente contagens e a versão ativa;
- falha antes de qualquer write se uma versão necessária estiver ausente ou um envelope for inválido.

A saída não contém user ID, segredo TOTP nem chave.

## Aplicar

Somente depois de backup/checkpoint operacional e preflight verde:

```bash
pnpm security:rotate-totp-key --apply
```

A execução faz novamente o preflight completo antes de escrever.

Cada atualização usa condição sobre:

- usuário;
- TOTP ainda ativo;
- envelope antigo observado.

Se o estado mudar concorrentemente, a linha não é sobrescrita e entra em `conflicts`. Conflito produz exit code não-zero e exige nova inspeção/preflight.

O processo é idempotente: envelopes já na versão ativa são ignorados.

## Verificação pós-rotação

Execute novamente:

```bash
pnpm security:rotate-totp-key
```

Critério esperado:

```text
wouldRotate = 0
conflicts = 0
```

Depois:

1. valide login MFA com TOTP em conta de teste;
2. valide step-up/desativação em ambiente seguro quando aplicável;
3. confirme logs sem segredo/chave;
4. somente então considere remover a chave anterior.

## Remover chave anterior

Remova uma versão de `TOTP_ENCRYPTION_PREVIOUS_KEYS` somente quando o dry-run comprovar que nenhum envelope ativo ainda depende dela.

Se uma versão referenciada for removida cedo demais, o runtime falha fechado com `TOTP_ENCRYPTION_KEY_VERSION_NOT_CONFIGURED`.

## Rollback

### Antes de `--apply`

É seguro restaurar a configuração anterior, porque nenhum envelope foi reescrito.

### Depois que algum envelope foi reescrito

Não faça rollback para código anterior ao keyring: envelopes `v2.<nova-versão>` não são compreendidos pelo runtime legado.

Para recuar a chave ativa mantendo o código novo:

- restaure a chave anterior como ativa e sua versão correspondente;
- mantenha a chave nova em `TOTP_ENCRYPTION_PREVIOUS_KEYS`;
- rode dry-run;
- se necessário, aplique recriptografia de volta à versão ativa escolhida.

Só remova uma das chaves quando o checkpoint confirmar zero dependências daquela versão.

## Falhas

Pare a rotação quando houver:

- envelope inválido;
- key version sem chave configurada;
- conflito de update;
- falha de conexão/banco;
- dúvida sobre qual chave corresponde a uma versão.

Nunca tente "adivinhar" a chave usando todas as versões. A versão persistida é parte do contrato e impede fallback silencioso.
