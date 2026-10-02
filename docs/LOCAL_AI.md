# Assistente financeiro local

O recurso **Explique meu mês** usa inferência local no navegador para transformar dados financeiros já calculados pelo domínio em uma explicação curta em linguagem natural.

## Princípios

- a IA não é fonte de verdade financeira;
- nenhum saldo, forecast, percentual ou total canônico é calculado pelo modelo;
- não existe mutation, pagamento ou transferência disponível para a IA;
- não existe fallback automático para API paga;
- o app continua funcional quando a IA local não está disponível.

## Runtime

Runtime: `@mlc-ai/web-llm@0.2.85`.

Modelo inicial:

```text
Qwen2.5-0.5B-Instruct-q4f16_1-MLC
```

A engine roda em um Web Worker e é importada apenas depois que o usuário aciona **Explique meu mês**. O dashboard inicial não inicializa o WebLLM nem baixa o modelo.

WebGPU é obrigatório para o MVP. O app verifica a disponibilidade de um adapter antes de habilitar a ação. Falha de GPU, memória ou inicialização é tratada como indisponibilidade da feature, não como falha do dashboard.

Os artefatos baixados pelo WebLLM podem ser reutilizados pelo cache do navegador em acessos posteriores.

## FinancialContext

O contexto enviado ao modelo é construído no cliente a partir de DTOs já carregados pelo produto e inclui apenas:

- resumo do mês selecionado;
- comparação com o mês anterior;
- planejamento mensal;
- até 5 categorias com maior valor realizado;
- até 6 fatos derivados de insights determinísticos;
- safe-to-spend e contadores do forecast;
- até 5 metas.

O contexto não inclui:

- lista completa de transações;
- descrições de transações;
- SQL ou acesso Prisma;
- outros usuários;
- dados de outras moedas agregados à moeda selecionada.

Valores monetários continuam em centavos inteiros.

## Privacidade e rede

O contexto financeiro não é enviado a endpoint de IA do Controle de Gastos nem a provider LLM externo.

No primeiro uso, o WebLLM precisa obter os artefatos públicos do runtime/modelo. Esse tráfego serve apenas para carregar a engine/modelo; o `FinancialContext` não participa dessas requisições. A inferência do prompt ocorre localmente no Web Worker.

Não adicionar telemetria de:

- prompt;
- resposta;
- `FinancialContext`;
- nomes de categorias/metas/assinaturas presentes no contexto.

## Prompt injection

Nomes controlados pelo usuário são:

1. normalizados para uma única linha;
2. limitados em tamanho;
3. serializados dentro de um bloco explicitamente marcado como contexto não confiável.

A system instruction determina que qualquer texto dentro desse bloco seja tratado como dado, nunca como instrução.

Mensagens livres dos insights e descrições de transações não entram no prompt.

A resposta é renderizada como texto React normal, sem HTML interpretado.

## Valores ocultos

Quando a preferência de ocultar valores está ativa, **Explique meu mês** fica desabilitado. Isso evita que a saída da IA revele valores que a própria interface está escondendo.

## Cancelamento e falha

A geração usa `AbortController`. Durante geração, o cancelamento solicita `interruptGenerate()` ao WebLLM e a UI ignora respostas tardias.

Se o navegador não suportar WebGPU ou a engine falhar:

- nenhuma API externa alternativa é chamada;
- a explicação local fica indisponível;
- dashboard, insights e forecast permanecem normais.

## Limites atuais

- uma única superfície: **Explique meu mês**;
- sem chat livre;
- sem aconselhamento de investimento;
- sem notícias ou dados de mercado externos;
- sem ferramentas MCP ou mutations;
- sem persistência de conversa/resposta;
- modelo pequeno priorizando compatibilidade e custo local sobre profundidade textual.
