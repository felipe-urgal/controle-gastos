# Redesign de Transações — Protótipo 2

## Objetivo

Reproduzir a tela do **protótipo 2** como contrato visual da página de Transações.

A implementação não deve reinterpretar a composição. Grid, ordem dos blocos, hierarquia, densidade, textos principais, cores, espaçamentos, proporções e ações devem seguir o protótipo aprovado.

## Estrutura visual obrigatória

### Cabeçalho
- Eyebrow: `ORBIT / CENTRO OPERACIONAL`
- Título: `Transações`
- Subtítulo: `Acompanhe toda a sua movimentação financeira de forma simples e organizada.`
- Ações no canto superior direito:
  - `Importar CSV/OFX`
  - `Nova transação`
- Segunda linha de contexto à direita:
  - mês anterior
  - período atual
  - próximo mês
  - `Filtros`

### Resumo do mês
Quatro cards horizontais, nesta ordem:
1. **Entradas**
   - ícone verde
   - quantidade de transações
   - valor total
   - comparação/estado do mês
2. **Saídas**
   - ícone vermelho
   - quantidade de transações
   - valor total
   - comparação/estado do mês
3. **Saldo do mês**
   - ícone roxo
   - saldo do período
   - indicação positiva/negativa
4. **Agendadas**
   - ícone calendário
   - quantidade
   - valor total
   - indicação de próximos dias

### Área principal
Grid desktop em duas colunas:
- esquerda: timeline de movimentações, ocupando a maior largura;
- direita: coluna de apoio com `Visão do mês` e `Próximos lançamentos`.

### Movimentação do período
- Título: `Movimentação de <mês> de <ano>`
- Controle `Ordenar por` no cabeçalho
- Timeline vertical roxa
- Grupos por data, com rótulos como:
  - `Hoje`
  - `Ontem`
  - `17 set`
- Cada transação deve mostrar:
  - ícone da categoria
  - descrição
  - categoria e conta
  - valor
  - horário/data contextual
  - status
  - menu de contexto
- Entradas em verde, saídas em vermelho e transferências em roxo.
- Botão inferior `Ver mais transações`.

### Visão do mês
- Título `Visão do mês`
- Link de ação no canto direito
- Mini gráfico de barras com entradas e saídas
- Totais de entradas e saídas ao lado
- Bloco inferior de insight financeiro
- O insight deve ser derivado de dados reais; não usar valores ou percentuais fictícios.

### Próximos lançamentos
- Título `Próximos lançamentos`
- Link `Ver calendário`
- Até quatro lançamentos pendentes futuros
- Cada item deve mostrar:
  - bloco de data
  - ícone
  - descrição
  - categoria e conta
  - valor
  - distância temporal
  - badge `Agendada`
- Botão inferior `Ver todos os agendados (<n>)`

## Comportamento preservado
- Importação CSV/OFX
- Criação de nova transação
- Filtro por período
- Filtros avançados
- Detalhe contextual da transação
- Edição, duplicação e navegação para detalhes
- Responsividade mobile
- Ocultação de valores quando configurada pelo usuário
- Sem soma de moedas diferentes em um mesmo total

## O que deve sair da superfície principal
- Abas `Inbox` e `Histórico`
- Resumo por cinco estados repetido
- Board/kanban de cinco colunas
- Duplicação visual entre resumo e lanes vazias

Os filtros e estados continuam existindo funcionalmente, mas passam a ser representados dentro da timeline, próximos lançamentos e filtros.

## Fidelidade
- Protótipo 2 é a referência visual final.
- Não criar novos cards ou alterar a ordem dos blocos.
- Não trocar textos principais sem necessidade de dados reais.
- Ajustar alturas, larguras, radius, gaps, paddings, tipografia e tons até a tela renderizada ficar visualmente equivalente ao protótipo.
- Divergências só são aceitáveis quando o dado real do sistema não permite reproduzir um conteúdo específico; nesses casos a composição visual deve permanecer igual.
