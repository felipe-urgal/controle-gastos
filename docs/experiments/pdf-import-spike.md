# Spike experimental — importação de extrato PDF

Issue: #701

## Resultado

O spike implementa leitura **local e sem dependência nova** de PDFs textuais simples, limitada a streams de conteúdo sem compressão ou com `FlateDecode`. O resultado converge para o contrato canônico de importação (data, valor em centavos, direção, descrição e erros de revisão), mas usa `source: "PDF"` apenas no experimento e **não está conectado ao fluxo de confirmação/persistência**.

## Limites de segurança

- máximo de 2 MB;
- máximo de 20 páginas;
- nenhum JavaScript, link ou anexo é executado;
- nenhum documento é persistido;
- nenhum lançamento vira transação automaticamente;
- linhas ambíguas recebem erro de revisão;
- saldo inicial/final e totais conhecidos são ignorados.

## Fixtures cobertas

Os testes sintéticos cobrem:

- tabela textual simples;
- múltiplas páginas;
- stream `FlateDecode`;
- descrição em mais de uma linha;
- saldo inicial/final misturado;
- valores positivos/negativos e sufixos C/D;
- arquivo inválido;
- arquivo grande;
- documento sem transações;
- limite de páginas;
- linha com mais de um valor monetário.

## Precisão observada no spike

Para layouts sintéticos em que cada lançamento contém data e valor reconhecíveis:

- data: determinística para `dd/mm/aaaa`, `dd/mm/aa` e `aaaa-mm-dd`;
- valor: determinístico para formatos monetários já aceitos pelo importador;
- direção: sinal explícito ou sufixo C/D;
- descrição: preservada e limitada ao contrato atual;
- falsos lançamentos: linhas de saldo/total são descartadas e linhas com múltiplos valores são marcadas para revisão.

## Limitações relevantes

PDF não é formato transacional. Este parser propositalmente não tenta resolver:

- CMaps/fontes customizadas;
- texto desenhado como glyphs/imagem;
- OCR;
- layouts baseados somente em coordenadas;
- filtros PDF além de `FlateDecode`;
- criptografia;
- todos os layouts bancários possíveis.

Esses casos devem falhar de forma explícita em vez de produzir transações silenciosamente erradas.

## Decisão

**Não promover ainda para feature suportada.** O spike demonstra que PDFs textuais simples podem ser convertidos para o contrato canônico sem serviço pago, mas a cobertura real depende de um parser PDF mantido e de fixtures anonimizadas de layouts bancários diversos. A próxima etapa, se houver demanda, deve usar um extrator PDF maduro e manter este parser de linhas/regras de revisão por cima dele. OCR continua fora deste spike.

A integração futura deve entrar apenas no preview/review inbox e reutilizar fingerprint, deduplicação, regras e confirmação idempotente já existentes.
