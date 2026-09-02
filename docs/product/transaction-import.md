# Importação de transações CSV/OFX

Status: **✅ implementada e integrada à `main` na #155 / PR #199**.  
Merge em `main`: `36c53d1ef936c0210a00e4f217d5657974616832`.  
Última revisão documental: **2026-09-02**.

A importação segue um fluxo obrigatório de **arquivo → preview → confirmação**. O preview é stateless e não cria lançamentos financeiros.

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

A validação de moeda do OFX evita conversão implícita. A semântica de agregados multi-moeda do restante do produto foi definida na #198 e implementada no PR #219: agregados permanecem separados por moeda e a importação continua sem converter valores.

## Preview e segurança

`POST /api/transactions/import/preview` recebe `multipart/form-data` com `accountId` e `file`.

O servidor:

1. deriva o usuário exclusivamente da sessão;
2. valida ownership e estado da conta;
3. valida tipo, tamanho, quantidade, datas, valores e descrições;
4. normaliza o arquivo para um DTO comum;
5. calcula fingerprints determinísticos, escopados por usuário e conta;
6. consulta duplicidades existentes;
7. devolve itens válidos, inválidos e duplicados com motivos textuais;
8. assina um token de preview de curta duração contendo somente o digest necessário para vincular confirmação e preview.

Nenhuma `Transaction` é criada nessa etapa e o arquivo bruto não é persistido nem logado.

## Confirmação

`POST /api/transactions/import/confirm` recebe o token do preview e os itens revisados.

O servidor valida novamente:

- identidade do usuário;
- integridade e expiração do preview;
- ownership e estado da conta;
- ownership, estado e tipo de cada categoria;
- validade dos itens selecionados;
- fingerprints já existentes.

As gravações ocorrem em uma única transação Prisma. A constraint única de fingerprint e o tratamento de duplicidades tornam reenvios/reimportações idempotentes inclusive sob concorrência.

## Fingerprint

A fingerprint é SHA-256 e nunca é global:

- com identificador externo: `user + account + source + externalId`;
- sem identificador externo: `user + account + source + date + type + amountCents + normalizedDescription + occurrence`.

O contador `occurrence` evita colapsar duas linhas legitimamente idênticas dentro do mesmo arquivo, mantendo reimportações do mesmo conjunto determinísticas.

## Persistência

Não existe `ImportJob`.

Os únicos metadados de importação persistidos ficam na própria `Transaction`:

- `importSource`;
- `importFingerprint`;
- `importExternalId`.

`Transaction` continua sendo a única fonte de verdade financeira. A importação não cria modelo paralelo de saldo, total ou lançamentos.

## UX

Rota autenticada: `/transacoes/importar`.

Fluxo:

1. selecionar arquivo e conta;
2. revisar preview com itens válidos, inválidos e duplicados;
3. selecionar/corrigir contexto de categoria quando necessário;
4. confirmar explicitamente os itens a gravar;
5. receber resumo final.

Cancelar antes da confirmação não produz efeito financeiro. Motivos de rejeição são textuais e a interface segue o Dark Command Center.

## Cobertura e validação da entrega

O PR #199 registra cobertura para:

- CSV e OFX válidos;
- itens inválidos e motivos textuais;
- centavos exatos;
- fingerprint determinístico sem colapsar linhas legítimas;
- arquivo acima de 2 MB e limite de quantidade;
- preview sem escrita;
- conta/categoria de outro usuário;
- confirmação somente dos itens selecionados;
- validação atômica sem writes parciais;
- reimportação idêntica detectada e idempotente.

Evidência histórica do head final `16ea2964c6b0c190a95d2c04bfef07e41c72dd8a`:

- migrations em PostgreSQL limpo: ✅;
- lint/typecheck/build: ✅;
- testes: **91/91** ✅;
- frontend budget: ✅;
- CI #172: ✅;
- Lighthouse #134: ✅;
- Vercel deployment check: ✅;
- auto code review final: ✅ sem bloqueadores restantes.

Refs #155, #136, #163, #198, PR #199 e PR #219.