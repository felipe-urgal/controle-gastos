# Factories financeiras de teste

Issue: #550  
Roadmap: #290 — Fase 2, Qualidade, item 27

## Objetivo

Reduzir setup repetido em testes financeiros de integração sem esconder as invariantes que o teste precisa demonstrar.

A factory canônica vive em:

```text
tests/support/financial-test-factory.ts
```

Ela não é código de produção e não adiciona comportamento ao runtime.

## API

Cada arquivo de teste cria sua própria instância:

```ts
const fixtures = new FinancialTestFactory();
```

A instância oferece helpers pequenos para:

- `user(overrides)`;
- `account(userId, overrides)`;
- `category(userId, overrides)`;
- `transaction({ userId, accountId, categoryId, overrides })`;
- `cleanup()`.

Os defaults servem apenas para produzir registros válidos. Campos relevantes para a regra testada devem continuar explícitos no teste.

## Isolamento

A factory rastreia somente os IDs de usuários que ela mesma criou. `cleanup()` remove esses usuários; cascades do schema limpam os registros financeiros relacionados.

Não existe registry global entre arquivos, singleton de fixture nem cleanup amplo por prefixo de e-mail.

Isso mantém testes paralelos independentes e impede uma suite de apagar dados criados por outra factory.

## Quando usar

Use a factory quando o setup é infraestrutura repetitiva:

- usuário básico;
- conta comum;
- categoria comum;
- transação simples necessária como pré-condição.

Mantenha criação explícita no próprio teste quando o dataset é parte central da especificação. Por exemplo, Forecast continua declarando seu `createMany` com valores/datas/status porque essa matriz é a própria regra sob teste.

## Recorte inicial

A #550 migra três fluxos representativos:

- lifecycle do CRUD normal de transactions;
- criação/idempotência/ownership de transferências;
- Forecast integrado.

A migração dos demais testes deve ser incremental, somente quando reduzir duplicação real sem piorar a leitura.

## Guardrails

- não criar DSL para comportamento financeiro;
- não inferir tipo/moeda/status quando esses campos são relevantes à assertion;
- não transformar fixtures em fonte de regra de negócio;
- não manter estado global compartilhado;
- não esconder ownership;
- preferir overrides explícitos a dezenas de métodos especializados;
- manter factories fora de `app/` para não confundir suporte de teste com runtime.
