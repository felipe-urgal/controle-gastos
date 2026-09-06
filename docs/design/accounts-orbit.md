# Contas Orbit (#295)

Status: **integrado em `main`; fidelidade ao Portfólio aprovado em correção pela #356 após finding da QA #342**.

> A auditoria estática da #342 detectou que a implementação integrada preservou componentes administrativos que a direção aprovada pretendia substituir. A validação visual final permanece pendente até a correção #356 e a matriz manual da #342.

## Fonte visual normativa

O protótipo `ux/295-accounts-portfolio-prototype` em `prototypes/295-accounts-portfolio/index.html` é a **especificação visual normativa** desta rota.

A implementação final deve reproduzir o que foi desenhado: header, resumo, busca/filtros simples, lista densa, agrupamentos, saldo/atividade em primeiro plano, master-detail desktop, detalhe mobile e ação de criação.

Não basta ficar “próximo”, “equivalente” ou preservar apenas a intenção. `DynamicFilters`, `IndexPage`, `AccountCard` ou qualquer abstração existente não possuem precedência sobre o protótipo. Componentes podem ser substituídos/refatorados e bibliotecas podem ser atualizadas/adicionadas quando necessário para paridade com qualidade de produção.

Qualquer diferença inevitável deve ser documentada na #356 antes do merge, com motivo e impacto visual.

## Composição aprovada

A rota de Contas é um **portfólio**, com a composição do protótipo aprovado:

1. header e ação principal;
2. resumo financeiro/operacional suportado pelos dados reais;
3. busca e filtro simples por tipo;
4. lista densa e escaneável;
5. conta selecionada com detalhe contextual no mesmo workspace desktop;
6. detalhe em sheet/full-screen e ação de criação própria no mobile.

Saldo e atividade recente possuem precedência visual sobre metadados administrativos.

## Contratos preservados

- saldo continua derivado das transações concretas concluídas;
- nenhuma coluna de saldo autoritativo é criada ou usada;
- BRL, USD e EUR permanecem isolados e não são totalizados entre si;
- criar/editar/desativar contas continua seguindo os contratos existentes;
- nenhuma ação de Transferência é exibida antes da #284 fornecer contrato funcional correspondente;
- nenhuma projeção/Forecast é criada por esta rota;
- `showValues=false` mascara saldo e valores do detalhe/contexto.

## Dados demonstrativos ausentes

Se alguma métrica visual do protótipo depender de dado que o produto não fornece, não inventar endpoint, agregado ou regra apenas para preencher o mockup. A diferença deve ser registrada na #356 e a composição deve ser preservada com dado real, estado vazio ou ausência explícita quando aplicável.

A ausência de dado não autoriza retornar ao layout administrativo anterior.

## Semântica Orbit

- roxo permanece identidade de navegação/seleção do shell;
- conta ativa usa verde apenas como estado positivo;
- saldo negativo usa semântica de despesa/vermelho;
- valores longos podem quebrar linha sem reduzir tipografia;
- desktop e mobile devem reproduzir suas composições aprovadas, sem converter o mobile em split-view comprimido.

## Validação exigida

A issue #295 só deve ser considerada plenamente validada após:

- comparação visual lado a lado com o protótipo aprovado;
- confirmação de paridade de resumo, filtros, lista, seleção, detalhe e comportamento mobile;
- documentação de qualquer diferença inevitável;
- `pnpm check` no head final;
- auto code review completo;
- resolução do finding #356;
- revisão visual manual em 320px/mobile/desktop;
- consolidação da evidência em `docs/quality/orbit-first-wave-qa.md`.
