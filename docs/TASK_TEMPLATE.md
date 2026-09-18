# Tarefa

## Uso deste template

Este documento ajuda a estruturar problema, fluxo, critérios de aceite, riscos e validação em issues, planejamento ou especificações locais.

Quando o trabalho estiver sendo coordenado pelo `agent-workflow-browser`, **não crie uma segunda task operacional neste repositório**. A fonte canônica de estado da execução fica no repositório central:

```text
tasks/controle-gastos/<TASK-ID>.md
```

Este template pode fornecer conteúdo para a especificação, mas não mantém `workflow`, `status`, `current_agent`, `next_agent`, autorizações, refs de trabalho ou handoff. Esses campos pertencem exclusivamente à task canônica do `agent-workflow-browser`.

## 1. O que e por quê?

**Ação**

- [ ] Criar funcionalidade
- [ ] Ajustar / corrigir bug
- [ ] Analisar / refatorar código

**Problema**

Descreva o cenário atual ou a dor real.

**Ganho**

Descreva o resultado esperado para usuário, negócio ou manutenção.

## 2. Como o usuário vê?

**Referência visual**

Link de Figma, print ou descrição objetiva quando houver UI.

**Fluxo**

1. O usuário aciona...
2. O sistema processa...
3. O resultado final é...

**Trava-erros e feedback**

- Status durante processamento:
- Bloqueios/validações:
- Feedback de sucesso:
- Feedback de erro:

## 3. Critérios de aceite

- [ ] Cenário feliz: dado..., quando..., então...
- [ ] Cenário de erro: dado..., quando..., então...

## 4. Arquitetura e código

**Onde mexer**

- Frontend:
- Backend:
- Persistência/infra, se aplicável:

**Qualidade**

- [ ] A solução segue KISS/YAGNI.
- [ ] A responsabilidade tem owner claro.
- [ ] Não foi criada abstração sem necessidade concreta.
- [ ] Dependências externas estão isoladas quando isso protege regra de negócio.

## 5. Segurança e performance

- Permissão:
- Dados sensíveis:
- Risco de query, loop, payload ou operação cara:
- Mitigação necessária:

## 6. Testes e rollback

**Cobertura**

- [ ] Unitário
- [ ] Integração
- [ ] E2E
- [ ] Manual

**Rollback**

Explique como desfazer ou desativar a mudança se houver regressão.
