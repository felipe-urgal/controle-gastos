# Redesign v3 — Contraste, estados e mensagens acessíveis (#252)

Status: **implementação determinística em revisão**  
Issue: [#252](https://github.com/felipe-urgal/controle-gastos/issues/252)  
Roadmap: [#245](https://github.com/felipe-urgal/controle-gastos/issues/245)  
Baseline: `docs/quality/redesign-v3-audit.md`  
Data: **2026-09-02**

## Objetivo

Registrar a parte verificável em código e automação da revisão de contraste, estados e mensagens do Redesign v3, sem declarar como concluídas validações que dependem de inspeção visual contextual, leitor de tela ou dispositivo real.

O escopo não altera regras financeiras, APIs, autenticação, schema ou migrations.

## Findings tratados

### `--text-subtle` claro

A baseline #246 confirmou que `--text-subtle: #6c7b72` falhava 4.5:1 em texto normal nas superfícies claras suportadas. O token foi ajustado para `#5f6e65`, preservando a hierarquia secundária sem reduzir tipografia.

Matriz após o ajuste:

| Combinação light | Contraste |
| --- | ---: |
| `text-subtle` / `background` | **5.04:1** |
| `text-subtle` / `surface` | **5.38:1** |
| `text-subtle` / `surface-raised` | **4.85:1** |
| `text-subtle` / `surface-subtle` | **4.57:1** |

`text-muted` continua com margem maior que 5.5:1 nas mesmas superfícies. No tema escuro, `text-subtle` permanece acima de 5.0:1 nas superfícies suportadas e `text-muted` acima de 8.0:1.

### Bordas funcionais de controles

A baseline mediu `border`/`border-strong` abaixo de 3:1, mas registrou corretamente que isso não torna toda borda uma falha automática de 1.4.11.

A correção mantém `--border` como borda sutil/decorativa e fortalece somente `--border-strong`, usado quando a fronteira contribui para identificar um controle:

- dark: `#60737f`;
- light: `#788b80`.

A primitive `.ds-control` passa a usar `--border-strong`; os controles nativos específicos da importação que ainda não usam essa primitive também foram alinhados.

Matriz mínima de `border-strong`:

| Tema | background | surface | surface-raised |
| --- | ---: | ---: | ---: |
| dark | **3.85:1** | **3.60:1** | **3.32:1** |
| light | **3.39:1** | **3.62:1** | **3.26:1** |

Painéis, divisores e bordas sem função de identificação continuam usando `--border`; não foi feita uma alteração indiscriminada da densidade visual.

## Estados semânticos da importação

`app/components/pages/transactions/import/index.tsx` deixou de usar `emerald-500`, `amber-500` e `red-500` locais para status.

O fluxo passa a usar o contrato semântico compartilhado:

- válido/sucesso: `income` + `primary-subtle`;
- duplicata/atenção: `warning` + `warning-subtle`;
- inválido/erro: `expense` + `danger-subtle`;
- erro global: primitive `Alert`;
- valores financeiros: `income`/`expense` com prefixo textual `+`/`-`.

Os badges continuam contendo texto explícito — `Válida`, `Possível duplicata` e `Inválida` — portanto o significado não depende apenas da cor.

Contrastes de texto dos estados aprovados:

| Combinação | dark | light |
| --- | ---: | ---: |
| `income` / `primary-subtle` | **7.75:1** | **4.57:1** |
| `expense` / `danger-subtle` | **5.89:1** | **5.30:1** |
| `warning` / `warning-subtle` | **6.42:1** | **4.51:1** |
| `on-primary` / `primary` | **9.51:1** | **5.02:1** |

O indicador ativo das etapas da importação também passou de `text-white` para `--on-primary`, evitando uma combinação inadequada no tema escuro.

## Mensagens de status

A revisão mantém a regra de não mover foco para atualizações não críticas e acrescenta semântica programática onde o conteúdo muda após uma ação:

- resumo de válidas/duplicadas/inválidas: `role="status"`, `aria-live="polite"`, `aria-atomic="true"`;
- quantidade selecionada/sem categoria: `role="status"`, `aria-live="polite"`, `aria-atomic="true"`;
- conclusão da importação: `role="status"`, `aria-live="polite"`, `aria-atomic="true"`;
- falhas continuam usando `Alert`, que usa `role="alert"` para erro/warning e `role="status"` para success/info.

A regressão E2E existente da importação foi ampliada para confirmar a presença dos live regions no preview real, sem simular leitor de tela.

## Estados compartilhados revisados

A inspeção determinística também confirmou contratos já existentes que devem ser preservados:

- bottom navigation usa `aria-current="page"`, peso tipográfico, pill e indicador inferior no estado ativo; não depende apenas de cor;
- `PageLoading` usa `role="status"` com texto `sr-only`;
- `Button` expõe `aria-busy` durante loading e mantém estado `disabled` nativo quando aplicável;
- `Alert` associa ícone + mensagem textual e semântica `alert/status` conforme criticidade;
- `prefers-reduced-motion` reduz animações/transições globalmente a uma única iteração mínima.

Esses pontos são evidência de código, não substituem validação com tecnologia assistiva.

## Regressão automatizada

`app/stylesheets/globals.test.ts` calcula contraste diretamente dos tokens reais de `globals.css` e impede regressão das combinações aprovadas:

- `text-muted` e `text-subtle` >= 4.5:1 nas superfícies suportadas, dark/light;
- `border-strong` >= 3:1 contra background/surface/surface-raised, dark/light;
- estados semânticos e `on-primary` >= 4.5:1.

`tests/e2e/financial-flow.spec.mjs` continua exercitando um preview CSV real e passa a exigir os `role=status`/`aria-live` relevantes.

## WCAG 2.2 relacionada

- 1.4.1 Use of Color (A)
- 1.4.3 Contrast (Minimum) (AA)
- 1.4.11 Non-text Contrast (AA)
- 2.4.7 Focus Visible (AA)
- 3.3.1 Error Identification (A)
- 4.1.2 Name, Role, Value (A)
- 4.1.3 Status Messages (AA)

## Limites e validações ainda manuais

Esta implementação não declara como concluídos:

- inspeção visual completa dark/light em toda a matriz de páginas;
- classificação contextual de toda borda/ícone decorativo restante;
- reader/AT smoke test real para confirmar experiência dos live regions;
- Firefox/WebKit-Safari e dispositivos reais;
- validações de zoom/contraste em contextos que dependam de renderização específica do navegador.

Esses itens devem permanecer explícitos na #252 e/ou no gate final #253.

## Auto code review

Antes do merge, revisar especialmente:

- se `--border` decorativo permaneceu sutil e só fronteiras funcionais usam `--border-strong`;
- se nenhum status essencial ficou dependente apenas de cor;
- se live regions não viraram `alert` excessivo para atualizações não críticas;
- se os novos tokens continuam coerentes nos dois temas;
- se a regressão calcula os tokens reais em vez de repetir números hardcoded;
- se os gates de frontend passam no mesmo head final.

Refs #245, #246, #252 e #253.
