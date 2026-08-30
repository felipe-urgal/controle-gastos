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

O JSON é o snapshot estruturado para backup/portabilidade. A versão atual é `formatVersion: 1` e contém:

- `exportedAt`: instante UTC em ISO 8601;
- `accounts`: contas pertencentes ao usuário, inclusive inativas;
- `categories`: categorias pertencentes ao usuário, inclusive inativas;
- `transactions`: transações pertencentes ao usuário.

As transações usam:

- `date`: `YYYY-MM-DD`;
- `amountCents`: valor inteiro em centavos, sem conversão para ponto flutuante;
- `type`: `INCOME` ou `EXPENSE`;
- `status`: `PENDING`, `COMPLETED` ou `CANCELLED`;
- dados legíveis e IDs da conta e categoria relacionadas.

A exportação não inclui o registro de autenticação do usuário e, portanto, não contém senha/hash, JWT, tokens de recuperação, rate limits ou identificadores recebidos do cliente.

## CSV

O CSV é voltado à leitura e análise das transações. A primeira linha possui colunas estáveis:

`transactionId,date,amountCents,currency,type,status,accountId,accountName,categoryId,categoryName,description`

Regras:

- UTF-8 com BOM para compatibilidade com planilhas;
- separador `,`;
- todos os campos entre aspas;
- aspas internas duplicadas;
- vírgulas e quebras de linha preservadas dentro do campo;
- datas em `YYYY-MM-DD`;
- valores em centavos inteiros (`amountCents`);
- textos que começam como fórmula de planilha (`=`, `+`, `-`, `@`, inclusive após espaços) recebem um apóstrofo inicial para evitar formula injection.

## Segurança e consistência

As três coleções são consultadas dentro de uma transação PostgreSQL com isolamento `RepeatableRead`, garantindo que o arquivo represente um único snapshot lógico. A operação não executa `create`, `update` ou `delete`.

Os logs registram somente evento, formato, request ID e resultado; conteúdo financeiro e `userId` não são enviados aos logs.

## UX atual

O redesign v2 moveu a exportação para a área de configurações/portabilidade e mantém:

- escolha explícita de CSV ou JSON;
- loading durante a geração;
- feedback de sucesso/erro;
- botões e mensagens acessíveis por teclado;
- nenhuma escrita no banco ao iniciar ou concluir o download.

Implementação original: #150. Redesign da área: #170.
