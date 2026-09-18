# Guia de Code Review

> Este documento define critérios técnicos locais de review. Estado do workflow, handoff, autorizações e próxima etapa pertencem à task canônica do `agent-orchestrator`.

O objetivo do review é reduzir regressões e manter o código simples de alterar, testar e remover.

## Ordem de prioridade

1. Correção funcional e segurança.
2. Clareza da responsabilidade.
3. Testabilidade e baixo acoplamento.
4. Simplicidade.
5. Reuso e abstração somente quando houver necessidade concreta.

KISS prevalece sobre uma aplicação mecânica de SOLID.

## Single Responsibility

Verifique se uma unidade possui um motivo principal para mudar. Procure componentes que misturam UI, transporte, regra de negócio e formatação; funções excessivamente longas; e nomes genéricos como Manager, Utils ou Helper.

Pergunta útil: "Essa lógica tem um owner claro ou deveria ser isolada?"

## Open/Closed

Observe cadeias crescentes de if/else ou switch usadas para adicionar variantes. Só introduza estratégia, polimorfismo ou registry quando houver variação real e recorrente.

Pergunta útil: "Adicionar o próximo caso exigirá editar vários lugares?"

## Liskov Substitution

Herança ou contratos compartilhados devem manter expectativas compatíveis. Evite subclasses que anulam métodos, retornam valores especiais inesperados ou recusam entradas aceitas pelo contrato base.

Pergunta útil: "Essa implementação pode substituir a abstração sem tratamento especial?"

## Interface Segregation

Evite contratos e props maiores do que o consumidor precisa. Prefira dependências pequenas e específicas quando isso reduzir acoplamento real.

Pergunta útil: "O consumidor depende de dados ou métodos que nunca usa?"

## Dependency Inversion

Isole integrações externas quando elas atravessarem regra de negócio ou tiverem chance real de substituição. Não crie wrappers apenas para cumprir um padrão.

Pergunta útil: "Uma troca dessa integração contaminaria a regra de negócio?"

## Checklist final

- [ ] A mudança resolve exatamente o problema proposto.
- [ ] Comportamento fora do escopo foi preservado.
- [ ] Casos de erro e regressões relevantes foram tratados.
- [ ] Não há abstração sem necessidade concreta.
- [ ] Responsabilidades continuam claras.
- [ ] Testes cobrem o comportamento importante no nível adequado.
- [ ] Segurança, autorização, persistência e performance foram consideradas quando aplicável.
- [ ] O diff está menor e mais fácil de manter do que uma alternativa razoável.
