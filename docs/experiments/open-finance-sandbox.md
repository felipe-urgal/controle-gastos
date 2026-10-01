# Experimento — Open Finance sandbox

Issue: #702

## Escopo implementado

Foi criado um cliente **read-only** para ambiente mock/sandbox, sem Prisma e sem qualquer mutation financeira. O adapter modela apenas:

- contas;
- transações;
- paginação;
- estado `BOOKED`/`PENDING`;
- consentimento/token de sandbox;
- normalização para DTOs externos neutros;
- conversão opcional para preview compatível com os conceitos do importador atual.

O cliente usa caminhos compatíveis com o domínio de Accounts do Open Finance e recebe a URL do mock por configuração. Nenhuma instituição real é codificada.

## Guardas

- execução bloqueada quando `NODE_ENV=production`;
- URL aceita somente localhost ou host explicitamente contendo `sandbox`/`mock`;
- token permanece em header e não é incluído na URL;
- timeout explícito;
- validação Zod de todas as respostas;
- `pageSize` limitado a 100;
- 401/403 normalizados como consentimento expirado/inválido;
- nenhum payload bruto do provider é persistido;
- nenhum PIX, pagamento ou endpoint de mutation existe.

## Reuso do pipeline atual

O fluxo atual pode reutilizar diretamente os conceitos de:

- data lógica;
- valor em centavos;
- `INCOME`/`EXPENSE`;
- descrição;
- moeda;
- identificador externo;
- revisão antes da confirmação.

`toSandboxImportPreview` marca transações pendentes e IDs duplicados como erros de revisão. Ele deliberadamente **não** chama o confirmador de importação e não grava transações.

## Diferenças para importação por arquivo

A sincronização remota introduz problemas que CSV/OFX não possuem:

- paginação;
- consentimento/token;
- indisponibilidade e rate limit;
- transação `PENDING` que pode virar `BOOKED`;
- atualização do mesmo `externalId` em chamadas diferentes;
- janela incremental de sincronização.

Para deduplicação futura, o identificador externo deve ser a chave primária da sincronização por provider/conta; fingerprint de conteúdo continua útil para arquivos, mas não deve substituir o ID estável do provider.

## Produção

Este experimento não representa os requisitos completos do Open Finance Brasil em produção. Uma integração real exigiria, entre outros pontos, validação regulatória do participante/agregador escolhido, gestão completa de consentimento, certificados/mTLS e requisitos operacionais de segurança/observabilidade.

## Decisão

O experimento mostra que os DTOs centrais podem ser reutilizados sem misturar provider com persistência. Ainda **não** cria `BankDataProvider`: a abstração deve nascer somente quando houver duas implementações concretas com duplicação real, conforme #703.
