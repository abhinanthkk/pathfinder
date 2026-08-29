import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import PropTypes from 'prop-types'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Plus, X, MessageSquare, Zap, Layers, Sparkles,
  Target, CheckCircle2, Loader2, ArrowRight, Route,
} from 'lucide-react'
import useUserStore from '../store/useUserStore'
import useGoalsStore from '../store/useGoalsStore'
import api from '../services/api'
import { Logo } from '../components/shared/Logo'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { AskPathfinder } from '../components/shared/AskPathfinder'
import { useToast } from '../context/ToastContext'
import { EASE } from '../lib/motion'

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

const GEN_STEPS = [
  'Analyzing your goal',
  'Mapping required skills',
  'Sequencing milestones',
  'Building learning steps',
  'Saving your roadmap',
]

const btnActive = 'border-primary-400/70 bg-primary-400/10 text-primary-400 font-semibold'
const btnInactive =
  'border-surface-700 bg-surface-900/70 text-surface-300 hover:border-surface-600 hover:bg-surface-850 hover:text-white'

const selectionClass = (active) => (active ? btnActive : btnInactive)

function GenerationOverlay({ visible, step }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          aria-live="polite"
          role="status"
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" aria-hidden="true" />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="relative w-full max-w-sm rounded-[16px] border border-primary-400/25 bg-surface-925 p-7 shadow-glow-lg"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-primary-400/30 bg-primary-400/10 text-primary-400">
                <Sparkles className="h-5 w-5 animate-pulse-soft" aria-hidden="true" />
              </span>
              <div>
                <p className="section-label text-primary-400">Generating roadmap</p>
                <p className="text-sm font-semibold text-white">Building your learning path</p>
              </div>
            </div>

            <ul className="mt-6 space-y-3">
              {GEN_STEPS.map((label, i) => {
                const done = step > i
                const active = step === i
                return (
                  <li key={label} className="flex items-center gap-3">
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors ${
                        done
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                          : active
                            ? 'border-primary-400/40 bg-primary-400/10 text-primary-400'
                            : 'border-surface-700 text-surface-600'
                      }`}
                    >
                      {done ? (
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : active ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <span className="h-1 w-1 rounded-full bg-current" aria-hidden="true" />
                      )}
                    </span>
                    <span
                      className={`font-mono text-xs transition-colors ${
                        done ? 'text-surface-400' : active ? 'text-primary-300' : 'text-surface-600'
                      }`}
                    >
                      {label}
                    </span>
                  </li>
                )
              })}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

GenerationOverlay.propTypes = {
  visible: PropTypes.bool.isRequired,
  step: PropTypes.number.isRequired,
}

export default function OnboardingPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { setProfile } = useUserStore()
  const { goals, status: goalsStatus, fetchGoals, createGoal, setActivePathId } = useGoalsStore()

  const [activeTab, setActiveTab] = useState('form')
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [genVisible, setGenVisible] = useState(false)
  const [genStep, setGenStep] = useState(0)
  const genTimers = useRef([])

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

  useEffect(() => {
    return () => {
      genTimers.current.forEach(clearTimeout)
    }
  }, [])

  const activeGoalCount = (goals || []).filter((g) => g.status === 'active').length

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
    if (loading) return

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
    setGenVisible(true)
    setGenStep(0)

    GEN_STEPS.forEach((_, i) => {
      genTimers.current.push(setTimeout(() => setGenStep(i + 1), i * 480))
    })

    const allSkills = {}
    selectedSkills.forEach((s) => { allSkills[s] = 0.5 })
    customSkills.forEach((s) => { allSkills[s.toLowerCase().replace(/\s+/g, '_')] = 0.5 })

    try {
      const selected = GOALS.find((g) => g.id === selectedGoalId)
      const res = await createGoal({
        target_role: isCustomGoal ? '' : (selected?.id || ''),
        goal: isCustomGoal ? customGoalText : (selected?.label || ''),
        experience_level: experienceLevel,
        weekly_hours: weeklyHours,
        preferred_learning_style: learningStyle,
        skills: allSkills,
      })

      const createdPathId = res?.path?.path_id || ''
      if (createdPathId) {
        setActivePathId(createdPathId)
      } else {
        await fetchGoals()
      }

      const profileRes = await api.getProfile()
      setProfile(profileRes)

      await new Promise((resolve) => setTimeout(resolve, 700))
      setGenVisible(false)
      toast.success('Learning path generated for this role.')
      navigate('/dashboard', { replace: true, state: { learningPathId: createdPathId } })
    } catch (err) {
      setGenVisible(false)
      const detail = err?.response?.data?.detail
      if (typeof detail === 'string' && detail) {
        setFormError(detail)
      } else {
        setFormError('Failed to generate your learning path. Please try again.')
        toast.error('Something went wrong. Please retry.')
      }
    } finally {
      setLoading(false)
      genTimers.current.forEach(clearTimeout)
      genTimers.current = []
    }
  }

  const inputCls =
    'w-full rounded-[10px] border border-surface-700 bg-surface-950 px-3.5 py-2.5 font-mono text-xs text-surface-100 placeholder:text-surface-600 outline-none transition-colors focus:border-primary-400/70 focus:ring-1 focus:ring-primary-400/25'

  const sectionHeading = 'mb-3 flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-widest text-primary-400'

  return (
    <div className="min-h-screen bg-surface-950 bg-app-ambient text-surface-100">
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,44rem)_1fr]">
        {/* Brand panel */}
        <aside className="relative hidden overflow-hidden border-r border-surface-800/70 bg-surface-925 lg:flex lg:flex-col lg:justify-between">
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <div className="absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-primary-400/[0.06] blur-3xl" />
            <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-sky-500/[0.04] blur-3xl" />
          </div>

          <div className="relative p-8">
            <Logo to="/dashboard" />
          </div>

          <div className="relative px-8 pb-14 lg:px-12">
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="section-label text-primary-400"
            >
              Pathfinder onboarding
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.08, ease: EASE }}
              className="mt-3 max-w-md text-3xl font-semibold leading-tight tracking-tight text-white"
            >
              Turn a goal into a step-by-step roadmap.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.16, ease: EASE }}
              className="mt-3 max-w-md text-sm leading-relaxed text-surface-400"
            >
              Pathfinder analyzes your target role, maps the skills you already have, and sequences
              milestones that adapt to how you actually learn.
            </motion.p>

            <motion.ul
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.28, duration: 0.5 }}
              className="mt-8 space-y-3"
            >
              {[
                { icon: Target, text: 'Popular engineering roles, one click away' },
                { icon: Route, text: 'Adaptive milestones that re-route as you progress' },
                { icon: Sparkles, text: 'Dedicated AI advisor for your path' },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-xs text-surface-300">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] border border-surface-800 bg-surface-900 text-primary-400">
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  {text}
                </li>
              ))}
            </motion.ul>
          </div>

          <div className="relative px-8 pb-8">
            <div className="flex items-center gap-2 font-mono text-[10px] text-surface-600">
              <span>PATHFINDER</span>
              <span className="h-px w-8 bg-surface-800" aria-hidden="true" />
              <span>LEARNING OS · v1</span>
            </div>
          </div>
        </aside>

        {/* Form panel */}
        <main className="flex w-full flex-col">
          <header className="flex h-16 shrink-0 items-center justify-between border-b border-surface-800/70 px-4 sm:px-8 lg:border-transparent">
            <div className="lg:hidden">
              <Logo to="/dashboard" />
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-1.5 rounded-[8px] font-mono text-xs text-surface-400 transition-colors hover:text-white focus:outline-none"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Return to dashboard</span>
            </button>
          </header>

          <div className="flex-1 px-4 py-8 sm:px-8 lg:px-12">
            <div className="mx-auto w-full max-w-2xl">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: EASE }}
                className="mb-6"
              >
                <p className="section-label text-primary-400">Onboarding</p>
                <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-white">
                  {activeGoalCount === 0 ? 'How would you like to start?' : 'Add another learning path'}
                </h1>
                <p className="mt-1.5 text-sm text-surface-400">
                  {activeGoalCount === 0
                    ? 'Set your learning profile to generate a personalized roadmap.'
                    : 'You can follow unlimited learning paths independently. Switch between them anytime from the sidebar.'}
                </p>
                <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-surface-800 bg-surface-925 px-3 py-1.5">
                  <Layers className="h-3.5 w-3.5 text-primary-400" aria-hidden="true" />
                  <span className="font-mono text-[11px] text-surface-300">
                    {activeGoalCount} learning path{activeGoalCount === 1 ? '' : 's'}
                    {goalsStatus === 'loading' ? ' · loading' : ''}
                  </span>
                </div>
              </motion.div>

              {/* Tab selector */}
              <div className="mb-6 flex rounded-[12px] border border-surface-800 bg-surface-925 p-1">
                <button
                  onClick={() => { setActiveTab('form'); setAssistantOpen(false) }}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-[9px] py-2 font-mono text-xs font-medium uppercase tracking-wider transition-all ${
                    activeTab === 'form'
                      ? 'bg-primary-400/10 text-primary-400'
                      : 'text-surface-400 hover:text-surface-200'
                  }`}
                >
                  <Zap className="h-3.5 w-3.5" />
                  Quick Form
                </button>
                <button
                  onClick={() => { setActiveTab('chat'); setAssistantOpen(true) }}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-[9px] py-2 font-mono text-xs font-medium uppercase tracking-wider transition-all ${
                    activeTab === 'chat'
                      ? 'bg-primary-400/10 text-primary-400'
                      : 'text-surface-400 hover:text-surface-200'
                  }`}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  Chat with AI
                </button>
              </div>

              {/* Quick Form */}
              {activeTab === 'form' && (
                <Card padded className="rounded-[16px]">
                  <AnimatePresence>
                    {formError && (
                      <motion.div
                        role="alert"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mb-5 rounded-[10px] border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 font-mono text-xs text-red-300">
                          {formError}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="space-y-7">
                    <section>
                      <p className={sectionHeading}>
                        <Target className="h-3.5 w-3.5" aria-hidden="true" />
                        Learning goal
                      </p>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {GOALS.map((g) => (
                          <button
                            key={g.id}
                            onClick={() => handleGoalSelect(g.id)}
                            className={`rounded-[10px] border px-3 py-2.5 text-xs font-medium transition-all ${selectionClass(selectedGoalId === g.id)}`}
                          >
                            {g.label}
                          </button>
                        ))}
                        <button
                          onClick={() => handleGoalSelect('__custom__')}
                          className={`rounded-[10px] border px-3 py-2.5 text-xs font-medium transition-all ${selectionClass(selectedGoalId === '__custom__')}`}
                        >
                          Enter your own goal
                        </button>
                      </div>

                      {customGoalVisible && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="overflow-hidden"
                        >
                          <div className="mt-3">
                            <input
                              type="text"
                              value={customGoalText}
                              onChange={(e) => setCustomGoalText(e.target.value)}
                              placeholder="e.g. Blockchain Developer, Embedded Systems…"
                              className={inputCls}
                            />
                          </div>
                        </motion.div>
                      )}
                    </section>

                    <section>
                      <p className={sectionHeading}>
                        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                        Current skills
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {QUICK_SKILLS.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => toggleSkill(s.id)}
                            aria-pressed={selectedSkills.includes(s.id)}
                            className={`rounded-full border px-3 py-1.5 font-mono text-xs transition-all ${selectionClass(selectedSkills.includes(s.id))}`}
                          >
                            {s.label}
                          </button>
                        ))}
                        {customSkills.map((skill) => (
                          <span
                            key={skill}
                            className="flex items-center gap-1.5 rounded-full border border-primary-400/50 bg-primary-400/10 px-3 py-1.5 font-mono text-xs text-primary-400"
                          >
                            {skill}
                            <button
                              onClick={() => removeCustomSkill(skill)}
                              className="transition-colors hover:text-red-400"
                              aria-label={`Remove ${skill}`}
                            >
                              <X className="h-3 w-3" aria-hidden="true" />
                            </button>
                          </span>
                        ))}
                      </div>

                      <div className="mt-3 flex gap-2">
                        <input
                          type="text"
                          value={customSkillInput}
                          onChange={(e) => setCustomSkillInput(e.target.value)}
                          onKeyDown={handleCustomSkillKeyDown}
                          placeholder="Add a skill (press Enter or +)"
                          className={inputCls}
                        />
                        <button
                          onClick={addCustomSkill}
                          className="flex h-9 w-9 shrink-0 items-center justify-center self-center rounded-[10px] border border-surface-700 bg-surface-900 text-surface-300 transition-all hover:border-primary-400/60 hover:text-primary-400"
                          aria-label="Add skill"
                        >
                          <Plus className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </section>

                    <section>
                      <p className={sectionHeading}>
                        <Layers className="h-3.5 w-3.5" aria-hidden="true" />
                        Experience level
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {EXPERIENCE_LEVELS.map((l) => (
                          <button
                            key={l.id}
                            onClick={() => setExperienceLevel(l.id)}
                            className={`rounded-[10px] border py-2.5 font-mono text-xs uppercase transition-all ${selectionClass(experienceLevel === l.id)}`}
                          >
                            {l.label}
                          </button>
                        ))}
                      </div>
                    </section>

                    <section>
                      <div className="mb-2 flex items-baseline justify-between">
                        <p className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-widest text-primary-400">
                          <Route className="h-3.5 w-3.5" aria-hidden="true" />
                          Weekly hours
                        </p>
                        <span className="stat-number text-sm font-bold text-primary-400">
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

                    <section>
                      <p className={sectionHeading}>
                        <Zap className="h-3.5 w-3.5" aria-hidden="true" />
                        Learning style
                      </p>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {LEARNING_STYLES.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => setLearningStyle(s.id)}
                            className={`rounded-[10px] border py-2.5 font-mono text-xs transition-all ${selectionClass(learningStyle === s.id)}`}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </section>

                    <div className="border-t border-surface-800 pt-5">
                      <Button
                        onClick={handleSubmit}
                        loading={loading}
                        disabled={loading}
                        className="w-full text-sm"
                        size="lg"
                      >
                        {loading ? 'Generating your roadmap…' : 'Generate My Learning Path'}
                        {!loading && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
                      </Button>
                    </div>
                  </div>
                </Card>
              )}

              {/* Chat tab info */}
              {activeTab === 'chat' && (
                <Card className="p-10 text-center">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                    className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[18px] border border-primary-400/30 bg-primary-400/10 shadow-glow"
                  >
                    <MessageSquare className="h-8 w-8 text-primary-400" aria-hidden="true" />
                  </motion.div>
                  <h2 className="text-lg font-semibold text-white">Chat with Pathfinder AI</h2>
                  <p className="mx-auto mt-2 max-w-sm text-sm text-surface-400">
                    Describe your goals in your own words. The AI will guide you through onboarding conversationally.
                  </p>
                  <Button
                    onClick={() => setAssistantOpen(true)}
                    className="mt-6"
                  >
                    <MessageSquare className="h-4 w-4" aria-hidden="true" />
                    Open AI Chat
                  </Button>
                </Card>
              )}
            </div>
          </div>
        </main>
      </div>

      <AskPathfinder isOpen={assistantOpen} onClose={() => setAssistantOpen(false)} />
      <GenerationOverlay visible={genVisible} step={genStep} />
    </div>
  )
}