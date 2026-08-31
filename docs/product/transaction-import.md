# Importação de transações CSV/OFX

A importação de transações segue um fluxo obrigatório de **arquivo → preview → confirmação**. O preview é stateless e não cria lançamentos financeiros.

## Limites do MVP

- formatos aceitos: `.csv` e `.ofx`;
- tamanho máximo: **2 MB** por arquivo;
- máximo de **1.000 transações** por arquivo;
- CSV assume a moeda da conta selecionada;
- OFX com `CURDEF` diferente da moeda da conta é rejeitado; não há conversão cambial implícita;
- lançamentos importados são criados como `COMPLETED`, pois o arquivo representa movimentações já registradas pela instituição.

## CSV

O CSV aceita vírgula ou ponto e vírgula como separador e exige colunas equivalentes a:

- data: `data`, `date` ou `dtposted`;
- descrição: `descricao`, `description`, `memo`, `historico` ou `name`;
- valor: `valor`, `amount` ou `trnamt`;
- identificador externo opcional: `id`, `fitid`, `externalid` ou `transactionid`.

Datas aceitas: `YYYY-MM-DD`, `DD/MM/YYYY`, `DD-MM-YYYY`. Valores são convertidos diretamente de texto para **centavos inteiros**, sem `float` intermediário.

## OFX

São lidos os blocos `STMTTRN` e os campos `DTPOSTED`, `TRNAMT`, `FITID`, `NAME` e `MEMO`. Quando `FITID` existe, ele é a identidade preferencial para deduplicação.

## Preview e segurança

`POST /api/transactions/import/preview` recebe `multipart/form-data` com `accountId` e `file`.

O servidor:

1. deriva o usuário exclusivamente da sessão;
2. valida ownership/estado da conta;
3. valida tipo, tamanho, quantidade, datas, valores e descrições;
4. normaliza o arquivo para um DTO comum;
5. calcula fingerprints determinísticos, sempre escopados por usuário e conta;
6. consulta duplicidades existentes;
7. devolve itens válidos, inválidos e duplicados com motivos textuais;
8. assina um token de preview com validade curta contendo apenas o digest do conteúdo normalizado.

Nenhuma `Transaction` é criada nessa etapa e o arquivo bruto não é persistido nem logado.

## Confirmação

`POST /api/transactions/import/confirm` recebe o token do preview e os itens revisados.

O servidor valida novamente:

- identidade do usuário;
- integridade/expiração do preview;
- ownership e estado da conta;
- ownership, estado e tipo de cada categoria;
- validade dos itens selecionados;
- fingerprints já existentes.

Todas as gravações ocorrem em uma única transação Prisma. A constraint única `(userId, importFingerprint)` e `skipDuplicates` tornam reenvios idempotentes inclusive em condições de corrida.

## Fingerprint

A fingerprint é SHA-256 e nunca é global:

- com identificador externo: `user + account + source + externalId`;
- sem identificador externo: `user + account + source + date + type + amountCents + normalizedDescription + occurrence`.

O contador `occurrence` evita colapsar duas linhas legitimamente idênticas dentro do mesmo arquivo, mantendo reimportações do mesmo conjunto determinísticas.

## Persistência

Não existe `ImportJob`. Os únicos metadados persistidos ficam na própria `Transaction`:

- `importSource`;
- `importFingerprint`;
- `importExternalId`.

Assim, `Transaction` continua sendo a única fonte de verdade financeira e a importação não cria um modelo paralelo de saldo, totais ou lançamentos.
