# Contas Orbit (#295)

Status: **correção de fidelidade implementada na PR #362; gate técnico verde no head final. QA visual pós-integração permanece na #342**.

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

Ainda é obrigatório na #342, após integração:

- comparação visual lado a lado com o protótipo;
- 320px, mobile comum, 768px e desktop;
- dark/light;
- `showValues=true/false` em navegador;
- teclado/foco, zoom/reflow e touch;
- registro da evidência em `docs/quality/orbit-first-wave-qa.md`.

CI verde não é evidência de paridade visual completa.