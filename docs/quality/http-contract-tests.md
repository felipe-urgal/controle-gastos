# Testes de contrato HTTP

Issue: #548  
Roadmap: #290 — Fase 2, Qualidade, item 26  
Baseline: `d1b2f08187a41e2b05cf880bf9a035197a704c11`

## Objetivo

Fixar os contratos públicos já existentes com uma suite curta de caracterização. O objetivo não é impor uma nova camada HTTP nem padronizar mensagens por estética; é impedir regressões de shape, status, privacidade, ownership e idempotência.

## Envelope canônico

Respostas que usam `app/lib/api-response.ts` seguem:

### Sucesso

```json
{
  "success": true,
  "data": {},
  "message": "opcional"
}
```

### Falha

```json
{
  "success": false,
  "error": {
    "message": "mensagem pública",
    "code": "opcional"
  }
}
```

Campos opcionais podem ser omitidos pela serialização JSON quando `undefined`.

Todas as respostas produzidas pelo helper são privadas:

```text
Cache-Control: private, no-store, max-age=0
```

## Matriz caracterizada

| Contrato | Representante | Evidência |
| --- | --- | --- |
| 200 success envelope | helper compartilhado | `http-contract.test.ts` |
| 400 input inválido | Forecast query inválida | handler real + schema real |
| 401 sem autenticação | Forecast | auth mock retorna `UNAUTHORIZED` |
| 404 ownership/inexistente | detalhe de Transferência | `HttpError` público sem distinção de tenant |
| 429 rate limit | `rateLimitFailure` | `Retry-After` + failure envelope |
| 500 seguro | Forecast | erro interno contém DSN/segredo e resposta não replica detalhes |
| 201 criação idempotente | POST Transferência | primeira criação |
| 200 replay idempotente | POST Transferência | mesma operação já persistida |
| cache privado | helpers + handlers representativos | header `private, no-store, max-age=0` |

## Regras

- testes de contrato não substituem testes de domínio/integrados;
- erro 500 nunca deve devolver stack, DSN, erro Prisma/driver ou segredo;
- ownership continua usando respostas que não revelam a existência de recurso de outro usuário;
- `code` é opcional; adicionar códigos novos exige necessidade de contrato, não apenas uniformidade estética;
- idempotência mantém a distinção atual: `201` para criação nova e `200` para replay da mesma tentativa;
- rate limit público usa `429` e `Retry-After`.

## Evolução

Novos endpoints críticos devem reutilizar estes padrões ou ter teste explícito quando precisarem de contrato diferente. Não criar snapshot global de todas as rotas: mudanças legítimas precisam continuar revisáveis e localizadas.
