# 2FA TOTP opcional

Status: **primitives criptográficas integradas; challenge MFA em implementação na #288**.  
Última revisão: **2026-09-05**.

Este documento registra o contrato de segurança antes de conectar TOTP ao login, banco ou UI. Nenhum slice atual ativa 2FA para usuário existente.

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

A persistência futura usa uma env dedicada `TOTP_ENCRYPTION_KEY`, diferente de `JWT_SECRET`, banco e demais segredos. Formato: 32 bytes / 64 hex.

O foundation integrado usa AES-256-GCM com IV aleatório de 96 bits, tag de 128 bits, AAD versionado e envelope `v1.<iv>.<ciphertext>.<tag>`. Falha de autenticação/tamper/chave errada nunca retorna plaintext parcial.

## Recovery codes

Cada código possui 80 bits aleatórios e formato legível em grupos. O banco armazenará somente SHA-256 do valor normalizado; a comparação usa primitive de tempo constante. Consumo único e concorrência serão resolvidos atomicamente no slice de persistência.

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

### Limite importante: assinatura não resolve replay

`jti` identifica o challenge, mas este slice **não declara consumo único**. Anti-replay exige estado persistido/atômico ou regra equivalente no fluxo integrado. Isso será implementado antes de habilitar login 2FA.

Da mesma forma, proteção contra reutilização do mesmo time-step TOTP será decidida junto da API efetivamente adotada de `otplib` e do estado persistido.

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

## Persistência planejada

A migration futura deve ser aditiva e manter usuários atuais com 2FA desativado. Precisa representar:

- `totpEnabled=false` por default;
- envelope criptografado após enrollment confirmado;
- timestamps úteis;
- recovery code hashes com consumo atômico;
- estado mínimo de challenge/anti-replay quando necessário.

Enrollment abandonado não deixa 2FA parcialmente ativo.

## Fluxos futuros

### Ativação

senha atual → segredo temporário → QR/chave manual → primeiro TOTP → persistência/ativação → recovery codes exibidos uma vez.

### Login

email/senha → challenge MFA sem sessão final → TOTP/recovery code → consumo seguro do challenge/código → sessão normal.

### Desativação

sessão válida + senha atual + TOTP/recovery → limpar envelope → invalidar recovery codes → desativar.

## Validação atual

Primitives criptográficas cobrem chave, AES-GCM, IV único, tamper, recovery codes e comparação segura.

Challenge cobre:

- round-trip com `sub+jti`;
- token de sessão rejeitado como MFA;
- challenge MFA rejeitado como sessão;
- purpose incorreto rejeitado;
- expiração;
- inputs sem subject/identidade rejeitados.

Próximos slices: adoção auditada de `otplib`, schema/migration, enrollment, anti-replay persistido, integração login, recovery atômico, desativação, rate limit, UI e E2E.

Refs #288, #283, PR #320, `app/lib/auth-token.ts`, `app/lib/auth-rate-limit.ts` e `docs/quality/dependency-security-policy.md`.
