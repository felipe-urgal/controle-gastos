# Lançamento rápido

Contrato do interpretador de frases (`app/lib/transactions/quick-entry.ts`). A interface (busca global, prévia e sugestões) chega nos lotes seguintes; aqui só vale o que precisa continuar verdadeiro.

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
