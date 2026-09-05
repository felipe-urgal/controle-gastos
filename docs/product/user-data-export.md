# Exportação de dados do usuário

A exportação é uma operação somente de leitura disponível em **Perfil / Configurações > Portabilidade de dados** para o usuário autenticado. O endpoint não aceita `userId` do cliente: o escopo é sempre derivado da sessão.

## Endpoint

`GET /api/user/export?format=json|csv`

Respostas bem-sucedidas usam:

- `Content-Disposition: attachment`;
- `Cache-Control: private, no-store`;
- `X-Content-Type-Options: nosniff`;
- nome de arquivo `controle-gastos-YYYY-MM-DD.<formato>`.

## JSON

A versão atual é `formatVersion: 2`.

A v2 preserva contas, categorias e transações da v1 e torna explícita a distinção estrutural entre movimentação normal e perna de transferência.

Cada transação inclui:

- `date`: `YYYY-MM-DD`;
- `amountCents`: inteiro em centavos;
- `type`: `INCOME` ou `EXPENSE`;
- `kind`: `NORMAL` ou `TRANSFER`;
- `status`: `PENDING`, `COMPLETED` ou `CANCELLED`;
- conta relacionada;
- `category`: objeto para `NORMAL` e `null` para `TRANSFER`;
- `transfer`: `null` para `NORMAL` ou `{ id, role }` para `TRANSFER`.

As duas pernas de uma transferência compartilham o mesmo `transfer.id`; `role` distingue `SOURCE`/`DESTINATION`. Isso permite reconstruir o vínculo sem categoria artificial e sem depender de descrição/data/valor.

A exportação não inclui registro de autenticação, senha/hash, JWT, reset token, rate limit ou material de 2FA.

## CSV

O CSV continua voltado à leitura/análise, agora com colunas explícitas de domínio:

`transactionId,date,amountCents,currency,type,kind,status,accountId,accountName,categoryId,categoryName,transferId,transferRole,description`

Para `TRANSFER`, `categoryId/categoryName` ficam vazios e `transferId/transferRole` identificam o vínculo. Para `NORMAL`, campos de transferência ficam vazios.

Regras preservadas:

- UTF-8 com BOM;
- separador `,`;
- todos os campos entre aspas;
- aspas internas duplicadas;
- vírgulas/quebras de linha preservadas;
- datas `YYYY-MM-DD`;
- centavos inteiros;
- textos iniciados como fórmula (`=`, `+`, `-`, `@`, inclusive após whitespace) recebem apóstrofo inicial para evitar formula injection.

## Segurança e consistência

As coleções são consultadas dentro de uma transação PostgreSQL `RepeatableRead`, garantindo snapshot lógico único. A operação não executa create/update/delete.

Logs registram apenas evento, formato, request ID e resultado; conteúdo financeiro e `userId` não entram nos logs.

## Compatibilidade

A introdução de transferências exige `formatVersion: 2` porque o shape de transação passa a admitir categoria nula e metadados de vínculo. Consumidores de JSON devem tratar `formatVersion` explicitamente. O CSV também ganhou colunas; consumidores posicionais devem usar o header como contrato.

Enquanto o runtime ainda não cria transferências, exports v2 de dados legados terão somente `kind=NORMAL`, categoria preenchida e campos de transferência vazios.

## UX atual

A exportação permanece na área de configurações/portabilidade com:

- escolha explícita CSV/JSON;
- loading;
- feedback de sucesso/erro;
- operação acessível por teclado;
- nenhuma escrita ao iniciar/concluir download.

Implementação original: #150. Redesign da área: #170. Evolução para transferências: #284.
