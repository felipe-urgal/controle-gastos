type ResolvedTheme = 'light' | 'dark';

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => { ready: Promise<void>; finished: Promise<void> };
};

/**
 * Troca o tema com uma revelação circular a partir do ponto clicado (View Transitions API).
 * Sem suporte, ou com "reduzir movimento", troca direto. O `data-theme` é aplicado dentro da
 * transição porque o ThemeProvider só o escreve num efeito, depois do snapshot.
 */
export function switchThemeWithReveal(
  next: ResolvedTheme,
  setTheme: (theme: ResolvedTheme) => void,
  origin: { x: number; y: number },
) {
  const doc = document as ViewTransitionDocument;
  const root = document.documentElement;
  if (!doc.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    setTheme(next);
    return;
  }

  root.classList.add('theme-reveal');
  const transition = doc.startViewTransition(() => {
    root.dataset.theme = next;
    setTheme(next);
  });
  const radius = Math.hypot(
    Math.max(origin.x, window.innerWidth - origin.x),
    Math.max(origin.y, window.innerHeight - origin.y),
  );
  transition.ready
    .then(() =>
      root.animate(
        {
          clipPath: [
            `circle(0px at ${origin.x}px ${origin.y}px)`,
            `circle(${radius}px at ${origin.x}px ${origin.y}px)`,
          ],
        },
        { duration: 600, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', pseudoElement: '::view-transition-new(root)' },
      ),
    )
    .catch(() => {});
  transition.finished.finally(() => root.classList.remove('theme-reveal'));
}
