# Desenvolvimento

## Preparação

Requisitos principais:

- Node.js 24.x
- pnpm
- PostgreSQL conforme a configuração do projeto

Instalação:

    pnpm install

Ambiente local:

    pnpm dev

## Relação com o agent-orchestrator

Quando uma mudança for coordenada pelo `agent-orchestrator`, este documento continua sendo a fonte local para preparação, desenvolvimento e validação do projeto. Ele não substitui a task canônica nem define workflow, handoff ou autorizações.

## Fluxo de alteração

1. Entenda o comportamento atual e localize o owner da responsabilidade.
2. Defina critérios de aceite antes de implementar quando a mudança não for trivial.
3. Faça a menor alteração coerente com a arquitetura atual.
4. Adicione ou ajuste testes no mesmo nível em que o comportamento é garantido.
5. Execute o gate principal e revise o diff.

## Validação

Gate canônico:

    pnpm check

Comandos úteis:

    pnpm lint
    pnpm typecheck
    pnpm test
    pnpm build
    pnpm test:e2e

Não execute E2E indiscriminadamente; use-o para fluxos relevantes ou antes de mudanças com maior risco de regressão.

## Banco e segurança

- Não commite segredos ou credenciais reais.
- Não altere migrations já aplicadas; crie forward-fix.
- Valide ownership de recursos no servidor.
- Não misture moedas em agregados sem regra explícita de conversão.

## Política de documentação

Mantenha somente documentação viva. Decisões concluídas, planos antigos e relatórios pontuais ficam no histórico Git, issues e PRs. Novos documentos devem existir apenas quando forem necessários para operar, desenvolver ou revisar o sistema no presente.
