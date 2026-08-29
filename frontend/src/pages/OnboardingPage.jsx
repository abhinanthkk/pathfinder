import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, X, MessageSquare, Zap, Layers } from 'lucide-react'
import useUserStore from '../store/useUserStore'
import useGoalsStore from '../store/useGoalsStore'
import api from '../services/api'
import { Logo } from '../components/shared/Logo'
import { Button } from '../components/ui/Button'
import { AskPathfinder } from '../components/shared/AskPathfinder'
import { useToast } from '../context/ToastContext'

const GOALS = [
  { id: 'backend_developer', label: 'Backend Developer', useAI: false },
  { id: 'frontend_developer', label: 'Frontend Developer', useAI: false },
  { id: 'full_stack_developer', label: 'Full Stack Developer', useAI: true },
  { id: 'data_scientist', label: 'Data Scientist', useAI: false },
  { id: 'ml_engineer', label: 'Machine Learning Engineer', useAI: false },
  { id: 'ai_engineer', label: 'AI Engineer', useAI: true },
  { id: 'devops_engineer', label: 'DevOps Engineer', useAI: false },
  { id: 'cybersecurity', label: 'Cybersecurity', useAI: false },
  { id: 'mobile_app_developer', label: 'Mobile App Developer', useAI: true },
  { id: 'uiux_designer', label: 'UI/UX Designer', useAI: false },
]

const QUICK_SKILLS = [
  { id: 'python', label: 'Python' },
  { id: 'javascript', label: 'JavaScript' },
  { id: 'html_css', label: 'HTML/CSS' },
  { id: 'java', label: 'Java' },
  { id: 'cpp', label: 'C++' },
  { id: 'sql', label: 'SQL' },
  { id: 'react', label: 'React' },
  { id: 'docker', label: 'Docker' },
  { id: 'git', label: 'Git' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'nodejs', label: 'Node.js' },
  { id: 'linux', label: 'Linux' },
]

const EXPERIENCE_LEVELS = [
  { id: 'beginner', label: 'Beginner' },
  { id: 'intermediate', label: 'Intermediate' },
  { id: 'advanced', label: 'Advanced' },
]

const LEARNING_STYLES = [
  { id: 'projects', label: 'Projects' },
  { id: 'videos', label: 'Videos' },
  { id: 'reading', label: 'Reading' },
  { id: 'mixed', label: 'Mixed' },
]

const btnActive = 'border-primary-400 bg-primary-400/10 text-primary-400 font-semibold'
const btnInactive =
  'border-surface-700 bg-surface-900 text-surface-300 hover:border-surface-600 hover:text-white'

const selectionClass = (active) => (active ? btnActive : btnInactive)

export default function OnboardingPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { setProfile } = useUserStore()
  const { goals, status: goalsStatus, fetchGoals, createGoal, isMaxed } = useGoalsStore()

  const [activeTab, setActiveTab] = useState('form') // 'form' | 'chat'
  const [assistantOpen, setAssistantOpen] = useState(false)

  // Form state
  const [selectedGoalId, setSelectedGoalId] = useState('')
  const [customGoalVisible, setCustomGoalVisible] = useState(false)
  const [customGoalText, setCustomGoalText] = useState('')
  const [selectedSkills, setSelectedSkills] = useState([])
  const [customSkillInput, setCustomSkillInput] = useState('')
  const [customSkills, setCustomSkills] = useState([])
  const [experienceLevel, setExperienceLevel] = useState('beginner')
  const [weeklyHours, setWeeklyHours] = useState(10)
  const [learningStyle, setLearningStyle] = useState('mixed')
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    fetchGoals()
  }, [fetchGoals])

  const activeGoalCount = (goals || []).filter((g) => g.status === 'active').length
  const maxed = isMaxed()

  const handleGoalSelect = (goalId) => {
    if (goalId === '__custom__') {
      setSelectedGoalId('__custom__')
      setCustomGoalVisible(true)
    } else {
      setSelectedGoalId(goalId)
      setCustomGoalVisible(false)
      setCustomGoalText('')
    }
  }

  const toggleSkill = (skillId) => {
    setSelectedSkills((prev) =>
      prev.includes(skillId) ? prev.filter((s) => s !== skillId) : [...prev, skillId]
    )
  }

  const addCustomSkill = () => {
    const trimmed = customSkillInput.trim()
    if (!trimmed) return
    if (!customSkills.includes(trimmed) && !selectedSkills.includes(trimmed)) {
      setCustomSkills((prev) => [...prev, trimmed])
    }
    setCustomSkillInput('')
  }

  const removeCustomSkill = (skill) => {
    setCustomSkills((prev) => prev.filter((s) => s !== skill))
  }

  const handleCustomSkillKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addCustomSkill()
    }
  }

  const handleSubmit = async () => {
    if (maxed) {
      setFormError('You currently have 2 active learning paths. Remove or finish one before adding another.')
      return
    }

    const isCustomGoal = selectedGoalId === '__custom__'
    const goalText = isCustomGoal ? customGoalText.trim() : selectedGoalId

    if (!goalText) {
      setFormError(
        isCustomGoal
          ? 'Please enter your custom goal.'
          : 'Please select a learning goal to proceed.'
      )
      return
    }

    setFormError('')
    setLoading(true)

    const allSkills = {}
    selectedSkills.forEach((s) => { allSkills[s] = 0.5 })
    customSkills.forEach((s) => { allSkills[s.toLowerCase().replace(/\s+/g, '_')] = 0.5 })

    try {
      const selected = GOALS.find((g) => g.id === selectedGoalId)
      // Always route through the goals API: known roles resolve to the skill
      // graph, everything else (custom + AI-only presets) falls back to the
      // AI/fallback generator. Exactly one role is created/refreshed.
      await createGoal({
        target_role: isCustomGoal ? '' : (selected?.id || ''),
        goal: isCustomGoal ? customGoalText : (selected?.label || ''),
        experience_level: experienceLevel,
        weekly_hours: weeklyHours,
        preferred_learning_style: learningStyle,
        skills: allSkills,
      })

      // Refresh profile from the server so the store reflects the new goal.
      const profileRes = await api.getProfile()
      setProfile(profileRes)

      toast.success('Learning path generated for this role.')
      navigate('/dashboard')
    } catch (err) {
      const detail = err?.response?.data?.detail
      if (typeof detail === 'string' && detail.includes('2 active learning paths')) {
        setFormError(detail)
      } else {
        setFormError('Failed to generate your learning path. Please try again.')
        toast.error('Something went wrong. Please retry.')
      }
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

      <main className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-2xl">
          {/* Title */}
          <div className="mb-6 text-center">
            <p className="font-mono text-[10px] font-medium uppercase tracking-widest text-primary-400">
              &gt; PATHFINDER ONBOARDING
            </p>
            <h1 className="mt-2 text-2xl font-bold text-white">
              {activeGoalCount === 0 ? 'How would you like to start?' : 'Add another learning role'}
            </h1>
            <p className="mt-1.5 text-sm text-surface-400">
              {activeGoalCount === 0
                ? 'Set your learning profile to generate a personalized roadmap.'
                : 'You can follow up to 2 learning paths independently. Switch between them anytime from the sidebar.'}
            </p>
            <div className="mt-3 inline-flex items-center gap-2 rounded-[6px] border border-surface-700 bg-surface-900/70 px-3 py-1.5">
              <Layers className="h-3.5 w-3.5 text-primary-400" aria-hidden="true" />
              <span className="font-mono text-[11px] text-surface-300">
                {activeGoalCount} / 2 learning paths {goalsStatus === 'loading' ? '· loading' : ''}
              </span>
            </div>
          </div>

          {/* Tab selector */}
          <div className="mb-6 flex rounded-[8px] border border-surface-800 bg-surface-900/60 p-1">
            <button
              onClick={() => { setActiveTab('form'); setAssistantOpen(false) }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-[6px] py-2 font-mono text-xs font-medium uppercase tracking-wider transition-all ${
                activeTab === 'form'
                  ? 'bg-primary-400/10 text-primary-400 border border-primary-400/40'
                  : 'text-surface-400 hover:text-surface-200'
              }`}
            >
              <Zap className="h-3.5 w-3.5" />
              Quick Form
            </button>
            <button
              onClick={() => { setActiveTab('chat'); setAssistantOpen(true) }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-[6px] py-2 font-mono text-xs font-medium uppercase tracking-wider transition-all ${
                activeTab === 'chat'
                  ? 'bg-primary-400/10 text-primary-400 border border-primary-400/40'
                  : 'text-surface-400 hover:text-surface-200'
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Chat with AI
            </button>
          </div>

          {/* Quick Form */}
          {activeTab === 'form' && (
            <div className="rounded-[8px] border border-surface-800 bg-surface-900/60 p-6 sm:p-8">
              {formError && (
                <div
                  role="alert"
                  className="mb-5 rounded-[6px] border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 font-mono text-xs text-red-300"
                >
                  {formError}
                </div>
              )}

              {maxed ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full border border-primary-400/30 bg-primary-400/10">
                    <Layers className="h-6 w-6 text-primary-400" />
                  </span>
                  <h2 className="text-lg font-semibold text-white">2 learning paths reached</h2>
                  <p className="max-w-sm text-sm text-surface-400">
                    You&apos;re already following 2 active learning roles. Focus on completing one,
                    then you can replace it here.
                  </p>
                  <Button onClick={() => navigate('/dashboard')} className="mt-2 font-mono text-xs">
                    Return to Dashboard
                  </Button>
                </div>
              ) : (
                <div className="space-y-7">
                {/* LEARNING GOAL */}
                <section>
                  <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-widest text-primary-400">
                    &gt; LEARNING GOAL
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {GOALS.map((g) => (
                      <button
                        key={g.id}
                        onClick={() => handleGoalSelect(g.id)}
                        className={`rounded-[6px] border px-3 py-2.5 text-xs font-medium transition-all ${selectionClass(selectedGoalId === g.id)}`}
                      >
                        {g.label}
                      </button>
                    ))}
                    {/* Enter your own goal option */}
                    <button
                      onClick={() => handleGoalSelect('__custom__')}
                      className={`rounded-[6px] border px-3 py-2.5 text-xs font-medium transition-all ${selectionClass(selectedGoalId === '__custom__')}`}
                    >
                      ✏️ Enter your own goal
                    </button>
                  </div>

                  {/* Custom goal text input */}
                  {customGoalVisible && (
                    <div className="mt-3">
                      <input
                        type="text"
                        value={customGoalText}
                        onChange={(e) => setCustomGoalText(e.target.value)}
                        placeholder="e.g. Blockchain Developer, Embedded Systems…"
                        className="w-full rounded-[6px] border border-surface-700 bg-surface-950 px-3.5 py-2.5 font-mono text-xs text-surface-100 placeholder-surface-600 outline-none focus:border-primary-400/60 focus:ring-1 focus:ring-primary-400/30"
                      />
                    </div>
                  )}
                </section>

                {/* CURRENT SKILLS */}
                <section>
                  <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-widest text-primary-400">
                    &gt; CURRENT SKILLS
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_SKILLS.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => toggleSkill(s.id)}
                        aria-pressed={selectedSkills.includes(s.id)}
                        className={`rounded-[6px] border px-3 py-1.5 font-mono text-xs transition-all ${selectionClass(selectedSkills.includes(s.id))}`}
                      >
                        {s.label}
                      </button>
                    ))}
                    {customSkills.map((skill) => (
                      <span
                        key={skill}
                        className="flex items-center gap-1.5 rounded-[6px] border border-primary-400/50 bg-primary-400/10 px-3 py-1.5 font-mono text-xs text-primary-400"
                      >
                        {skill}
                        <button
                          onClick={() => removeCustomSkill(skill)}
                          className="hover:text-red-400 transition-colors"
                          aria-label={`Remove ${skill}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>

                  {/* Add custom skill */}
                  <div className="mt-3 flex gap-2">
                    <input
                      type="text"
                      value={customSkillInput}
                      onChange={(e) => setCustomSkillInput(e.target.value)}
                      onKeyDown={handleCustomSkillKeyDown}
                      placeholder="Add a skill (press Enter or +)"
                      className="flex-1 rounded-[6px] border border-surface-700 bg-surface-950 px-3 py-2 font-mono text-xs text-surface-100 placeholder-surface-600 outline-none focus:border-primary-400/60 focus:ring-1 focus:ring-primary-400/30"
                    />
                    <button
                      onClick={addCustomSkill}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] border border-surface-700 bg-surface-850 text-surface-300 transition-all hover:border-primary-400/60 hover:text-primary-400"
                      aria-label="Add skill"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </section>

                {/* EXPERIENCE LEVEL */}
                <section>
                  <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-widest text-primary-400">
                    &gt; EXPERIENCE LEVEL
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {EXPERIENCE_LEVELS.map((l) => (
                      <button
                        key={l.id}
                        onClick={() => setExperienceLevel(l.id)}
                        className={`rounded-[6px] border py-2.5 font-mono text-xs uppercase transition-all ${selectionClass(experienceLevel === l.id)}`}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                </section>

                {/* WEEKLY HOURS */}
                <section>
                  <div className="mb-2 flex items-baseline justify-between font-mono text-[10px]">
                    <p className="font-semibold uppercase tracking-widest text-primary-400">
                      &gt; WEEKLY HOURS
                    </p>
                    <span className="text-primary-400 font-bold text-sm">
                      {weeklyHours}h / week
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="40"
                    value={weeklyHours}
                    onChange={(e) => setWeeklyHours(parseInt(e.target.value, 10))}
                    className="w-full accent-primary-400"
                    aria-label="Weekly hours"
                  />
                  <div className="mt-1 flex justify-between font-mono text-[10px] text-surface-500">
                    <span>1h</span>
                    <span>40h</span>
                  </div>
                </section>

                {/* LEARNING STYLE */}
                <section>
                  <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-widest text-primary-400">
                    &gt; LEARNING STYLE
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {LEARNING_STYLES.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setLearningStyle(s.id)}
                        className={`rounded-[6px] border py-2.5 font-mono text-xs transition-all ${selectionClass(learningStyle === s.id)}`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </section>

                {/* Submit */}
                <div className="border-t border-surface-800 pt-5">
                  <Button
                    onClick={handleSubmit}
                    loading={loading}
                    className="w-full font-mono text-sm tracking-wider"
                    size="lg"
                  >
                    Generate My Learning Path
                  </Button>
                </div>
              </div>
            )}
            </div>
          )}

          {/* Chat tab info */}
          {activeTab === 'chat' && (
            <div className="rounded-[8px] border border-surface-800 bg-surface-900/60 p-8 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-primary-400/30 bg-primary-400/10">
                <MessageSquare className="h-7 w-7 text-primary-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">Chat with Pathfinder AI</h2>
              <p className="mt-2 text-sm text-surface-400">
                Describe your goals in your own words. The AI will guide you through onboarding conversationally.
              </p>
              <button
                onClick={() => setAssistantOpen(true)}
                className="mt-5 inline-flex items-center gap-2 rounded-[6px] border border-primary-400/40 bg-primary-400/10 px-4 py-2.5 font-mono text-xs font-medium text-primary-400 transition-all hover:bg-primary-400/20"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Open AI Chat
              </button>
            </div>
          )}
        </div>
      </main>

      {/* AI Assistant Drawer */}
      <AskPathfinder isOpen={assistantOpen} onClose={() => setAssistantOpen(false)} />
    </div>
  )
}
