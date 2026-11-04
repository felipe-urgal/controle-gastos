# Lançamento rápido

Contrato do lançamento rápido: o interpretador de frases (`app/lib/transactions/quick-entry.ts`), as sugestões do servidor e a prévia na busca global. Aqui só vale o que precisa continuar verdadeiro.

## Princípios

- **Função pura, sem IA e sem banco:** `parseQuickEntry(frase, hoje)` só devolve o que entendeu. A data de hoje é injetada (data lógica de Brasília), nunca lida do relógio da máquina.
- **Nada é gravado aqui.** Quem usa mostra uma prévia e exige confirmação; a criação segue o fluxo normal de transações (idempotência e fila offline incluídas).
- **Ambiguidade é erro, nunca palpite:** dois valores sem como escolher, data que não existe e valor fora do limite devolvem `ok: false` com um motivo; o texto nunca é "ajustado" para caber.
- **Valor em centavos inteiros**, sem float, entre 1 e `TRANSACTION_MAX_AMOUNT_CENTS`.

## O que é entendido

| Parte | Formas aceitas |
|---|---|
| Valor | `45,90`, `45.90`, `45`, `1.234,56`, `1.234`, `R$ 45,90`. Com vários números vale o único com `R$`, ou o único com centavos; senão é ambíguo. Não é valor um número colado em letra (`3x`, `5kg`). |
| Data | `hoje` (padrão), `ontem`, `anteontem`, `amanhã`, `dia 5` (mês atual), `15/10` (ano atual), `15/10/2025`, `15/10/25`. Só a primeira data da frase conta; dia ou data inexistente é `INVALID_DATE`. |
| Tipo | Despesa por padrão. Receita com `+` na frente do valor ou uma palavra inteira como `recebi`, `salário`, `freela`, `reembolso`, `rendimentos`, `venda`. |
| Conta | Texto depois de `na conta`, `no cartão`, `na carteira`, `pela conta`, `via conta`. **A conta vai no fim da frase:** tudo depois do marcador é a dica. Achar a conta é trabalho do chamador. |
| Descrição | O que sobra sem valor, data e conta, sem palavras de ligação soltas nas pontas ("almoço de hoje" vira "almoço"); no máximo 100 caracteres; pode ser vazia. O texto é mantido como foi digitado e nunca interpretado como HTML ou comando. |

## Motivos de erro

`EMPTY`, `NO_AMOUNT`, `INVALID_AMOUNT` (zero, formato impossível como `1,234`, acima do teto), `AMBIGUOUS_AMOUNT`, `INVALID_DATE`.

## Na busca global (Ctrl+K)

- Quando a frase é entendida aparece a linha **"Lançar R$ … · descrição"** no topo, com tipo e data. Ela **só vem marcada por padrão** se a frase tem sinais claros de lançamento (`confident`: valor com centavos ou `R$`, data, palavra de receita ou conta) ou se não há nenhum outro resultado; uma busca comum com número ("mercado 45", "iphone 15") continua abrindo o que achou. Mesmo sem estar marcada, a linha fica a uma seta de distância.
- Escolher a linha abre a **prévia**: valor e data como entendidos, tipo (Despesa/Receita), descrição, conta e categoria editáveis. O que não se edita ali (valor, data) se corrige digitando a frase de novo ("Voltar").
- **Nada é gravado sem o clique em "Lançar".** A gravação usa `transactionService.createIdempotent` com chave de idempotência por conteúdo, como o formulário: duplo clique ou retry não criam dois lançamentos. Dados recusados (400/422) viram uma tentativa nova. Sem conexão, a prévia manda usar "Nova transação" (que guarda offline); o lançamento rápido não usa a fila offline.
- **Status:** data de hoje ou passada vira concluída; data futura vira **pendente**, e a prévia avisa.
- **Tipo:** vem do que foi inferido, mas quem manda é a categoria escolhida (como no formulário). Trocar o tipo limpa a categoria e busca outra sugestão.
- Depois de criar, a lista de Transações aberta recarrega (evento `transactions:changed`); outras telas mostram o lançamento na próxima visita.

## Sugestão de conta, categoria e estabelecimento

`GET /api/transactions/quick-entry?description=&type=` (sessão obrigatória, só leitura, dono validado):

1. Último lançamento do usuário com a **mesma descrição** (sem diferenciar caixa) cuja categoria seja do tipo pedido: conta, categoria e estabelecimento dele (`SAME_DESCRIPTION`).
2. Senão, o **estabelecimento reconhecido pelos aliases** (sem conflito) e o último lançamento dele (`MERCHANT`).
3. Senão, só a **última conta usada** (`LAST_ACCOUNT`).

Conta ou categoria **inativa** nunca é sugerida; lançamentos cancelados não contam; categoria de outro tipo não é emprestada. A conta citada na frase ("na conta Itaú") vence a sugestão e só é usada se houver **uma única** conta ativa que case (`matchAccountByHint`); na dúvida a prévia pede a escolha. Com uma só conta ativa, ela vem marcada.

## Atalhos do ícone e favoritos

- **Atalhos do ícone do app** (`public/manifest.json`, pressionar o ícone no Android): Nova despesa (`/transacoes/nova?type=expense`), Nova receita (`?type=income`), Transferência (`?mode=transfer`) e Compromissos; depois Avisos, Transações e Dashboard. O Android mostra só os primeiros quatro, então a ordem importa. Os parâmetros são os que a tela de nova transação já entende; um teste amarra o manifesto a isso.
- **Modelos favoritos** na busca global: até três, como ações rápidas que abrem `/transacoes/nova?template=<id>` já preenchida (o usuário confirma no formulário). O valor só aparece no texto se o usuário não oculta valores.

## Compartilhar para o app (Android, PWA instalado)

O iPhone não oferece "compartilhar para PWA"; nada acontece lá.

1. O sistema envia um `POST multipart` para `/api/share` (`share_target` no manifesto: `title`, `text`, `url` e a imagem no campo `imagem`, só JPG ou PNG, os formatos que o OCR lê).
2. O **service worker** intercepta esse POST (só esse caminho, só da própria origem): o texto vai na URL e a imagem (até **6 MB**, o limite do OCR) fica no cache temporário `share-target-v1`; responde 303 para `/compartilhar`. O cache não tem o prefixo `controle-gastos-` de propósito, para a limpeza de versões do SW não o apagar.
3. **Fallback:** se o SW ainda não estiver ativo, `POST /api/share` no servidor repassa só o texto (corpo até 1 MB) com um redirecionamento relativo fixo; imagem nunca sobe para o servidor.
4. `/compartilhar` (exige login) mostra o texto compartilhado e a **mesma prévia do lançamento rápido**. O texto passa pelo interpretador (horário como `14:32` é ignorado); a imagem passa pelo **OCR de recibo no navegador** e só vira rascunho com valor lido com segurança (o mesmo critério do formulário). A imagem é lida **uma vez** e apagada do cache (também apagada se tiver mais de 10 minutos); nunca é enviada ao servidor. Sem valor seguro, a página manda usar o formulário. Nada é gravado sem a confirmação.
