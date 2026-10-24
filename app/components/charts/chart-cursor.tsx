/** Linha vertical e marcador do ponto ativo; vai dentro do `<svg>` do gráfico. */
export function ChartCursor({
  x,
  y,
  top,
  bottom,
  color = 'var(--primary)',
}: {
  x: number;
  y: number;
  top: number;
  bottom: number;
  color?: string;
}) {
  return (
    <g pointerEvents="none">
      <line x1={x} x2={x} y1={top} y2={bottom} stroke="var(--border-strong)" strokeDasharray="2 3" />
      <circle cx={x} cy={y} r="6" fill="var(--surface)" stroke={color} strokeWidth="3" />
    </g>
  );
}
