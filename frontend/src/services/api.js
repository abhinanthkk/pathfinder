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
    if (err.response?.status === 401) {
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
export const getPath = () => api.get('/path')
export const explainRecommendation = (resourceId) =>
  api.post('/explain', { resource_id: resourceId }, { timeout: 25000 })
export const updateProgress = (resourceId, status) =>
  api.post('/progress', { resource_id: resourceId, status }, { timeout: 15000 })
export const getDashboard = () => api.get('/dashboard')
export const sendChatMessage = (message, history = []) =>
  api.post('/chat', { message, conversation_history: history }, { timeout: 45000 })
export const askQuestion = (question, resourceId = null) =>
  api.post('/ask', { question, resource_id: resourceId }, { timeout: 30000 })

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

export default api
