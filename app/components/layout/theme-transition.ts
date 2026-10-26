type ResolvedTheme = 'light' | 'dark';

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => { ready: Promise<void>; finished: Promise<void> };
};

/**
 * Troca o tema com uma revelação circular (View Transitions API). Para o escuro, o círculo nasce no ponto
 * clicado (o botão do tema). Para o claro, no desktop ele "volta" do canto superior direito; no mobile é o
 * inverso exato: o tema escuro encolhe de volta para o botão, deixando o claro por baixo.
 * Sem suporte, ou com "reduzir movimento", troca direto. O `data-theme` é aplicado dentro da
 * transição porque o ThemeProvider só o escreve num efeito, depois do snapshot.
 */
export function switchThemeWithReveal(
  next: ResolvedTheme,
  setTheme: (theme: ResolvedTheme) => void,
  clickOrigin: { x: number; y: number },
) {
  const doc = document as ViewTransitionDocument;
  const root = document.documentElement;
  if (!doc.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    setTheme(next);
    return;
  }

  const desktop = window.matchMedia('(min-width: 1024px)').matches;
  // Mobile, escuro → claro: o círculo do tema antigo encolhe até o botão (o inverso de claro → escuro).
  const inverse = next === 'light' && !desktop;
  const origin = next === 'dark' || inverse ? clickOrigin : { x: window.innerWidth, y: 0 };
  root.classList.add('theme-reveal');
  if (inverse) root.classList.add('theme-reveal-inverse');
  const transition = doc.startViewTransition(() => {
    root.dataset.theme = next;
    setTheme(next);
  });
  const radius = Math.hypot(
    Math.max(origin.x, window.innerWidth - origin.x),
    Math.max(origin.y, window.innerHeight - origin.y),
  );
  transition.ready
    .then(() => {
      const circle = (radiusPx: number) => `circle(${radiusPx}px at ${origin.x}px ${origin.y}px)`;
      return root.animate(
        { clipPath: inverse ? [circle(radius), circle(0)] : [circle(0), circle(radius)] },
        {
          duration: 600,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          pseudoElement: inverse ? '::view-transition-old(root)' : '::view-transition-new(root)',
        },
      );
    })
    .catch(() => {});
  transition.finished.finally(() => root.classList.remove('theme-reveal', 'theme-reveal-inverse'));
}
