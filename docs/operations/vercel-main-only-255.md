# Validação do deployment Vercel main-only — issue #255

Status: **validado — fechamento preparado**  
Issue: [#255](https://github.com/felipe-urgal/controle-gastos/issues/255)  
Hardening: PR #258  
Data da validação final: **2026-09-03**

## 1. Objetivo

Confirmar no projeto Vercel conectado que branches diferentes de `main` não executam build/deploy efetivo, que `main` continua gerando Production Deployments e que o CI do GitHub permanece independente da Vercel.

## 2. Configuração em produção

O `vercel.json` atual mantém defesa em camadas:

- `git.deploymentEnabled`: `* = false` e `main = true`;
- `ignoreCommand`: `[ "$VERCEL_GIT_COMMIT_REF" != "main" ]`;
- `github.silent: true`.

Na semântica do `ignoreCommand`, branch fora de `main` retorna exit `0` e o deployment é ignorado; `main` retorna exit `1` e o fluxo de build continua.

## 3. Evidência de branches fora da main

Depois do PR #258, branches de trabalho recentes produziram apenas registros cancelados/ignorados, sem Preview Deployment efetivo.

Exemplo final observado no PR #281 / branch `docs/close-redesign-v3-245-253`:

- deployment `dpl_5giNdHRGq9msSZtTnLgcwVvhYGX4`;
- target `null`;
- state `CANCELED`;
- o log executa o `ignoreCommand` e encerra com: `The deployment was canceled because the Ignored Build Step command returned exit code 0.`;
- não houve execução do build da aplicação após o Ignored Build Step.

O mesmo padrão `CANCELED` foi observado em branches posteriores do Redesign v3, incluindo PRs #273, #274, #278 e #281.

Conclusão: a integração Git ainda pode criar um **registro** de deployment para a branch, mas o hardening impede o **build/deploy efetivo** antes da etapa de aplicação.

## 4. Evidência de main / produção

Após o hardening do PR #258, merges subsequentes em `main` continuaram gerando Production Deployments `READY`.

Evidências observadas:

- PR #272 → `main` `c065b8cd...` → Production `READY`;
- PR #273 → `main` `c876dac5...` → Production `READY`;
- PR #274 → `main` `bf478600...` → Production `READY`;
- PR #278 → `main` `75049b3d...` → Production `READY`, deployment `dpl_DXQxxmgaBZkTJ2RFXfZrY24QwvDY`.

Isso confirma que o `ignoreCommand` não bloqueia o caminho automático de produção da `main`.

## 5. GitHub e ruído de bot

O CI do GitHub continuou executando normalmente nas branches/PRs enquanto a Vercel cancelava os registros fora da `main` no Ignored Build Step.

No PR #281 não havia comentários de Conversation do bot Vercel na conferência final, consistente com `github.silent: true`.

## 6. Critério de aceite

- [x] branch fora de `main` não executa build/deploy efetivo;
- [x] `main` continua gerando Production Deployment automático;
- [x] CI do GitHub continua independente da Vercel;
- [x] comentários automáticos do bot Vercel permanecem silenciados no fluxo observado;
- [x] contrato operacional documenta a diferença entre registro `CANCELED` e Preview efetivo.

A issue #255 pode ser encerrada após o merge do PR documental de fechamento.

## 7. Referências

- `vercel.json`
- `docs/operations/production-contract.md`
- PRs #256 e #258
- PRs de validação pós-hardening #272, #273, #274, #278 e #281
- Issue #255
