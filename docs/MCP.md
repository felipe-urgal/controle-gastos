# MCP read-only

O Controle de Gastos expõe um endpoint MCP HTTP somente leitura para clientes e assistentes que precisem consultar dados financeiros do usuário sem acesso direto a SQL ou Prisma.

## Endpoint

Produção:

```text
https://SEU-DOMINIO/api/mcp
```

Desenvolvimento local:

```text
http://localhost:5100/api/mcp
```

Transporte: HTTP stateless.

O servidor atende o fluxo MCP legado baseado em `initialize` e negocia as revisões `2025-11-25`, `2025-06-18` e `2025-03-26`. Clientes modernos que implementam fallback para servidores legados podem usar o mesmo endpoint.

## Autenticação

O endpoint não usa o cookie/JWT da sessão web.

Cada cliente recebe um token próprio com escopo fixo:

```text
finance:read
```

O token deve ser enviado em todas as requisições:

```http
Authorization: Bearer cgmcp_...
```

O segredo completo:

- é exibido somente uma vez na criação;
- é armazenado no banco apenas como SHA-256;
- possui expiração;
- pode ser revogado individualmente;
- deixa de funcionar imediatamente após revogação ou expiração.

Criação e revogação ficam em **Configurações → Segurança → Acesso MCP somente leitura**. A criação exige confirmação de identidade.

## Configuração de um cliente

Configure o cliente MCP com:

```text
URL: https://SEU-DOMINIO/api/mcp
Transport: HTTP
Header:
  Authorization: Bearer SEU_TOKEN
```

O nome exato dos campos varia entre clientes. Use sempre o endpoint acima e envie o token como Bearer header.

## Teste rápido

Depois de criar o token, o handshake pode ser validado com:

```bash
curl -X POST https://SEU-DOMINIO/api/mcp \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer SEU_TOKEN' \
  -d '{
    "jsonrpc":"2.0",
    "id":1,
    "method":"initialize",
    "params":{
      "protocolVersion":"2025-11-25",
      "capabilities":{},
      "clientInfo":{"name":"manual-test","version":"1.0.0"}
    }
  }'
```

Para listar tools:

```bash
curl -X POST https://SEU-DOMINIO/api/mcp \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer SEU_TOKEN' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'
```

## Tools disponíveis

### `get_accounts`

Lista contas do usuário. Saldos de contas correntes/investimento são derivados somente de transações `COMPLETED`. Cartões não recebem um saldo bancário artificial.

Paginada por `page`/`limit` (máx. 100 por página); `hasMore` indica próxima página.

### `get_monthly_summary`

Retorna resumo financeiro canônico de um mês e uma moeda:

- receitas;
- despesas;
- saldo;
- comparação com mês anterior;
- planejamento;
- até 10 principais categorias.

Moedas aceitas: `BRL`, `USD`, `EUR`.

### `search_transactions`

Pesquisa somente dentro de um mês solicitado.

Filtros opcionais:

- moeda;
- texto;
- tipo;
- status.

Texto pesquisado: descrição, estabelecimento (nome, sem aliases), categoria e tag. Não equivale à Busca global.

Paginação:

- `limit`: máximo 50;
- `page`: máximo 20 (até 1.000 registros por mês).

`hasMore=true` sempre tem uma página seguinte válida. Na última página alcançável, se ainda houver resultados, a resposta traz `truncated=true` (e `hasMore=false`): refine com `query`, `type`, `status` ou `currency`.

Esse limite evita transformar a tool em mecanismo de exportação irrestrita.

### `get_forecast`

Retorna forecast determinístico e safe-to-spend já calculados pelo domínio.

Horizontes permitidos:

- 30 dias;
- 60 dias;
- 90 dias.

Listas de compromissos também são limitadas antes de retornar ao cliente.

### `get_net_worth`

Retorna patrimônio líquido e histórico por moeda.

- máximo de 24 meses;
- moedas permanecem separadas;
- não há conversão cambial automática;
- valores monetários continuam em centavos inteiros.

## Segurança e limites

O MCP não oferece:

- criação, edição ou exclusão de transações;
- pagamentos;
- execução de PIX;
- SQL;
- Prisma;
- query genérica;
- acesso administrativo;
- recomendação financeira.

Toda tool recebe o `userId` derivado do token validado pelo servidor. O cliente nunca pode informar ou substituir esse identificador.

Rate limit:

- até 120 requisições por minuto por token;
- até 300 requisições por minuto por IP confiável.

Quando o limite é atingido, o endpoint responde `429` e inclui `Retry-After`.

## Ciclo de vida e eventos de segurança

O token MCP é uma credencial independente das sessões do app e não depende de `authVersion`.

- Máximo de 5 tokens ativos por usuário, garantido sob concorrência (409 `MCP_TOKEN_LIMIT_REACHED`).
- Todo token ativo é sempre listado e revogável; apenas o histórico expirado/revogado é limitado (20 mais recentes).
- Troca normal de senha e desativação de MFA **preservam** os tokens (revogue manualmente se necessário).
- Redefinição de senha por recuperação (forgot/reset) **revoga todos** os tokens ativos.
- Exclusão da conta remove os tokens em cascata.
- `lastUsedAt` é telemetria best-effort; falha de escrita não nega a requisição.
- O corpo é limitado a 64 KB pelos bytes realmente recebidos (413), independente de `Content-Length`.
- `showValues` é preferência visual: o token MCP retorna valores reais.
- Apenas `POST /api/mcp` é exposto; demais métodos retornam 405.

## Revogação

Abra **Configurações → Segurança → Acesso MCP somente leitura** e escolha **Revogar** no token correspondente.

Tokens revogados não podem ser reativados. Gere um novo token quando necessário.
