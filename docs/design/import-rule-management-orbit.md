# Gestão de regras de importação — Orbit (#285)

Status: **implementado no slice de UI de gestão**.  
Última revisão: **2026-09-07**.

## Objetivo

Permitir administrar as regras locais que enriquecem o preview CSV/OFX sem transformar automação em confirmação financeira automática.

A tela vive em `/transacoes/importar/regras` e a importação oferece acesso direto para ela.

## Hierarquia

Desktop:

```text
PageHeader
mensagem de contrato / feedback
┌──────────────────────────────┬─────────────────────────┐
│ lista ordenada de regras     │ formulário / explicação│
│ estado + condição + ações    │ condição + sugestão     │
└──────────────────────────────┴─────────────────────────┘
```

Em viewport estreita, as duas áreas empilham. O formulário não depende de modal e permanece navegável por teclado.

## Lista

Cada regra mostra somente informação necessária para decidir e manter a automação:

- nome;
- ativa/pausada;
- prioridade;
- receita/despesa;
- operador e padrão da descrição;
- conta específica ou qualquer conta;
- faixa de valor em centavos;
- categoria sugerida;
- descrição sugerida, quando existir.

A lista respeita a ordem real do servidor: `priority ASC, id ASC`.

## Ações

- **Editar** abre o payload completo da regra;
- **Pausar/Ativar** usa o mesmo `PUT` completo, sem endpoint paralelo;
- **Remover** exige segundo clique explícito em “Confirmar exclusão” e oferece cancelar;
- **Nova regra** abre um formulário vazio com prioridade sugerida depois da maior prioridade atual.

O estado visual só muda depois de resposta bem-sucedida da API.

## Formulário

Campos:

- nome;
- tipo `INCOME | EXPENSE`;
- prioridade inteira;
- conta opcional;
- categoria obrigatória filtrada pelo tipo selecionado;
- operador `EQUALS | STARTS_WITH | CONTAINS`;
- padrão da descrição;
- mínimo/máximo opcionais em centavos inteiros;
- descrição sugerida opcional;
- ativa/pausada.

Trocar o tipo limpa a categoria atual quando ela for incompatível. Isso é conveniência visual; o backend continua revalidando ownership, atividade e tipo na transação.

## Privacidade de valores

A preferência global `showValues=false` também vale para a gestão de regras:

- a lista troca qualquer faixa configurada por “faixa de valor oculta”;
- o formulário não renderiza inputs de mínimo/máximo enquanto os valores estiverem ocultos;
- ao editar outros campos, os limites já persistidos permanecem no estado do formulário e são reenviados sem serem apagados;
- uma nova faixa só pode ser criada/alterada depois que o usuário habilitar a exibição de valores.

Assim a tela não vaza thresholds financeiros e também não destrói dados silenciosamente por causa da máscara.

## Ordenação

Menor prioridade executa primeiro. Empate continua estável por `id`.

Este slice não usa drag-and-drop nem dispara dois updates para “trocar posições”, porque esse comportamento poderia deixar ordenação parcialmente persistida. A prioridade é editada diretamente. Um reorder visual futuro exige operação batch transacional no servidor.

## Estados e acessibilidade

- controles possuem labels textuais;
- ações usam `button` real e alvos compatíveis com toque;
- carregamento desabilita mutações concorrentes;
- erros usam `role=alert` pelo componente `Alert`;
- sucesso usa `role=status`;
- confirmação de delete não depende de diálogo nativo;
- foco visível segue tokens Orbit;
- nenhuma informação financeira é codificada apenas por cor;
- `showValues=false` não deixa valores monetários visíveis em texto ou inputs.

## Fronteira financeira

A tela gerencia **metadados de automação**. Ela não:

- gera preview;
- altera token assinado;
- cria `Transaction`;
- confirma importação;
- aplica categoria sem revisão do usuário.

A Import Inbox continua permitindo override manual e o servidor continua sendo autoridade final.

## Validação

- mapeamento de formulário possui teste Vitest puro;
- API/ownership permanecem protegidos pelas regressões PostgreSQL do CRUD;
- `pnpm check` cobre lint, typecheck, testes e build;
- o head final deve passar CI e self-review antes de review humano.

Refs: #285, #299, `docs/product/import-rules.md`, `docs/design/import-inbox-orbit.md`.
