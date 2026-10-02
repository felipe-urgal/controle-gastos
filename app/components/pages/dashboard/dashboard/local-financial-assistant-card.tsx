'use client';

import { useEffect, useRef, useState } from 'react';
import { FaMagic, FaRedo, FaStop } from 'react-icons/fa';

import { buildFinancialContext } from '@/app/lib/local-ai/financial-context';
import { explainFinancialContext } from '@/app/lib/local-ai/local-assistant-runtime';
import {
  getWebGpuSupportStatus,
  type WebGpuSupportStatus,
} from '@/app/lib/local-ai/webgpu-support';
import type { MonthlyDashboard } from '@/app/types/dashboard';
import type { FinancialInsightsData } from '@/app/types/financial-insight';
import type { ForecastData } from '@/app/types/forecast';

type SupportState = 'checking' | WebGpuSupportStatus;
type RunState = 'idle' | 'loading' | 'ready' | 'error';

export function LocalFinancialAssistantCard({
  dashboard,
  insights,
  forecast,
  showValues,
  compact = false,
}: {
  dashboard: MonthlyDashboard;
  insights: FinancialInsightsData | null;
  forecast: ForecastData | null;
  showValues: boolean;
  compact?: boolean;
}) {
  const [support, setSupport] = useState<SupportState>('checking');
  const [state, setState] = useState<RunState>('idle');
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let cancelled = false;

    void getWebGpuSupportStatus().then((status) => {
      if (!cancelled) setSupport(status);
    });

    return () => {
      cancelled = true;
      abortRef.current?.abort();
    };
  }, []);

  async function explainMonth() {
    if (!showValues || support !== 'supported') return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState('loading');
    setError('');
    setAnswer('');
    setProgress(0);
    setProgressText('Preparando IA local');

    try {
      const context = buildFinancialContext({
        dashboard,
        insights,
        forecast,
      });

      const { webLlmFinancialGenerator } = await import(
        '@/app/lib/local-ai/webllm-generator'
      );
      const result = await explainFinancialContext(
        context,
        webLlmFinancialGenerator,
        (update) => {
          if (controller.signal.aborted) return;
          setProgress(update.progress);
          setProgressText(update.text || 'Carregando modelo local');
        },
        controller.signal,
      );

      if (controller.signal.aborted) return;
      setAnswer(result);
      setState('ready');
    } catch (caught) {
      if (
        controller.signal.aborted ||
        (caught instanceof DOMException && caught.name === 'AbortError')
      ) {
        setState('idle');
        setProgress(0);
        setProgressText('');
        return;
      }

      setError(
        caught instanceof Error && caught.message === 'LOCAL_AI_UNSUPPORTED'
          ? 'IA local indisponível neste navegador ou dispositivo.'
          : 'Não foi possível gerar a explicação local. Seus dados do dashboard continuam disponíveis normalmente.',
      );
      setState('error');
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }

  function cancel() {
    abortRef.current?.abort();
  }

  const disabledReason =
    !showValues
      ? 'Ative a visualização de valores para gerar uma explicação sem revelar números que estão ocultos na interface.'
      : support === 'api-unavailable'
        ? 'Este navegador não expõe a API WebGPU. Use uma versão atual do navegador em um dispositivo compatível.'
        : support === 'adapter-unavailable'
          ? 'WebGPU foi detectado, mas nenhum adaptador de GPU pôde ser inicializado. No Linux, verifique se o Chrome está usando Vulkan e se os drivers gráficos estão disponíveis.'
          : support === 'adapter-error'
            ? 'WebGPU foi detectado, mas houve uma falha ao inicializar o adaptador de GPU. Reinicie o navegador e verifique a aceleração gráfica e os drivers.'
            : null;

  return (
    <section
      className={`rounded-[18px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-surface)] ${compact ? 'p-4' : 'p-4 sm:p-5'}`}
      aria-labelledby={compact ? 'local-ai-title-mobile' : 'local-ai-title'}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--orbit-primary)]">
            IA local · privada
          </p>
          <h2
            id={compact ? 'local-ai-title-mobile' : 'local-ai-title'}
            className="mt-1 text-base font-bold text-[var(--foreground)]"
          >
            Explique meu mês
          </h2>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-[var(--text-muted)]">
            A explicação usa somente o resumo, categorias, insights, metas e
            forecast já calculados pelo app. O modelo roda no navegador e não
            possui ações de escrita.
          </p>
        </div>
        <span className="rounded-full bg-[var(--surface-raised)] px-2.5 py-1 text-[10px] font-semibold text-[var(--text-muted)]">
          {support === 'checking'
            ? 'Verificando suporte'
            : support === 'supported'
              ? 'WebGPU disponível'
              : support === 'api-unavailable'
                ? 'WebGPU indisponível'
                : support === 'adapter-unavailable'
                  ? 'WebGPU sem adaptador'
                  : 'Falha no WebGPU'}
        </span>
      </div>

      {disabledReason && (
        <p className="mt-3 rounded-[12px] bg-[var(--surface-raised)] p-3 text-xs leading-relaxed text-[var(--text-muted)]">
          {disabledReason}
        </p>
      )}

      {state === 'loading' && (
        <div className="mt-4" aria-live="polite">
          <div className="flex items-center justify-between gap-3 text-xs text-[var(--text-muted)]">
            <span>{progressText || 'Carregando modelo local'}</span>
            <span>{Math.round(progress * 100)}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--surface-raised)]">
            <div
              className="h-full rounded-full bg-[var(--orbit-primary)] transition-[width]"
              style={{ width: `${Math.max(3, progress * 100)}%` }}
            />
          </div>
          <button
            type="button"
            onClick={cancel}
            className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-[10px] border border-[var(--border)] px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
          >
            <FaStop aria-hidden="true" />
            Cancelar
          </button>
        </div>
      )}

      {state === 'ready' && answer && (
        <div className="mt-4 rounded-[14px] border border-[var(--border)] bg-[var(--surface-raised)] p-4">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--foreground)]">
            {answer}
          </p>
          <p className="mt-3 border-t border-[var(--border)] pt-3 text-[11px] leading-relaxed text-[var(--text-muted)]">
            Texto explicativo gerado localmente. Valores e cálculos oficiais
            continuam sendo os exibidos pelo domínio financeiro do app.
          </p>
        </div>
      )}

      {state === 'error' && error && (
        <p
          role="alert"
          className="mt-3 rounded-[12px] border border-[var(--danger)]/30 bg-[var(--danger-subtle)] p-3 text-xs leading-relaxed text-[var(--expense)]"
        >
          {error}
        </p>
      )}

      {state !== 'loading' && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void explainMonth()}
            disabled={
              support !== 'supported' ||
              !showValues
            }
            className="inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-[var(--orbit-primary)] px-4 text-sm font-bold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-45"
          >
            {state === 'ready' || state === 'error' ? (
              <FaRedo aria-hidden="true" />
            ) : (
              <FaMagic aria-hidden="true" />
            )}
            {state === 'ready' || state === 'error'
              ? 'Gerar novamente'
              : 'Explique meu mês'}
          </button>
          <p className="max-w-xl text-[11px] leading-relaxed text-[var(--text-muted)]">
            O primeiro uso baixa o modelo local e exibe o progresso. Os artefatos
            do modelo podem ficar em cache no navegador; nenhuma API de IA paga é
            necessária.
          </p>
        </div>
      )}
    </section>
  );
}
