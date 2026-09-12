# Análise de bundle com Turbopack

Este documento define o fluxo versionado para inspecionar a composição do bundle do `controle-gastos`.

## Comando canônico

```bash
pnpm analyze
```

O comando:

1. regenera o Prisma Client;
2. remove qualquer saída anterior de `.next/diagnostics/analyze`;
3. executa `next experimental-analyze --output` usando o Turbopack do Next.js atual;
4. falha se o analyzer retornar erro;
5. falha se `.next/diagnostics/analyze` não for criado ou ficar vazio.

A limpeza prévia é obrigatória para impedir falso positivo com relatório antigo deixado por uma execução anterior.

## Saída

A análise estática é gravada em:

```text
.next/diagnostics/analyze
```

Essa pasta pode ser publicada como artifact de CI ou copiada para fora de `.next` quando for necessário preservar uma fotografia para comparação.

Exemplo:

```bash
cp -r .next/diagnostics/analyze ./analyze-before-refactor
```

Depois de uma mudança relevante, execute `pnpm analyze` novamente e compare o novo relatório por rota, ambiente (`client`/`server`), tipo de asset e cadeia de imports.

## Exploração interativa

Quando for útil navegar pelo relatório localmente em vez de gerar somente a saída estática:

```bash
pnpm exec next experimental-analyze
```

Esse modo inicia a interface interativa do analyzer do Next.js.

## Relação com o build de produção

`pnpm analyze` é diagnóstico. Ele **não substitui** o build canônico:

```bash
pnpm build
```

O build de produção continua usando o Turbopack padrão do Next.js. Não troque o build para Webpack apenas para produzir relatório de bundle.

## Histórico

O baseline pós-Orbit da #481 identificou que o fluxo anterior (`ANALYZE=true pnpm build` com `@next/bundle-analyzer`) retornava sucesso mesmo sem gerar relatório porque o plugin Webpack não analisava o build Turbopack.

A #482 migra o comando versionado para o analyzer nativo do Next.js e adiciona validação explícita da saída. O snapshot histórico em `post-orbit-performance-baseline.md` permanece inalterado como evidência daquele estado.

## Quando executar

Use a análise quando houver risco ou investigação concreta envolvendo:

- crescimento de bundle/chunks;
- dependência grande;
- client boundary excessiva;
- lazy loading;
- regressão observada no frontend budget ou Lighthouse.

O diagnóstico não precisa virar custo fixo de todo PR; `pnpm check` continua sendo o gate canônico de código.
