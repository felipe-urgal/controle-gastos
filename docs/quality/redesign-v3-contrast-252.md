# Redesign v3 — Contraste, estados e mensagens acessíveis (#252)

Status: **implementação determinística concluída; responsabilidade manual transferida para #253**  
Issue: [#252](https://github.com/felipe-urgal/controle-gastos/issues/252)  
Roadmap: [#245](https://github.com/felipe-urgal/controle-gastos/issues/245)  
Baseline: `docs/quality/redesign-v3-audit.md`  
Reconciliação: `docs/quality/redesign-v3-audit-contrast-246-252.md`  
Implementação: [PR #268](https://github.com/felipe-urgal/controle-gastos/pull/268)

## Resultado integrado

O PR #268 foi integrado em `main` pelo merge `ff8b77fd1fdb2c8887397de0411af71c26eb25a2`.

Head final revisado e validado: `38ed0ef4fb59864056feac571dd8da720285a257`.

Gates no mesmo head:

- ✅ CI #308;
- ✅ E2E Chromium #97;
- ✅ Lighthouse baseline #238;
- ✅ auto-review final após a correção do live region de conclusão.

O follow-up documental PR #269 também foi integrado.

## Findings determinísticos resolvidos

### Contraste de texto

O finding P1 da baseline #246 em `--text-subtle` claro foi corrigido. A matriz protegida por teste mantém contraste >=4.5:1 nas superfícies suportadas.

Valores registrados após o ajuste:

| Combinação light | Contraste |
| --- | ---: |
| `text-subtle` / `background` | 5.04:1 |
| `text-subtle` / `surface` | 5.38:1 |
| `text-subtle` / `surface-raised` | 4.85:1 |
| `text-subtle` / `surface-subtle` | 4.57:1 |

### Bordas funcionais

`--border` permanece sutil/decorativo. `--border-strong` é usado quando a fronteira contribui para identificar controles e permanece >=3:1 contra as superfícies suportadas em dark/light.

### Estados semânticos

A importação deixou de depender de classes cromáticas locais para seus estados prioritários e usa tokens semânticos de `income`, `expense` e `warning`, preservando texto explícito para válido, duplicata e inválido. Valores financeiros mantêm prefixos `+`/`-`, evitando dependência exclusiva de cor.

### Mensagens dinâmicas

Atualizações relevantes do preview/seleção/conclusão usam live regions `status/polite`. O auto-review encontrou uma versão intermediária em que o status de conclusão envolvia também os botões; o container foi restringido ao texto e todos os gates foram repetidos no head final.

## Regressões

- `app/stylesheets/globals.test.ts` calcula contraste a partir dos tokens reais de `globals.css`;
- `tests/e2e/financial-flow.spec.mjs` valida os status do preview real;
- a matriz posterior do QA final executou a suíte em Chromium, Firefox e WebKit; E2E #112 do PR #272 ficou verde nos três engines.

WebKit em Linux é evidência de engine e não equivale a Safari/iOS/macOS real.

## Pendências manuais

A #252 não permanece dona de uma segunda matriz paralela. Os itens abaixo continuam exclusivamente no gate final #253:

- inspeção visual dark/light completa;
- reader/AT smoke test real;
- classificação contextual de bordas/ícones dependente de renderização;
- Safari real e dispositivo físico;
- zoom/contextos específicos que não sejam demonstráveis pela automação.

Nenhum desses itens é marcado como concluído por este documento.

## Reconciliação

A responsabilidade determinística da #252 está concluída e a issue pode ser encerrada junto com #246 pela reconciliação documentada em `docs/quality/redesign-v3-audit-contrast-246-252.md`.

Isso não significa conformidade WCAG integral. O QA transversal continua em #253 até existir evidência suficiente para encerrar o roadmap #245.

Refs #245, #246, #252, #253, PR #268 e PR #269.
