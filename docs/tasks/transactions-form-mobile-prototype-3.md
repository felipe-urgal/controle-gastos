# New/Edit de Transações mobile — Protótipo 3

## Objetivo

Aplicar o protótipo 3 aprovado somente ao fluxo mobile de Nova transação / Editar transação, mantendo o formulário desktop atual.

O mobile passa a ter um fluxo em três etapas:

1. Valor
2. Detalhes
3. Revisão

## Passo 1 — Valor

- cabeçalho da página existente com voltar, título e descrição;
- indicador de etapas `Valor / Detalhes / Revisão`;
- seletor segmentado `Despesa / Receita / Transferência`;
- valor em destaque;
- bloco `Detalhes da transação`;
- Conta;
- Categoria;
- Data;
- Descrição;
- entrada para `Detalhes avançados`;
- ações `Cancelar / Continuar`.

O visual deve usar cards compactos, ícones em blocos roxos discretos e não repetir o recibo desktop.

## Passo 2 — Detalhes

- Status;
- formato do lançamento:
  - Única;
  - Recorrente;
  - Parcelada;
- quando recorrente:
  - frequência;
  - término por quantidade/data;
  - preview do período;
- quando parcelada:
  - quantidade de parcelas;
  - preview das parcelas;
- ações `Voltar / Continuar`.

Em Edit, o formato continua único e as regras atuais permanecem.

## Passo 3 — Revisão

- tipo;
- valor;
- conta;
- categoria;
- data;
- descrição;
- status;
- formato;
- ações `Voltar / Criar...` ou `Salvar alterações`.

No mobile, esta etapa substitui o modal de revisão. O desktop continua usando o modal existente.

## Transferência

A opção Transferência deve seguir a mesma linguagem visual:
- três etapas;
- origem;
- destino;
- data;
- descrição;
- status;
- revisão final;
- confirmação.

## Shell mobile

Nas rotas de composição:
- `/transacoes/nova`;
- `/transacoes/alterar/[id]`;

a topbar global do app fica oculta para que o cabeçalho da própria página seja o topo, como no protótipo. A bottom navigation permanece.

## Desktop

A partir de `lg`, o recibo atual permanece sem redesign.

## Regras preservadas

- criação;
- edição;
- duplicação;
- transferência;
- status;
- recorrência flexível;
- parcelamento;
- moedas;
- validações;
- ocultação de lógica inexistente;
- navegação final;
- acessibilidade dos selects customizados.
