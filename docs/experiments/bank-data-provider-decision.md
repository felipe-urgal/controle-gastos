# Decisão experimental — Bank Data Provider

Issue: #703

## Decisão

**Não introduzir `BankDataProvider` neste momento.**

A pré-condição de existirem dois fluxos externos foi atingida após os experimentos de importação por arquivo/PDF e Open Finance sandbox, mas a segunda condição da issue não foi: **não existe duplicação comportamental suficiente para justificar uma interface comum**.

Criar a abstração agora aumentaria acoplamento e obrigaria um dos fluxos a implementar capacidades que ele não possui.

## Fluxos avaliados

### Importação por arquivo

O pipeline de arquivos recebe conteúdo fornecido pelo usuário e produz `ParsedImportItem[]`.

Características reais:

- não lista contas externas;
- não possui consentimento ou token;
- não possui paginação remota;
- não possui estado remoto `PENDING`/`BOOKED`;
- não depende de rede;
- erro principal é de parsing/formato;
- identidade opcional vem de campos do arquivo, como `FITID`;
- a moeda pode vir do arquivo ou da conta local;
- o resultado segue diretamente para preview, fingerprint, deduplicação e confirmação.

O parser é uma transformação finita de input local em itens de importação. Ele não representa um provedor bancário remoto.

### Open Finance sandbox

O adapter sandbox representa aquisição remota de dados e produz `ExternalAccount[]` e páginas de `ExternalTransaction`.

Características reais:

- lista contas externas;
- usa token e consentimento;
- possui paginação;
- possui timeout e erros de rede;
- diferencia `PENDING` e `BOOKED`;
- usa `externalId` estável do provider;
- precisa normalizar payload externo;
- não persiste transações;
- é bloqueado em produção.

## Comparação do contrato candidato

O contrato sugerido na issue era:

```ts
interface BankDataProvider {
  listAccounts(context): Promise<ExternalAccount[]>;
  listTransactions(context, input): Promise<ExternalTransactionPage>;
}
```

Aplicá-lo ao fluxo de arquivos exigiria pelo menos uma destas soluções artificiais:

1. inventar `listAccounts()` para um arquivo que não possui contas remotas;
2. criar uma conta externa sintética apenas para satisfazer a interface;
3. simular paginação em um conteúdo já carregado integralmente;
4. transformar erros de parsing em erros de provider remoto;
5. transportar `PENDING/BOOKED` para formatos que não possuem esse conceito.

Nenhuma dessas opções remove duplicação real. Elas apenas deslocam diferenças legítimas para condicionais e adapters artificiais.

## Duplicação observada

Existe sobreposição nos **DTOs de transação normalizada**, como:

- data lógica;
- valor em centavos;
- direção `INCOME`/`EXPENSE`;
- descrição;
- moeda;
- identificador externo opcional.

Essa sobreposição já é tratada pelo pipeline de importação e não exige um provider genérico.

Não foi encontrada duplicação significativa em:

- descoberta de contas;
- paginação;
- consentimento;
- ciclo de vida remoto;
- transporte;
- retry/timeout;
- erros externos.

Esses comportamentos existem apenas no Open Finance sandbox.

## Regra para reconsiderar

Reabrir a decisão somente quando houver **dois providers remotos concretos** com comportamento repetido, por exemplo:

- Open Finance sandbox;
- segundo adapter remoto aprovado no futuro.

Nesse cenário, avaliar extração apenas do que estiver duplicado de fato, provavelmente:

- `ExternalAccount`;
- `ExternalTransaction`;
- página de transações;
- erro remoto normalizado;
- operações `listAccounts` e `listTransactions`.

Ainda assim, manter fora da interface:

- persistência;
- Prisma;
- categorização;
- merchant matching;
- deduplicação canônica;
- criação de transações;
- DI container/factory genérica.

## Resultado

A issue é encerrada como **não necessária no estado atual**.

A arquitetura permanece menor:

```text
arquivo -> parser -> ParsedImportItem -> pipeline de importação

sandbox -> OpenFinanceSandboxClient -> ExternalTransaction -> preview
```

Isso preserva as diferenças reais dos dois fluxos sem criar uma abstração prematura.
