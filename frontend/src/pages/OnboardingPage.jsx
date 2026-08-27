import { useState, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import useUserStore from '../store/useUserStore'
import api from '../services/api'

const QUICK_SKILLS = [
  { id: 'python_basics', label: 'Python' },
  { id: 'sql_basics', label: 'SQL' },
  { id: 'javascript_basics', label: 'JavaScript' },
  { id: 'git_basics', label: 'Git' },
  { id: 'docker_basics', label: 'Docker' },
  { id: 'html_basics', label: 'HTML/CSS' },
]

const GOALS = [
  { id: 'backend_developer', label: 'Backend Developer' },
  { id: 'data_scientist', label: 'Data Scientist' },
  { id: 'frontend_developer', label: 'Frontend Developer' },
]

const STYLES = [
  { id: 'project', label: 'Projects' },
  { id: 'video', label: 'Videos' },
  { id: 'text', label: 'Reading' },
  { id: 'mixed', label: 'Mixed' },
]

export default function OnboardingPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isDemo = searchParams.get('demo') === 'true'

  const [mode, setMode] = useState(isDemo ? 'form' : null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const chatEndRef = useRef(null)

  const { setUserId, setProfile, profile } = useUserStore()

  const [form, setForm] = useState({
    goal: '',
    target_role: '',
    skills: {},
    weekly_hours: 5,
    preferred_learning_style: 'mixed',
    experience_level: 'beginner',
  })

  useEffect(() => {
    if (mode === 'chat') {
      setMessages([{
        role: 'assistant',
        content: "Hi! I'm your AI learning advisor. Tell me about your learning goal and what you already know, and I'll create a personalized roadmap for you.",
      }])
    }
  }, [mode])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return

    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)

    try {
      const userId = useUserStore.getState().userId


      const res = await api.sendChatMessage(userMsg, messages.map(m => ({
        role: m.role,
        content: m.content,
      })))

      setMessages(prev => [...prev, { role: 'assistant', content: res.reply }])

      if (res.extracted_profile) {
        setProfile(res.extracted_profile)
      }

      if (res.profile_complete) {
        setTimeout(() => navigate('/roadmap'), 2000)
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again or use the quick form.',
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleFormSubmit = async () => {
    setLoading(true)
    try {
      await api.createProfile({
        goal: GOALS.find(g => g.id === form.target_role)?.label || form.goal,
        target_role: form.target_role,
        interests: [],
        experience_level: form.experience_level,
        weekly_hours: form.weekly_hours,
        preferred_learning_style: form.preferred_learning_style,
        skills: form.skills,
      })

      const profileRes = await api.getProfile()
      setProfile(profileRes)

      navigate('/roadmap')
    } catch (err) {
      console.error('Profile creation failed:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!mode) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-lg w-full text-center"
        >
          <h1 className="text-3xl font-bold text-white mb-3">How would you like to start?</h1>
          <p className="text-surface-400 mb-8">Choose how you'd like to set up your learning profile.</p>
          <div className="flex gap-4">
            <button
              onClick={() => setMode('chat')}
              className="flex-1 p-6 rounded-2xl bg-surface-800 border border-surface-700 hover:border-primary-500 transition-all group"
            >
              <div className="text-3xl mb-3">💬</div>
              <h3 className="text-lg font-semibold text-white mb-1">Chat with AI</h3>
              <p className="text-sm text-surface-400">Natural conversation to build your profile</p>
            </button>
            <button
              onClick={() => setMode('form')}
              className="flex-1 p-6 rounded-2xl bg-surface-800 border border-surface-700 hover:border-primary-500 transition-all group"
            >
              <div className="text-3xl mb-3">📝</div>
              <h3 className="text-lg font-semibold text-white mb-1">Quick Form</h3>
              <p className="text-sm text-surface-400">Fill in your details directly</p>
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  if (mode === 'form') {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-xl w-full"
        >
          <h1 className="text-3xl font-bold text-white mb-2">Build Your Profile</h1>
          <p className="text-surface-400 mb-8">Tell us about yourself so we can create your learning path.</p>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-2">Learning Goal</label>
              <div className="grid grid-cols-3 gap-2">
                {GOALS.map(g => (
                  <button
                    key={g.id}
                    onClick={() => setForm({ ...form, target_role: g.id })}
                    className={`p-3 rounded-xl text-sm font-medium transition-all ${
                      form.target_role === g.id
                        ? 'bg-primary-600 text-white'
                        : 'bg-surface-800 text-surface-300 border border-surface-700 hover:border-surface-500'
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-300 mb-2">Current Skills</label>
              <div className="flex flex-wrap gap-2">
                {QUICK_SKILLS.map(s => (
                  <button
                    key={s.id}
                    onClick={() => {
                      const newSkills = { ...form.skills }
                      if (newSkills[s.id]) {
                        delete newSkills[s.id]
                      } else {
                        newSkills[s.id] = 0.5
                      }
                      setForm({ ...form, skills: newSkills })
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      form.skills[s.id]
                        ? 'bg-primary-600 text-white'
                        : 'bg-surface-800 text-surface-300 border border-surface-700 hover:border-surface-500'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-300 mb-2">
                Weekly Hours: {form.weekly_hours}h
              </label>
              <input
                type="range"
                min="1"
                max="40"
                value={form.weekly_hours}
                onChange={(e) => setForm({ ...form, weekly_hours: parseInt(e.target.value) })}
                className="w-full accent-primary-500"
              />
              <div className="flex justify-between text-xs text-surface-500 mt-1">
                <span>1h</span>
                <span>40h</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-300 mb-2">Preferred Learning Style</label>
              <div className="grid grid-cols-4 gap-2">
                {STYLES.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setForm({ ...form, preferred_learning_style: s.id })}
                    className={`p-3 rounded-xl text-sm font-medium transition-all ${
                      form.preferred_learning_style === s.id
                        ? 'bg-primary-600 text-white'
                        : 'bg-surface-800 text-surface-300 border border-surface-700 hover:border-surface-500'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-300 mb-2">Experience Level</label>
              <div className="grid grid-cols-3 gap-2">
                {['beginner', 'intermediate', 'advanced'].map(l => (
                  <button
                    key={l}
                    onClick={() => setForm({ ...form, experience_level: l })}
                    className={`p-3 rounded-xl text-sm font-medium capitalize transition-all ${
                      form.experience_level === l
                        ? 'bg-primary-600 text-white'
                        : 'bg-surface-800 text-surface-300 border border-surface-700 hover:border-surface-500'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleFormSubmit}
              disabled={!form.target_role || loading}
              className="w-full py-3.5 rounded-xl bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-all"
            >
              {loading ? 'Creating Profile...' : 'Generate My Learning Path'}
            </button>
          </div>

          <button
            onClick={() => setMode(null)}
            className="mt-4 text-sm text-surface-500 hover:text-surface-300 transition-colors"
          >
            ← Back to options
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">AI Learning Advisor</h1>
          <p className="text-sm text-surface-400">Tell me about your goals</p>
        </div>
        <button
          onClick={() => setMode('form')}
          className="text-sm text-primary-400 hover:text-primary-300 transition-colors"
        >
          Use Form Instead
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-primary-600 text-white rounded-br-md'
                  : 'bg-surface-800 text-surface-200 border border-surface-700 rounded-bl-md'
              }`}>
                {msg.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div className="bg-surface-800 border border-surface-700 rounded-2xl rounded-bl-md p-4">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 bg-surface-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-surface-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-surface-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </motion.div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="flex gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Describe your goal..."
          className="flex-1 px-4 py-3 rounded-xl bg-surface-800 border border-surface-700 text-white placeholder-surface-500 focus:outline-none focus:border-primary-500 transition-colors text-sm"
        />
        <button
          onClick={handleSendMessage}
          disabled={!input.trim() || loading}
          className="px-6 py-3 rounded-xl bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white font-medium transition-all"
        >
          Send
        </button>
      </div>
    </div>
  )
}
