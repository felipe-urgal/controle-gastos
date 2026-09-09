# Importação — Import Inbox Orbit (#299)

Status: **implementação concluída e integrada pela PR #352; criação explícita de regra a partir da classificação manual adicionada pela #285**.  
Última revisão: **2026-09-09**.

## Objetivo

Substituir a revisão em cards independentes por uma inbox operacional: primeiro resolver o que exige decisão, depois confirmar um lote explícito. A UI continua consumindo os contratos existentes de preview e confirmação; criar uma regra a partir da revisão usa o CRUD próprio de regras e não cria uma nova regra financeira.

## Fluxo

1. selecionar conta e arquivo CSV/OFX;
2. gerar preview somente leitura;
3. revisar a inbox por estado;
4. resolver ou ignorar tudo que estiver em **Precisa revisar**;
5. quando houver classificação manual, opcionalmente criar uma regra explícita para previews futuros;
6. confirmar somente quando a ação final puder dizer quantos itens estão selecionados para criação e quantos serão ignorados;
7. mostrar o resultado real devolvido pela confirmação.

## Estados da inbox

- **Precisa revisar** — item válido sem categoria ou item inválido ainda sem decisão explícita;
- **Pronta** — item válido, selecionado e com categoria;
- **Duplicada** — item marcado como duplicado pelo backend; nunca entra selecionado;
- **Ignorada** — item que o usuário decidiu não importar ou item inválido explicitamente ignorado.

Os estados são apresentados em texto e não dependem apenas de cor.

## Regras de sugestão

O preview enriquecido da #285 pode trazer:

- `matchedRuleId`;
- `matchedRuleName`;
- `suggestedCategoryId`;
- `suggestedDescription`.

A categoria sugerida é pré-selecionada somente quando a categoria ainda existe no conjunto ativo carregado e tem o mesmo tipo da transação.

A descrição sugerida é exibida como informação, mas **não altera o item assinado neste slice**. O token de preview continua protegendo os dados brutos analisados; alterar descrição antes da confirmação invalidaria esse contrato. Uma futura normalização de descrição precisa de contrato próprio no backend/token.

A seleção manual de categoria continua sendo a autoridade enviada na confirmação.

### Criar regra a partir da classificação manual

Quando o usuário escolhe uma categoria sem sugestão, ou troca uma sugestão por outra categoria, o detalhe pode oferecer **Criar regra com esta classificação**.

A ação é progressiva e explícita:

1. escolher a categoria manualmente;
2. abrir o criador inline;
3. revisar nome, escopo, operador, padrão e prioridade;
4. confirmar a criação pelo endpoint de regras;
5. continuar revisando o mesmo preview, sem recarregá-lo nem reclassificá-lo silenciosamente.

Defaults visuais/funcionais:

- `EQUALS` como operador inicial;
- conta do preview como escopo inicial;
- categoria/tipo fixados na classificação que disparou a ação;
- nenhuma faixa monetária copiada;
- prioridade depois das regras existentes;
- descrição normalizada vazia.

O criador fica no próprio painel de detalhe em desktop e dentro do mesmo sheet de detalhe no mobile. Não abre uma segunda camada/modal e não transporta descrição financeira em query string ou storage.

Após sucesso, a mensagem deixa explícito que a regra vale para **próximos previews**. A linha atual mantém provenance, categoria revisada e token exatamente como estavam.

## Confirmação e segurança

A UI não altera `previewToken` e envia ao endpoint de confirmação apenas o shape original do preview mais `selected` e `categoryId`. Campos de provenance/sugestão são deliberadamente removidos do payload final.

O botão final fica bloqueado enquanto existir item em **Precisa revisar**. Antes do clique, a barra sticky informa:

```text
X selecionadas para criar · Y serão ignoradas · Z precisam de decisão
```

“Selecionadas para criar” descreve a intenção da UI, não promete inserts. O backend continua revalidando token, ownership, categoria, tipo, fingerprint e duplicidade no momento do write; somente a resposta da confirmação é tratada como resultado efetivo.

Ao trocar filtro ou busca, a seleção contextual do painel é reiniciada. Ao editar o item atual, o detalhe continua preso àquele item mesmo que sua classificação mude, evitando saltos inesperados durante a revisão.

Criar uma regra é uma mutation separada de metadado de automação. Escolher categoria nunca cria regra por efeito colateral, e nenhuma leitura/preview escreve `TransactionImportRule`.

## Responsividade

- desktop: lista/inbox à esquerda e detalhe sticky à direita;
- mobile: lista principal e detalhe em bottom sheet;
- o bottom sheet é identificado como diálogo, mas não declara modalidade ARIA sem implementar focus trap completo;
- o criador de regra permanece inline dentro do detalhe, evitando dialog aninhado;
- filtros de estado possuem scroll horizontal em telas estreitas;
- busca filtra descrição, data, origem e nome da regra;
- ações possuem alvo mínimo de toque e estados acessíveis;
- `showValues=false` mascara valores monetários também nesta tela; o criador inline não copia o valor da linha para a regra.

## Não objetivos

- editar regras existentes dentro da Inbox — isso permanece em `/transacoes/importar/regras`;
- alterar descrição assinada pelo preview;
- alterar deduplicação;
- aceitar item inválido por decisão de frontend;
- escrever qualquer transação durante preview;
- criar regra silenciosamente ao classificar;
- criar um modelo financeiro paralelo.

Refs #299, #285, `docs/product/transaction-import.md`, `docs/product/import-rules.md` e Orbit spec.
