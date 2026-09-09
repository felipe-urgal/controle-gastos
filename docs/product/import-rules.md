# Regras locais de importação

Status: **evaluator, contrato, persistência, CRUD autenticado, integração com preview, consumo visual de sugestões, UI de gestão e criação explícita a partir de classificação manual implementados; E2E completo permanece pendente na #285**.  
Última revisão: **2026-09-09**.

Este contrato complementa `transaction-import.md`. O fluxo financeiro continua arquivo → preview stateless → confirmação explícita. Regras são metadados de automação e não alteram essa fronteira.

## Matching determinístico

O evaluator server-side define condições simples:

- conta específica ou qualquer conta;
- `INCOME` ou `EXPENSE`;
- descrição por `EQUALS`, `STARTS_WITH` ou `CONTAINS`;
- `minAmountCents`/`maxAmountCents` opcionais e inclusivos;
- prioridade inteira;
- estado ativo/inativo.

A ação produz `categoryId` sugerido e descrição normalizada opcional.

Menor `priority` vence; empate usa `id` em ordem lexical. Somente a primeira regra ativa e válida produz sugestão. O evaluator não encadeia ações nem muta regra/candidato.

## Normalização textual

Matching usa somente para comparação:

1. Unicode `NFKC`;
2. `trim`;
3. whitespace repetido vira um espaço;
4. comparação em minúsculas.

O texto original não é alterado. `normalizedDescription` é uma **sugestão** para o preview quando configurada; a origem permanece intacta no token assinado. Não existe regex no MVP.

## Contrato de entrada

`app/schemas/import-rule.schema.ts` é a fronteira canônica para criação/edição.

O payload é completo e explícito:

```text
name
isActive
priority
accountId | null
transactionType
EQUALS | STARTS_WITH | CONTAINS
descriptionPattern
minAmountCents | null
maxAmountCents | null
categoryId
normalizedDescription | null
```

Validações:

- `accountId` e `categoryId` precisam ter formato UUID;
- nome/padrão/descrição normalizada não aceitam texto vazio;
- valores são inteiros não negativos em centavos;
- quando ambos existem, `maxAmountCents >= minAmountCents`;
- prioridade precisa ser inteira, sem faixa artificial de produto.

O schema valida formato, não ownership.

## Persistência e CRUD autenticado

`TransactionImportRule` persiste o mesmo shape do evaluator/contrato, escopado por `userId` e ligado opcionalmente a uma conta e obrigatoriamente a uma categoria.

Endpoints:

```text
GET    /api/import-rules
POST   /api/import-rules
GET    /api/import-rules/:id
PUT    /api/import-rules/:id
DELETE /api/import-rules/:id
```

Regras server-side:

- `userId` vem sempre da sessão e nunca do payload;
- get/update/delete buscam a regra por `id + userId`;
- conta específica precisa pertencer ao usuário e estar ativa;
- categoria precisa pertencer ao usuário, estar ativa e ter o mesmo tipo da regra;
- create/update revalidam referências na transação;
- listagem é determinística por `priority ASC, id ASC`;
- DTO não expõe `userId`.

Lifecycle: excluir usuário/categoria remove regras relacionadas; excluir conta remove regras específicas por cascade, nunca as transforma silenciosamente em globais.

## Integração com preview

`POST /api/transactions/import/preview` continua executando primeiro o parser/fingerprint/token existente e só depois enriquece a resposta com regras persistidas.

Para cada linha válida e não duplicada, a resposta pode incluir:

```text
matchedRuleId
matchedRuleName
suggestedCategoryId
suggestedDescription
```

O carregamento considera somente:

- `userId` autenticado;
- regras ativas;
- regras globais ou da conta selecionada;
- categoria ainda ativa e compatível com o tipo.

Itens inválidos ou duplicados não recebem automação.

### Token e override manual

Os campos de provenance/sugestão **não entram no token assinado**. O token continua cobrindo os dados originais do preview: data, valor, tipo, descrição, fingerprint e demais campos importados.

Isso é proposital:

1. criar/editar uma regra depois do preview não reescreve silenciosamente o arquivo que foi revisado;
2. a confirmação continua recebendo a categoria escolhida pelo usuário;
3. override manual tem precedência sobre a sugestão;
4. o backend revalida categoria, tipo, ownership, fingerprint e token antes de criar `Transaction`.

A integração expõe as sugestões no contrato do preview sem transformar automação em mutação financeira automática.

## Consumo visual na Import Inbox

A implementação Orbit da #299/PR #352 consome o provenance real do preview sem mudar o contrato assinado:

- categoria sugerida é pré-selecionada somente quando continua ativa e compatível com o tipo;
- nome da regra aplicada fica visível no detalhe da linha;
- descrição sugerida é exibida apenas como informação, sem substituir a descrição assinada;
- o usuário pode sobrescrever manualmente a categoria antes da confirmação;
- campos de sugestão/provenance são removidos do payload de confirmação;
- duplicatas e itens inválidos continuam sem automação;
- `showValues=false` mascara valores também na revisão.

A UI usa estados `Precisa revisar`, `Pronta`, `Duplicada` e `Ignorada`. A confirmação permanece bloqueada enquanto existir pendência de decisão; o backend continua sendo a autoridade final sobre token, ownership, categoria, tipo e deduplicação.

### Criar regra a partir de uma classificação manual

Quando uma linha válida recebe categoria manualmente — incluindo override de uma sugestão diferente — o detalhe passa a oferecer a ação explícita **Criar regra com esta classificação**.

Essa ação não escreve nada ao escolher a categoria e não chama `POST /api/transactions/import/preview`. O usuário primeiro abre um formulário inline, revisa o contrato e somente então confirma a criação pelo `POST /api/import-rules` já existente.

Defaults conservadores:

- regra ativa;
- escopo inicial limitado à conta do preview;
- `transactionType` igual ao tipo real da linha;
- `categoryId` igual à classificação manual escolhida;
- operador inicial `EQUALS`, evitando um `CONTAINS` amplo por acidente;
- padrão derivado da descrição original, respeitando o limite público de 255 caracteres;
- prioridade depois da maior prioridade atual (`max + 10`, ou `0` sem regras);
- nenhuma faixa de valor é copiada da linha;
- `normalizedDescription` começa vazia.

Antes de salvar, o usuário pode revisar nome, escopo (`esta conta` ou `qualquer conta`), operador, padrão e prioridade. Categoria e tipo permanecem ligados à classificação que originou a ação. Refinamentos como faixa de valor e descrição normalizada continuam disponíveis na tela de gestão.

A descrição usada para preparar o formulário permanece apenas no estado React da revisão; não é colocada em URL ou storage persistente. O endpoint de criação continua derivando `userId` da sessão e revalidando conta, categoria, estado e compatibilidade de tipo.

Criar a regra **não altera o preview atual**, não muda `matchedRuleId`, não modifica o token e não troca a categoria já revisada. A nova regra só participa de previews futuros.

## UI de gestão das regras

A gestão está disponível em `/transacoes/importar/regras` e é acessível diretamente pela tela de importação.

O frontend usa `importRuleService`, tipos públicos próprios e o CRUD autenticado existente. Não acessa Prisma nem replica regras de ownership.

A tela permite:

- listar regras na ordem real de avaliação;
- criar e editar o payload completo;
- pausar/ativar reutilizando o mesmo `PUT` canônico;
- remover com confirmação explícita em duas etapas;
- escolher conta específica ou “Qualquer conta”;
- filtrar categorias locais pelo tipo `INCOME`/`EXPENSE` antes do submit;
- configurar `EQUALS`, `STARTS_WITH` e `CONTAINS`;
- informar faixa opcional em centavos;
- editar `priority` diretamente, deixando explícito que menor número executa primeiro;
- configurar descrição sugerida sem alterar o conteúdo assinado do preview;
- respeitar `showValues=false` também nos thresholds das regras.

Quando `showValues=false`, faixas configuradas aparecem apenas como “faixa de valor oculta”. Os inputs de mínimo/máximo não são renderizados; ao editar outros campos, os valores já persistidos permanecem no estado e são reenviados intactos. Uma nova faixa só pode ser criada ou alterada depois que a exibição de valores for habilitada.

### Ordenação

A UI **não implementa reorder otimista com múltiplos PUTs**. Esse desenho poderia persistir apenas metade de uma troca caso uma requisição falhasse.

Neste slice, reordenar significa editar a prioridade inteira de uma regra. O servidor continua sendo a autoridade da ordenação `priority ASC, id ASC`. Se o produto exigir drag-and-drop/reorder em lote no futuro, deve existir endpoint transacional específico para essa operação antes da experiência visual.

### Referências inativas

A lista pode mostrar “Conta indisponível” ou “Categoria indisponível” se o estado relacionado mudar entre leituras. Ao editar/ativar, o servidor revalida referências e falha fechado. A UI não tenta “consertar” regra silenciosamente nem transforma conta específica em global.

## Centavos e privacidade

Faixas e candidatos usam inteiros. Não existe cálculo financeiro em `float`, conversão monetária ou envio de dados a serviço externo.

`showValues=false` é aplicado tanto no preview quanto na gestão: valores financeiros não ficam expostos em texto ou campos editáveis. A máscara não altera o payload persistido de uma regra existente. O criador inline não copia `amountCents` para a regra, portanto não cria uma nova exposição de valor.

Descrição/valor do extrato não entram em logs de regras. Falhas operacionais registram apenas metadata técnica não sensível já usada pelo fluxo de importação.

## Dependências

Não foi adicionada `json-rules-engine` nem biblioteca de formulário/teste de componente. O domínio cabe em funções puras + Zod já presentes no projeto; o mapeamento de formulário é coberto por Vitest sem adicionar runtime desnecessário.

Uma engine genérica só deve ser reconsiderada se requisitos reais como composição ALL/ANY aumentarem materialmente a complexidade.

## Próximo slice

1. regressão E2E do fluxo completo `preview → sugestão/override → confirmação`.

## Validação

Cobertura protege evaluator, normalização, conta/tipo/faixa/prioridade, schema, bounds em centavos, ownership do CRUD e também:

- provenance determinística no preview;
- ausência de sugestão para duplicata/item inválido;
- preservação dos dados originais usados pelo token e pela confirmação manual;
- consumo visual sem inserir provenance no payload final;
- conversão do formulário de gestão para payload completo;
- rejeição client-side de centavos fracionários/negativos e faixa invertida;
- payload completo no toggle de estado;
- defaults conservadores do criador a partir de classificação manual;
- limites públicos de nome/padrão aplicados antes do submit;
- build/typecheck da tela com a preferência `showValues` integrada.

Cada slice passa PostgreSQL efêmero, `pnpm check` e auto-review do mesmo head final.

Refs #285, #299, #283, PR #318, PR #323, PR #330, PR #348, PR #352, PR #370, `app/lib/transactions/import-rules.ts`, `app/lib/transactions/import/rule-preview.ts`, `app/components/pages/transactions/import`, `app/components/pages/transactions/import/rules`, `docs/design/import-rule-management-orbit.md`, `docs/design/import-inbox-orbit.md` e `docs/product/transaction-import.md`.
