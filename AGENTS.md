# AGENTS.md

## Objetivo

Trabalhe de forma autônoma, incremental e verificável. Prefira a menor solução que resolva completamente o problema sem criar dívida óbvia.

## Fluxo obrigatório

1. Inspecione o estado atual antes de alterar código.
2. Identifique impacto, regressões e casos de borda relevantes.
3. Preserve comportamento fora do escopo.
4. Implemente a solução mais simples e de menor manutenção.
5. Execute validações proporcionais ao risco.
6. Revise o diff final antes de considerar a tarefa concluída.

## Regras de engenharia

- KISS e YAGNI têm prioridade sobre abstrações prematuras.
- SOLID é ferramenta de design, não meta de complexidade.
- Não crie helpers, services, hooks ou camadas genéricas sem necessidade concreta.
- Não esconda erro relevante nem transforme falha em sucesso silencioso.
- Mantenha regras de domínio fora de componentes de apresentação sempre que houver comportamento real a proteger.
- Alterações de API, persistência ou autenticação exigem testes de contrato/regressão.

## Invariantes deste projeto

- Valores monetários permanecem em centavos inteiros.
- Agregados nunca somam moedas diferentes silenciosamente.
- Saldo de conta é derivado de transações.
- Ownership deve ser validado no servidor.
- Migrations aplicadas são imutáveis; use forward-fix.

## Validação

Gate principal:

    pnpm check

Use E2E quando alterar um fluxo crítico de usuário:

    pnpm test:e2e

## Documentação

- docs/DEVELOPMENT.md
- docs/TASK_TEMPLATE.md
- docs/CODE_REVIEW.md

Não crie documentação histórica por padrão. Git, issues e PRs já preservam histórico. Documente apenas contratos ou procedimentos que precisam permanecer verdadeiros.
