# Rendimentos do trabalho

O módulo **Rendimentos do trabalho** trata holerites, adiantamentos e informes
anuais como fontes documentais separadas de `Transaction`.

A regra central é:

> documento explica o rendimento; transação bancária representa o dinheiro realizado.

Importar ou corrigir um documento de folha nunca cria uma receita bancária
automaticamente. Quando existe um crédito bancário compatível, o vínculo é
explícito, reversível e não altera a `Transaction` original.

## Superfícies do módulo

A página `/rendimentos-trabalho` é protegida no servidor e organizada por tarefa:

- **Mensal** — importação, consolidação por competência, adiantamentos e histórico;
- **Conciliação bancária** — vínculo do líquido com crédito existente;
- **Anual / IR** — informe anual e conciliação anual.

As áreas bancária e anual são carregadas somente quando selecionadas.

## Tipos de documento e pagamento

Os tipos de documento persistidos são:

- `PAYROLL_ADVANCE` — documento de adiantamento salarial;
- `MONTHLY_PAYSLIP` — documento de folha/pagamento.

O contrato de classificação de pagamento é:

- `ADVANCE` — adiantamento;
- `REGULAR` — folha regular;
- `THIRTEENTH` — 13º salário;
- `VACATION` — férias;
- `PLR` — participação nos lucros/resultados;
- `OTHER` — pagamento reconhecido como rendimento do trabalho, mas sem natureza
  fiscal específica suficientemente comprovada.

### Regras de classificação

Tipos especiais só são inferidos quando há evidência textual explícita no PDF.

Exemplos aceitos:

- 13º / décimo terceiro / gratificação natalina → `THIRTEENTH`;
- recibo/folha/pagamento de férias → `VACATION`;
- PLR / participação nos lucros ou resultados → `PLR`;
- folha mensal / salário mensal / dias normais → `REGULAR`;
- adiantamento explícito → `ADVANCE`.

Se o documento é reconhecido como folha, mas a natureza não pode ser determinada
com segurança, o tipo é `OTHER`.

A UI mostra a classificação no preview e permite revisão antes da confirmação.

Combinações válidas:

- `PAYROLL_ADVANCE` aceita somente `ADVANCE`;
- `MONTHLY_PAYSLIP` aceita `REGULAR`, `THIRTEENTH`, `VACATION`, `PLR`
  ou `OTHER`.

Nenhum tipo fiscal especial é inferido apenas para fazer a conciliação fechar.

## Valores monetários e ausência de informação

Todos os valores monetários são centavos inteiros.

O teto canônico é o limite de `Int` usado pelo Prisma:

`2_147_483_647` centavos.

Valores acima desse limite são rejeitados antes da persistência.

### `null` não é zero

Campo ausente permanece `null`.

Isso vale para:

- renda bruta;
- líquido;
- IRRF;
- INSS;
- bases;
- FGTS;
- valores de rubrica;
- valores do informe anual.

A consolidação mensal carrega valor e estado de completude. Se existe documento
relevante, mas um valor necessário está ausente, o agregado fica incompleto e a
UI mostra **Incompleto**. A ausência real de uma categoria continua podendo ser
representada por zero completo.

O sistema nunca converte “não foi possível determinar” em `R$ 0,00`.

## Fingerprint, idempotência e retificação

O fingerprint representa o conteúdo documental canônico, não apenas a competência.

No holerite ele inclui identidade, classificação, valores financeiros,
INSS/IRRF/FGTS, bases, totais, rubricas e metadado bancário normalizado.

No informe anual ele inclui identidade fiscal e o conteúdo financeiro das seções.

Arrays são canonicalizados para que simples reordenação não gere uma nova versão.

Warnings/errors de parser não fazem parte da identidade do conteúdo.

### Idempotência

Repetir o mesmo documento permanece idempotente.

Confirmações concorrentes do mesmo preview também são idempotentes:

- apenas um registro é criado;
- conflito de fingerprint é tratado como replay;
- as respostas convergem para o mesmo ID.

## Lifecycle auditável

Holerites, adiantamentos e informes anuais usam lifecycle explícito:

- `ACTIVE` — versão vigente;
- `SUPERSEDED` — substituída por uma versão corrigida;
- `ARCHIVED` — inutilizada manualmente, preservada para auditoria.

Retificação nunca sobrescreve silenciosamente uma versão anterior.

A relação de substituição é registrada por `supersedesId`, `supersededAt` e
`supersededBy`.

Ao superseder ou arquivar um documento mensal:

- vínculos bancários da versão obsoleta são removidos;
- vínculos adiantamento × folha incompatíveis são removidos;
- a competência é recalculada;
- a nova versão fica elegível para conciliação.

Read models financeiros consideram apenas versões `ACTIVE`.

O histórico continua exibindo versões substituídas e arquivadas.

Hard-delete de documentos importados não faz parte do contrato atual.

## Atomicidade da importação

A importação mensal trata como uma única unidade:

- supersede/cleanup da versão anterior;
- criação do novo documento;
- reconciliação derivada da competência.

Essas etapas participam da mesma transação de banco.

Se a derivação falha, o documento novo e qualquer mudança de lifecycle são
revertidos juntos.

No frontend, sucesso da mutação é separado de falha de refresh:

- POST 2xx continua sendo sucesso;
- falha posterior ao recarregar histórico/resumo é mostrada separadamente;
- a UI oferece retry da leitura;
- o POST não é repetido automaticamente.

## Adiantamento × folha

A conciliação de adiantamento usa usuário, CNPJ, competência e rubricas de
compensação salarial.

O match automático só ocorre quando a evidência é única e segura.

Quando há ausência, divergência ou múltiplas rubricas/folhas possíveis, o vínculo
fica `PENDING`.

### Resolução manual

A UI permite selecionar explicitamente:

- o adiantamento;
- a folha `REGULAR` da mesma competência/fonte;
- a rubrica usada como compensação.

A decisão manual é auditada em `PayrollAdvanceLink.evidence`, incluindo:

- `source = MANUAL`;
- folha selecionada;
- índice e descrição da rubrica;
- valor esperado;
- valor escolhido;
- diferença;
- timestamp;
- estado automático anterior, quando existente.

Uma decisão manual válida é preservada contra reconciliações automáticas
posteriores.

Também é possível desfazer a decisão. Nesse caso a competência é recalculada e
pode voltar a `PENDING`.

A resolução nunca altera valores do holerite.

## Consolidação mensal

A consolidação normal usa somente:

- `ADVANCE`;
- `REGULAR`.

`THIRTEENTH`, `VACATION`, `PLR` e `OTHER` não contaminam os totais mensais
regulares.

Quando existe uma única folha regular, a renda bruta vem dela; o adiantamento
vinculado não duplica renda bruta.

Os pagamentos líquidos de adiantamento e folha permanecem distinguíveis.

IRRF de adiantamento continua compondo a retenção da competência quando aplicável.

### Competência ambígua

Mais de um documento `REGULAR` ativo para o mesmo usuário/CNPJ/ano/mês não é
somado como se fosse um total definitivo.

Enquanto a ambiguidade existir:

- renda bruta fica incompleta;
- folha líquida fica incompleta;
- líquido total fica incompleto;
- IRRF fica incompleto;
- a UI mostra **Revisar competência**.

Superseder/arquivar a versão incorreta remove a ambiguidade.

Pagamentos realmente distintos devem usar classificações distintas.

## Conciliação bancária

Um `PayrollDocument` pode vincular no máximo uma `Transaction`, e uma
transação não pode liquidar dois documentos de folha.

Um candidato bancário precisa cumprir todas as invariantes:

- mesmo usuário;
- `kind = NORMAL`;
- `type = INCOME`;
- `status = COMPLETED`;
- conta `CREDIT_DEBIT`;
- moeda `BRL`;
- valor exatamente igual a `netPaidCents`;
- mês da competência ou até dia 10 do mês seguinte;
- ainda não vinculado a outro documento de folha.

Logo, não são candidatos:

- transferências;
- pagamentos de cartão;
- crédito/estorno em conta `CREDIT_CARD`;
- conta de investimento;
- USD/EUR;
- transação já usada por outro documento.

Estados possíveis:

- `MATCHED` — vínculo existente e ainda válido;
- `SUGGESTED` — exatamente um candidato financeiro;
- `UNMATCHED` — nenhum candidato;
- `REVIEW_REQUIRED` — ambiguidade ou vínculo existente incompatível.

O sistema nunca cria o vínculo automaticamente.

### Metadado bancário do holerite

Metadados bancários são somente contexto auxiliar.

Quando o nome do banco pode ser comparado com o nome da conta cadastrada, essa
evidência pode:

- ordenar candidatos;
- explicar por que um candidato parece mais provável.

Agência e número de conta do PDF não são considerados confirmação porque o
cadastro financeiro atual não possui campos comparáveis confiáveis.

Metadado nunca substitui valor, moeda, tipo, status, kind ou confirmação manual.

## Informe anual e conciliação anual

O informe anual é versionado com o mesmo lifecycle auditável dos documentos
mensais.

A conciliação anual é agrupada por usuário, CNPJ da fonte pagadora e
ano-calendário.

Regras principais:

- adiantamento não duplica renda tributável;
- IRRF de adiantamento continua compondo retenção anual;
- ausência permanece incompleta;
- cobertura mensal incompleta bloqueia falso `MATCHED`;
- 13º e PLR são comparados quando explicitamente classificados;
- férias permanecem componente de revisão quando não é possível separar com
  segurança parcela tributável de abono/isento;
- `OTHER` permanece revisão explícita;
- divergências nunca são corrigidas silenciosamente.

O “último ano fechado” usa data lógica em `America/Sao_Paulo`, não o ano UTC
isolado do navegador.

## Performance dos read models

As leituras do módulo são limitadas por ano/página:

- histórico mensal paginado;
- consolidação por competência paginada;
- conciliação bancária filtrável por ano, status e fonte pagadora;
- informes anuais paginados.

A conciliação bancária não executa uma busca de candidatos por documento.

Para uma leitura ela usa:

1. uma consulta dos documentos do recorte;
2. no máximo uma consulta em lote dos créditos candidatos.

O número de queries não cresce linearmente com a quantidade de holerites.

## Privacidade visual

O módulo respeita o controle global `showValues`.

Quando `showValues = false`, ficam ocultos valores sensíveis como:

- bruto;
- líquido;
- IRRF;
- INSS;
- valores de rubrica;
- candidatos bancários;
- compensações de adiantamento;
- valores do informe anual;
- diferenças e origens monetárias da conciliação anual;
- notas complementares potencialmente sensíveis.

Labels, competência, fonte pagadora e status continuam visíveis.

Valores ocultos também não são colocados em `aria-label` ou `title`.

## PDF sem texto

O caminho principal usa texto embutido no PDF.

Se não houver texto extraível, o preview retorna uma pendência explícita de
OCR/revisão manual.

Nenhum valor é inferido e nenhum documento é persistido nesse estado.

## Não suportado / fora de escopo

O módulo não:

- cria salário automaticamente como `Transaction`;
- calcula folha do zero;
- calcula imposto de renda devido;
- substitui eSocial, contabilidade ou declaração oficial;
- executa OCR automático não revisado;
- infere classificação fiscal sem evidência documental;
- sincroniza diretamente com sistemas de RH;
- faz hard-delete de documentos importados;
- trata conta de investimento, cartão, transferência ou moeda estrangeira como
  crédito salarial elegível;
- usa metadado bancário como confirmação automática;
- separa automaticamente férias tributáveis de abono/isento quando o documento
  não traz estrutura suficiente.

Essas limitações são deliberadas para preservar auditabilidade e evitar criar
uma segunda fonte de verdade financeira.

## Invariantes

- documento de folha/informe nunca cria `Transaction` automaticamente;
- vincular crédito nunca altera a transação original;
- um documento vincula no máximo uma transação;
- uma transação não liquida dois documentos;
- ausência permanece `null`;
- ambiguidade nunca é resolvida automaticamente;
- retificação preserva histórico;
- retry concorrente não duplica importação;
- classificação fiscal especial exige evidência ou revisão explícita;
- ownership é aplicado a documentos, informes, links e transações;
- valores monetários permanecem centavos inteiros dentro do teto do domínio.
