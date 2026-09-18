# Threat model leve dos fluxos críticos

Issue: #554  
Roadmap: #290 — Fase 3, Segurança, item 29  
Baseline: `a64ab0d6d4b6cc77c943001fd6cd84a649febce4`

## Objetivo

Este documento conecta ativos críticos a ameaças, controles existentes, evidência automatizada e risco residual. Ele descreve o estado implementado; não substitui contratos de produto nem inventa controles futuros.

Classificação usada:

- **controlado** — existe controle implementado e regressão direta;
- **residual conhecido** — existe risco remanescente já aceito/delimitado ou coberto por item posterior da roadmap;
- **inconclusivo operacional** — o código não consegue provar uma propriedade do ambiente implantado.

## Fronteiras de confiança

As principais entradas controladas pelo cliente são:

- cookies/tokens de sessão;
- credenciais, TOTP e recovery codes;
- tokens de reset recebidos por e-mail;
- arquivos CSV/OFX e seus metadados;
- IDs de conta/categoria/transação;
- `Idempotency-Key` de transferência;
- saldos/datas informados para reconciliação;
- payload de step-up para operação destrutiva.

Nenhum `userId` enviado pelo cliente é fonte de autoridade. A identidade vem da sessão autenticada e relações privadas são revalidadas no servidor.

---

## 1. Autenticação e MFA

**Ativos**

- sessão autenticada;
- credenciais;
- segredo TOTP;
- recovery codes;
- challenges MFA.

**Ameaças materiais**

- credential stuffing/brute force;
- enumeração de conta;
- replay de JWT antigo;
- replay de TOTP/recovery code/challenge;
- emissão de sessão antes do segundo fator;
- vazamento do segredo TOTP em banco/logs.

**Controles implementados**

- login/signup/reset evitam respostas públicas que revelem existência de conta;
- JWT fixa algoritmo, issuer, audience e expiração;
- `authVersion` é embutido no token e revalidado no gateway server-side;
- usuário inativo ou sessão de versão antiga é rejeitado;
- troca/reset de senha incrementam `authVersion`;
- usuário com MFA recebe challenge curto, não sessão final, após senha válida;
- challenge MFA possui purpose/issuer/audience próprios, expiração e consumo server-side;
- TOTP usa anti-replay por `totpLastUsedStep`;
- recovery codes são persistidos somente como hash e consumidos uma vez;
- segredo TOTP é persistido criptografado com AES-256-GCM e AAD dedicado;
- rate limit MFA usa buckets por principal e IP;
- logs maduros usam observabilidade sanitizada e não carregam fator bruto.

**Evidência**

- `app/lib/auth/__tests__/auth-token.test.ts`;
- `app/lib/auth/__tests__/auth-session.test.ts`;
- `app/api/auth/__tests__/signup-security.test.ts`;
- `app/api/auth/mfa/__tests__/login-mfa.integration.test.ts`;
- `app/lib/security/__tests__/mfa-persistence.integration.test.ts`;
- `app/lib/security/__tests__/mfa-rate-limit.integration.test.ts`;
- `docs/product/totp-2fa.md`;
- `docs/quality/auth-policy-audit-514.md`.

**Risco residual**

- **residual conhecido:** a chave `TOTP_ENCRYPTION_KEY` é única no runtime atual. O envelope possui versão de formato (`v1`), mas não persiste key ID nem aceita keyring para rotação sem janela coordenada. Isso corresponde ao item 30 da roadmap;
- **inconclusivo operacional:** o código valida presença/formato dos segredos, mas não inspeciona nem deve registrar a entropia real das chaves implantadas.

Status: **controlado, com rotação criptográfica pendente como evolução explícita**.

---

## 2. Reset de senha

**Ativos**

- conta do usuário;
- token de reset;
- senha nova;
- sessões emitidas anteriormente.

**Ameaças materiais**

- enumeração por solicitação de reset;
- roubo/reuso do token;
- token persistido em claro;
- replay após troca de senha;
- brute force do token;
- sessão antiga permanecer válida após reset.

**Controles implementados**

- solicitação de reset usa resposta pública genérica;
- token bruto é randômico e o banco persiste somente SHA-256;
- token expira e nova solicitação invalida tokens anteriores;
- consumo do token e atualização da senha ocorrem atomicamente;
- token consumido não pode ser reutilizado;
- reset incrementa `authVersion`, invalidando sessões antigas;
- rate limiting protege IP/token.

**Evidência**

- `app/api/auth/reset-password/__tests__/route.integration.test.ts`;
- testes de forgot-password hardening;
- `app/lib/auth/__tests__/auth-session.test.ts`;
- `docs/quality/auth-policy-audit-514.md`.

**Risco residual**

- **residual externo:** segurança da caixa de e-mail e do canal de entrega está fora da fronteira da aplicação;
- **inconclusivo operacional:** disponibilidade/entrega do provedor de e-mail não é garantida por testes de aplicação.

Status: **controlado na aplicação**.

---

## 3. Importação CSV/OFX

**Ativos**

- ledger de transações;
- contas/categorias do usuário;
- arquivo importado;
- identidade/fingerprint de cada lançamento.

**Ameaças materiais**

- arquivo excessivamente grande ou malformado;
- parsing abusivo;
- valores/datas inválidos;
- referência a conta/categoria de outro usuário;
- reimport/double-submit;
- escrita financeira durante preview;
- confirmação parcial;
- conversão cambial implícita;
- logging/persistência do arquivo bruto.

**Controles implementados**

- formatos limitados a CSV/OFX;
- limite de 2 MB e 1.000 itens;
- rate limit por usuário para preview/confirmação;
- preview autentica e valida ownership antes do processamento relevante;
- valores são convertidos para centavos inteiros sem float financeiro;
- OFX com moeda incompatível é rejeitado;
- preview não escreve transações e arquivo bruto não é persistido;
- confirmação revalida usuário, conta, categorias e token de preview;
- confirmação ocorre em transação Prisma;
- fingerprint único + tratamento de duplicidade tornam reimport idempotente;
- sugestões de regra não entram no token financeiro assinado nem viram write automático.

**Evidência**

- `app/lib/transactions/import/__tests__/parser.test.ts`;
- `app/lib/transactions/import/__tests__/transaction-import.integration.test.ts`;
- `app/lib/transactions/import/__tests__/transaction-import-limits.test.ts`;
- `app/lib/transactions/import/__tests__/rule-preview-handler.integration.test.ts`;
- `docs/product/transaction-import.md`;
- `docs/quality/expensive-operation-limits.md`.

**Risco residual**

- **residual conhecido:** processamento permanece síncrono por request. Se volume real começar a exceder limites serverless, o item 37 define medição/chunking antes de considerar fila externa;
- nenhum finding novo de ownership, atomicidade ou integridade foi identificado nesta revisão.

Status: **controlado dentro dos limites públicos atuais**.

---

## 4. Exportação de dados

**Ativos**

- histórico financeiro completo do usuário;
- contas/categorias;
- conteúdo exportado em JSON/CSV.

**Ameaças materiais**

- exportar dados de outro usuário;
- incluir senha/token/metadata interna;
- cache intermediário de resposta sensível;
- CSV inseguro ou conteúdo mal escapado;
- repetição automatizada de export caro;
- snapshot inconsistente;
- export muito grande exceder memória/runtime.

**Controles implementados**

- usuário vem exclusivamente da sessão;
- queries são escopadas pelo usuário autenticado;
- DTO exclui senha, tokens e IDs internos não necessários;
- CSV possui escaping, BOM explícito e neutralização de prefixos de fórmula controlados pelo usuário;
- resposta usa `private, no-store` e `nosniff`;
- export completo usa snapshot `RepeatableRead`;
- rate limit dedicado: 10 exportações por usuário em 1 hora;
- bloqueio ocorre antes do snapshot e retorna `429 + Retry-After`.

**Evidência**

- `app/lib/export/__tests__/user-data-export.test.ts`;
- `app/api/user/export/route.integration.test.ts`;
- `docs/product/user-data-export.md`;
- `docs/quality/expensive-operation-limits.md`.

**Risco residual**

- **residual conhecido:** export é completo e síncrono por decisão de portabilidade. Dataset que ultrapasse limites de runtime deve seguir o item 37, sem truncamento silencioso;
- posse do arquivo depois do download passa a ser responsabilidade do dispositivo/usuário.

Status: **controlado para o volume contratado atualmente**.

---

## 5. Transferências entre contas

**Ativos**

- duas contas owned;
- par de pernas SOURCE/DESTINATION;
- saldo derivado;
- chave de idempotência e identidade da operação.

**Ameaças materiais**

- usar conta foreign;
- transferir entre moedas diferentes;
- double-submit/retry criar operações duplicadas;
- reutilizar mesma chave com payload diferente;
- persistir apenas uma perna;
- editar/remover uma perna isoladamente;
- mutation de transferência reconciliada.

**Controles implementados**

- origem/destino são revalidadas por ownership e estado;
- mesma conta é rejeitada;
- moedas diferentes são rejeitadas;
- criação exige `Idempotency-Key`;
- chave é normalizada/limitada e persistida somente como hash;
- request hash diferencia replay legítimo de conflito de payload;
- constraint única por usuário colapsa concorrência/retry;
- criação das duas pernas é atômica;
- lifecycle opera no par, não em uma perna isolada;
- CRUD normal bloqueia pernas de transferência;
- reconciliação bloqueia lifecycle quando uma perna está protegida.

**Evidência**

- `app/lib/transfers/__tests__/create-transfer.integration.test.ts`;
- `app/lib/transfers/__tests__/lifecycle-transfer.integration.test.ts`;
- `app/lib/transactions/__tests__/transaction-transfer-guards.integration.test.ts`;
- `tests/e2e/transfer-final.spec.mjs`;
- `docs/product/account-transfers.md`;
- ADR 0003.

**Risco residual**

- nenhum finding novo de atomicidade/idempotência/ownership foi identificado;
- retries dependem de o cliente reutilizar a mesma chave para a mesma tentativa lógica; o cliente atual possui helper dedicado para isso.

Status: **controlado**.

---

## 6. Reconciliação

**Ativos**

- status de conferência de transações;
- identidade do fechamento;
- trilha de auditoria;
- saldo realizado, que não pode ser alterado pela reconciliação.

**Ameaças materiais**

- reconciliar transação de outro usuário;
- reconciliar item não `COMPLETED`;
- corrida entre preview/fechamento;
- fechamento com diferença não zero;
- estado parcial;
- undo atingir lote antigo ou de outro usuário;
- reconciliação virar segunda fonte financeira.

**Controles implementados**

- conta/transação são buscadas com ownership;
- somente `COMPLETED` pode avançar na reconciliação;
- preview é leitura e não executa writes;
- fechamento roda em isolamento `SERIALIZABLE`;
- diferença precisa ser exatamente zero em centavos;
- atualização condicional detecta mudança concorrente;
- fechamento + evento de auditoria são atômicos;
- undo aceita somente o lote ativo mais recente e opera atomicamente;
- retry do fechamento/undo é idempotente;
- reconciliation status não participa de saldo, Dashboard, limites ou Forecast;
- CRUD comum bloqueia mutation de item `RECONCILED`.

**Evidência**

- `app/lib/transactions/__tests__/reconciliation.integration.test.ts`;
- `app/lib/transactions/__tests__/reconciliation-confirm.integration.test.ts`;
- `app/lib/transactions/__tests__/reconciliation-undo.integration.test.ts`;
- `tests/e2e/reconciliation-flow.spec.mjs`;
- `docs/product/account-reconciliation.md`;
- ADR 0004.

**Risco residual**

- concorrência legítima pode resultar em conflito e exigir retry explícito pelo cliente; isso é preferível a aceitar estado stale;
- nenhum finding novo de consistência foi identificado.

Status: **controlado**.

---

## 7. Operações destrutivas

O fluxo destrutivo de maior impacto hoje é exclusão da própria conta.

**Ativos**

- conta do usuário;
- dados financeiros relacionados;
- estado MFA/recovery/reset.

**Ameaças materiais**

- sessão roubada excluir conta sem reautenticação;
- brute force da senha no endpoint destrutivo;
- usuário MFA perder proteção de segundo fator na exclusão;
- recovery code ser reutilizado;
- exclusão parcial deixar dados órfãos;
- exclusão irreversível sem capacidade operacional de recuperação.

**Controles implementados**

- sessão sozinha não é suficiente;
- step-up exige senha atual;
- conta com MFA exige também TOTP ou recovery code;
- recovery code é consumo único;
- step-up possui rate limit por usuário/IP antes de repetir bcrypt indefinidamente;
- deleção é escopada ao usuário autenticado;
- relações possuem cascades coerentes para remoção dos dados owned.

**Evidência**

- `app/api/user/__tests__/delete-step-up.integration.test.ts`;
- `app/lib/security/__tests__/step-up-auth.integration.test.ts`;
- testes de deleção de usuário;
- `docs/product/totp-2fa.md`.

**Risco residual**

- **residual conhecido:** recuperação após exclusão depende da estratégia operacional de backup/restore. O item 31 da roadmap exige validar restore em banco isolado e definir RPO/RTO;
- não existe soft-delete de usuário como fonte paralela de dados; adicionar isso apenas por medo de exclusão aumentaria complexidade e não substitui backup.

Status: **controlado no acesso destrutivo; recuperação operacional pertence ao item 31**.

---

## Findings e próximos itens

Esta revisão não encontrou vulnerabilidade de runtime que exija hotfix imediato.

Dois riscos residuais já correspondem a itens explícitos da roadmap:

1. **item 30 — rotação/versionamento de segredos criptográficos:** TOTP usa envelope de formato versionado, mas uma única chave de runtime;
2. **item 31 — backup/restore testado:** exclusão permanente precisa de capacidade operacional de recuperação comprovada.

O item 37 continua sendo o caminho previsto caso import/export ultrapassem limites de execução serverless.

Nenhum novo finding de ownership, centavos, multi-moeda, atomicidade ou vazamento de dados foi identificado neste threat model.

## Regra de manutenção

Atualize este documento quando:

- surgir um novo fluxo financeiro/security crítico;
- um controle listado for removido ou substituído;
- um risco residual virar finding material;
- um item da roadmap fechar um risco residual aqui registrado.

Não atualize o threat model por mudança visual sem impacto de segurança.
