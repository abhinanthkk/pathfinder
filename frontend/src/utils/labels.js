// Central mapping of raw skill ids to human-friendly labels, used across screens.
// Extend here rather than duplicating label maps in individual pages.
export const SKILL_LABELS = {
  python_basics: 'Python',
  sql_basics: 'SQL',
  git_basics: 'Git',
  functions: 'Functions',
  oop: 'OOP',
  rest_apis: 'REST APIs',
  fastapi: 'FastAPI',
  postgresql: 'PostgreSQL',
  docker_basics: 'Docker',
  testing: 'Testing',
  authentication: 'Auth',
  http_basics: 'HTTP',
  numpy: 'NumPy',
  pandas: 'Pandas',
  statistics: 'Statistics',
  data_visualization: 'Data Viz',
  exploratory_analysis: 'EDA',
  machine_learning: 'ML',
  feature_engineering: 'Feature Eng',
  html_basics: 'HTML',
  css_basics: 'CSS',
  responsive_design: 'Responsive',
  javascript_basics: 'JavaScript',
  javascript_advanced: 'Advanced JS',
  typescript: 'TypeScript',
  react_basics: 'React',
  react_advanced: 'Advanced React',
  state_management: 'State Mgmt',
  react_ROUTING: 'Routing',
  api_integration: 'API Integration',
  css_frameworks: 'CSS Frameworks',
  testing_frontend: 'Frontend Testing',
}

export function skillLabel(id) {
  return SKILL_LABELS[id] || String(id).replace(/_/g, ' ')
}

export function humanize(str = '') {
  return String(str).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
