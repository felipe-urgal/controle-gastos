# Contas Orbit (#295)

Status: **correção estrutural de fidelidade integrada na PR #362; finding visual pós-integração #380 em correção. A matriz visual completa permanece na #342**.

## Fonte visual normativa

O protótipo `ux/295-accounts-portfolio-prototype` em `prototypes/295-accounts-portfolio/index.html` é a especificação visual normativa desta rota.

A implementação deve reproduzir header, resumo, busca/filtros simples, lista densa, saldo/atividade em primeiro plano, master-detail desktop, detalhe mobile e ação de criação, respeitando o domínio real.

## Correção #356 / PR #362

A correção:

- remove o bloco genérico de filtros da superfície principal;
- cria resumo operacional e busca direta;
- usa lista densa com saldo e atividade recente;
- restaura master-detail no desktop;
- usa detalhe contextual em sheet no mobile;
- reutiliza dados reais da conta e transações, sem inventar saldo bloqueado, Pix ou depósito;
- corrige `showValues=false` também no detalhe e nas transações recentes.

## Ajuste pós-QA #380

Screenshots atuais de `/contas` e `/contas/nova` mostraram que a composição estrutural já estava próxima do protótipo, mas alguns controles ainda herdavam o `--primary` verde do baseline anterior.

A correção #380 trata identidade visual sem alterar o domínio:

- seleção de conta, filtro ativo, foco e ações primárias passam a usar os tokens dedicados `--orbit-*`;
- `Nova conta`, `Criar conta` e `Salvar alterações` passam a usar a identidade roxa Orbit;
- `Tipo de conta`, `Moeda` e o seletor de identidade visual usam roxo para estado selecionado;
- o header desktop volta a expor `Filtrar`, levando foco ao grupo de filtros real por tipo;
- verde/vermelho continuam reservados a saldo, atividade e estados semânticos; `Conta ativa` permanece semanticamente verde.

### Fluxo de Nova conta

O HTML do protótipo #295 apresenta um modal de criação marcado explicitamente como `Fluxo demonstrativo do protótipo` e contém apenas `Nome` e `Instituição`.

Esse modal não substitui o contrato funcional real. A aplicação precisa continuar coletando os campos exigidos/suportados pelo domínio atual — nome, tipo, moeda, identidade visual e descrição; na edição, também o status. Portanto, a correção preserva o formulário real e aplica a linguagem visual Orbit aos seus controles em vez de remover campos para copiar uma demonstração incompleta.

## Diferenças inevitáveis documentadas

### Bancos x Carteiras

O protótipo separa `Bancos / Investimentos / Carteiras`. O domínio atual possui apenas os tipos `CREDIT_DEBIT` e `INVESTMENT`.

Por isso a implementação usa `Bancos e carteiras` para `CREDIT_DEBIT` e `Investimentos` para `INVESTMENT`. Separar bancos de carteiras por nome, cor ou ícone seria heurística sem contrato e foi deliberadamente evitado.

### Transferir / Pix / Depositar

O backend de Transferências já possui fundação e endpoint de criação, mas `docs/product/account-transfers.md` registra que a feature ainda não está completa e que a UI não deve ser habilitada antes dos guardrails restantes.

Assim, a PR #362 não exibe ação de Transferência falsa ou incompleta. Ações reais disponíveis na composição são editar, ver transações, lançar e abrir o detalhe completo.

Pix e Depositar continuam fora por ausência de contrato próprio.

## Contratos preservados

- saldo continua derivado de transações concretas `COMPLETED` elegíveis;
- nenhuma coluna de saldo autoritativo é criada;
- BRL, USD e EUR permanecem isolados e não são totalizados entre si;
- criar/editar/desativar contas segue os contratos existentes;
- nenhuma UI de Transferência é habilitada antes dos guardrails da #284;
- `showValues=false` mascara saldo e valores do detalhe/contexto;
- selecionar ou abrir detalhe não executa write.

## Validação

O head final da PR #362 passou `pnpm check` no CI. O warning de seleção derivada encontrado no review foi removido por construção, sem `setState` síncrono de sincronização.

A #380 deve passar novamente o gate canônico no head final. A validação visual completa continua obrigatória na #342:

- comparação visual lado a lado com o protótipo;
- 320px, mobile comum, 768px e desktop;
- dark/light;
- `showValues=true/false` em navegador;
- teclado/foco, zoom/reflow e touch;
- registro da evidência em `docs/quality/orbit-first-wave-qa.md`.

CI verde não é evidência de paridade visual completa.
