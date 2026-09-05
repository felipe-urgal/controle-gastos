# Contas Orbit (#295)

Status: **implementação em revisão** na branch `ux/295-accounts-portfolio-implementation`.

## Direção implementada

A rota de Contas passa a ser apresentada como um **portfólio**, priorizando saldo atual, tipo, status e identidade da conta antes de metadados administrativos. A composição continua usando o shell e os primitives compartilhados da #302.

A listagem existente e a visualização em cards foram preservadas para não remover capacidade do produto. Busca, tipo, moeda, status e alternância de visualização continuam disponíveis pelos filtros atuais.

## Contratos preservados

- saldo continua derivado das transações concretas concluídas;
- nenhuma coluna de saldo autoritativo é criada ou usada;
- BRL, USD e EUR permanecem isolados e não são totalizados entre si;
- criar/editar/desativar contas continua seguindo os contratos existentes;
- nenhuma ação de Transferência é exibida antes da #284 fornecer o contrato funcional correspondente;
- nenhuma projeção/Forecast é criada por esta rota.

## Privacidade de valores

Foi corrigida uma inconsistência encontrada durante a implementação: as visualizações `ViewList` e `ViewCard` formatavam `account.balance` diretamente. Agora ambas consultam `user.showValues` e mascaram o saldo com `••••` quando `showValues=false`, mantendo o mesmo comportamento esperado nas demais superfícies financeiras.

## Semântica Orbit

- roxo permanece identidade de navegação/seleção do shell;
- conta ativa usa verde apenas como estado positivo, não o antigo `--primary`;
- saldo negativo usa a semântica de despesa/vermelho;
- valores longos podem quebrar linha sem reduzir tipografia.

## Fora de escopo

O protótipo mostrava evolução e atividade contextual como parte central do desktop. Esta entrega não inventa dados nem adiciona endpoints apenas para reproduzir mockup. O detalhe existente da conta continua sendo o ponto de acesso às movimentações recentes.

## Validação exigida

A issue #295 só deve ser concluída após `pnpm check` no head final, auto code review e revisão visual manual quando houver navegador disponível. O resultado real dos gates deve ser registrado na issue.
