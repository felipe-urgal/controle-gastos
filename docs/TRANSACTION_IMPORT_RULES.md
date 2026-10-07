# Regras de importação de transações

## Contrato de descrição

Regras de importação classificam uma transação; elas não reescrevem a descrição recebida do arquivo.

A descrição importada é dado de origem e deve permanecer intacta durante preview e confirmação. A antiga propriedade `normalizedDescription` não faz parte do contrato funcional final e será removida desta funcionalidade.

Quando houver uma identidade normalizada de estabelecimento, ela pertence ao domínio de Merchant/aliases e não substitui silenciosamente a descrição original da transação.

Consequências:

- regras podem sugerir categoria e Merchant, mas não texto substituto;
- preview e confirmação preservam a descrição original;
- normalização persistida de descrição exigiria um campo `rawDescription` separado e não está sendo adotada nesta revisão.

## Normalização persistida

A alternativa de persistir uma descrição normalizada não foi escolhida nesta revisão. Não será criado `rawDescription` separado somente para sustentar esse comportamento. Quando o objetivo for identidade de estabelecimento, o domínio de Merchant/aliases deve ser usado.

Se uma normalização persistida de descrição voltar a ser necessária no futuro, ela deve ser modelada como dado distinto do raw antes de qualquer sobrescrita.
