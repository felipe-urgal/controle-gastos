# 2FA TOTP opcional

Status: **foundation de segurança, persistência, anti-replay, rate limit MFA, adapter `otplib` e enrollment backend implementados; login MFA, desativação e UI ainda pendentes na #288**.  
Última revisão: **2026-09-11**.

O backend já possui o fluxo de ativação TOTP, mas ele ainda não está exposto na UI e o login normal ainda não exige segundo fator. A #288 permanece aberta até a integração end-to-end.

## Contrato de segurança

- 2FA é opcional por usuário;
- usuário sem 2FA mantém o login atual;
- ativação exige sessão válida, senha atual e primeiro TOTP válido;
- o segredo persistido fica criptografado com chave dedicada `TOTP_ENCRYPTION_KEY`;
- recovery codes são mostrados uma vez e persistidos somente como hash;
- challenge de login e token temporário de enrollment não equivalem a sessão autenticada;
- TOTP/recovery code nunca são registrados em logs;
- não existe bypass administrativo oculto.

## Adapter TOTP

`otplib@13.5.0` fica encapsulado em `app/lib/security/totp.ts` com política explícita SHA-1, 6 dígitos, período de 30 segundos, Base32 e tolerância limitada de clock.

O adapter gera segredo/URI de provisioning, valida o código e retorna o time-step aceito. `afterTimeStep` fornece rejeição antecipada de replay; a garantia persistida continua em `totpLastUsedStep` + mutação atômica da aplicação.

Revisão da dependência: [`../quality/dependency-reviews/otplib-13.5.0.md`](../quality/dependency-reviews/otplib-13.5.0.md).

## Enrollment backend

Endpoints autenticados:

```text
POST /api/user/security/totp/enrollment
POST /api/user/security/totp/enrollment/confirm
```

### Início

O servidor:

1. valida a sessão;
2. revalida a senha atual;
3. rejeita conta que já tenha 2FA ativo;
4. gera os dados temporários de provisioning;
5. devolve URI/chave manual e um token de enrollment curto.

Nenhum estado MFA é persistido nessa etapa. Abandonar o fluxo não deixa 2FA parcialmente ativado.

### Confirmação

O servidor:

1. valida sessão e token de enrollment para o mesmo usuário;
2. valida o primeiro TOTP;
3. gera 10 recovery codes;
4. ativa 2FA e persiste segredo criptografado, data de ativação, primeiro time-step aceito e hashes dos recovery codes em uma única transação;
5. devolve os recovery codes em claro somente nessa resposta.

O mesmo enrollment não consegue ativar a conta duas vezes nem substituir o estado já ativo.

## Persistência e replay

`User` mantém `totpEnabled`, `totpSecretEncrypted`, `totpActivatedAt` e `totpLastUsedStep`.

`consumeTotpTimeStep` só aceita steps crescentes para usuário com 2FA ativo. O primeiro código usado no enrollment já grava seu time-step, evitando reutilização imediata desse mesmo código após ativar.

Recovery codes usam consumo único e atômico por usuário. Challenges MFA persistem apenas a identidade derivada necessária para garantir expiração e uso único.

## Rate limiting

O login MFA reutilizará `AuthRateLimit` em PostgreSQL:

- 5 tentativas por usuário/challenge em 15 minutos;
- 30 tentativas por IP em 15 minutos;
- bloqueio de 15 minutos ao exceder o limite;
- TOTP e recovery code compartilham o mesmo namespace.

Esse rate limit ainda será conectado ao endpoint de verificação do login MFA.

## Fluxos

### Ativação — backend implementado

sessão válida → senha atual → provisioning temporário → primeiro TOTP → ativação atômica → recovery codes exibidos uma vez.

### Login — pendente

email/senha → challenge MFA sem sessão final → rate limit → TOTP/recovery → consumo atômico → sessão normal.

### Desativação — pendente

sessão válida + senha atual + TOTP/recovery → limpar material TOTP → invalidar recovery codes/challenges → desativar atomicamente.

## Validação atual

O conjunto de testes cobre primitives criptográficas, adapter TOTP, challenge, persistência/anti-replay, rate limit e enrollment, incluindo:

- senha atual obrigatória;
- abandono sem persistência parcial;
- isolamento entre usuários;
- primeiro TOTP obrigatório;
- segredo persistido somente após confirmação;
- primeiro time-step marcado como usado;
- recovery codes persistidos somente como hashes;
- reuso do enrollment rejeitado.

Próximos slices: integração do login MFA, desativação, UI de segurança/login e E2E.

Refs #288, #283, PR #320, PR #325, PR #331, PR #335, PR #412, PR #413, PR #414, `.env.example` e `docs/quality/dependency-security-policy.md`.
