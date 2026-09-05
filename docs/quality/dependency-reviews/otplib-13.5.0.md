# Dependency review — `otplib` 13.5.0

Issue: #288  
Data da revisão: **2026-09-05**  
Decisão: **aprovada para adoção controlada em slice próprio; ainda não adicionada ao lockfile neste review**.

## Objetivo

Avaliar uma implementação TOTP antes de conectá-la ao enrollment/login. O review não ativa 2FA e não altera dependências sozinho.

## Versão e suporte

- pacote: `otplib`;
- versão observada no registry: `13.5.0`;
- linha suportada pelo upstream: `13.x`;
- `<=12.x`: EOL segundo a política de segurança;
- engine upstream: Node `>=20`; o Controle de Gastos usa Node `24.x`;
- licença: MIT;
- v13 é uma reescrita com API funcional/async e breaking changes em relação a v12.

Fontes verificadas:

- https://www.npmjs.com/package/otplib
- https://github.com/yeojz/otplib
- https://github.com/yeojz/otplib/blob/main/SECURITY.md
- https://github.com/yeojz/otplib/releases

## Segurança relevante para o nosso uso

A política upstream declara:

- comparação de token em tempo constante;
- guardrails para limitar janela/DoS e tamanho de segredo;
- RNG criptograficamente seguro para geração de segredo;
- replay control por `afterTimeStep`;
- 13.x como única linha atualmente suportada.

Não havia advisory publicado na página de segurança do projeto na data desta revisão.

O upstream também deixa explícito que **não** resolve responsabilidades da aplicação: armazenamento seguro do segredo, rate limit, lockout, transporte e sessão pós-verificação. Essas responsabilidades já pertencem ao nosso domínio e não serão delegadas à biblioteca.

## Configuração candidata

Para interoperabilidade com apps autenticadores comuns, o adapter do projeto deve declarar e testar explicitamente:

```text
algorithm = SHA-1
period = 30 segundos
digits = 6
secret = Base32
```

Isso não significa aceitar defaults implicitamente para sempre. O wrapper server-only será a fronteira que fixa o contrato e impede chamadas dispersas ao pacote.

## Replay

A versão 13 adicionou `afterTimeStep` no TOTP e a política upstream o apresenta como primitive de replay protection.

No Controle de Gastos, `User.totpLastUsedStep` continua sendo a fonte persistida de aplicação. O fluxo futuro deverá:

1. verificar TOTP com uma janela explicitamente limitada;
2. obter/confirmar o time-step aceito;
3. rejeitar step `<= totpLastUsedStep`;
4. atualizar o step aceito atomicamente antes de emitir sessão final.

A existência de `afterTimeStep` não substitui persistência/atomicidade do nosso lado.

## Supply chain e runtime

- importar somente em módulo server-only;
- não carregar TOTP no bundle do browser;
- não usar API legada `authenticator`/preset de v12;
- preferir API funcional v13 (`generateSecret`, `generate`, `verify`, URI quando necessário);
- revisar o diff real de `pnpm-lock.yaml` no PR de adoção;
- rodar `pnpm audit --prod --audit-level=high --ignore-registry-errors` quando o ambiente de pacote estiver disponível;
- não usar override/audit-fix automático para “forçar” aprovação.

O upstream informa plugins padrão baseados em `@noble/hashes` e `@scure/base`; dependências transitivas devem ser revisadas no lockfile real, não presumidas a partir do README.

## Decisão

`otplib` 13.5.0 é **adequada como candidata** para o adapter TOTP do projeto porque:

- a linha é suportada;
- o runtime é compatível;
- há política de segurança pública;
- há primitive específica para replay por time-step;
- a API v13 permite encapsulamento server-only pequeno;
- não precisamos criar nossa própria implementação de RFC 6238.

A aprovação é condicionada a uma adoção posterior gerada por `pnpm`, com lockfile e auditoria reais. **Não editar `package.json`/`pnpm-lock.yaml` manualmente** e não ativar 2FA antes desse gate.

## Próximo slice

Adicionar `otplib@13.5.0` usando pnpm, criar o wrapper server-only e cobrir vetores/clock/janela/time-step. Enrollment e login permanecem fora até esse adapter estar verde.

Refs #288, `docs/product/totp-2fa.md`, `docs/quality/dependency-security-policy.md`.
