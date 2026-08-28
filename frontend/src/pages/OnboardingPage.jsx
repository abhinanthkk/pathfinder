import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import useUserStore from '../store/useUserStore'
import api from '../services/api'
import { Logo } from '../components/shared/Logo'
import { Button } from '../components/ui/Button'
import { PathfinderAssistant } from '../components/shared/PathfinderAssistant'
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
  { id: 'project', label: 'Project-First' },
  { id: 'video', label: 'Visual / Video' },
  { id: 'text', label: 'Documentation / Text' },
  { id: 'mixed', label: 'Balanced Mix' },
]

const selectionClass = (active) =>
  active
    ? 'border-primary-400 bg-primary-400/10 text-primary-400 font-semibold'
    : 'border-surface-700 bg-surface-900 text-surface-300 hover:border-surface-600 hover:text-white'

export default function OnboardingPage() {
  const navigate = useNavigate()
  const toast = useToast()
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
  const [loading, setLoading] = useState(false)
  const [focusedField, setFocusedField] = useState('this screen')

  const onSectionFocus = (id) => () => setFocusedField(id)

  const handleFormSubmit = async () => {
    if (!form.target_role) {
      setFormError('Please select a target role to proceed.')
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
      toast.success('Profile synthesized! Generating learning graph…')
      navigate('/roadmap')
    } catch {
      setFormError('Failed to save technical profile. Please try again.')
      toast.error('Failed to save profile.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-950 text-surface-100">
      {/* Header */}
      <header className="flex h-14 items-center justify-between border-b border-surface-800 px-4 sm:px-8">
        <Logo to="/dashboard" />
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 font-mono text-xs text-surface-400 transition-colors hover:text-white focus:outline-none focus-visible:ring-1 focus-visible:ring-primary-400"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span>RETURN TO DASHBOARD</span>
        </button>
      </header>

      <main className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-xl rounded-[8px] border border-surface-800 bg-surface-900/60 p-6 sm:p-8">
          <div className="mb-6 border-b border-surface-800 pb-4">
            <p className="font-mono text-[10px] font-medium uppercase tracking-widest text-primary-400">
              &gt; PROFILE PARAMETERS
            </p>
            <h1 className="mt-1 text-xl font-semibold text-white">Setup your learning path</h1>
            <p className="mt-1 text-xs text-surface-400">
              Complete these parameters and Pathfinder will generate your personalized roadmap.
            </p>
          </div>

          {formError && (
            <div
              role="alert"
              className="mb-5 rounded-[6px] border border-red-500/30 bg-red-500/10 px-3.5 py-2 font-mono text-xs text-red-300"
            >
              {formError}
            </div>
          )}

          <div className="space-y-6">
            <div data-field="Target role" onFocusCapture={onSectionFocus('Target role')} onMouseEnter={onSectionFocus('Target role')}>
              <p className="mb-2 font-mono text-xs uppercase tracking-wider text-surface-300">
                Target Role <span className="text-primary-400">*</span>
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {GOALS.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setForm({ ...form, target_role: g.id })}
                    className={`rounded-[6px] border p-3 text-xs font-medium transition-all ${selectionClass(form.target_role === g.id)}`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            <div data-field="Existing baseline skills" onFocusCapture={onSectionFocus('Existing baseline skills')} onMouseEnter={onSectionFocus('Existing baseline skills')}>
              <p className="mb-2 font-mono text-xs uppercase tracking-wider text-surface-300">Existing Baseline Skills</p>
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
                      className={`rounded-[6px] border px-3 py-1.5 font-mono text-xs transition-all ${selectionClass(active)}`}
                      aria-pressed={active}
                    >
                      {s.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div data-field="Weekly commitment" onFocusCapture={onSectionFocus('Weekly commitment')} onMouseEnter={onSectionFocus('Weekly commitment')}>
              <div className="mb-2 flex items-center justify-between font-mono text-xs">
                <label htmlFor="weekly-hours" className="uppercase tracking-wider text-surface-300">
                  Weekly Commitment
                </label>
                <span className="text-primary-400 font-bold">{form.weekly_hours} HOURS / WEEK</span>
              </div>
              <input
                id="weekly-hours"
                type="range"
                min="1"
                max="40"
                value={form.weekly_hours}
                onChange={(e) => setForm({ ...form, weekly_hours: parseInt(e.target.value, 10) })}
                className="w-full accent-primary-400"
              />
              <div className="flex justify-between font-mono text-[10px] text-surface-500">
                <span>1h</span>
                <span>40h</span>
              </div>
            </div>

            <div data-field="Preferred learning style" onFocusCapture={onSectionFocus('Preferred learning style')} onMouseEnter={onSectionFocus('Preferred learning style')}>
              <p className="mb-2 font-mono text-xs uppercase tracking-wider text-surface-300">Preferred Learning Style</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {STYLES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setForm({ ...form, preferred_learning_style: s.id })}
                    className={`rounded-[6px] border p-2.5 text-xs transition-all ${selectionClass(form.preferred_learning_style === s.id)}`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div data-field="Experience level" onFocusCapture={onSectionFocus('Experience level')} onMouseEnter={onSectionFocus('Experience level')}>
              <p className="mb-2 font-mono text-xs uppercase tracking-wider text-surface-300">Experience Level</p>
              <div className="grid grid-cols-3 gap-2">
                {['beginner', 'intermediate', 'advanced'].map((l) => (
                  <button
                    key={l}
                    onClick={() => setForm({ ...form, experience_level: l })}
                    className={`rounded-[6px] border p-2.5 font-mono text-xs uppercase transition-all ${selectionClass(form.experience_level === l)}`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-surface-800 pt-5 sm:flex-row-reverse">
              <Button onClick={handleFormSubmit} loading={loading} className="flex-1 font-mono text-xs">
                COMPILE LEARNING GRAPH <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
              <Button variant="ghost" onClick={() => navigate('/dashboard')} className="font-mono text-xs">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </main>

      <PathfinderAssistant context={{ field: focusedField }} label="Ask Pathfinder AI" />
    </div>
  )
}
