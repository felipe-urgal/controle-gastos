# Contrato de ownership do CRUD autenticado

Este documento registra o contrato de isolamento por usuário reforçado pela issue #304, um recorte do roadmap técnico #290.

## Regra padrão

Para entidades privadas gerenciadas por `baseCrudHandler`, o usuário autenticado é a fronteira de ownership.

### Create

O handler adiciona `userId` ao `data` persistido. O cliente não escolhe o proprietário do registro.

```text
payload validado + userId autenticado -> create
```

### Read, update e delete

Operações por ID precisam buscar a entidade dentro do escopo do usuário:

```text
{ id, userId }
```

Para mutations, a mesma restrição deve permanecer na operação final. Não é suficiente validar ownership em uma leitura anterior e executar `update` ou `delete` apenas por `id`.

Esse contrato reduz a chance de uma regressão futura transformar uma checagem preliminar em proteção apenas aparente.

## `selfRoute`

Rotas configuradas com `selfRoute: true` são uma exceção intencional. Nelas, o próprio ID resolvido é o ID do usuário autenticado, então o filtro adicional `userId` não é aplicado ao model.

Qualquer novo uso de `selfRoute` deve deixar claro que o model representa o próprio recurso do usuário e precisa de cobertura de teste específica.

## Hooks customizados

Hooks como `beforeCreate`, `beforeUpdate`, `beforeDelete`, `customList` e `customWhere` podem introduzir regras adicionais de domínio, mas não devem enfraquecer a fronteira de ownership.

Quando um hook executa persistência por conta própria, ele passa a ser responsável por preservar o escopo do usuário autenticado e precisa ter teste correspondente.

## Cobertura de regressão

`app/lib/api/__tests__/base-crud-handler-ownership.test.ts` cobre o contrato compartilhado:

- criação força `userId` do usuário autenticado;
- update consulta e executa a mutation com `{ id, userId }`;
- registro fora do escopo retorna `404` e não é atualizado;
- delete consulta e executa a mutation com `{ id, userId }`.

Novos métodos de mutation adicionados ao handler devem receber cobertura equivalente antes do merge.

## Checklist para endpoints privados

Ao criar ou revisar uma mutation autenticada:

1. autenticar antes de acessar dados privados;
2. validar a entrada;
3. derivar ownership da sessão, nunca do payload confiado pelo cliente;
4. incluir ownership na consulta e na mutation final quando o model permitir;
5. retornar ausência/negação sem revelar dados de outro usuário;
6. cobrir o caminho autorizado e o caminho fora do escopo em testes;
7. executar lint, testes e build.
