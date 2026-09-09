# Importação de transações CSV/OFX

Status: **✅ fluxo financeiro implementado; Import Inbox Orbit e regras locais integradas à `main`**.  
Entrega base: #155 / PR #199 (`36c53d1`).  
UX atual: #299 / PR #352 (`ac362b8`).  
Regras locais: #285, com gestão integrada pelo PR #370 (`86543f0`) e criação explícita a partir de classificação manual neste slice.  
Última revisão documental: **2026-09-09**.

A importação segue o contrato obrigatório **arquivo → preview stateless → confirmação explícita**. O preview não cria lançamentos financeiros; a confirmação continua sendo a única fronteira de escrita.

## Limites do MVP

- formatos aceitos: `.csv` e `.ofx`;
- tamanho máximo: **2 MB** por arquivo;
- máximo de **1.000 transações** por arquivo;
- CSV assume a moeda da conta selecionada;
- OFX com `CURDEF` diferente da moeda da conta é rejeitado;
- não existe conversão cambial implícita;
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

A validação de moeda do OFX evita conversão implícita. A semântica multi-moeda permanece a definida na #198 / PR #219: agregados são separados por moeda e a importação nunca converte valores.

## Preview e segurança

`POST /api/transactions/import/preview` recebe `multipart/form-data` com `accountId` e `file`.

O servidor:

1. deriva o usuário exclusivamente da sessão;
2. valida ownership e estado da conta;
3. valida tipo, tamanho, quantidade, datas, valores e descrições;
4. normaliza o arquivo para um DTO comum;
5. calcula fingerprints determinísticos, escopados por usuário e conta;
6. consulta duplicidades existentes;
7. identifica itens válidos, inválidos e duplicados com motivos textuais;
8. avalia regras locais persistidas somente para itens válidos e não duplicados;
9. devolve provenance/sugestões quando existe match;
10. assina um token de preview de curta duração contendo somente os dados originais necessários para vincular confirmação e preview.

Nenhuma `Transaction` é criada nessa etapa e o arquivo bruto não é persistido nem logado.

### Regras locais no preview

A integração da #285 pode enriquecer um item com:

```text
matchedRuleId
matchedRuleName
suggestedCategoryId
suggestedDescription
```

Esses campos **não entram no token financeiro assinado** e não transformam sugestão em escrita automática.

Regras importantes:

- somente regras do usuário autenticado são avaliadas;
- regra inativa não participa;
- categoria sugerida precisa continuar ativa, pertencer ao usuário e ter o mesmo tipo da transação;
- item inválido ou duplicado não recebe automação;
- primeira regra válida por `priority ASC, id ASC` vence;
- override manual tem precedência;
- descrição sugerida é informativa e não substitui silenciosamente o conteúdo original assinado.

O contrato completo está em [`import-rules.md`](./import-rules.md).

## Confirmação

`POST /api/transactions/import/confirm` recebe o token do preview e os itens revisados.

O servidor valida novamente:

- identidade do usuário;
- integridade e expiração do preview;
- ownership e estado da conta;
- ownership, estado e tipo de cada categoria escolhida;
- validade dos itens selecionados;
- fingerprints já existentes.

A categoria enviada para confirmação é a decisão final revisada pelo usuário, independentemente de ter vindo inicialmente de sugestão ou escolha manual. Campos de provenance não fazem parte do payload financeiro final.

As gravações ocorrem em uma única transação Prisma. A constraint única de fingerprint e o tratamento de duplicidades tornam reenvios/reimportações idempotentes inclusive sob concorrência.

## Fingerprint

A fingerprint é SHA-256 e nunca é global:

- com identificador externo: `user + account + source + externalId`;
- sem identificador externo: `user + account + source + date + type + amountCents + normalizedDescription + occurrence`.

O contador `occurrence` evita colapsar duas linhas legitimamente idênticas dentro do mesmo arquivo, mantendo reimportações do mesmo conjunto determinísticas.

## Persistência

Não existe `ImportJob`.

Os metadados de importação financeira persistidos ficam na própria `Transaction`:

- `importSource`;
- `importFingerprint`;
- `importExternalId`.

`Transaction` continua sendo a única fonte de verdade financeira. Regras de importação são metadados de automação separados e não criam saldo, total ou ledger paralelo.

## UX atual — Import Inbox Orbit

Rota autenticada: `/transacoes/importar`.

A experiência atual foi consolidada pela #299 / PR #352 como **Import Inbox Orbit**.

Fluxo:

1. selecionar conta e arquivo;
2. gerar o preview sem escrita financeira;
3. revisar a inbox por estado: `Precisa revisar`, `Pronta`, `Duplicada` e `Ignorada`;
4. usar filtros/busca e detalhe contextual para revisar em volume;
5. revisar categoria e eventual sugestão de regra;
6. sobrescrever manualmente a sugestão quando necessário;
7. opcionalmente criar, por ação explícita, uma regra reutilizável a partir dessa classificação manual;
8. confirmar explicitamente somente quando não houver pendência bloqueante;
9. receber resumo final.

Desktop usa lista densa + detalhe contextual. Mobile reorganiza a mesma informação sem depender de cards gigantes ou overflow. `showValues=false`, teclado, foco, estados loading/error/empty e touch targets continuam obrigatórios.

Cancelar antes da confirmação não produz efeito financeiro.

### Criar regra a partir da revisão

Uma categoria escolhida manualmente — ou um override para categoria diferente da sugestão original — pode virar regra apenas quando o usuário aciona **Criar regra com esta classificação** e confirma o formulário inline.

A ação usa o CRUD de `/api/import-rules`; ela **não** chama novamente nem acopla escrita ao `POST /api/transactions/import/preview`.

O formulário começa de forma conservadora:

- conta atual como escopo;
- tipo e categoria da classificação manual;
- comparação `EQUALS` sobre a descrição original;
- prioridade no fim da ordem atual;
- nenhuma faixa monetária copiada da linha;
- nenhuma descrição normalizada preenchida silenciosamente.

Nome, escopo, operador, padrão e prioridade podem ser revisados antes do `POST /api/import-rules`. O backend continua revalidando ownership, conta ativa, categoria ativa e compatibilidade do tipo.

A regra criada só vale para **previews futuros**. O item atual, seu `previewToken`, provenance e payload de confirmação permanecem inalterados. Descrição/valor não são colocados em URL ou storage persistente para transportar esse estado.

### Gestão das regras

A tela `/transacoes/importar/regras`, integrada pelo PR #370, permite gerenciar as regras persistidas sem acoplar essa escrita ao preview.

O usuário pode:

- listar regras na ordem real de avaliação;
- criar/editar o payload completo;
- ativar/pausar;
- excluir com confirmação explícita;
- limitar por conta/tipo/faixa em centavos;
- escolher categoria compatível;
- editar prioridade diretamente;
- configurar descrição sugerida;
- preservar privacidade quando `showValues=false`.

O fluxo completo `preview → sugestão/override → confirmação` é protegido por `tests/e2e/import-rules-flow.spec.mjs`. A implementação prevista na #285 está concluída.

## Evolução visual histórica

O Redesign v3 da #250 / PR #264 endureceu o reflow em 320px, safe area, tipografia secundária e barra sticky da implementação anterior. Esses requisitos de acessibilidade/reflow continuam válidos, mas a composição visual da importação foi posteriormente substituída pela Import Inbox Orbit da #299 / PR #352.

A evidência histórica permanece em [`../quality/redesign-v3-reflow-250.md`](../quality/redesign-v3-reflow-250.md).

## Cobertura e validação

A entrega base da importação cobre:

- CSV e OFX válidos;
- itens inválidos e motivos textuais;
- centavos exatos;
- fingerprint determinístico sem colapsar linhas legítimas;
- limites de arquivo/quantidade;
- preview sem escrita;
- isolamento de conta/categoria por usuário;
- confirmação somente dos itens selecionados;
- validação atômica sem writes parciais;
- reimportação idêntica detectada e idempotente.

Os slices posteriores adicionam cobertura para:

- evaluator determinístico de regras;
- provenance no preview sem alterar o token original;
- ausência de sugestão em inválidos/duplicados;
- override manual;
- consumo visual das sugestões na Import Inbox;
- formulário e gestão autenticada de regras;
- defaults conservadores da regra criada por classificação manual;
- `showValues=false` no preview e na gestão.

Refs #155, #198, #250, #285, #299, PR #199, PR #219, PR #264, PR #352, PR #370, [`import-rules.md`](./import-rules.md) e `docs/design/import-inbox-orbit.md`.
