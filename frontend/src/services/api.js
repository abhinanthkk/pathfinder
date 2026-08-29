import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    console.error('API Error:', err.response?.data || err.message)
    if (err.response?.status === 401 && err.config?.headers?.Authorization) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/'
    }
    return Promise.reject(err)
  }
)

export const healthCheck = () => api.get('/health')

// Auth APIs
export const signup = (data) => api.post('/auth/signup', data)
export const login = (data) => api.post('/auth/login', data)
export const getMe = () => api.get('/auth/me')

// Profile & Core APIs
export const createProfile = (data) => api.post('/profile', data)
export const getProfile = () => api.get('/profile')
export const getRecommendations = (limit = 10) =>
  api.post('/recommend', { limit })
export const generatePath = () => api.post('/path', {})
export const getPath = (pathId) =>
  api.get('/path', { params: pathId ? { path_id: pathId } : {} })
export const explainRecommendation = (resourceId) =>
  api.post('/explain', { resource_id: resourceId }, { timeout: 25000 })
export const updateProgress = (resourceId, status) =>
  api.post('/progress', { resource_id: resourceId, status }, { timeout: 15000 })
export const getDashboard = (pathId) =>
  api.get('/dashboard', { params: pathId ? { path_id: pathId } : {} })
export const sendChatMessage = (message, history = []) =>
  api.post('/chat', { message, conversation_history: history }, { timeout: 45000 })
export const askQuestion = (question, resourceId = null) =>
  api.post('/ask', { question, resource_id: resourceId }, { timeout: 30000 })

// Streak & Activity APIs
export const getStreak = () => api.get('/streak')
export const recordActivity = (type) => api.post('/activity', { type })

// Badges API
export const getBadges = () => api.get('/badges')

// Milestone check API
export const checkMilestone = (milestoneId) =>
  api.post('/milestone/check', { milestone_id: milestoneId })

// Skill Progress API
export const getSkillProgress = (pathId) =>
  api.get('/skill-progress', { params: pathId ? { path_id: pathId } : {} })

// Generate Roadmap API (for custom goals)
export const generateRoadmap = (data) =>
  api.post('/roadmap/generate', data, { timeout: 60000 })

// Multi-role goals API
export const getOnboardingStatus = () => api.get('/onboarding-status')
export const getGoals = () => api.get('/goals')
export const getPaths = () => api.get('/paths')
export const createGoal = (data) => api.post('/goals', data, { timeout: 60000 })
export const activateGoal = (pathId) => api.post(`/goals/${pathId}/activate`)
export const activatePath = (pathId) => api.put(`/paths/${pathId}/activate`)
export const archivePath = (pathId) => api.post(`/paths/${pathId}/archive`)
export const getPathProgress = (pathId) => api.get(`/paths/${pathId}/progress`)
export const completeStep = (pathId, nodeId) =>
  api.post(`/paths/${pathId}/steps/${nodeId}/complete`, {}, { timeout: 15000 })
export const skipStep = (pathId, nodeId) =>
  api.post(`/paths/${pathId}/steps/${nodeId}/skip`, {}, { timeout: 15000 })

// Attach all methods to the axios instance for convenience
api.healthCheck = healthCheck
api.signup = signup
api.login = login
api.getMe = getMe
api.createProfile = createProfile
api.getProfile = getProfile
api.getRecommendations = getRecommendations
api.generatePath = generatePath
api.getPath = getPath
api.explainRecommendation = explainRecommendation
api.updateProgress = updateProgress
api.getDashboard = getDashboard
api.sendChatMessage = sendChatMessage
api.askQuestion = askQuestion
api.getStreak = getStreak
api.recordActivity = recordActivity
api.getBadges = getBadges
api.checkMilestone = checkMilestone
api.getSkillProgress = getSkillProgress
api.generateRoadmap = generateRoadmap
api.getOnboardingStatus = getOnboardingStatus
api.getGoals = getGoals
api.getPaths = getPaths
api.createGoal = createGoal
api.activateGoal = activateGoal
api.activatePath = activatePath
api.archivePath = archivePath
api.getPathProgress = getPathProgress
api.completeStep = completeStep
api.skipStep = skipStep

export default api
