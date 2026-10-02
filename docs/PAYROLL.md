# Rendimentos do trabalho

A camada de rendimentos do trabalho é separada de `Transaction`.

Holerites e adiantamentos explicam a composição de rendimentos e retenções, mas
não criam créditos bancários automaticamente. A conciliação com transações será
tratada em uma etapa posterior.

## Documentos suportados nesta etapa

- `PAYROLL_ADVANCE`: adiantamento salarial;
- `MONTHLY_PAYSLIP`: folha mensal.

A detecção usa sinais explícitos do documento, como `ADIANTAMENTO SALARIAL`,
`Folha Mensal`, `DIAS NORMAIS` e `I.N.S.S.`.

## Valores e campos ausentes

Todos os valores monetários são persistidos em centavos inteiros.

Campos que não aparecem no documento permanecem `null`; o importador não
converte ausência em zero.

Quando disponíveis, o parser preserva:

- fonte pagadora e CNPJ;
- funcionário;
- competência;
- salário-base;
- vencimentos e descontos;
- líquido;
- INSS;
- IRRF e base de IRRF;
- base e valor de FGTS;
- rubricas de vencimento/desconto;
- metadados bancários somente como contexto.

## Validação

Quando vencimentos, descontos e líquido estão presentes, a importação valida:

`vencimentos - descontos = líquido`

Divergência gera erro de preview e bloqueia a confirmação. O sistema nunca
corrige valores silenciosamente.

## Idempotência

O fingerprint considera usuário, tipo de documento, CNPJ, competência, tipo de
pagamento e valores principais. A combinação é única por usuário no banco.

O preview é assinado e vinculado ao usuário autenticado. Um preview emitido
para outro usuário não pode ser confirmado.

## PDF sem texto

O caminho principal usa texto embutido no PDF. Se não houver texto extraível, o
preview retorna uma pendência explícita de OCR/revisão manual. Nenhum valor é
inferido e nenhum documento é persistido nesse estado.

## Interface

A página `/rendimentos-trabalho` apresenta o preview antes da confirmação,
incluindo tipo detectado, competência, fonte pagadora, totais, retenções,
rubricas, avisos e duplicidade.

## Limites desta issue

A #751 não:

- vincula adiantamento à folha mensal;
- reconcilia pagamento com transação bancária;
- interpreta informe anual;
- corrige divergências automaticamente.

Essas responsabilidades pertencem às issues seguintes da roadmap de
rendimentos do trabalho.


## Adiantamento x folha mensal

Após cada importação, a competência é conciliada por usuário, CNPJ e mês/ano.

O vínculo automático exige uma única rubrica de compensação salarial compatível
com o valor bruto do adiantamento. Descrições como `DESC.ADIANT.SALARIAL` são
tratadas como compensação da folha, não como nova saída financeira.

Quando o vínculo é exato:
- os dois documentos continuam armazenados separadamente;
- a renda bruta da competência usa a folha mensal, sem somar novamente o adiantamento;
- os pagamentos líquidos de ADVANCE e REGULAR permanecem separados e também são somados;
- o IRRF retido no adiantamento continua compondo o IRRF total da competência.

Quando há valor divergente, múltiplos candidatos ou mais de um adiantamento
indistinguível, o vínculo fica `PENDING` com a evidência usada no matching.
Nenhuma associação ambígua é criada automaticamente.
