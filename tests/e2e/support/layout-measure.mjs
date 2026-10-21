/**
 * Medição de layout executada no navegador (`page.evaluate(measure, isNarrow)`): overflow horizontal,
 * alvos de toque < 44 px, campos < 16 px (só estreito) e texto < 12 px.
 */
export function measure(isNarrow) {
  const visible = (element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
  };
  const doc = document.documentElement;
  const interactive = [
    ...document.querySelectorAll('a[href], button, select, textarea, input:not([type="hidden"]), [role="button"]'),
  ].filter(visible);

  const smallTargets = isNarrow
    ? interactive
        .filter((element) => !element.matches('a[href="#main-content"], input[type="checkbox"], input[type="radio"], input[type="file"]'))
        .map((element) => ({ element, rect: element.getBoundingClientRect() }))
        .filter(({ rect }) => rect.width > 2 && rect.height > 2 && (rect.width < 44 || rect.height < 44))
        .map(({ element, rect }) => `${element.tagName.toLowerCase()} "${(element.getAttribute('aria-label') || element.textContent || '').trim().slice(0, 30)}" ${Math.round(rect.width)}x${Math.round(rect.height)}`)
    : [];

  const smallInputs = isNarrow
    ? interactive
        .filter((element) => element.matches('input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="file"]), select, textarea'))
        .filter((element) => Number.parseFloat(getComputedStyle(element).fontSize) < 16)
        .map((element) => `${element.tagName.toLowerCase()} ${getComputedStyle(element).fontSize}`)
    : [];

  // Texto de conteúdo < 12 px (ignora ícones/SVG e elementos sem texto próprio).
  const smallText = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (!node.textContent?.trim()) continue;
    const parent = node.parentElement;
    if (!parent || !visible(parent) || parent.closest('svg, script, style')) continue;
    if (Number.parseFloat(getComputedStyle(parent).fontSize) < 12) {
      smallText.push(`${parent.tagName.toLowerCase()} "${node.textContent.trim().slice(0, 30)}"`);
    }
  }

  // Conteúdo cortado: um ancestral com overflow oculto pode esconder o estouro (o `scrollWidth` do
  // documento não acusa). Procura elementos que passam da borda direita fora de áreas rolantes.
  const clipped = [];
  const scrolls = (element) => {
    for (let node = element.parentElement; node && node !== document.body; node = node.parentElement) {
      if (/(auto|scroll)/.test(getComputedStyle(node).overflowX)) return true;
    }
    return false;
  };
  for (const element of document.body.querySelectorAll('article, section, li, p, strong, h2, h3, button, a, input, select, dd, dt, span')) {
    if (!visible(element) || element.closest('.sr-only, [aria-hidden="true"], svg, nav[aria-label="Navegação principal"]')) continue;
    const style = getComputedStyle(element);
    if (style.position === 'fixed' || scrolls(element)) continue;
    const rect = element.getBoundingClientRect();
    if (rect.width > 2 && rect.right > window.innerWidth + 1) {
      clipped.push(`${element.tagName.toLowerCase()} "${(element.getAttribute('aria-label') || element.textContent || '').trim().slice(0, 30)}" +${Math.round(rect.right - window.innerWidth)}px`);
    }
  }

  return {
    clipped: clipped.slice(0, 6),
    overflow: doc.scrollWidth - doc.clientWidth,
    smallTargets,
    smallInputs,
    smallText,
  };
}
