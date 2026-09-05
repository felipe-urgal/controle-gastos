# Histórico — deployment Vercel main-only (issue #255)

> **Documento histórico, supersedido pelo PR #315.** Este arquivo registra a validação do contrato antigo em que a integração Git da Vercel promovia `main` automaticamente. Ele **não é instrução operacional vigente**. Para produção atual, use [`../PRODUCTION.md`](../PRODUCTION.md) e [`production-contract.md`](production-contract.md).

Status histórico: **validado em 2026-09-03**  
Issue: #255  
Hardening histórico: PR #258  
Supersedido operacionalmente por: PR #315

## Contrato que estava sendo validado

Na época da #255, o objetivo era provar que branches diferentes de `main` não executavam build/deploy efetivo, enquanto `main` continuava gerando Production Deployments automáticos pela integração Git da Vercel.

A configuração então usada combinava `git.deploymentEnabled` por branch, `ignoreCommand` e `github.silent`. Branches de trabalho podiam gerar registros `CANCELED`, mas o build da aplicação era interrompido antes de executar.

## Evidência histórica

Depois do PR #258, branches de trabalho recentes produziram registros cancelados/ignorados sem Preview Deployment efetivo. O PR #281 foi uma das evidências finais observadas.

Merges subsequentes em `main` ainda geravam Production Deployments `READY`, confirmando o comportamento automático daquele contrato.

Essas evidências serviram para fechar a #255, mas **não descrevem o estado atual**.

## Contrato vigente desde #315

O PR #315 centralizou a promoção no Dev Dashboard e alterou `vercel.json` para:

```json
{
  "git": {
    "deploymentEnabled": false
  }
}
```

Consequências atuais:

- branch e `main` não disparam deployment Vercel automaticamente;
- `strategy: git-managed` continua válida no Production Contract porque a revision promovida é Git-managed;
- a promoção é uma mutação explícita `provider-deploy` pelo Dev Dashboard/API;
- migration, provider `READY` e `prod:verify` continuam etapas independentes;
- merge em `main` torna a revision elegível, mas não equivale a produção.

## Referências vigentes

- `vercel.json`
- `.dev-dashboard/production.json`
- `docs/PRODUCTION.md`
- `docs/operations/production-contract.md`
- PR #315

## Referências históricas

- Issue #255
- PRs #256 e #258
- PRs de validação #272, #273, #274, #278 e #281
