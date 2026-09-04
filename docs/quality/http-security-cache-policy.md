# Política de headers HTTP e cache privado

Este documento registra o baseline introduzido pela issue #303, um recorte do roadmap técnico #290.

## Headers globais

A aplicação envia os seguintes headers em todas as rotas por meio de `next.config.ts`:

| Header | Valor | Objetivo |
| --- | --- | --- |
| `X-Content-Type-Options` | `nosniff` | impedir MIME sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | limitar informações enviadas no `Referer` |
| `X-Frame-Options` | `DENY` | impedir carregamento da aplicação em frames |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | desabilitar capacidades não utilizadas |

## Respostas privadas da API

O helper compartilhado `app/lib/api-response.ts` marca respostas de sucesso e erro com:

```text
Cache-Control: private, no-store, max-age=0
```

O contrato existe porque as respostas produzidas por esse helper são utilizadas por fluxos autenticados e podem carregar dados financeiros ou de sessão do usuário. Intermediários e navegadores não devem reutilizar uma resposta privada como conteúdo cacheado.

Endpoints que não passam pelo helper compartilhado continuam responsáveis por declarar sua própria política de cache. Ao criar um endpoint autenticado novo, preferir o helper comum ou declarar `no-store` explicitamente.

## CSP

Uma `Content-Security-Policy` restritiva não faz parte desta entrega. Ela deve ser introduzida em um recorte próprio depois de inventariar scripts, estilos, integrações e necessidades de nonce/hash do runtime do Next.js.

Não adicionar uma CSP permissiva apenas para preencher o header: a política deve efetivamente reduzir a superfície de execução e ter cobertura de navegação/E2E antes do merge.

## Validação

Mudanças nesta política devem manter:

- testes do helper de resposta garantindo `no-store` em sucesso e erro;
- lint, testes e build verdes;
- revisão dos recursos carregados pela aplicação antes de endurecer headers que possam bloquear comportamento legítimo.
