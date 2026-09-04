# Contrato de camadas da aplicação

Status: contrato alvo para a evolução incremental descrita na issue #291.

Este documento define onde cada responsabilidade deve viver no diretório `app/` e qual direção de dependência deve ser preservada. Ele não exige uma migração em massa: código existente pode ser movido por domínio, em PRs pequenos, desde que código novo não aumente o acoplamento entre camadas.

## Direção de dependências

Fluxo principal:

```text
pages/components -> hooks -> services (cliente) -> api -> lib (aplicação/domínio) -> Prisma
                         \________________ schemas/types ________________/
```

Regras gerais:

- dependências devem apontar para a direita no fluxo acima;
- componentes e hooks nunca acessam Prisma ou módulos `server-only`;
- rotas HTTP não devem concentrar regras de negócio;
- regras de negócio não devem depender de `NextRequest` ou `NextResponse`;
- schemas e tipos representam contratos, não executam I/O;
- exceções precisam ser explícitas e justificadas no PR que as introduzir.

## Responsabilidades por diretório

### `app/(pages)`

Responsável por roteamento e composição das telas.

Pode:

- montar componentes de feature;
- conectar parâmetros da rota ao fluxo da tela;
- definir metadata e composição específica de página.

Não deve:

- acessar Prisma;
- implementar regras de negócio;
- duplicar chamadas HTTP já encapsuladas em `app/services`.

### `app/components`

Responsável pela interface.

- `app/components/ui`: primitives e componentes reutilizáveis de apresentação;
- demais componentes: composição visual e comportamento local de uma feature.

Pode receber dados e callbacks e usar hooks apropriados. Não deve conhecer persistência, Prisma ou detalhes internos da API.

### `app/hooks`

Responsável por estado e orquestração do lado cliente.

Pode:

- coordenar estado de tela;
- chamar serviços de cliente;
- adaptar respostas para consumo dos componentes.

Não deve acessar banco de dados nem importar módulos exclusivos do servidor.

### `app/services`

Responsável pelos adapters HTTP usados pelo cliente.

Inclui o `api-client`, o serviço base e serviços por feature. Esta camada conhece endpoints e contratos de transporte, mas não conhece Prisma.

Código novo deve preferir um serviço por domínio/feature em vez de espalhar `fetch` pelos componentes.

### `app/api`

Responsável pela borda HTTP da aplicação.

Uma rota deve se limitar a:

1. receber a requisição e parâmetros;
2. autenticar/autorizar quando necessário;
3. validar o contrato de entrada;
4. chamar a lógica de aplicação/domínio;
5. serializar a resposta.

Rotas não devem duplicar regras de negócio, invariantes ou consultas complexas que possam ser compartilhadas.

### `app/lib`

Responsável por código executado no servidor, lógica de aplicação/domínio e infraestrutura compartilhada.

Código de domínio deve:

- expressar invariantes perto da feature correspondente;
- receber valores já validados sempre que possível;
- evitar dependência direta de objetos HTTP do Next.js;
- deixar detalhes de persistência isolados e explícitos.

Módulos transversais como autenticação, Prisma, erros HTTP e helpers compartilhados continuam em `app/lib` quando não pertencem a uma única feature.

#### `app/lib/crud`

É uma camada existente de configuração/orquestração do CRUD genérico. Durante a migração, ela pode continuar servindo de adapter, mas regras específicas de domínio devem sair gradualmente daqui para módulos de domínio claros.

Não adicionar novas regras de negócio genéricas apenas para evitar criar um módulo de feature.

#### `app/lib/services`

É uma camada existente de compatibilidade/serviços do servidor. Não deve crescer como uma segunda definição ambígua de `app/services`.

Ao tocar nesses módulos, preferir mover lógica de domínio para um namespace explícito em `app/lib/<dominio>/` ou para um serviço de servidor claramente nomeado, mantendo `app/services` reservado ao cliente HTTP.

### `app/schemas`

Responsável pelos contratos de validação e parsing.

Pode conter schemas Zod e tipos derivados deles. Não deve acessar banco, sessão, serviços ou realizar efeitos colaterais.

### `app/types`

Responsável por tipos compartilhados de transporte e visualização que não pertencem a um schema específico.

Quando um tipo puder ser derivado de um schema, preferir a derivação para reduzir drift. Não importar módulos exclusivos do servidor.

## Regras para código novo

Antes de criar um módulo, responder:

1. É apresentação? `components`.
2. É estado/orquestração do cliente? `hooks`.
3. É acesso HTTP pelo cliente? `services`.
4. É borda HTTP? `api`.
5. É regra de domínio/aplicação ou infraestrutura do servidor? `lib`.
6. É validação? `schemas`.
7. É apenas contrato de tipos compartilhado? `types`.

Se uma mudança exigir lógica em mais de uma camada, a dependência deve seguir a direção definida neste documento.

## Estratégia de migração da issue #291

A migração deve ser incremental e orientada por domínio:

1. escolher um domínio com fronteiras claras;
2. registrar uma issue filha com o recorte;
3. mover regras de negócio para o módulo alvo sem alterar comportamento público;
4. manter adapters temporários quando necessário para evitar migrações em cascata;
5. atualizar imports e testes apenas daquele domínio;
6. remover o adapter legado quando não houver mais consumidores;
7. executar lint, testes e build antes do merge.

Evitar PRs que tentem reorganizar todo o diretório `app/` de uma vez.

## Definition of Done de um módulo migrado

Um domínio é considerado migrado quando:

- sua responsabilidade principal tem um único lugar claro;
- UI e hooks não dependem de Prisma/server-only;
- a rota HTTP apenas adapta transporte, autenticação e validação;
- regras de negócio são testáveis sem construir uma `NextResponse`;
- schemas/tipos não executam I/O;
- não foi criada uma segunda implementação equivalente em outra camada;
- documentação e testes do domínio refletem a estrutura final;
- lint, testes e build permanecem verdes.

## Anti-padrões a evitar

- `fetch` duplicado em vários componentes para o mesmo recurso;
- consultas Prisma em componentes, hooks ou `app/services`;
- regras de negócio escondidas dentro de route handlers;
- schemas que consultam banco ou sessão;
- tipos duplicados manualmente quando já existe schema fonte;
- criar novos módulos em `app/lib/services` apenas por conveniência, perpetuando a ambiguidade com `app/services`;
- refactor estrutural amplo sem uma issue e sem uma unidade de comportamento claramente revisável.
