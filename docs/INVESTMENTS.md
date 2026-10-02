# Domínio de investimentos

Issue: #694

## Decisões de domínio

O domínio de investimentos é separado de `Transaction`.

Uma `InvestmentOperation` registra a aquisição ou venda de uma quantidade de um ativo em uma conta do tipo `INVESTMENT`. Criar ou excluir uma operação **não cria, altera nem exclui transações financeiras automaticamente**.

Essa separação é intencional: o saldo atual das contas continua derivado exclusivamente de `Transaction`. Somar posições ao patrimônio atual sem modelar também o caixa da corretora e a origem dos aportes causaria dupla contagem.

Portanto, neste primeiro escopo:

- contas de investimento continuam no patrimônio existente pelo saldo derivado de transações;
- posições aparecem apenas na superfície de investimentos;
- o total exibido em investimentos é **custo investido**, não valor de mercado;
- posições não são adicionadas ao patrimônio consolidado neste PR;
- cotações externas enriquecem apenas a superfície de investimentos; não substituem operações nem alteram o saldo da conta;
- o patrimônio consolidado continua sem somar posições automaticamente enquanto caixa + posições da conta de investimento não tiverem uma regra explícita de não dupla contagem.

## Precisão de quantidade

Quantidade não usa `float`.

O banco armazena `quantity_units BIGINT` com escala fixa de 8 casas:

```text
1 unidade       = 100000000
0,125 unidade   = 12500000
0,00000001      = 1
```

A API recebe e devolve quantidade como string decimal. Isso evita perda de precisão em JavaScript/JSON e cobre ações fracionárias e cripto sem introduzir `Decimal` no contrato HTTP.

## Valores monetários

- preço unitário: centavos inteiros;
- taxas: centavos inteiros;
- custo da posição: centavos inteiros derivados;
- valor bruto fracionário é arredondado para o centavo mais próximo (half-up).

Taxas de compra entram no custo da posição. Taxas de venda não alteram o custo remanescente.

## Cotações de mercado

A issue #695 adiciona valuation informativo via brapi para ações, FIIs e ETFs brasileiros em BRL.

- a consulta acontece somente no servidor;
- `BRAPI_TOKEN` é opcional para os símbolos públicos de teste e necessário para os demais ativos conforme o contrato da brapi;
- a última cotação bem-sucedida é persistida em `AssetQuote`;
- preço é armazenado em centavos inteiros;
- origem, horário de referência e horário de coleta permanecem explícitos;
- cotações com moeda diferente do ativo são rejeitadas;
- o refresh é explícito na UI e usa TTL de 15 minutos;
- falha externa não remove a última cotação conhecida;
- cotação stale continua visível e marcada como desatualizada;
- nenhuma operação, saldo ou custo médio depende da disponibilidade da brapi.

O valor de mercado da posição é derivado de quantidade × última cotação, com aritmética inteira e arredondamento para centavos.

## Eventos fiscais e transferência de custódia

A classificação fiscal é separada da operação econômica original.

Cada `InvestmentOperation` recebe um `InvestmentFiscalEvent` com a
classificação inicial `BUY` ou `SELL`. Essa classificação pode ser revisada
sem alterar a operação importada/original.

Tipos suportados:

- `BUY`;
- `SELL`;
- `CUSTODY_TRANSFER_IN`;
- `CUSTODY_TRANSFER_OUT`;
- `BONUS`;
- `SPLIT`;
- `REVERSE_SPLIT`;
- `OTHER`.

Transferências de custódia movimentam quantidade, mas não representam
aquisição/alienação fiscal nova e não realizam resultado. A instituição de
origem/destino e o motivo da reclassificação podem ser registrados para
auditoria.

A classificação original é preservada em `originalType`; revisões feitas pelo
usuário ficam marcadas como `USER`. O custo fiscal propriamente dito será
tratado na camada fiscal específica e não deve ser inferido do valor de uma
transferência.

## Custo fiscal por ativo

A issue #734 adiciona uma camada de custo fiscal independente da corretora.

O custo fiscal é derivado globalmente por ativo, não por conta de investimento:

- `BUY` aumenta quantidade fiscal e custo por valor bruto + taxas;
- `SELL` reduz quantidade e remove custo proporcional;
- `CUSTODY_TRANSFER_IN` e `CUSTODY_TRANSFER_OUT` não alteram quantidade
  fiscal global nem custo;
- `BONUS` aumenta quantidade sem adicionar custo;
- eventos ainda insuficientemente modelados, como split/reverse split sem
  relação explícita, geram pendência em vez de estimativa silenciosa.

O sistema compara a quantidade fiscal derivada com a posição econômica atual.
Divergência gera `FISCAL_QUANTITY_MISMATCH`; o custo conhecido permanece
visível como parcial, mas não é apresentado como totalmente conciliado.

### Baseline/ajuste manual auditável

Quando o histórico anterior está incompleto, o usuário pode registrar um
`InvestmentFiscalCostAdjustment` com:

- quantidade fiscal conhecida;
- custo fiscal total conhecido;
- data-base;
- motivo obrigatório;
- instituição de origem opcional.

O ajuste é um baseline absoluto para o ativo naquela data. Ele não altera nem
apaga operações importadas e ajustes anteriores permanecem no histórico.

Isso cobre, por exemplo, cotas transferidas da Rico para a Nubank: a entrada
pode ser classificada como `CUSTODY_TRANSFER_IN` e o custo fiscal herdado pode
ser informado separadamente. Compras posteriores continuam sendo aplicadas a
partir desse baseline.

Nenhum custo ausente é preenchido usando valor de mercado. A interface mantém
separados:

- **custo fiscal**: base usada pela camada fiscal;
- **custo econômico importado**: derivado das operações econômicas;
- **valor de mercado**: quantidade × última cotação disponível.

O valor atualmente exibido por uma corretora não é inferido nem tratado como
custo fiscal sem uma fonte explícita.

## Regras fiscais versionadas

A issue #742 centraliza regras de renda variável em um catálogo tipado por
**ano-calendário**. O catálogo não reaproveita automaticamente regras de outro
ano.

A primeira versão suportada é:

```text
ano-calendário 2025
exercício 2026
```

Para essa versão, as regras cobertas são somente as operações comuns que o
domínio atual consegue representar com segurança:

- **STOCK / ações**: grupo `GENERAL`, alíquota de 15%, com isenção do ganho
  quando o total mensal de alienações de ações à vista é igual ou inferior a
  R$ 20.000;
- **ETF**: grupo `GENERAL`, alíquota de 15%, sem a isenção mensal de
  R$ 20.000;
- **FII**: grupo `FII_FIAGRO`, alíquota de 20%, sem a isenção mensal de
  ações;
- código DARF: `6015`;
- valor mínimo para recolhimento: R$ 10,00.

O catálogo também define as fontes oficiais usadas para cada versão.

### Grupos e compensação

A apuração versionada usa os grupos:

- `GENERAL`;
- `FII_FIAGRO`.

Isso substitui, para o cálculo final do imposto, a separação conservadora
provisória por `InvestmentAssetType`. O relatório histórico de prejuízos da
#738 continua disponível, mas a apuração de imposto da #742 refaz a
compensação com o grupo fiscal da versão selecionada.

Ganhos isentos de ações são removidos da base tributável antes da compensação.
Perdas continuam sendo carregadas para competências posteriores do grupo
aplicável.

### IRRF e DARF

A apuração:

1. calcula o imposto bruto pela alíquota versionada;
2. usa IRRF registrado na competência;
3. carrega crédito de IRRF não utilizado para competências seguintes;
4. considera DARFs registrados;
5. carrega saldo de imposto inferior ao mínimo de R$ 10 para competências
   seguintes;
6. expõe saldo em aberto e pendências.

### Exercício ainda não suportado

Ano sem catálogo, como 2026/exercício 2027 nesta versão, retorna
`WAITING_RULES`. O sistema não aplica 2025 por aproximação.

Classes sem regra explícita (por exemplo, cripto ou renda fixa nesta primeira
versão) também permanecem pendentes em vez de receber alíquota presumida.

### Fontes oficiais da versão 2025

- Receita Federal — Bolsa de Valores:
  operações comuns com alíquota de 15%;
- Receita Federal — Isenções:
  limite mensal de R$ 20.000 para ações e ausência dessa isenção para ETF;
- Receita Federal — Fundos de Investimento no Brasil:
  ganhos na alienação/resgate de FII com alíquota de 20%;
- Receita Federal — Manual do ReVar:
  grupos Geral e FII/FIAGRO e recolhimento mínimo de R$ 10;
- Receita Federal — Rendimentos do Capital:
  IRRF e imposto pago por DARF 6015.

As URLs oficiais ficam junto ao catálogo no código para auditoria e atualização
quando uma nova versão for adicionada.

## Relatório anual de apoio ao IR

A issue #741 consolida as camadas fiscais já existentes em uma única visão por
ano-calendário.

O relatório contém:

- patrimônio em 31/12 anterior e atual;
- ativos e custo fiscal;
- rendimentos/proventos;
- vendas e resultado realizado;
- prejuízos acumulados;
- IRRF;
- DARFs;
- pendências;
- justificativas e ajustes manuais auditáveis.

A fonte de verdade continua sendo cada camada fiscal. O relatório não copia nem
persiste um novo estado derivado.

### Completude

O status anual vem diretamente da Central de Pendências:

- `COMPLETE`;
- `COMPLETE_WITH_JUSTIFICATIONS`;
- `INCOMPLETE`.

Exportações preservam o mesmo status e nunca ocultam pendências ou
justificativas.

### Exportações

A API suporta:

```text
GET /api/investments/annual-tax-support?year=YYYY
GET /api/investments/annual-tax-support/export?year=YYYY&format=csv
GET /api/investments/annual-tax-support/export?year=YYYY&format=pdf
```

O CSV expõe as seções fiscais em blocos para auditoria e processamento
posterior.

O PDF é um documento de apoio textual, paginado e gerado no servidor sem
dependência externa. Ele inclui status, patrimônio, rendimentos, vendas,
prejuízos, IRRF/DARF, pendências e notas.

Todas as versões exibem aviso explícito de que o material:

- não é a declaração oficial;
- não transmite dados à Receita Federal;
- serve para conferência e preenchimento manual.

## Central de pendências fiscais

A issue #740 consolida lacunas fiscais por ano-calendário sem criar uma nova
fonte de verdade. A central recalcula o estado usando as camadas já existentes:

- fechamento fiscal em 31/12;
- custo fiscal;
- classificação de rendimentos;
- resultado realizado;
- apuração de IRRF/DARF.

Cada pendência possui:

- severidade;
- categoria;
- entidade relacionada;
- mensagem;
- ação sugerida;
- chave estável;
- fingerprint da versão atual do problema.

### Resolução auditável

Uma pendência ativa pode receber justificativa manual. A justificativa é
persistida em `InvestmentFiscalPendingResolution` e não altera os dados de
origem.

A resolução é ligada ao **fingerprint** da versão atual da pendência:

- se a causa for corrigida, a pendência deixa de ser gerada;
- se os dados mudarem e o problema continuar, o fingerprint muda e a pendência
  volta a ficar ativa;
- justificativas antigas permanecem no histórico, marcadas como não aplicadas à
  versão atual;
- não é possível justificar um fingerprint que já não corresponde ao estado
  atual.

O status anual pode ser:

- `COMPLETE`: nenhuma pendência ativa ou justificada;
- `COMPLETE_WITH_JUSTIFICATIONS`: não há pendência ativa, mas existem
  justificativas aplicadas;
- `INCOMPLETE`: existe ao menos uma pendência ativa.

A central não transforma ausência de dados em zero e não permite esconder uma
lacuna apenas com estado de UI.

## IRRF e DARF

A issue #739 adiciona registros auditáveis de imposto retido e pagamentos DARF
sem criar ou alterar `Transaction`.

### IRRF

`InvestmentTaxWithholding` registra:

- classe do ativo;
- moeda;
- valor retido;
- data;
- ativo/operação opcional;
- origem `MANUAL` ou `IMPORT`;
- observação opcional.

Quando ativo ou operação são informados, ownership, classe e moeda são
validados no servidor.

### DARF

`InvestmentTaxPayment` registra:

- competência;
- classe;
- moeda;
- código;
- valor pago;
- data de pagamento;
- observação;
- referência de comprovante opcional.

O pagamento é apenas um registro fiscal. Ele não gera saída financeira nem
procura movimentação bancária automaticamente.

### Vínculo com a apuração

O relatório `GET /api/investments/taxes?year=YYYY` consolida, para a mesma
competência/classe/moeda:

- base de resultado após compensação de prejuízos;
- IRRF registrado;
- DARF pago.

O campo de imposto devido e saldo em aberto permanece explicitamente
indisponível até a #742 fornecer regras fiscais versionadas. Nesta etapa o
sistema não transforma resultado tributável em imposto usando alíquota
hardcoded e não presume como o IRRF deve ser compensado.

Isso permite importar IRRF de notas de corretagem no futuro (#746) e manter
DARFs auditáveis agora, sem antecipar regras tributárias que pertencem ao
catálogo versionado.

## Prejuízos fiscais acumulados

A camada de prejuízo fiscal consome somente resultados realizados já apurados.

Regras aplicadas nesta etapa:

- prejuízo de um mês é carregado para meses posteriores;
- ganho posterior compensa primeiro o saldo de prejuízo disponível;
- prejuízo nunca é aplicado retroativamente contra ganho de mês anterior;
- saldos são separados por classe de ativo e moeda;
- mês com apuração `PENDING` não consome nem gera saldo automaticamente;
- o resultado após compensação permanece disponível para as etapas de imposto.

A separação atual usa a estratégia conservadora
`EXACT_ASSET_TYPE_V1`: cada `InvestmentAssetType` mantém seu próprio saldo.
Ela evita compensações entre classes até a issue #742 centralizar e versionar
as regras fiscais de compatibilidade.

### Ajuste manual auditável

É possível informar um saldo inicial/baseline por:

- classe;
- moeda;
- ano;
- mês;
- valor;
- motivo obrigatório.

O ajuste define o saldo disponível no início daquele mês e fica persistido em
`InvestmentTaxLossAdjustment`. Ajustes posteriores não apagam o histórico
anterior.

O relatório anual mostra saldo inicial, prejuízo gerado, prejuízo compensado,
resultado restante após compensação e saldo final de cada mês.

## Resultado realizado de vendas

A apuração de resultado realizado usa apenas eventos fiscais de venda e o custo
fiscal acumulado até cada alienação.

Para cada `SELL`, o sistema calcula:

- valor bruto da venda;
- taxas da operação;
- valor líquido;
- custo fiscal proporcional das unidades vendidas;
- lucro ou prejuízo realizado.

Valorização de mercado e cotações não participam desse cálculo.

A apuração é agrupada por:

- ano;
- mês;
- classe fiscal do ativo;
- moeda.

FII, STOCK, ETF e outras classes não são misturados no mesmo agrupamento. Esta
etapa não aplica alíquota, isenção ou compensação de prejuízo; essas regras
dependem do catálogo fiscal versionado e das issues seguintes.

Se o histórico anterior estiver incompleto, houver quantidade fiscal
insuficiente ou um evento não suportado antes da venda, o resultado fica
`PENDING` e não é apresentado como lucro/prejuízo confiável.

O endpoint `GET /api/investments/realized-results?year=YYYY` retorna os grupos
mensais e cada venda individual, com custo alocado e trilha suficiente para
auditoria/reprocessamento determinístico.

## Relatório anual de rendimentos

A consolidação anual usa diretamente os registros persistidos em
`InvestmentIncome`; não cria uma segunda fonte de verdade.

O relatório agrupa por:

- ano-calendário;
- ativo;
- tipo de rendimento;
- instituição/conta custodiante;
- moeda.

Cada agrupamento mantém os pagamentos individuais para conferência, incluindo
data, quantidade-base, valor unitário, valor líquido e observação.

Totais anuais são calculados separadamente por moeda. O sistema nunca soma BRL,
USD ou outras moedas silenciosamente.

Os tipos `DIVIDEND` e `INTEREST` são considerados classificados para esta
etapa. Eventos genéricos `INCOME` ou `OTHER` permanecem no relatório, mas
geram a pendência `UNCLASSIFIED_INCOME_TYPE` para revisão antes do relatório
fiscal final.

O endpoint `GET /api/investments/income-report?year=YYYY` retorna a estrutura
completa do relatório, incluindo totais por moeda/tipo, agrupamentos, eventos
individuais e pendências, para reutilização futura no relatório anual de IR.

A idempotência continua sendo responsabilidade da importação: registros com o
mesmo `importFingerprint` não são duplicados, e o relatório apenas consolida
os eventos efetivamente persistidos.

## Snapshot fiscal em 31/12

O snapshot fiscal anual é derivado sob demanda a partir dos eventos fiscais e
ajustes de custo já persistidos. Ele não copia valor de mercado para a base
fiscal e não cria uma segunda fonte de verdade.

Para um ano-calendário, o endpoint considera somente eventos com data lógica até
31/12 daquele ano e retorna:

- quantidade fiscal por ativo;
- custo fiscal total;
- preço médio fiscal;
- pendências herdadas da camada fiscal;
- instituições/custódias relacionadas como contexto;
- totais separados por moeda;
- comparação automática com 31/12 do ano anterior.

O custo continua global por ativo. Contas/corretoras aparecem apenas como
contexto de custódia e não fragmentam a base fiscal.

Ativos totalmente vendidos permanecem no fechamento com quantidade e custo
zero quando existe histórico até aquela data, permitindo mostrar a transição da
posição anterior para zero.

A interface usa por padrão o último ano já encerrado. Anos históricos são
recalculados deterministicamente a partir dos dados auditáveis existentes, sem
usar a cotação atual ou uma cotação retroativa estimada.

## Valor de contas de investimento

O saldo transacional da conta continua separado da posição de investimentos.

Na tela de Contas, contas do tipo `INVESTMENT` exibem o **valor da posição**:

1. valor de mercado quando existe cotação válida para a posição;
2. custo investido como fallback quando não existe cotação;
3. origem `MIXED` quando há posições com e sem cotação.

O `balance` transacional não é sobrescrito no domínio de conta. Isso evita
que forecast/saldo disponível passem a tratar ativos como caixa.

No patrimônio do mês atual, quando uma conta de investimento possui posições,
o valor das posições substitui o saldo transacional daquela conta na
distribuição patrimonial, em vez de ser somado a ele. Isso evita dupla contagem
de aportes.

Meses históricos não reutilizam a cotação/posição atual. Enquanto não houver
histórico de cotações/snapshots, eles permanecem com a derivação transacional
existente em vez de fabricar um valuation retroativo.

## Posição derivada

Não existe tabela de holding.

A posição é recalculada das operações em ordem lógica:

1. `BUY`: aumenta quantidade e custo pelo valor bruto + taxas;
2. `SELL`: reduz quantidade;
3. o custo removido numa venda é proporcional ao custo acumulado antes da venda;
4. venda maior que a posição disponível é rejeitada;
5. excluir uma compra é rejeitado quando deixaria uma venda histórica sem quantidade suficiente.

Isso mantém operações como única fonte de verdade da posição.

## Ownership e moeda

- ativo pertence a um usuário;
- operação pertence ao mesmo usuário do ativo e da conta;
- a conta deve ser `INVESTMENT`;
- moeda do ativo e da conta deve ser idêntica;
- contas com operações não podem mudar tipo/moeda;
- conta com operações não pode ser excluída.

## Importação B3

A superfície de investimentos aceita arquivos CSV/XLSX de movimentações e
proventos exportados pela B3.

- o formato é detectado pelos cabeçalhos, não pelo nome do arquivo;
- ativos inexistentes são criados automaticamente em BRL/B3;
- movimentações entram como `InvestmentOperation`;
- proventos entram como `InvestmentIncome`;
- o mesmo arquivo pode ser importado novamente sem duplicar registros, por
  meio de fingerprint persistido;
- proventos não criam `Transaction` automaticamente;
- créditos de "Transferência - Liquidação" continuam entrando como operação
  econômica para preservar a posição, mas podem ser reclassificados fiscalmente
  como transferência de custódia sem alterar o registro importado;
- preços unitários com mais de duas casas são normalizados para centavos e o
  ajuste necessário para preservar o valor total da operação entra no custo
  importado.

## Importação de notas de corretagem Nu Investimentos

O importador de investimentos também aceita notas de corretagem em PDF quando o
documento possui texto extraível e layout reconhecível da Nu Investimentos.

Regras aplicadas:

- cada negócio é normalizado como `BUY` ou `SELL`;
- a identidade da importação considera conta, nota, data, ordem do negócio,
  ticker, direção, quantidade e preço;
- taxas alocáveis entram em `feesCents` da operação;
- o rateio é proporcional ao valor bruto de cada negócio, sempre em centavos;
- qualquer resíduo de arredondamento é aplicado ao último negócio, garantindo
  que a soma das taxas alocadas seja exatamente igual ao total da nota;
- entram no rateio: taxa de liquidação/CCP, emolumentos, taxa de transferência,
  corretagem, ISS e outras despesas operacionais reconhecidas;
- IRRF permanece separado do custo da operação e é preservado nos metadados da
  nota para conciliação/apuração fiscal;
- o PDF original não é persistido como fonte de verdade;
- PDF sem texto extraível ou com layout não reconhecido falha explicitamente em
  vez de estimar valores.

## Proventos

`InvestmentIncome` registra o pagamento efetivamente recebido, a quantidade
de cotas usada no evento e o valor unitário. A quantidade do provento é
histórica e não é recalculada usando a posição atual.

Os proventos aparecem na superfície de investimentos e no histórico do ativo,
mas não alteram o saldo da conta.

## Fora deste escopo

- rentabilidade/realized P&L;
- cálculo fiscal de custo médio/preço médio;
- cálculo final de imposto;
- ordens reais;
- integração com corretora;
- geração automática de `Transaction`.
