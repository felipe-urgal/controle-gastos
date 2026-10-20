/**
 * Mede estouro horizontal de conteúdo. Roda no navegador: `page.evaluate(horizontalOverflow)`.
 *
 * O `<main id="main-content">` usa `overflow-x: clip`, então o `scrollWidth` do documento
 * não enxerga conteúdo estourando. Medimos dentro dele: elementos visíveis cuja borda direita
 * passa da tela e que não estão dentro de um contêiner rolável/cortado (abas rolantes, tabelas
 * com overflow-x). Retorna `{ overflow, tag }` (px de excesso; 0 = ok).
 */
export function horizontalOverflow() {
  const main = document.getElementById('main-content') ?? document.body;
  const visible = (element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
  };
  const clipped = (element) => {
    for (let node = element.parentElement; node && node !== main; node = node.parentElement) {
      if (getComputedStyle(node).overflowX !== 'visible') return true;
    }
    return false;
  };
  const escaping = [...main.querySelectorAll('*')]
    .filter((element) => visible(element) && getComputedStyle(element).position !== 'fixed')
    .filter((element) => element.getBoundingClientRect().right > window.innerWidth + 1 && !clipped(element));
  const widest = escaping.reduce((max, element) => Math.max(max, element.getBoundingClientRect().right), 0);

  return {
    overflow: Math.max(document.documentElement.scrollWidth - window.innerWidth, Math.round(widest - window.innerWidth)),
    tag: escaping[0] ? `${escaping[0].tagName.toLowerCase()}.${String(escaping[0].className).slice(0, 60)}` : '',
  };
}
