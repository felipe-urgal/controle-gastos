# Política de rate limiting por classe de risco

Issue: #536  
Roadmap: #290 — Fase 2, Segurança, item 15  
Baseline inicial: `ed8be385147804ae662696b01af67818e4641400`

## Objetivo

Usar o limiter PostgreSQL existente de forma proporcional ao risco, sem Redis obrigatório, sem armazenar identificadores em claro e sem transformar toda leitura autenticada em write de controle.

O primitive canônico vive em `app/lib/security/rate-limit.ts` e mantém:

- chave SHA-256 derivada de `action:identifier`;
- estado compartilhado no PostgreSQL (`AuthRateLimit`);
- transação `Serializable`;
- retry limitado para conflitos transacionais `P2034`, PostgreSQL `40001` e `40P01`;
- `Retry-After` calculado a partir do bloqueio.

Rate limiting complementa — e nunca substitui — validação, ownership, idempotência, atomicidade e limites de payload.

## Matriz

| Classe | Fluxo | Identificador | Política atual/alvo | Estado |
| --- | --- | --- | --- | --- |
| auth estrito | login | IP + `IP:e-mail` | 30/IP e 5/principal em 15 min; bloqueio 15 min | existente |
| auth estrito | MFA login/desativação | IP + user ID | 30/IP e 5/principal em 15 min; bloqueio 15 min | existente |
| auth recovery | forgot-password | IP + e-mail | 10/IP e 3/e-mail em 1 h; bloqueio 1 h | existente |
| auth recovery | reset-password | IP + hash do token | 20/IP e 5/token em 1 h; bloqueio 1 h | existente |
| auth recovery | verificar reset token | IP | 30/IP em 15 min; bloqueio 15 min | existente |
| auth criação | signup | IP | 10/IP em 1 h; bloqueio 1 h | #537 |
| operação cara | preview/confirmação de importação | user ID autenticado | 30 operações em 15 min; bloqueio 15 min; limites de arquivo/itens preservados | #536 |
| mutation financeira | transactions CRUD + complete/reconciliação + recorrências/parcelas | user ID autenticado | 120 mutations em 1 min; bloqueio 1 min; bucket compartilhado | #536 |
| leitura comum | GETs autenticados | — | sem contador PostgreSQL por padrão | decisão explícita |

## Por que leitura comum não usa o limiter persistido

`consumeRateLimit` grava/atualiza uma linha no PostgreSQL a cada consumo. Aplicá-lo indiscriminadamente a GETs converteria tráfego de leitura em writes serializáveis, aumentando contensão e custo justamente para proteger endpoints de menor risco.

Leituras comuns permanecem protegidas por:

- autenticação e ownership;
- paginação e limites máximos de contrato;
- filtros/horizontes bounded;
- limites adicionais dos itens 16 e 23 da roadmap quando necessários.

Endpoints de leitura excepcionalmente caros podem receber política própria após medição; isso não transforma `common-read` em classe persistida global.

## Regras de implementação

1. políticas de auth existentes não mudam de threshold sem finding específico;
2. classes autenticadas preferem user ID a IP quando o handler já possui `userId`;
3. não duplicar autenticação só para obter identificador de rate limit;
4. não importar `Request`/IP em funções puras de domínio;
5. retornar 429 com `Retry-After` quando houver bloqueio;
6. logs de rate limiting não incluem e-mail, token, payload financeiro ou identificador bruto;
7. identificadores permanecem hashados no banco;
8. novos limiters devem ter regressão direta de bloqueio e de ausência de efeito colateral quando bloqueados.

## Aplicação das classes autenticadas

Os thresholds dos fluxos autenticados são deliberadamente mais permissivos que os de auth para evitar falso positivo em uso humano normal:

- importação compartilha um bucket entre preview e confirmação, protegendo parsing/consultas e confirmação sem mudar os limites atuais de arquivo/itens;
- mutations financeiras compartilham um bucket entre create/update/delete, conclusão pendente, reconciliação e criação de séries/parcelas;
- o limiter roda após autenticação e antes do trabalho financeiro relevante; bloqueio retorna `429` com `Retry-After`;
- GETs continuam sem contador persistido.

Transferências permanecem no fluxo dedicado e não foram acopladas ao bucket de `transactions` neste recorte; o critério da #536 é proteger as mutations financeiras prioritárias sem ampliar escopo para outros domínios.

## Evolução

- #537 consolidou o primitive genérico no namespace `security` e protegeu signup;
- #542 reforçou o retry do primitive para conflitos serializáveis expostos pelo adapter PostgreSQL;
- #536 aplica as classes de importação pesada e mutation financeira aos fluxos prioritários de transactions;
- o item 15 está funcionalmente coberto neste recorte e deve ser encerrado somente após CI do head final e CI de `main` verdes.
