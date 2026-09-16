# Auditoria de política de autenticação, cookies e tokens — #514

## Escopo

Auditoria da Fase 1 / Segurança / item 3 da roadmap #290 sobre o `main`:

`744d33704636df60b5523db3d3d5fcb0bd95e5da`

Superfície revisada:

- `app/lib/auth.ts`;
- `app/lib/auth/auth-cookie.ts`;
- `app/lib/auth/auth-token.ts`;
- `app/lib/auth/password-reset-token.ts`;
- `app/lib/auth/auth-rate-limit.ts`;
- `app/lib/security/mfa-challenge.ts`;
- `app/lib/security/mfa-login.ts`;
- `app/api/auth/login/route.ts`;
- `app/api/auth/logout/route.ts`;
- `app/api/auth/signup/route.ts`;
- `app/api/auth/forgot-password/route.ts`;
- `app/api/auth/reset-password/route.ts`;
- `app/api/auth/mfa/verify/route.ts`;
- `app/api/verificar-token/route.ts`;
- `app/lib/users/user-crud.ts`;
- testes próximos dessas responsabilidades;
- configuração/documentação de `JWT_SECRET`.

A auditoria é conservadora: busca negativa não prova que uma rota pública não possui consumidor externo. Itens sem evidência suficiente são classificados como `inconclusivo`, não como código morto.

## Resumo executivo

A superfície de autenticação já possui controles fortes consolidados: sessão JWT com algoritmo/issuer/audience/expiração explícitos, cookies `HttpOnly` com `Secure` dependente do transporte, challenge MFA purpose-bound e curto, reset tokens randômicos armazenados apenas como hash, rate limiting e respostas genéricas no fluxo de recuperação.

Foram encontrados dois gaps materiais:

1. **#515 — invalidação de sessão:** JWTs normais não carregam versão/epoch de autenticação e `getAuthenticatedUserId` não revalida `isActive`; troca/reset de senha não revogam sessões já emitidas.
2. **#516 — signup:** conflito de e-mail revela explicitamente conta existente e o fallback de erro usa `console.error` bruto, fora da observabilidade sanitizada.

Um endpoint legado de verificação de reset token (`GET /api/verificar-token?token=...`) não possui consumidor interno encontrado. Como uma rota pública pode ter integração externa, a ausência de referência interna não é evidência suficiente para remoção neste recorte.

## Matriz de controles

| Controle | Evidência | Classificação | Ação |
| --- | --- | --- | --- |
| JWT de sessão fixa algoritmo | `HS256` no sign e allow-list `[HS256]` no verify | Conforme | Nenhuma |
| JWT de sessão fixa issuer/audience | `seu-app` / `seu-app-users`, validados no verify | Conforme | Nenhuma |
| JWT de sessão expira | TTL `7d`; teste cobre token expirado | Conforme | Nenhuma |
| Cookie e JWT têm duração coerente | cookie `maxAge=7d`; token `expiresIn=7d` | Conforme | Nenhuma |
| Cookie não acessível por JS | `httpOnly: true` em login e MFA | Conforme | Nenhuma |
| Cookie usa `Secure` em HTTPS/proxy | `shouldUseSecureAuthCookie` cobre HTTPS direto e `x-forwarded-proto=https`; testes dedicados | Conforme | Nenhuma |
| Cookie restringe cross-site | `sameSite: "lax"` | Conforme | Nenhuma |
| Cookie tem escopo previsível | `path: "/"`, `priority: "high"` | Conforme | Nenhuma |
| Logout limpa o mesmo cookie | `token=""`, mesmos atributos centrais, `maxAge: 0` | Conforme | Nenhuma |
| Challenge MFA é separado logicamente da sessão | issuer/audience/purpose próprios, `jti`, TTL 5 min | Conforme | Nenhuma |
| Challenge MFA não funciona como sessão normal | teste dedicado rejeita challenge em `verifyAuthToken` | Conforme | Nenhuma |
| MFA revalida usuário ativo/configurado | `completeMfaLogin` exige `isActive`, `totpEnabled`, segredo válido e consumo atômico | Conforme | Nenhuma |
| Reset token tem alta entropia | `crypto.randomBytes(32)` | Conforme | Nenhuma |
| Reset token não é persistido em claro | SHA-256 antes de persistir | Conforme | Nenhuma |
| Reset token expira | 1 hora no request; reset e verify checam `expiresAt` | Conforme | Nenhuma |
| Reset token é uso único | consumo via `deleteMany` condicional dentro da transação antes da troca do hash | Conforme | Nenhuma |
| Nova solicitação invalida reset tokens anteriores | `deleteMany({ userId })` antes de criar o novo token | Conforme | Nenhuma |
| Forgot-password evita enumeração | resposta pública genérica para e-mail inexistente/inativo/inválido | Conforme | Nenhuma |
| Login evita enumeração | mesma resposta para usuário inexistente, senha inválida ou usuário inativo | Conforme | Nenhuma |
| Sessão normal revalida estado atual | `getAuthenticatedUserId` valida apenas JWT e retorna `sub` | **Gap material** | #515 |
| Troca de senha invalida JWTs antigos | `userCrud` troca hash sem epoch/version | **Gap material** | #515 |
| Reset de senha invalida JWTs antigos | reset troca hash sem epoch/version | **Gap material** | #515 |
| Usuário inativo perde sessão já emitida | gateway não consulta `isActive` | **Gap material** | #515 |
| Signup evita enumeração | `P2002` responde `E-mail já está em uso` | **Gap material** | #516 |
| Auth backend usa logging sanitizado | login/forgot/reset/MFA usam `logEvent`; signup usa `console.error(error)` | **Gap material** | #516 |
| Logs dos fluxos maduros não carregam segredos | contextos usam requestId/route/status/code; sanitização remove Bearer/JWT em error stack | Conforme | Nenhuma |
| `JWT_SECRET` é documentado como segredo longo e randômico | README/.env.example/CI usam placeholders longos; runtime valida presença, não entropia | Inconclusivo operacional | Não alterar sem evidência do segredo de deploy |
| `GET /api/verificar-token?token=...` é necessário | nenhuma referência interna encontrada além da própria rota | Inconclusivo | Não remover só por busca negativa |

## Detalhamento — #515

### Estado atual

`signAuthToken(userId)` assina apenas `{ sub: userId }` por 7 dias. `verifyAuthToken` devolve apenas `userId`.

`getAuthenticatedUserId` lê o cookie e aceita qualquer JWT criptograficamente válido. Não há consulta ao usuário para confirmar:

- `isActive` atual;
- se a senha foi trocada depois da emissão;
- se um reset de senha deveria encerrar sessões antigas.

A troca autenticada de senha em `app/lib/users/user-crud.ts` atualiza somente `password`. O reset em `POST /api/auth/reset-password` também atualiza somente `password` depois de consumir o reset token.

### Consequência

Um JWT capturado antes da troca/reset de senha permanece utilizável até o TTL de 7 dias. Se o usuário for marcado como inativo depois da emissão, a sessão normal também continua criptograficamente válida.

### Correção delimitada

#515 deve usar versão monotônica de autenticação no usuário, incluída no JWT e comparada no gateway server-side. A versão só deve ser incrementada por eventos de credencial/revogação; updates como nome ou `showValues` não devem revogar sessão.

`proxy.ts` permanece sem Prisma: ele continua sendo filtro de navegação por assinatura/expiração. A autorização real de API fica no gateway server-side, que pode consultar a versão vigente.

## Detalhamento — #516

### Enumeração

`POST /api/auth/signup` retorna `E-mail já está em uso` para `P2002`. Um cliente não autenticado pode usar essa diferença para confirmar que um e-mail possui conta.

A política já adotada em login e forgot-password é não distinguir publicamente a existência da conta. Signup deve ser alinhado a esse contrato com mensagem genérica de falha de cadastro, preservando o status e o fluxo de sucesso.

### Logging

O fallback inesperado do signup executa:

`console.error("REGISTER ERROR:", error)`

Esse caminho não passa por `sanitizeError`, não adiciona request ID e diverge dos demais endpoints de auth. A correção deve usar `getRequestId`, `withRequestId` e `logEvent`, sem colocar e-mail, nome, senha, body ou hash no contexto.

## Itens conformes relevantes

### Cookie de sessão

Login e MFA usam exatamente:

- `httpOnly: true`;
- `secure: shouldUseSecureAuthCookie(request)`;
- `sameSite: "lax"`;
- `path: "/"`;
- `maxAge: 60 * 60 * 24 * 7`;
- `priority: "high"`.

Logout limpa o cookie com os mesmos atributos centrais e `maxAge: 0`.

A duplicação dessas opções entre rotas pode ser refinada no futuro se houver drift real, mas não há divergência funcional que justifique abstração nova neste recorte.

### JWT de sessão

O token normal:

- usa `HS256` explicitamente;
- verifica somente a allow-list `HS256`;
- fixa issuer e audience;
- expira em 7 dias;
- rejeita `sub` ausente/não string;
- possui regressões para issuer, audience e expiração.

### Challenge MFA

O challenge MFA não reutiliza semanticamente a sessão normal apesar de compartilhar `JWT_SECRET`:

- issuer: `controle-gastos-mfa`;
- audience: `controle-gastos-mfa-login`;
- purpose: `mfa-login`;
- `jti` obrigatório;
- TTL 5 minutos;
- persistência/consumo server-side do challenge;
- teste garante que challenge MFA não autentica como token normal.

### Reset de senha

O token bruto existe apenas para entrega ao usuário. O banco recebe somente SHA-256; o fluxo atual substitui tokens anteriores, limita tentativas, checa expiração e consome o token atomicamente antes de gravar a nova senha.

## Itens inconclusivos sem write neste recorte

### Força real de `JWT_SECRET`

Código exige presença de `JWT_SECRET`, e exemplos/CI usam strings explicitamente longas. A auditoria não lê nem registra segredo real de produção. Sem evidência segura sobre o valor implantado, não há base para afirmar tamanho/entropia reais nem para mudar o contrato de deploy silenciosamente.

Uma futura validação operacional pode impor um mínimo de bytes/rotação, mas isso deve vir com verificação de ambiente e plano de rollout, não como efeito colateral desta auditoria.

### `/api/verificar-token`

A busca pelo caminho não encontrou consumidor interno; a tela atual envia reset diretamente por `POST /api/auth/reset-password`. Ainda assim, rota pública pode ser consumida externamente. Ela permanece intocada nesta auditoria por ausência de evidência suficiente para remoção.

## Follow-ups

- #515 — invalidar sessões antigas após troca/reset de senha e rejeitar usuário inativo no gateway server-side.
- #516 — remover enumeração explícita e logging bruto do signup.

## Critério de encerramento da #514

A #514 só deve ser encerrada depois que #515 e #516 estiverem integradas e o CI pós-merge de `main` estiver verde. O documento de auditoria pode ser mergeado antes, mas a issue-pai permanece aberta até os findings materiais fecharem.
