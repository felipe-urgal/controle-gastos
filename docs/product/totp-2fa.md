# 2FA TOTP opcional

Status: **security foundation em implementação na #288**.  
Última revisão: **2026-09-05**.

Este documento registra o contrato de segurança antes de conectar TOTP ao login, banco ou UI. O slice atual entrega primitives de proteção de segredo e recovery codes; ele **não ativa 2FA para nenhum usuário** e não altera o fluxo de autenticação existente.

## Princípios

- 2FA é opcional por usuário;
- usuário sem 2FA continua no fluxo atual;
- enrollment não ativa 2FA antes da confirmação do primeiro TOTP;
- login com 2FA não emite sessão final após apenas email/senha;
- segredo TOTP nunca é persistido em texto puro;
- recovery codes são mostrados uma vez e persistidos somente como hash;
- nenhum segredo, `otpauth://`, TOTP ou recovery code entra em logs;
- não existe bypass administrativo oculto.

## Chave de criptografia

O runtime final terá uma env dedicada:

```text
TOTP_ENCRYPTION_KEY
```

Formato escolhido: 32 bytes codificados como 64 caracteres hexadecimais. Exemplo de geração operacional:

```bash
openssl rand -hex 32
```

O valor real pertence ao secret store do ambiente e nunca ao Git, issue, PR, fixture ou log.

A chave deve ser diferente de senha de usuário, `JWT_SECRET`, credencial de banco ou qualquer outro segredo existente. O `.env.example` só será alterado quando um consumer runtime passar a exigir a variável; o foundation puro recebe a chave explicitamente e não lê `process.env`.

## Envelope de segredo

O foundation usa AES-256-GCM com:

- IV aleatório de 96 bits por criptografia;
- authentication tag de 128 bits;
- AAD estático e versionado para separar este uso criptográfico;
- formato persistível `v1.<iv>.<ciphertext>.<tag>` em base64url.

A versão explícita evita acoplar dados futuros a um formato impossível de migrar. Rotação de chave não faz parte do MVP, mas o envelope não impede uma estratégia de decrypt/re-encrypt futura.

Falha de autenticação, chave errada, tag adulterada ou envelope malformado produz erro genérico e nunca retorna plaintext parcial.

## Recovery codes

Cada código possui 80 bits aleatórios e é exibido como cinco grupos hexadecimais de quatro caracteres, por exemplo:

```text
ABCD-EF01-2345-6789-ABCD
```

O banco final armazenará somente SHA-256 do código normalizado. Hash rápido é adequado aqui porque o segredo de entrada é aleatório de alta entropia, não uma senha escolhida por humano. O valor plaintext é entregue uma única vez durante enrollment/regeneração.

Verificação usa comparação em tempo constante. Consumo de recovery code será implementado atomicamente no slice de persistência para garantir uso único inclusive sob concorrência.

## Challenge MFA planejado

Depois da validação de email/senha de um usuário com 2FA ativo, o servidor emitirá um challenge curto e assinado, com no mínimo:

- subject interno do usuário;
- purpose explícito `mfa-login`;
- identificador único de challenge;
- `iat`/`exp` curtos;
- versão do contrato.

O challenge **não é** sessão autenticada e não autoriza APIs privadas normais. Somente após validar TOTP ou recovery code o servidor emite a sessão atual.

Replay do challenge/time-step deve ser impedido pelo estado mínimo necessário no servidor. Esse estado será modelado junto da integração com `otplib`, pois a proteção concreta precisa considerar a API da versão adotada.

## Rate limiting

O projeto já possui `AuthRateLimit` persistido em PostgreSQL e `consumeRateLimit`, com transação `Serializable`, bloqueio e chave hash. O fluxo MFA deve reutilizar essa infraestrutura com ações próprias, em vez de criar contador em memória ou dependência Redis.

Identificadores de rate limit não devem expor email/código em claro na persistência; o helper atual deriva hash da combinação ação+identificador.

## Dependência TOTP

`otplib` ainda não é dependência do repositório e **não foi adicionada neste foundation**.

Antes do slice de verificação TOTP:

1. confirmar a linha suportada mais recente;
2. revisar changelog e security policy;
3. conferir API de janela/replay/comparação;
4. executar auditoria conforme `docs/quality/dependency-security-policy.md`;
5. garantir import server-only e ausência no bundle cliente;
6. atualizar lockfile exclusivamente via pnpm, nunca manualmente.

Não há ganho em adicionar a dependência antes de existir consumer runtime.

## Persistência planejada

A migration deve ser aditiva e manter todos os usuários atuais com 2FA desativado. O shape final precisa representar pelo menos:

- `totpEnabled=false` por default;
- envelope criptografado quando enrollment estiver confirmado;
- timestamps úteis de ativação/rotação;
- recovery code hashes com identidade/consumo atômico;
- estado mínimo de anti-replay/challenge quando necessário.

Enrollment abandonado não deixa `totpEnabled=true` nem material parcialmente ativo.

## Fluxos futuros

### Ativação

senha atual → segredo temporário → QR/chave manual → primeiro TOTP válido → persistência/ativação → recovery codes mostrados uma vez.

### Login

email/senha → challenge MFA sem sessão final → TOTP ou recovery code → sessão normal.

### Desativação

sessão válida + senha atual + TOTP/recovery → limpar envelope → invalidar recovery codes → desativar.

## Validação do foundation

Testes atuais protegem:

- formato e tamanho da chave;
- round-trip AES-GCM;
- IV novo a cada criptografia;
- rejeição de chave incorreta/tag adulterada;
- geração única e formatada de recovery codes;
- normalização/hash/verificação em tempo constante;
- fail-closed para inputs malformados;
- limites de quantidade de recovery codes.

Próximos slices: revisão/adopção `otplib`, schema/migration, enrollment, challenge/login, recovery atômico, desativação, rate limit MFA, UI e E2E.

Refs #288, #283, `app/lib/auth-rate-limit.ts` e `docs/quality/dependency-security-policy.md`.
