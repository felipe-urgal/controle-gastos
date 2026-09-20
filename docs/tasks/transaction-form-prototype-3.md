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
  - Recorrência
  - Parcelamento
  - Observação/estado equivalente quando o domínio não possuir esse campo;
- Detalhes avançados em seção recolhível;
- rodapé visual dentro do recibo;
- ações Cancelar / Salvar fora do recibo;
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

O contrato atual não possui campo persistido de observação/notas. A linha visual correspondente deve comunicar essa limitação sem criar um campo falso ou descartar dados silenciosamente.

## Validação

- atualizar regressões E2E afetadas;
- rodar `pnpm check`;
- validar New, Edit e Transferência;
- comparar a tela renderizada com o protótipo antes de retirar o draft.
