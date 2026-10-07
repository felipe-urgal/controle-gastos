# Regras de importação de transações

## Contrato de descrição

Regras de importação classificam uma transação; elas não reescrevem a descrição recebida do arquivo.

A descrição importada é dado de origem e deve permanecer intacta durante preview e confirmação. A antiga propriedade `normalizedDescription` não faz parte do contrato funcional final e será removida desta funcionalidade.

Quando houver uma identidade normalizada de estabelecimento, ela pertence ao domínio de Merchant/aliases e não substitui silenciosamente a descrição original da transação.

Consequências:

- regras podem sugerir categoria e Merchant, mas não texto substituto;
- preview e confirmação preservam a descrição original;
- normalização persistida de descrição exigiria um campo `rawDescription` separado e não está sendo adotada nesta revisão.
