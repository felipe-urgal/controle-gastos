# Transações mobile — Protótipo 2

## Objetivo

Aplicar o protótipo 2 aprovado somente à listagem mobile de Transações, mantendo o desktop atual sem mudanças visuais.

## Contrato visual mobile

### Topbar
Na rota exata `/transacoes` em telefone:
- marca `Controle de Gastos`;
- ação de busca/filtros;
- ação `Nova transação`;
- controles globais de tema/perfil/logout deixam de competir com a listagem nessa largura;
- em tablet, os controles globais continuam disponíveis.

### Período
- mês anterior;
- período atual centralizado;
- próximo mês;
- seleção detalhada continua no modal já existente.

### Resumo do mês
Um único card compacto:
- `Saldo do mês` em destaque;
- insight derivado do saldo real;
- Entradas;
- Saídas.

Não usar os quatro cards desktop empilhados no telefone.

### Filtros rápidos
Chips:
- Todas;
- Receitas;
- Despesas;
- Pendentes.

Regras:
- Todas = movimentações concluídas;
- Receitas = receitas concluídas;
- Despesas = despesas concluídas;
- Pendentes = lançamentos pendentes;
- filtros avançados continuam acessíveis pela busca da topbar.

### Próximos lançamentos
- seção compacta;
- mostrar o próximo lançamento pendente;
- descrição;
- distância temporal;
- conta;
- valor;
- `Ver todos` muda para a visão de pendentes;
- estado vazio compacto, sem card alto.

### Atividade
Extrato contínuo agrupado por data:
- `Hoje • <data>`;
- `Ontem • <data>`;
- demais datas por extenso;
- linhas sem cards internos;
- ícone da categoria/transferência;
- descrição;
- conta + categoria;
- valor;
- horário ou status pendente.

### Importação
`Importar CSV/OFX` permanece acessível dentro do painel de busca/filtros no telefone.

## Desktop

A partir de `sm`, a composição atual deve continuar igual:
- cabeçalho;
- quatro cards do resumo;
- timeline;
- Visão do mês;
- Próximos lançamentos;
- importação e Nova transação no cabeçalho.

## Funcionalidade preservada
- período;
- filtros avançados;
- importação;
- criação;
- detalhes contextuais;
- ocultação de valores;
- múltiplas moedas;
- estados pendentes;
- bottom navigation;
- responsividade sem overflow horizontal.
