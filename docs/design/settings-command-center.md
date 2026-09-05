# Configurações — Command Center

Issue: #301  
Direção aprovada: **Command Center**  
Protótipo de referência: `ux/301-settings-command-center-prototype`

## Objetivo

Transformar a tela de perfil/configurações em um ponto de entrada compacto, navegável e responsivo, sem duplicar regras de negócio nem inventar funcionalidades que ainda não existem.

## Implementação

A tela real reutiliza os fluxos existentes e os organiza em áreas:

- **Conta** — dados atuais e resumo de preferências;
- **Preferências** — visibilidade de valores e tema usando o componente existente;
- **Segurança** — edição de dados pessoais/senha pelo fluxo já existente;
- **Exportação** — portabilidade de dados existente;
- **Sessão** — logout da sessão atual;
- **Risco** — exclusão permanente com confirmação explícita.

A navegação usa uma faixa horizontal de botões com `aria-pressed`, permanece utilizável em telas estreitas por scroll horizontal e preserva foco visível por teclado. Foi evitada a semântica ARIA de tabs porque ela exigiria também o padrão completo de teclado/tabpanel; os botões refletem melhor o comportamento implementado.

## Decisões para evitar dívida

O protótipo visual sugeria uma área de “Sessões”, mas o produto atual só possui controle da sessão corrente. A implementação usa **Sessão** no singular e não cria uma lista fictícia de dispositivos/sessões sem backend correspondente.

Da mesma forma, preferências, exportação, edição de senha e exclusão continuam delegadas aos componentes e APIs existentes. O Command Center reorganiza a experiência; não cria um segundo estado ou segundo caminho de mutação.

## Estados

- loading continua usando `PageLoading`;
- perfil ausente continua usando `PageEmpty`;
- erro de exclusão permanece anunciado com `role=alert`;
- mutações perigosas mantêm `ConfirmationModal` e `DeleteOverlay`;
- logout usa o mesmo `AuthContext` do restante da aplicação.

## Próximos passos

Após validação visual/CI, qualquer evolução de segurança (por exemplo MFA/sessões múltiplas) deve substituir somente o conteúdo da área correspondente, preservando a navegação e sem adicionar mocks permanentes.
