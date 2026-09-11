# 2FA TOTP opcional

Status: **backend, UI de login/configurações, QR local e cobertura E2E implementados na #288**.  
Última revisão: **2026-09-11**.

O backend impõe segundo fator para contas com TOTP ativo e a interface oferece login MFA, ativação, QR Code local, recovery codes e desativação em **Configurações > Segurança**. A sessão normal só é emitida depois de TOTP ou recovery code válido.

## Contrato de segurança

- 2FA é opcional por usuário;
- usuário sem 2FA mantém o login atual;
- ativação exige sessão válida, senha atual e primeiro TOTP válido;
- desativação exige sessão válida, senha atual e TOTP atual ou recovery code válido;
- o segredo persistido fica criptografado com chave dedicada `TOTP_ENCRYPTION_KEY`;
- recovery codes são mostrados uma vez e persistidos somente como hash;
- ao desativar, segredo, estado TOTP, recovery codes e challenges MFA do usuário são invalidados atomicamente;
- challenge de login e token temporário de enrollment não equivalem a sessão autenticada;
- usuário com 2FA não recebe cookie de sessão após apenas e-mail/senha;
- TOTP/recovery code nunca são registrados em logs;
- não existe bypass administrativo oculto.

## Adapter TOTP

`otplib@13.5.0` fica encapsulado em `app/lib/security/totp.ts` com política explícita SHA-1, 6 dígitos, período de 30 segundos, Base32 e tolerância limitada de clock.

O adapter gera segredo/URI de provisioning, valida o código e retorna o time-step aceito. `afterTimeStep` fornece rejeição antecipada de replay; a garantia persistida continua em `totpLastUsedStep` + mutação atômica da aplicação.

Revisão da dependência: [`../quality/dependency-reviews/otplib-13.5.0.md`](../quality/dependency-reviews/otplib-13.5.0.md).

## Enrollment

`app/lib/security/totp-enrollment.ts` implementa as duas etapas de domínio e é exposto somente para sessão autenticada.

### Início

`POST /api/auth/mfa/enrollment/start` chama `startTotpEnrollment` para o usuário da sessão:

1. busca o próprio usuário;
2. revalida a senha atual;
3. rejeita conta que já tenha 2FA ativo;
4. gera os dados temporários de provisioning;
5. devolve URI/chave manual e um token de enrollment curto.

Nenhum estado MFA é persistido nessa etapa. Abandonar o fluxo não deixa 2FA parcialmente ativado.

### Token temporário

`app/lib/security/totp-enrollment-token.ts` usa issuer/audience/purpose próprios e TTL de 10 minutos. O token fica ligado ao usuário e transporta somente o envelope TOTP já criptografado, nunca o segredo em texto puro.

Ele serve como prova transitória de que a senha foi revalidada e não é aceito como sessão autenticada nem como challenge de login.

### Confirmação

`POST /api/auth/mfa/enrollment/confirm` chama `confirmTotpEnrollment` para o mesmo usuário autenticado:

1. valida o token de enrollment para o mesmo usuário;
2. valida o primeiro TOTP;
3. gera 10 recovery codes;
4. ativa 2FA e persiste segredo criptografado, data de ativação, primeiro time-step aceito e hashes dos recovery codes em uma única transação;
5. devolve os recovery codes em claro somente ao chamador dessa operação.

O mesmo enrollment não consegue ativar a conta duas vezes nem substituir o estado já ativo.

## Login MFA

`POST /api/auth/login` mantém o fluxo existente para usuário sem 2FA. Para usuário com `totpEnabled=true`, credenciais válidas passam a:

1. criar um `jti` aleatório;
2. persistir somente o hash desse `jti`, com expiração;
3. devolver um challenge MFA assinado com TTL de 5 minutos;
4. não emitir o cookie `token` e não atualizar `lastLogin` ainda.

`POST /api/auth/mfa/verify` recebe o challenge e exatamente um fator: `token` TOTP **ou** `recoveryCode`. Antes de validar o fator, aplica o rate limit MFA por usuário e IP. Challenge inválido/expirado e fator inválido falham sem criar sessão.

No TOTP, o segredo é descriptografado somente no servidor, o código é validado com `afterTimeStep` e challenge + novo time-step são consumidos na mesma transação. No recovery code, challenge + recovery code são consumidos na mesma transação. Se qualquer lado falhar, a transação faz rollback; portanto um fator inválido não queima um challenge ainda válido e um challenge inválido não consome o fator.

Somente depois desse consumo atômico a aplicação assina o token normal de sessão, grava o cookie autenticado, atualiza `lastLogin` por best effort e limpa o bucket de rate limit do usuário.

## Desativação forte

`DELETE /api/auth/mfa/settings` executa `disableTotp` somente para o usuário da sessão autenticada. O payload exige `currentPassword` e exatamente um fator: `token` TOTP ou `recoveryCode`.

O fluxo:

1. confirma a sessão e aplica o mesmo rate limit MFA por usuário/IP usado na verificação de login;
2. confirma que a conta autenticada está ativa e possui 2FA;
3. revalida a senha atual com o hash persistido;
4. valida TOTP respeitando `totpLastUsedStep` ou localiza um recovery code ainda não usado;
5. em uma única transação, desativa o TOTP por atualização condicional, limpa segredo/data/time-step e remove todos os recovery codes e challenges MFA do usuário;
6. se o estado mudar concorrentemente, a operação falha com conflito sem deixar limpeza parcial.

Fator incorreto é tratado como autenticação MFA inválida. Não existe caminho de desativação somente com sessão ou senha, nem bypass administrativo. Após sucesso, o bucket MFA do usuário é limpo; o bucket agregado por IP é preservado.

## Interface

### Login

A tela de login mantém e-mail/senha como primeira etapa. Quando a API retorna `mfaRequired`, o usuário permanece sem sessão e a própria tela muda para a etapa de segundo fator. É possível usar TOTP ou recovery code, com `autocomplete="one-time-code"`, suporte a colar e erro textual anunciado por `role="alert"`.

### Configurações > Segurança

A interface usa `totpEnabled` do próprio usuário como estado visível.

Na ativação:

1. revalida a senha atual;
2. mantém token/segredo/URI de provisioning apenas no estado transitório do componente;
3. renderiza localmente o QR Code do `otpauth://` em SVG com `qrcode.react`, sem serviço externo, mantendo também URI e chave manual como fallback;
4. direciona o foco para a confirmação TOTP e exige o primeiro código válido antes de ativar;
5. mostra recovery codes uma única vez com ações de copiar e baixar `.txt`;
6. não grava enrollment token, segredo ou recovery codes em `localStorage`/`sessionStorage`.

Na desativação, o usuário confirma senha atual e escolhe TOTP ou recovery code. A tela só passa a refletir 2FA desativado depois do sucesso da API.

Revisão da dependência de QR: [`../quality/dependency-reviews/qrcode-react-4.2.0.md`](../quality/dependency-reviews/qrcode-react-4.2.0.md).

## Persistência e replay

`User` mantém `totpEnabled`, `totpSecretEncrypted`, `totpActivatedAt` e `totpLastUsedStep` enquanto o 2FA está ativo.

`consumeTotpTimeStep` só aceita steps crescentes para usuário com 2FA ativo. O primeiro código usado no enrollment já grava seu time-step, evitando reutilização imediata desse mesmo código após ativar.

No login, challenge + time-step ou challenge + recovery code são consumidos atomicamente. Recovery codes usam consumo único por usuário. Challenges persistem apenas a identidade derivada necessária para garantir expiração e uso único. Na desativação, todo o material MFA remanescente é removido na mesma transação que muda o estado do usuário para 2FA desativado.

## Rate limiting

As verificações MFA de login e desativação reutilizam `AuthRateLimit` em PostgreSQL:

- 5 tentativas por usuário em 15 minutos;
- 30 tentativas por IP em 15 minutos;
- bloqueio de 15 minutos ao exceder o limite;
- TOTP e recovery code compartilham o mesmo namespace;
- após verificação MFA válida, apenas o bucket do usuário é limpo; o bucket de IP permanece como proteção agregada.

Identificadores brutos de usuário/IP não são persistidos pelo limiter; as chaves são derivadas por hash.

## Fluxos

### Ativação — implementado

sessão válida → senha atual → QR/chave manual temporários → primeiro TOTP → ativação atômica → recovery codes exibidos uma vez.

### Login — implementado

email/senha → challenge MFA sem sessão final → rate limit → TOTP/recovery → consumo atômico de challenge + fator → sessão normal.

### Desativação — implementado

sessão válida → rate limit → senha atual → TOTP/recovery → validação forte → desativação atômica → limpeza de segredo, recovery codes e challenges.

## Validação

O conjunto de testes cobre primitives criptográficas, adapter TOTP, challenge, persistência/anti-replay, rate limit, enrollment, login MFA e desativação, incluindo:

- senha atual obrigatória no enrollment;
- abandono sem persistência parcial;
- isolamento entre usuários;
- primeiro TOTP obrigatório;
- segredo persistido somente após confirmação;
- primeiro time-step marcado como usado;
- recovery codes persistidos somente como hashes;
- reuso do enrollment rejeitado;
- usuário sem 2FA continua recebendo sessão após senha válida;
- usuário com 2FA não recebe sessão nem `lastLogin` antes do segundo fator;
- TOTP válido completa o login e replay é rejeitado;
- falha de time-step/recovery faz rollback do challenge;
- recovery code usado não pode ser reutilizado;
- desativação exige exatamente um fator e revalida a senha atual;
- TOTP válido/inválido é coberto na desativação;
- recovery code inválido não altera o estado MFA;
- desativação válida limpa estado TOTP, recovery codes e challenges na mesma transação.

O E2E final da #288 cobre ativação, provisioning visual, login com recovery code, login com TOTP, desativação forte e retorno ao login normal sem 2FA.

Refs #288, #283, PR #320, PR #325, PR #331, PR #335, PR #412, PR #413, PR #414, PR #415, PR #416, PR #417, PR #419, PR #420, PR #421, `.env.example`, `docs/design/mfa-settings-ui.md` e `docs/quality/dependency-security-policy.md`.
