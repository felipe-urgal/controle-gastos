# Show de Transação mobile — Protótipo 2

## Objetivo

Aplicar o **Protótipo 2 — Detalhe estilo carteira** somente ao Show mobile de Transações.

O desktop atual deve permanecer visualmente intacto.

## Estrutura mobile

### Cabeçalho
- voltar;
- título `Detalhes da transação` ou `Detalhes da transferência`;
- atalho de edição quando a transação permite mutação;
- sem a topbar global do app nessa rota mobile;
- bottom navigation permanece.

### Hero
- ícone real da categoria ou ícone de transferência;
- descrição da transação;
- conta;
- status;
- valor em destaque;
- sem inventar dados financeiros.

### Sobre
- tipo;
- categoria, quando aplicável;
- contraparte, em transferência;
- data;
- horário de registro.

### Conta e contexto
O protótipo visual propõe `Conta e origem`, mas o domínio atual não possui um campo persistido de origem do lançamento.

Para não inventar informação:
- conta;
- moeda;
- origem real quando puder ser derivada de uma transferência;
- `Não registrada` para a origem de transações normais, porque o modelo atual não persiste esse campo.

### Mais informações
- criada em;
- Observações;
- Etiquetas.

Como Observações e Etiquetas não existem atualmente no modelo de Transação, o mobile mantém essas linhas do protótipo com estados explícitos `Não registradas` / `Não disponíveis`, sem fabricar conteúdo.

Recorrência e parcelamento continuam em um bloco próprio quando existirem.

### Estado do lançamento
Card informativo derivado somente do status persistido:
- concluído;
- pendente;
- cancelado.

### Próximas ações
Para transações normais:
- Editar;
- Duplicar;
- Excluir transação.

Transferências permanecem somente leitura no Show, preservando a regra atual.

## Séries
Quando houver recorrência ou parcelamento:
- exibir contexto da série;
- período;
- parcela/ocorrência;
- informar que a edição afeta somente a ocorrência/parcela atual.

## Desktop
- ShowPage atual;
- painel principal;
- contexto lateral;
- ações atuais;
- comportamento atual.

Nenhum redesign desktop neste trabalho.

## Acessibilidade e responsividade
- sem overflow horizontal em 320px;
- targets de ação compatíveis com toque;
- headings e regiões identificáveis;
- confirmação existente para exclusão preservada.
