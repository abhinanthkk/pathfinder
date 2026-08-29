// Shared helpers for step resource rendering (used by Progress and Roadmap).

export function getStepResources(step) {
  if (step.resources && step.resources.length > 0) return step.resources
  const query = encodeURIComponent((step.title || '') + ' tutorial')
  const gfg = (step.title || '').toLowerCase().replace(/\s+/g, '-')
  return [
    {
      title: `Watch: ${step.title}`,
      type: 'youtube',
      url: `https://www.youtube.com/results?search_query=${query}`,
      source: 'YouTube',
    },
    {
      title: `Read: ${step.title}`,
      type: 'article',
      url: `https://www.geeksforgeeks.org/${gfg}/`,
      source: 'GeeksforGeeks',
    },
  ]
}

export function resourceTone(source) {
  switch (source) {
    case 'YouTube':
      return 'text-red-400 bg-red-500/10 border-red-500/25 hover:bg-red-500/15'
    case 'GeeksforGeeks':
      return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25 hover:bg-emerald-500/15'
    case 'W3Schools':
      return 'text-sky-400 bg-sky-500/10 border-sky-500/25 hover:bg-sky-500/15'
    default:
      return 'text-surface-300 bg-surface-800/60 border-surface-700 hover:bg-surface-700/50'
  }
}

export function resourceMark(source) {
  switch (source) {
    case 'YouTube':
      return { glyph: '▶', label: 'Watch on YouTube' }
    case 'GeeksforGeeks':
      return { glyph: 'GFG', label: 'GeeksforGeeks' }
    case 'W3Schools':
      return { glyph: 'W3', label: 'W3Schools' }
    default:
      return { glyph: '▤', label: 'Article' }
  }
}