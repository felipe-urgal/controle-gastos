# Exportação de dados do usuário

## Contrato

A exportação em JSON é um **snapshot lógico de portabilidade** da conta. O formato atual é `formatVersion: 5`.

A exportação em CSV é deliberadamente diferente: contém **somente transações** em formato tabular para uso em planilhas. CSV não é backup completo.

## Consistência e streaming

O snapshot é lido em uma transação PostgreSQL:

```sql
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY
```

Todos os domínios do JSON pertencem ao mesmo snapshot consistente. As coleções são emitidas em páginas e o arquivo é transmitido como stream; não é necessário materializar o JSON inteiro em memória.

## Estrutura JSON v5

```json
{
  "formatVersion": 5,
  "kind": "logical-portability-snapshot",
  "exportedAt": "2026-10-07T00:00:00.000Z",
  "profile": {},
  "data": {},
  "manifest": {
    "schema": "controle-gastos.user-data",
    "domains": [],
    "excludedSecurityData": []
  }
}
```

`profile` contém apenas identidade e preferências não secretas, incluindo nome, e-mail, estado de verificação, preferências financeiras, configuração de resumo periódico e o booleano de MFA.

`data` contém as coleções owned pelo usuário: contas, categorias, limites, regras de importação, reconciliações, transações e vínculos, merchants/aliases, tags, templates, séries/recorrências, transferências, pagamentos de cartão, metas, resumos periódicos, câmbio, dívidas, investimentos econômicos e fiscais, payroll, informes anuais e metadados seguros de tokens MCP.

Os registros de domínio usam os nomes persistidos das colunas para preservar fidelidade e reduzir manutenção de serializers. `userId`/`user_id` é removido de cada registro porque o snapshot já pertence a um único usuário.

## Dados deliberadamente excluídos

Nunca entram no snapshot:

- hash de senha;
- segredo TOTP;
- hashes de recovery codes;
- challenges de MFA;
- tokens de reset de senha;
- JWT/cookie de sessão;
- token MCP completo ou `token_hash`;
- estado interno de rate limit;
- hashes internos de idempotência/request.

Tokens MCP exportam somente metadados seguros, como nome, prefixo, escopo, expiração, último uso e status de revogação.

## Compatibilidade

Consumidores devem verificar `formatVersion` antes de interpretar o arquivo. Mudanças de estrutura incompatíveis exigem incremento de versão; campos e domínios podem ser adicionados de forma compatível dentro da versão somente quando não alterarem a semântica existente.
