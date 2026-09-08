# Transações — Inbox Financeira Orbit (#294)

Status: **correção de fidelidade pós-QA em andamento na #376; a validação visual/acessível permanece coordenada pela #342**.

## Fonte visual normativa

O protótipo `ux/294-transactions-inbox-prototype` em `docs/prototypes/transactions-inbox-financeira.html` é a especificação visual normativa desta rota e do refinamento de shell.

A implementação deve reproduzir topo operacional, segmentos, faixa de resumo, board/lista, densidade, sidebar, detalhe contextual desktop, filtros/detalhe em sheet e FAB mobile, respeitando o contrato público de transações.

## Correção #355 / PR #361

A correção:

- restaura o topo operacional e a ordem `resumo → segmentos/filtros → workspace`;
- mantém Inbox como superfície principal e Histórico como consulta secundária;
- usa lanes densas no desktop e progressive disclosure no mobile;
- abre detalhe contextual no desktop e bottom sheet no mobile sem perder a lista;
- preserva ações rápidas e criação/importação existentes;
- aplica o refinamento compartilhado da sidebar Orbit;
- remove efeitos de sincronização desnecessários na seleção do Histórico e código morto apontado pelo lint.

## Finding visual pós-integração #376

A validação manual da #342 em 08/09/2026 mostrou que o gate técnico anterior não produziu paridade visual completa. A evidência real de desktop/mobile revelou:

- Inbox iniciando com `status=COMPLETED`, o que esvaziava os grupos operacionais por padrão;
- cards legados altos dentro das lanes, com ações permanentes, fazendo o board crescer por vários viewports;
- paginação antes do workspace e com peso visual maior que no protótipo;
- composição de topo/resumo ainda diferente da referência normativa;
- mobile com disclosure mais aberto e longo que o desenho aprovado;
- sheet de filtros aninhando `DynamicFilters`, criando um segundo painel recolhível dentro do dialog;
- conflito de camada entre o sheet e a bottom navigation, deixando os campos de filtro sem área útil suficiente.

A #376 corrige esses pontos sem redefinir o design: remove o status default da Inbox, restaura a composição operacional, limita a densidade das lanes com progressive disclosure, mantém Histórico compacto e implementa os campos diretamente no sheet de filtros, com scroll interno, safe area e camada acima da navegação inferior.

## Grupos da Inbox

- **Precisa atenção** — `PENDING` com data anterior ao dia atual;
- **Pendentes de hoje** — `PENDING` com data atual;
- **Agendadas** — `PENDING` com data futura;
- **Concluídas recentes** — `COMPLETED`;
- **Canceladas** — `CANCELLED`.

A classificação é somente apresentação e não executa writes.

## Diferença inevitável: “Importadas recentemente”

O banco persiste `importSource`, `importFingerprint` e `importExternalId`, mas o mapper público `toTransactionDTO` não expõe esses campos atualmente.

Por isso a implementação não cria a lane `Importadas recentemente` por heurística de data, descrição ou origem presumida. A lane só deve ser habilitada quando o contrato público expuser origem explícita e confiável.

Isso é uma diferença funcional documentada e não autoriza alterar a composição restante do protótipo.

## Contratos preservados

- `COMPLETED`, `PENDING` e `CANCELLED` mantêm suas semânticas atuais;
- a Inbox é read-only ao navegar/selecionar;
- busca, filtros, paginação, criação, importação, duplicação, detalhe e ações rápidas existentes continuam acessíveis;
- categoria continua sendo a fonte de verdade de receita/despesa;
- moedas não são convertidas nem agregadas silenciosamente;
- `showValues=false` continua mascarando valores nas superfícies que exibem montantes;
- nenhuma UI incompleta de Transferência é antecipada.

## Validação

O head final da PR #361 passou `pnpm check` no CI, mas a QA visual posterior encontrou os desvios registrados na #376. Portanto, CI verde continua não sendo evidência de paridade visual.

Após a #376, permanece obrigatório na #342:

- comparação visual lado a lado com o protótipo;
- 320px, mobile comum, 768px e desktop;
- dark/light;
- `showValues=true/false` em navegador;
- teclado/foco, zoom/reflow e touch;
- registro da evidência em `docs/quality/orbit-first-wave-qa.md`.

CI verde não é evidência de paridade visual completa.
