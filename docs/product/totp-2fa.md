# 2FA TOTP opcional

Status: **primitives criptográficas, challenge, persistência, consumo atômico, proteção persistida de replay por time-step, rate limit MFA e adapter `otplib` implementados; enrollment/login ainda pendentes na #288**.  
Última revisão: **2026-09-11**.

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

### Consumo persistido de time-step TOTP

`consumeTotpTimeStep` usa uma única mutação condicional no usuário autenticado e só grava `totpLastUsedStep` quando:

- `totpEnabled=true`;
- o step ainda está nulo ou é estritamente menor que o novo step aceito.

A primitive rejeita step repetido ou regressivo e, sob duas tentativas concorrentes do mesmo step, somente uma consegue atualizar a linha.

O adapter TOTP agora também passa o último step conhecido como `afterTimeStep` para rejeição antecipada na biblioteca. Mesmo assim, a proteção final continua dependendo de `consumeTotpTimeStep`, porque o estado persistido/atômico pertence à aplicação.

## Adapter TOTP

`otplib@13.5.0` foi adicionado por `pnpm` e fica encapsulado em `app/lib/security/totp.ts`.

A política é explícita e única:

- SHA-1;
- 6 dígitos;
- período de 30 segundos;
- segredo Base32 com 20 bytes / 160 bits;
- tolerância de clock de 30 segundos para passado e futuro;
- API funcional v13, sem preset `authenticator` legado.

O adapter fornece:

- geração de segredo TOTP;
- URI `otpauth://` para enrollment;
- verificação de token com normalização apenas de whitespace;
- retorno do `timeStep` efetivamente aceito;
- suporte a `afterTimeStep` usando o último step persistido.

Token que não normalize para exatamente 6 dígitos falha fechado. A aplicação não implementa HMAC/TOTP manualmente e delega comparação em tempo constante à biblioteca auditada.

## Rate limiting

MFA reutiliza `AuthRateLimit` em PostgreSQL e `consumeRateLimit` com transação `Serializable`; não existe contador em memória nem dependência de Redis/serviço pago.

O adapter `app/lib/security/mfa-rate-limit.ts` define uma política única para a etapa de segundo fator:

- bucket por IP: 30 tentativas em 15 minutos;
- bucket por usuário/challenge autenticado: 5 tentativas em 15 minutos;
- bloqueio de 15 minutos ao exceder o limite;
- TOTP e recovery code compartilham os mesmos buckets, evitando bypass ao alternar o tipo de segundo fator;
- após MFA válido, somente o bucket do usuário pode ser limpo; o bucket de IP permanece para não permitir que um sucesso zere proteção coletiva contra abuso.

Os identificadores continuam entrando apenas na primitive genérica que persiste chave SHA-256; usuário/IP em claro não são armazenados em `AuthRateLimit`.

A política já está testada, mas ainda **não é chamada por endpoint público**, porque o endpoint de verificação MFA depende da integração do challenge no login.

## Dependência TOTP

A revisão de supply chain/API está registrada em:

- [`../quality/dependency-reviews/otplib-13.5.0.md`](../quality/dependency-reviews/otplib-13.5.0.md).

Estado após o PR #414:

- `otplib` 13.5.0 adotada e fixada no `package.json`;
- `pnpm-lock.yaml` gerado por `pnpm`, sem edição manual;
- upstream 13.x suportado e `<=12.x` EOL;
- Node `>=20` compatível com Node 24 do projeto;
- plugins padrão do lockfile usam `@noble/hashes` e `@scure/base`;
- comparação em tempo constante, guardrails e `afterTimeStep` vêm da biblioteca;
- armazenamento, rate limiting, atomicidade e sessão continuam responsabilidade desta aplicação.

## Fluxos futuros

### Ativação

senha atual → segredo temporário via adapter → URI/QR + chave manual → primeiro TOTP válido → persistência criptografada/ativação → recovery codes exibidos uma vez.

### Login

email/senha → challenge MFA sem sessão final → persistir hash do `jti` → rate limit MFA → TOTP/recovery code → `afterTimeStep` + consumo atômico do challenge/código/time-step → sessão normal.

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
- recovery code consumido uma única vez;
- time-step TOTP aceito somente em ordem crescente;
- duas tentativas concorrentes do mesmo time-step têm exatamente um vencedor;
- usuário sem 2FA ativo não consegue consumir time-step.

Adapter TOTP cobre:

- configuração SHA-1 / 6 dígitos / 30 segundos / Base32;
- segredo de 160 bits;
- vetor derivado do RFC 6238;
- clock drift limitado a um período adjacente;
- retorno do time-step aceito;
- rejeição antecipada de replay via `afterTimeStep`;
- normalização de whitespace sem aceitar formato fora de 6 dígitos;
- URI de provisioning coerente com a mesma política.

Rate limit MFA cobre:

- limite de 5 tentativas por usuário em 15 minutos;
- bucket adicional de IP com limite maior;
- TOTP/recovery no mesmo namespace de tentativa;
- limpeza do bucket do usuário após sucesso sem zerar o bucket de IP;
- rejeição de identificadores vazios antes de tocar a persistência compartilhada.

Próximos slices: serviço de enrollment, integração do challenge/rate limit/TOTP/recovery no login, desativação, UI e E2E.

Refs #288, #283, PR #320, PR #325, PR #331, PR #335, PR #412, PR #413, PR #414, `app/lib/auth-token.ts`, `app/lib/auth-rate-limit.ts` e `docs/quality/dependency-security-policy.md`.
