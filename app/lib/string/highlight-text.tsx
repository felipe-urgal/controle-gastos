type HighlightOptions = {
  className?: string
};

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const highlightText = (
  text: string,
  search: string,
  { className = 'bg-purple-500/30 text-white rounded px-0.5' }: HighlightOptions = {}
) => {
  if (!search || !text) return text

  const safeSearch = escapeRegex(search)

  const parts = text.split(new RegExp(`(${safeSearch})`, 'gi'))

  return parts.map((part, index) =>
    part.toLowerCase() === search.toLowerCase() ? (
      <mark key={index} className={className}>
        {part}
      </mark>
    ) : (
      part
    )
  )
};