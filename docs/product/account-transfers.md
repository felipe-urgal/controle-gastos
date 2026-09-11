# Transferências entre contas

Issue: #284  
Última revisão: **2026-09-11**.

## Estado atual

O domínio possui `Transfer` e duas pernas `Transaction` ligadas por `transferId`/`transferRole`. O CRUD genérico bloqueia mutação isolada, os agregados operacionais não classificam `TRANSFER` como receita/despesa e a exclusão de conta falha fechado quando existem transações vinculadas.

A criação dedicada é autenticada, atômica e idempotente:

```text
POST /api/transfers
  -> autenticação
  -> Idempotency-Key obrigatório
  -> validação do payload
  -> ownership + isActive das duas contas
  -> mesma moeda
  -> prisma.$transaction
       -> Transfer + hashes de idempotência
       -> SOURCE / EXPENSE
       -> DESTINATION / INCOME
```

O lifecycle também é dedicado à operação lógica inteira:

```text
PATCH /api/transfers/:id
DELETE /api/transfers/:id
  -> autenticação
  -> carregar Transfer ativo por id + userId
  -> exigir exatamente SOURCE + DESTINATION consistentes
  -> bloquear leg RECONCILED
  -> aplicar a operação em uma única prisma.$transaction
```

A leitura dedicada também está disponível:

```text
GET /api/transfers
GET /api/transfers/:id
  -> autenticação
  -> filtrar Transfer ativo por userId + deletedAt=null
  -> exigir exatamente SOURCE + DESTINATION consistentes
  -> devolver cada perna com account + counterpartAccount
```

Nenhuma leitura cria ou repara perna ausente/inconsistente.

A criação em `/transacoes/nova` oferece `Transferência` como modo explícito, separado do fluxo Receita/Despesa. O cliente usa o endpoint dedicado e envia uma chave idempotente por tentativa lógica; não cria categoria artificial nem replica regras financeiras do servidor.

Os consumidores genéricos de transação também reconhecem `kind=TRANSFER`. Inbox, Histórico, Calendário, detalhe da transação e transações recentes da Conta exibem direção e conta contraparte em vez de tratar a perna como Receita/Despesa com categoria ausente. A leitura genérica carrega a contraparte no mesmo query, sem busca N+1 no cliente. Ações genéricas incompatíveis (`Concluir`, `Editar`, `Duplicar` e exclusão isolada) não são oferecidas para pernas de transferência.

## Contrato de criação

Header obrigatório:

- `Idempotency-Key`: texto não vazio com no máximo 128 caracteres após `trim`.

Campos do body:

- `sourceAccountId`;
- `destinationAccountId`;
- `amountCents` inteiro e positivo;
- `year`, `month`, `day` válidos;
- `description`;
- `status`: `PENDING` ou `COMPLETED`.

Regras:

- origem e destino precisam ser contas próprias e ativas;
- a mesma mensagem é usada quando uma conta não é utilizável, sem revelar ownership de ids externos;
- origem e destino não podem ser a mesma conta;
- as moedas precisam ser iguais;
- as duas pernas possuem exatamente o mesmo valor/data/descrição/status;
- `SOURCE` usa `EXPENSE`, `DESTINATION` usa `INCOME`;
- ambas são `kind=TRANSFER` e `categoryId=null`;
- criação do vínculo e das duas pernas ocorre dentro da mesma transação Prisma.

## Quick Compose

Na criação dedicada de transação, o primeiro nível escolhe entre:

- `Receita / Despesa`, preservando o Quick Compose existente, categorias, recorrência e parcelamento;
- `Transferência`, abrindo um formulário próprio da operação ligada.

O modo de transferência exige:

- conta de origem;
- conta de destino;
- valor;
- data;
- descrição;
- status `COMPLETED` ou `PENDING`.

O destino é filtrado no cliente para contas ativas, diferentes da origem e com a mesma moeda. Isso é somente ajuda de UX: o backend continua revalidando ownership, atividade, contas distintas, moeda, data e valor antes de qualquer write.

A revisão explícita mostra valor, origem, destino e status antes da confirmação. No mobile, as ações ficam acima da bottom navigation/safe area. O dialog preserva foco, `Escape` e restauração do foco anterior seguindo o contrato Orbit.

Duplicação de transação normal não oferece conversão implícita para transferência. O modo é escolhido somente em uma nova operação explícita.

## Idempotência e retry

A chave nunca é persistida em texto puro. O serviço aplica SHA-256 à chave normalizada e persiste somente `idempotency_key_hash`. O body já validado também recebe um hash canônico (`request_hash`) com os campos do contrato de criação em ordem fixa.

A identidade idempotente é `(userId, idempotency_key_hash)`:

- primeira criação válida retorna `201`;
- retry com a mesma chave e o mesmo payload retorna `200` e os mesmos IDs de `Transfer`, `SOURCE` e `DESTINATION`;
- reutilizar a mesma chave com payload diferente retorna `409` e não cria novas linhas;
- a mesma chave pode ser usada por usuários diferentes sem colisão;
- retries concorrentes são serializados pela constraint única do PostgreSQL. A requisição perdedora do `P2002` recarrega a operação vencedora e aplica a mesma comparação de `request_hash`;
- depois de uma remoção lógica, a mesma chave continua reservada no tombstone. Retry atrasado do `POST` retorna `409` e **não recria as pernas financeiras**.

No cliente, a tentativa lógica é identificada pelo fingerprint dos mesmos campos canônicos do body. Enquanto o payload permanecer igual, reenvios reutilizam a mesma UUID de `Idempotency-Key`; ao alterar qualquer campo do contrato, o cliente gera uma nova chave. Assim, uma resposta perdida pode ser reenviada sem duplicar o par, enquanto uma edição real não reutiliza acidentalmente a identidade de uma tentativa anterior.

Transferências criadas antes do slice de idempotência permanecem com os dois hashes nulos. Uma constraint de banco exige que `idempotency_key_hash` e `request_hash` sejam ambos nulos ou ambos preenchidos, evitando estado parcial.

Idempotência não substitui autorização nem validação de domínio: ownership, conta ativa, mesma moeda, data e centavos continuam sendo verificados no fluxo normal antes de qualquer par financeiro ser criado.

## Lifecycle do par

### Atualização e cancelamento

`PATCH /api/transfers/:id` aceita pelo menos um dos campos:

- `amountCents`;
- `year`;
- `month`;
- `day`;
- `description`;
- `status`: `PENDING`, `COMPLETED` ou `CANCELLED`.

As contas não são alteradas neste slice. Trocar origem/destino permanece fora do contrato até existir necessidade real e guardrails equivalentes.

Antes do write, o servidor carrega a operação ativa por `(id, userId, deletedAt=null)` e exige:

- exatamente duas pernas;
- uma `SOURCE/EXPENSE` e uma `DESTINATION/INCOME`;
- ambas `kind=TRANSFER`, `categoryId=null` e ligadas ao mesmo parent/usuário;
- contas diferentes e na mesma moeda;
- valor, data, descrição e status iguais nas duas pernas.

Par ausente, removido ou de outro usuário retorna `404`. Par ativo mas inconsistente retorna `409`; a aplicação não tenta completar, reparar nem excluir silenciosamente a operação quebrada.

A atualização das duas pernas ocorre na mesma `prisma.$transaction`. Alteração de valor, data, descrição ou status invalida qualquer `CLEARED` anterior e volta ambas as pernas para `UNCLEARED`. Uma perna `RECONCILED` bloqueia atualização até que a reconciliação seja desfeita por fluxo explícito.

Cancelar é a mesma operação lógica com `status=CANCELLED`: ambas as pernas deixam de participar do saldo realizado e ficam `UNCLEARED`.

### Remoção

`DELETE /api/transfers/:id` valida ownership, shape e reconciliação do par. Dentro da mesma `prisma.$transaction`, remove **exatamente as duas pernas** e marca o parent com `deletedAt`.

O parent é preservado como tombstone técnico para manter identidade idempotente e auditabilidade mínima; ele não representa uma transferência ativa e não possui mais efeito financeiro. Um segundo `PATCH`/`DELETE` encontra `404`.

Se uma das pernas estiver `RECONCILED`, a remoção é bloqueada. Se o par estiver incompleto/inconsistente, retorna `409` e preserva o que existe para investigação; não há reparo implícito em leitura ou delete.

A migration `20260909193000_add_transfer_deleted_at` adiciona `deleted_at` nullable e índice `(userId, deletedAt)`. Rows existentes continuam ativas com `deleted_at=null`.

## Leitura e conta contraparte

`GET /api/transfers` lista somente operações ativas do usuário autenticado. `GET /api/transfers/:id` usa o mesmo escopo e retorna `404` para id inexistente, tombstonado ou de outro usuário.

Antes de mapear o DTO, a leitura valida o mesmo shape estrutural essencial do lifecycle: exatamente duas pernas, roles/tipos corretos, `kind=TRANSFER`, `categoryId=null`, vínculo e `userId` coerentes, contas distintas, mesma moeda e valor/data/descrição/status sincronizados. Par ativo inconsistente falha `409`; a leitura nunca tenta reparar o banco.

O DTO dedicado expõe:

- dados lógicos da transferência (`id`, valor, moeda, data, descrição e status);
- `source` e `destination` com `transactionId`;
- `reconciliationStatus`/`reconciledAt` independentes por perna;
- a conta da própria perna;
- `counterpartAccount`, permitindo que lista/detalhe apresentem a outra conta sem categoria artificial.

O DTO genérico de transação também expõe `counterpartAccount` somente para `kind=TRANSFER`. A relação é resolvida no servidor a partir das duas pernas do mesmo parent. Para transações normais, o campo permanece `null` e categoria/conta continuam com a apresentação anterior.

Tombstones são filtrados por `deletedAt=null` e não aparecem como operações ativas.

## Consumidores da leitura

A apresentação usa três sinais distintos sem alterar o sinal financeiro persistido da perna:

- `SOURCE/EXPENSE` → **Transferência enviada** + `Para <conta destino>`;
- `DESTINATION/INCOME` → **Transferência recebida** + `De <conta origem>`;
- transação `NORMAL` → categoria + conta, como antes.

A integração cobre:

- Inbox e Histórico de Transações, inclusive detalhe contextual;
- lista/card legados de Transações;
- Calendário compacto, timeline, agenda e drawer de detalhe;
- detalhe standalone da transação;
- transações recentes do detalhe de Conta.

Pernas de transferência usam o tom Orbit para não serem apresentadas visualmente como receita/despesa operacional. O sinal `+/-` continua refletindo `INCOME/EXPENSE` da perna, porque ele representa o efeito no saldo daquela conta. Com `showValues=false`, os valores continuam mascarados e a contraparte permanece visível por não ser dado monetário.

Ações genéricas que só funcionam para `kind=NORMAL` não são exibidas em transferências. Alterações/cancelamento/remoção do par continuam exclusivas do lifecycle dedicado de `/api/transfers/:id`.

No Calendário, transferências continuam aparecendo como movimentações da conta e entram no saldo realizado da respectiva perna. Elas **não** entram em receitas/despesas operacionais nem nos totais diários/mensais que classificam fluxo por natureza. O cálculo diário do cliente replica explicitamente essa exclusão para permanecer coerente com os agregados do servidor.

## QA final da #284

O último gate da feature foi concluído em **2026-09-11**, depois do deploy de produção do merge `ce39fd4` (PR #408) e de uma regressão E2E dedicada executada sobre build de produção com PostgreSQL efêmero.

A execução final do GitHub Actions (`34539219927`) passou integralmente em:

- Chromium;
- Firefox;
- WebKit.

O cenário valida de ponta a ponta:

- criação de transferência pelo Quick Compose em desktop;
- seleção do modo via teclado;
- foco inicial, ciclo de foco, `Escape` e restauração de foco no dialog de revisão;
- persistência das duas pernas e apresentação de `Para <destino>` / `De <origem>` no Histórico;
- ausência de `Sem categoria` nas superfícies de transferência;
- detalhe contextual com direção `Transferência enviada/recebida` e contraparte;
- transferência `PENDING` sem ação genérica `Concluir`;
- viewport mobile de 320x740 sem overflow horizontal na Inbox e no Calendário;
- marcador/seleção do dia e contraparte da transferência no Calendário;
- `showValues=false` com valor monetário mascarado e sem vazamento de `R$ 123,45` no Histórico.

O spec permanente fica em `tests/e2e/transfer-final.spec.mjs`; o workflow temporário usado apenas para fechar o gate não faz parte do runtime final. Screenshots, vídeos e traces da rodada de QA foram publicados como artefatos temporários da execução.

WebKit fornece cobertura da engine do Safari, mas não equivale a teste em iPhone/Safari físico, teclado virtual ou tecnologia assistiva real. A #284 não exige esses dispositivos como gate adicional; quando uma atividade futura exigir evidência física, ela deve continuar sendo registrada separadamente.

Com domínio, lifecycle, leitura, Quick Compose, consumidores, regressões unitárias e E2E multi-engine concluídos, a #284 está pronta para encerramento.
