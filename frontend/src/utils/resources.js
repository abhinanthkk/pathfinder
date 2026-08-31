// Shared helpers for step resource rendering (used by Progress and Roadmap).

const W3SCHOOLS_TOPICS = ['html', 'css', 'javascript', 'js', 'sql', 'python', 'react', 'java', 'nodejs', 'node', 'php', 'bootstrap', 'jquery', 'git', 'api', 'xml', 'angular', 'typescript', 'ts', 'mongo', 'mongodb', 'mysql', 'express', 'django', 'flask', 'kivy', 'data science', 'web app', 'web design', 'http', 'json']

function hasW3SchoolsTopic(query) {
  const q = query.toLowerCase()
  return W3SCHOOLS_TOPICS.some((topic) => q.includes(topic))
}

export function getStepResources(step) {
  if (step.resources && step.resources.length > 0) return step.resources
  const query = encodeURIComponent((step.title || '') + ' tutorial')
  const gfg = (step.title || '').toLowerCase().replace(/\s+/g, '-')
  const base = [
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
  if (hasW3SchoolsTopic(step.title || '')) {
    base.push({
      title: `Practice: ${step.title}`,
      type: 'docs',
      url: `https://www.w3schools.com/`,
      source: 'W3Schools',
    })
  }
  return base
}

export function resourceTone(source) {
  switch (source) {
    case 'YouTube':
      return 'text-[#FF0000] bg-red-50 border-red-100 hover:bg-red-100 hover:border-red-200'
    case 'GeeksforGeeks':
      return 'text-[#2F8D46] bg-emerald-50 border-emerald-100 hover:bg-emerald-100 hover:border-emerald-200'
    case 'W3Schools':
      return 'text-sky-600 bg-sky-50 border-sky-100 hover:bg-sky-100 hover:border-sky-200'
    default:
      return 'text-ink-400 bg-surface-secondary border-line hover:bg-surface'
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
