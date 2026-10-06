# Estabelecimentos e aliases

## Objetivo

`Merchant` é a identidade normalizada opcional de onde uma transação aconteceu.
A descrição original da transação continua sendo o dado histórico e nunca é
sobrescrita pelo nome do estabelecimento.

## Lifecycle

- Merchant em uso é desativado, não apagado.
- Hard-delete só é permitido sem transações e sem aliases.
- Merchant inativo preserva histórico, mas não participa de novos vínculos
  automáticos nem de matching/importação.
- Renomear merchant muda apenas a apresentação da entidade; a descrição
  original das transações permanece intacta.

## Identidade de merchant

A apresentação fica em `name`. A identidade case-insensitive é persistida em
`normalized_name`, coluna gerada pelo PostgreSQL com trim, colapso de espaços
e lowercase. A constraint `(userId, normalized_name)` é a garantia atômica de
unicidade.

## Normalização de alias

Aliases preservam `pattern` para exibição e persistem `normalizedPattern`
para comparação. A normalização:

1. remove diacríticos;
2. colapsa espaços;
3. aplica trim;
4. converte para lowercase em locale pt-BR.

Não há regex, fuzzy matching ou IA.

## Política canônica de matching

Para uma descrição, apenas aliases de merchants ativos do mesmo usuário são
candidatos. A ordem é determinística:

1. `EQUALS`;
2. `STARTS_WITH`;
3. `CONTAINS`;
4. padrão normalizado mais longo;
5. menor `priority`;
6. id somente como estabilidade final, sem significado de negócio.

Se aliases válidos de merchants diferentes corresponderem à mesma descrição,
o resultado é conflito. Prioridade e especificidade não transformam uma
ambiguidade cross-merchant em auto-match.

Formulário, endpoint `/match` e preview de importação usam a mesma função
`matchMerchantAlias`.

## Criação, preview e move

Antes de salvar pela tela administrativa, o endpoint de preview mostra:

- equivalente exato já existente;
- merchant atual do equivalente;
- overlaps potenciais;
- resultado de uma descrição de teste;
- vencedor e candidatos;
- conflito cross-merchant.

Equivalente exato não pode ser duplicado. Para corrigir a propriedade, a ação
explícita é **mover/reclassificar** o alias. A operação usa transaction +
advisory lock, consolida equivalentes legados e grava `MerchantAliasEvent`.

Overlaps de padrões diferentes podem ser legítimos. Eles são exibidos para
revisão consciente, mas não são bloqueados automaticamente.

## Aprendizado

No formulário de transação, auto-match é visível e reversível. Após escolha
manual, o alias não é reaplicado durante a mesma edição.

Ao corrigir uma transação importada ou resolver uma importação, o usuário pode
confirmar explicitamente o aprendizado. O fluxo reutiliza a reclassificação
atômica: se o padrão apontava para A e o usuário confirma B, a próxima
importação reconhece B sem manter um conflito equivalente.

## Escala

- tela administrativa de merchants usa busca/paginação server-side;
- aliases administrativos são paginados e filtráveis;
- `/match` consulta apenas candidatos que podem corresponder à descrição;
- preview de importação faz uma consulta em lote para as descrições do arquivo;
- preview administrativo pode analisar a coleção do usuário porque é uma ação
  explícita, não uma chamada a cada tecla.

## Integrações

- OCR apenas sugere dados da transação; não cria merchant. Uma descrição
  aplicada passa pelo matcher canônico do formulário.
- Recorrências/Assinaturas usam `merchantId` como parte da identidade quando
  disponível; rename/desativação não removem o vínculo histórico.
- Importações ignoram merchants inativos e conflitos exigem revisão manual.
