# Autenticação pública — contratos

## Sessão
- Cookie HttpOnly, SameSite=Lax, Path=/, sem Domain. Em HTTPS o nome é `__Host-token` (Secure); em HTTP (dev/E2E) é `token`. A leitura aceita os dois nomes; logout/limpeza expira ambos.
- **Proxy** (`proxy.ts`) é filtro barato: valida assinatura/expiração do JWT, sem consultar banco, e redireciona para `/login?next=<rota>`.
- **APIs** são a autoridade: `getAuthenticatedUserId` revalida usuário ativo e `authVersion`. Sessão revogada → 401; o client (`apiClient`) emite `auth:session-expired` e o `AuthContext` limpa o estado sem apagar rascunhos offline.
- `next` só aceita caminhos internos de rotas protegidas (`sanitizeNextPath`); qualquer outra coisa cai em `/dashboard`.

## Senha
- Regras em `app/lib/auth/password-rules.ts` (mín. 10 caracteres, máx. 72 **bytes** UTF-8) usadas por signup, reset e troca de senha. Nunca aceitar senha que o bcrypt truncaria.
- Login não aplica a política de criação: senhas antigas continuam válidas até a próxima troca.

## Tokens
- Reset: um token por usuário (`userId` único); novo pedido substitui o anterior. Se o envio falha, o token anterior ainda válido é restaurado. Reset bem-sucedido apaga todos os tokens do usuário e incrementa `authVersion`.
- Verificação de signup: JWT stateless de 24 h ligado a `authVersion`/e-mail; reutilizar após verificado é idempotente. Reenvio via `POST /api/auth/resend-verification` (resposta sempre 202 genérica).
- O token de reset sai da URL ao abrir `/reset-password`; refresh exige novo link.

## Rate limits (chaves hashadas)
- Login: IP (100/15 min, não zerado no sucesso), IP+e-mail (5/15 min, zerado no sucesso) e e-mail global (50/15 min). MFA: IP 30 e usuário 5 (o usuário só é conhecido após senha válida).
- Envio de verificação: 3/h por destinatário, independente de IP; resend também limita IP (10/h) e IP+e-mail (3/h).
- Forgot: a UI segue o 429/`Retry-After` do servidor.

## Observabilidade (eventos `logEvent`, sem e-mail/segredos)
`auth_signup_accepted`, `auth_signup_verification_delivery_failed`, `auth_verification_email_rate_limited`, `auth_resend_verification_requested`, `password_reset_requested`, `password_reset_delivery_failed`, `password_reset_succeeded`, `password_reset_rate_limited`, `auth_login_rate_limited`. Alertar quando a taxa de `*_delivery_failed` subir em relação aos pedidos aceitos.
