# 2FA TOTP opcional

Status: **primitives criptográficas, challenge, persistência e consumo atômico base implementados; integração TOTP/login ainda pendente na #288**.  
Última revisão: **2026-09-05**.

Este documento registra o contrato de segurança antes de conectar TOTP ao login e à UI. Nenhum slice atual ativa 2FA para usuário existente.

## Princípios

- 2FA é opcional;
- usuário sem 2FA mantém o login atual;
- enrollment só ativa após primeiro TOTP válido;
- login com 2FA não emite sessão final após apenas email/senha;
- segredo TOTP nunca é persistido em texto puro;
- recovery codes são mostrados uma vez e persistidos somente como hash;
- segredo, `otpauth://`, TOTP e recovery code nunca entram em logs;
- não existe bypass administrativo oculto.

## Proteção de segredo

A persistência usa uma env dedicada `TOTP_ENCRYPTION_KEY`, diferente de `JWT_SECRET`, banco e demais segredos. Formato: 32 bytes / 64 hex.

O foundation integrado usa AES-256-GCM com IV aleatório de 96 bits, tag de 128 bits, AAD versionado e envelope `v1.<iv>.<ciphertext>.<tag>`. Falha de autenticação/tamper/chave errada nunca retorna plaintext parcial.

O banco possui os campos `totpEnabled`, `totpSecretEncrypted`, `totpActivatedAt` e `totpLastUsedStep`. A migration é aditiva e mantém todos os usuários existentes com 2FA desativado.

A constraint `users_totp_state_check` garante:

- usuário desativado não retém envelope, ativação ou time-step aceito;
- usuário ativo precisa ter envelope criptografado e timestamp de ativação;
- `totpLastUsedStep` pode começar nulo após ativação e será atualizado apenas pelo fluxo TOTP integrado.

Enrollment temporário continua em memória/resposta transitória até o primeiro código válido; não existe usuário parcialmente ativado no banco.

## Recovery codes

Cada código possui 80 bits aleatórios e formato legível em grupos. O banco armazena somente SHA-256 do valor normalizado em `TotpRecoveryCode.codeHash`; a comparação usa primitive de tempo constante.

`consumeTotpRecoveryCode` calcula o hash imediatamente e executa `updateMany` condicionado a `userId + codeHash + usedAt=null`. O retorno só é verdadeiro quando exatamente uma linha é marcada. Reuso, outro usuário ou duas tentativas concorrentes não conseguem consumir a mesma linha duas vezes.

O código em claro não é persistido nem usado como chave de lookup no banco.

## Challenge MFA

Depois de validar email/senha de uma conta com 2FA ativo, o servidor emitirá um JWT curto e restrito à etapa MFA.

O contrato implementado usa:

- `sub`: ID interno do usuário;
- `jti`: identidade do challenge;
- `purpose=mfa-login`;
- issuer `controle-gastos-mfa`;
- audience `controle-gastos-mfa-login`;
- `HS256` com o segredo JWT já protegido pelo runtime;
- TTL de 5 minutos.

O challenge não é sessão autenticada. A separação por issuer/audience/purpose é deliberada: `verifyAuthToken` rejeita challenge MFA e `verifyMfaChallenge` rejeita token de sessão normal.

Reutilizar `JWT_SECRET` para assinatura não mistura o material criptográfico do segredo TOTP: `TOTP_ENCRYPTION_KEY` continua necessariamente separada. O challenge é uma credencial transitória do mesmo sistema de autenticação; comprometimento do `JWT_SECRET` já comprometeria sessões normais.

### Persistência e consumo de challenge

`persistMfaLoginChallenge` armazena **SHA-256 do `jti`**, nunca o token JWT nem o `jti` em claro.

`consumeMfaLoginChallenge` usa uma única mutação condicional por:

- `userId`;
- hash do `jti`;
- `consumedAt=null`;
- `expiresAt > now`.

Somente uma tentativa consegue atualizar a linha para `consumedAt=now`. Challenge expirado, já consumido ou pertencente a outro usuário falha fechado sem mudar estado.

Essa primitive entrega consumo único no nível de persistência, mas **não declara login MFA end-to-end protegido contra replay**: o fluxo de login ainda precisa verificar a assinatura/purpose do JWT e chamar o consumo antes de emitir sessão final.

Da mesma forma, `totpLastUsedStep` apenas prepara proteção contra reutilização do mesmo time-step TOTP; a regra efetiva será conectada junto da API auditada de `otplib`.

## Rate limiting

O projeto já possui `AuthRateLimit` em PostgreSQL e `consumeRateLimit` com transação `Serializable`. MFA deve reutilizar essa infraestrutura com ações próprias; não será criado contador em memória nem Redis apenas para esta feature.

## Dependência TOTP

`otplib` ainda não foi adicionada. Antes do consumer real:

1. confirmar versão suportada;
2. revisar changelog/security policy;
3. conferir janela/replay/comparação;
4. executar auditoria segundo `docs/quality/dependency-security-policy.md`;
5. garantir import server-only;
6. atualizar lockfile somente via pnpm.

## Fluxos futuros

### Ativação

senha atual → segredo temporário → QR/chave manual → primeiro TOTP → persistência/ativação → recovery codes exibidos uma vez.

### Login

email/senha → challenge MFA sem sessão final → persistir hash do `jti` → TOTP/recovery code → consumo atômico do challenge/código → sessão normal.

### Desativação

sessão válida + senha atual + TOTP/recovery → limpar envelope/time-step → invalidar recovery codes/challenges → desativar na mesma unidade transacional.

## Validação atual

Primitives criptográficas cobrem chave, AES-GCM, IV único, tamper, recovery codes e comparação segura.

Challenge assinado cobre:

- round-trip com `sub+jti`;
- token de sessão rejeitado como MFA;
- challenge MFA rejeitado como sessão;
- purpose incorreto rejeitado;
- expiração;
- inputs sem subject/identidade rejeitados.

Persistência/consumo cobre:

- default `totpEnabled=false` compatível com usuários existentes;
- envelope e estado coerentes por constraint;
- challenge persistido somente por hash;
- challenge expirado não consumido;
- isolamento por usuário;
- consumo único mesmo com duas tentativas concorrentes;
- recovery code persistido/consultado somente por hash;
- recovery code consumido uma única vez.

Próximos slices: adoção auditada de `otplib`, serviço de enrollment, integração dessas primitives no login, proteção por time-step TOTP, rate limit MFA, desativação, UI e E2E.

Refs #288, #283, PR #320, PR #325, PR #331, `app/lib/auth-token.ts`, `app/lib/auth-rate-limit.ts` e `docs/quality/dependency-security-policy.md`.
