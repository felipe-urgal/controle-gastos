# New/Edit de Transações — Protótipo 3

## Contrato visual

O protótipo 3 aprovado é a referência visual da tela de criação e edição de transações.

A implementação deve preservar a lógica existente e reproduzir a composição do protótipo sem voltar ao padrão antigo de formulário + resumo lateral.

## Estrutura obrigatória

- cabeçalho da página com voltar, título e descrição;
- recibo financeiro centralizado como elemento principal;
- seletor segmentado no topo do recibo:
  - Despesa
  - Receita
  - Transferência
- valor em grande destaque no centro;
- controles compactos à direita do valor para status, forma e tipo do lançamento;
- dados principais em linhas de extrato:
  - Conta
  - Categoria
  - Data
  - Descrição
- status e recorrência/forma do lançamento em indicadores compactos ao lado do valor;
- recorrência e parcelamento configurados dentro de **Detalhes avançados**, sem criar linhas extras no corpo do recibo;
- Detalhes avançados em seção recolhível;
- rodapé único do recibo com **Cancelar** e **Revisar e criar** / **Salvar alterações**;
- mesma linguagem visual em New e Edit;
- transferência usando a mesma composição do recibo.

## Regras funcionais preservadas

- criar receita/despesa;
- editar transação normal;
- duplicar transação;
- criar transferência;
- status concluída/pendente;
- recorrência flexível;
- parcelamento;
- revisão antes da persistência;
- conta, categoria, data e descrição obrigatórias;
- formatação monetária por conta;
- responsividade mobile;
- acessibilidade e foco dos modais.

## Limitações de domínio

O contrato atual não possui campo persistido de observação/notas. O formulário não deve criar uma linha ou campo fictício apenas para imitar conteúdo que não pode ser salvo.

## Validação

- atualizar regressões E2E afetadas;
- rodar `pnpm check`;
- validar New, Edit e Transferência;
- comparar a tela renderizada com o protótipo antes de retirar o draft.
