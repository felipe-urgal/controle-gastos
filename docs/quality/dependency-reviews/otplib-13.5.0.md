# Dependency review — `otplib` 13.5.0

Issue: #288  
Data da revisão: **2026-09-05**  
Adoção revisada: **2026-09-11**  
Decisão: **aprovada e adotada de forma encapsulada no PR #414**.

## Objetivo

Avaliar e adotar uma implementação TOTP antes de conectá-la ao enrollment/login. O pacote fica isolado em um adapter do domínio de segurança; este slice não ativa 2FA nem altera sessão.

## Versão e suporte

- pacote: `otplib`;
- versão adotada: `13.5.0`;
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

O upstream também deixa explícito que **não** resolve responsabilidades da aplicação: armazenamento seguro do segredo, rate limit, lockout, transporte e sessão pós-verificação. Essas responsabilidades continuam no nosso domínio.

## Configuração adotada

Para interoperabilidade com apps autenticadores comuns, `app/lib/security/totp.ts` fixa e testa explicitamente:

```text
algorithm = SHA-1
period = 30 segundos
digits = 6
secret = Base32 com 20 bytes / 160 bits
clock tolerance = 30 segundos para passado e futuro
```

A política fica centralizada no adapter para impedir chamadas dispersas ao pacote e evitar dependência implícita de defaults da biblioteca.

## Replay

A versão 13 expõe `afterTimeStep` e retorna o `timeStep` efetivamente aceito na verificação.

No Controle de Gastos, `User.totpLastUsedStep` continua sendo a fonte persistida de aplicação. O fluxo integrado deverá:

1. verificar TOTP pela janela limitada do adapter;
2. obter o `timeStep` aceito;
3. passar o último step persistido também como `afterTimeStep` para rejeição antecipada;
4. consumir o novo step atomicamente via `consumeTotpTimeStep` antes de emitir sessão final.

A primitive da biblioteca reduz a superfície de replay, mas **não substitui** a persistência/atomicidade do nosso lado.

## Supply chain e runtime

- `otplib@13.5.0` foi adicionado por `pnpm`, sem edição manual do lockfile;
- o lockfile real inclui os módulos v13 esperados e plugins padrão baseados em `@noble/hashes` e `@scure/base`;
- o código da aplicação importa a biblioteca somente no adapter `app/lib/security/totp.ts`;
- nenhuma UI/hook/service client importa o pacote;
- não é usada a API legada `authenticator`/preset de v12;
- o adapter usa a API funcional v13 (`generateSecret`, `generateURI`, `verify`);
- o CI deve validar instalação frozen-lockfile e o gate canônico;
- `pnpm audit --prod --audit-level=high --ignore-registry-errors` permanece gate de supply chain quando executável no ambiente com registry.

Não usar override/audit-fix automático apenas para forçar aprovação.

## Cobertura do adapter

Os testes do PR #414 cobrem:

- contrato SHA-1 / 6 dígitos / 30 segundos / Base32;
- segredo aleatório de 160 bits;
- vetor derivado do RFC 6238;
- retorno do time-step aceito;
- janela de clock limitada a um período adjacente;
- rejeição fora da janela;
- rejeição via `afterTimeStep` de step já consumido;
- normalização segura de espaços em código colado sem aceitar caracteres não numéricos;
- URI `otpauth://` coerente com a mesma política.

## Decisão

`otplib` 13.5.0 fica **aprovada e encapsulada** porque:

- a linha é suportada;
- o runtime é compatível;
- há política de segurança pública;
- há primitive específica para replay por time-step;
- a API v13 retorna o step aceito e permite integração direta com nosso estado persistido;
- o pacote foi instalado por `pnpm` com lockfile real;
- não precisamos criar nossa própria implementação de RFC 6238.

A aprovação não significa que 2FA já está ativo. Enrollment, challenge/login, consumo atômico e UX ainda precisam ser conectados end-to-end.

## Próximo slice

Implementar o serviço de enrollment usando este adapter e as primitives criptográficas/persistidas já existentes. Depois integrar challenge + rate limit + TOTP/recovery + consumo atômico no login antes de emitir sessão final.

Refs #288, #414, `docs/product/totp-2fa.md`, `docs/quality/dependency-security-policy.md`.
