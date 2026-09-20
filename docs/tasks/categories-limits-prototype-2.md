# Categorias / Limites — Protótipo 2

## Objetivo

Redesenhar a tela de **Categorias / Limites** usando o protótipo 2 aprovado como contrato visual.

A nova composição substitui o mapa orbital e a lista extensa atual por uma tela de gestão financeira mais direta: resumo do orçamento no topo, tabela de categorias como área principal e contexto/alertas na coluna lateral.

## Estrutura visual obrigatória

### Cabeçalho
- título: `Categorias / Limites`
- subtítulo: `Gerencie seus orçamentos, acompanhe seus gastos e mantenha o controle das suas finanças.`
- período
- moeda
- botão `Nova categoria`

### Resumo do orçamento
Um único bloco horizontal, dividido em cinco áreas:
1. **Orçamento total**
   - total dos limites configurados
   - quantidade de categorias com limite
2. **Realizado no mês**
   - gasto realizado
   - percentual consumido
3. **Restante**
   - saldo restante
   - percentual disponível
4. **Categorias críticas**
   - quantidade com 80% ou mais do limite
5. **Progresso do mês**
   - percentual consumido
   - barra de progresso
   - realizado / orçamento

### Navegação contextual
Quatro controles compactos:
- Visão geral
- Categorias
- Alertas
- Administração

Eles funcionam como atalhos para as áreas da própria página; não criam rotas ou páginas paralelas.

### Área principal

Grid desktop com:
- esquerda: **Suas categorias**
- direita:
  - **Distribuição dos gastos**
  - **Categorias críticas**
  - **Resumo da categoria selecionada**

### Suas categorias
A tabela deve ser o elemento principal da página.

Cabeçalho:
- título e descrição
- busca
- filtro por tipo
- filtro por status
- toggle `Com limite`
- toggle `Sem limite`

Colunas:
- Categoria
- Tipo
- Status
- Uso do limite
- Realizado
- Limite mensal
- Restante
- Ações

Regras:
- categorias críticas aparecem primeiro por percentual de uso;
- categorias sem limite aparecem depois;
- receitas podem ser exibidas, mas não entram nos cálculos do orçamento de despesas;
- a linha selecionada recebe destaque roxo discreto;
- clicar no nome ou em ações abre o resumo lateral;
- não inventar classificação fixa/variável que não exista no domínio.

### Distribuição dos gastos
- donut com dados reais do período;
- centro mostra o total realizado;
- legenda mostra as cinco maiores categorias e agrega o restante em `Outros`;
- usar as cores reais das categorias;
- não adicionar biblioteca de gráficos apenas para este componente.

### Categorias críticas
- categorias com consumo >= 80%;
- até três itens;
- progresso por categoria;
- realizado / limite;
- `Ver todas` aplica o filtro da tabela.

### Resumo da categoria selecionada
- ícone e cor reais;
- nome;
- limite mensal;
- realizado;
- restante;
- barra de utilização;
- `Editar limite` / `Definir limite`;
- `Ver transações`.

O bloco não deve duplicar uma lista de transações; a ação navega para a listagem filtrada.

### Administração de limites
- seção secundária recolhível no final;
- editar/definir;
- remover limite com confirmação;
- não competir visualmente com a tabela principal.

## Preservar
- período e moeda;
- ocultação de valores;
- criação de categoria;
- edição/definição de limite;
- remoção de limite;
- filtros de categoria;
- navegação para transações;
- responsividade;
- estados de loading/erro/vazio;
- separação de moeda existente.

## Remover da superfície principal
- `Mapa de Gastos Orbit`;
- órbitas e nós de categoria;
- bloco `Explorar categorias` em cards largos;
- duplicação entre mapa, detalhe e administração;
- últimas transações dentro do resumo lateral.

## Fidelidade
O protótipo 2 define:
- hierarquia;
- ordem dos blocos;
- proporções do grid;
- densidade;
- bordas/radius;
- linguagem de cores;
- tabela como protagonista;
- coluna lateral compacta.

Diferenças somente quando a interface proposta sugerir dados que não existem no domínio. Nesses casos, preservar a composição sem inventar informação.
