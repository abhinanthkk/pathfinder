import { useState, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, User } from 'lucide-react'
import useUserStore from '../store/useUserStore'
import api from '../services/api'
import { Logo } from '../components/shared/Logo'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useToast } from '../context/ToastContext'

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

const selectionClass = (active) =>
  active
    ? 'bg-primary-600 text-white'
    : 'bg-surface-800 text-surface-300 border border-surface-700 hover:border-surface-500'

export default function OnboardingPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isDemo = searchParams.get('demo') === 'true'
  const toast = useToast()

  const [mode, setMode] = useState(isDemo ? 'form' : null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const chatEndRef = useRef(null)

  const { setProfile } = useUserStore()

  const [form, setForm] = useState({
    goal: '',
    target_role: '',
    skills: {},
    weekly_hours: 5,
    preferred_learning_style: 'mixed',
    experience_level: 'beginner',
  })
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (mode === 'chat') {
      setMessages([
        {
          role: 'assistant',
          content:
            "Hi! I'm your AI learning advisor. Tell me about your learning goal and what you already know, and I will create a personalized roadmap for you.",
        },
      ])
    }
  }, [mode])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return

    const userMsg = input.trim()
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)

    try {
      const res = await api.sendChatMessage(
        userMsg,
        messages.map((m) => ({ role: m.role, content: m.content }))
      )

      setMessages((prev) => [...prev, { role: 'assistant', content: res.reply }])

      if (res.extracted_profile) {
        setProfile(res.extracted_profile)
      }

      if (res.profile_complete) {
        toast.success('Profile complete! Generating your roadmap…')
        setTimeout(() => navigate('/roadmap'), 2000)
      }
    } catch {
      toast.error('We couldn’t reach the advisor. Please try again or use the quick form.')
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, something went wrong. Please try again or use the quick form.',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleFormSubmit = async () => {
    if (!form.target_role) {
      setFormError('Please choose a learning goal to continue.')
      return
    }
    setFormError('')
    setLoading(true)
    try {
      await api.createProfile({
        goal: GOALS.find((g) => g.id === form.target_role)?.label || form.goal,
        target_role: form.target_role,
        interests: [],
        experience_level: form.experience_level,
        weekly_hours: form.weekly_hours,
        preferred_learning_style: form.preferred_learning_style,
        skills: form.skills,
      })

      const profileRes = await api.getProfile()
      setProfile(profileRes)
      toast.success('Profile saved! Building your path…')
      navigate('/roadmap')
    } catch {
      setFormError('We couldn’t save your profile. Please try again.')
      toast.error('Failed to save your profile.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-950">
      <header className="flex items-center justify-between border-b border-surface-800 px-4 py-3 sm:px-6">
        <Logo to="/dashboard" />
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-surface-400 transition-colors hover:text-surface-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to dashboard
        </button>
      </header>

      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10">
        {!mode ? (
          <Card className="w-full max-w-lg text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-500/15">
              <User className="h-6 w-6 text-primary-400" aria-hidden="true" />
            </div>
            <h1 className="text-2xl font-bold text-white">How would you like to start?</h1>
            <p className="mt-2 text-surface-400">Choose how you would like to set up your profile.</p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Button
                size="lg"
                variant="secondary"
                className="flex-1"
                onClick={() => setMode('chat')}
              >
                <span aria-hidden="true">💬</span> Chat with AI
              </Button>
              <Button size="lg" className="flex-1" onClick={() => setMode('form')}>
                <span aria-hidden="true">📝</span> Quick form
              </Button>
            </div>
          </Card>
        ) : mode === 'form' ? (
          <Card className="w-full max-w-xl">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-white">Build your profile</h1>
              <p className="mt-1 text-surface-400">
                Tell us about yourself so we can create your learning path.
              </p>
            </div>

            {formError && (
              <div
                role="alert"
                className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-300"
              >
                {formError}
              </div>
            )}

            <div className="space-y-6">
              <div>
                <p className="mb-2 text-sm font-medium text-surface-300">
                  Learning goal <span className="text-red-400" aria-hidden="true">*</span>
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {GOALS.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => setForm({ ...form, target_role: g.id })}
                      className={`rounded-xl p-3 text-sm font-medium transition-all ${selectionClass(form.target_role === g.id)}`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-surface-300">Current skills</p>
                <div className="flex flex-wrap gap-2">
                  {QUICK_SKILLS.map((s) => {
                    const active = !!form.skills[s.id]
                    return (
                      <button
                        key={s.id}
                        onClick={() => {
                          const newSkills = { ...form.skills }
                          if (newSkills[s.id]) delete newSkills[s.id]
                          else newSkills[s.id] = 0.5
                          setForm({ ...form, skills: newSkills })
                        }}
                        className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${selectionClass(active)}`}
                        aria-pressed={active}
                      >
                        {s.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label
                  htmlFor="weekly-hours"
                  className="mb-2 block text-sm font-medium text-surface-300"
                >
                  Weekly hours: <span className="text-white">{form.weekly_hours}h</span>
                </label>
                <input
                  id="weekly-hours"
                  type="range"
                  min="1"
                  max="40"
                  value={form.weekly_hours}
                  onChange={(e) =>
                    setForm({ ...form, weekly_hours: parseInt(e.target.value, 10) })
                  }
                  className="w-full accent-primary-500"
                />
                <div className="flex justify-between text-xs text-surface-500">
                  <span>1h</span>
                  <span>40h</span>
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-surface-300">Preferred learning style</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {STYLES.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setForm({ ...form, preferred_learning_style: s.id })}
                      className={`rounded-xl p-3 text-sm font-medium transition-all ${selectionClass(form.preferred_learning_style === s.id)}`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-surface-300">Experience level</p>
                <div className="grid grid-cols-3 gap-2">
                  {['beginner', 'intermediate', 'advanced'].map((l) => (
                    <button
                      key={l}
                      onClick={() => setForm({ ...form, experience_level: l })}
                      className={`rounded-xl p-3 text-sm font-medium capitalize transition-all ${selectionClass(form.experience_level === l)}`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-2 sm:flex-row-reverse">
                <Button onClick={handleFormSubmit} loading={loading} className="flex-1">
                  Generate my path
                </Button>
                <Button variant="ghost" onClick={() => setMode(null)}>
                  ← Back
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="flex w-full max-w-2xl flex-col" padded={false}>
            <div className="flex items-center justify-between border-b border-surface-800 p-4">
              <div>
                <h1 className="text-lg font-bold text-white">AI Learning Advisor</h1>
                <p className="text-sm text-surface-400">Tell me about your goals</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setMode('form')}>
                Use form instead
              </Button>
            </div>

            <div className="h-[60vh] space-y-4 overflow-y-auto p-4">
              <AnimatePresence>
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'rounded-br-md bg-primary-600 text-white'
                          : 'rounded-bl-md border border-surface-700 bg-surface-800 text-surface-200'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-md border border-surface-700 bg-surface-800 p-4">
                    <div className="flex gap-1.5">
                      <div className="h-2 w-2 animate-bounce rounded-full bg-surface-500" />
                      <div
                        className="h-2 w-2 animate-bounce rounded-full bg-surface-500"
                        style={{ animationDelay: '150ms' }}
                      />
                      <div
                        className="h-2 w-2 animate-bounce rounded-full bg-surface-500"
                        style={{ animationDelay: '300ms' }}
                      />
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="flex gap-3 border-t border-surface-800 p-4">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Describe your goal…"
                className="h-10 flex-1 rounded-lg border border-surface-700 bg-surface-950 px-3 text-sm text-white placeholder:text-surface-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <Button onClick={handleSendMessage} disabled={!input.trim() || loading}>
                Send
              </Button>
            </div>
          </Card>
        )}
      </main>
    </div>
  )
}
