import PropTypes from 'prop-types'
import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  User, Flame, Trophy, BookOpen, AlertCircle,
  TrendingUp, Target, Clock, Layers, Edit, Check, Trash2,
  Plus, Route, GraduationCap,
} from 'lucide-react'
import { AppShell } from '../components/layout/AppShell'
import { PageHeader } from '../components/shared/PageHeader'
import { SectionHeading } from '../components/shared/SectionHeading'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ProgressBar } from '../components/ui/Progress'
import { CountUp } from '../components/ui/CountUp'
import { Skeleton } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'
import { Modal } from '../components/ui/Modal'
import api from '../services/api'
import useUserStore from '../store/useUserStore'
import useGoalsStore from '../store/useGoalsStore'
import { useToast } from '../context/ToastContext'
import { EASE } from '../lib/motion'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function StreakDots({ weekly }) {
  const slots = DAY_LABELS.map((day, i) => ({
    day,
    active: weekly?.[i]?.active ?? false,
  }))
  return (
    <div className="flex items-center gap-1.5">
      {slots.map(({ day, active }, i) => (
        <div key={day} className="flex flex-1 flex-col items-center gap-1">
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 + i * 0.04, type: 'spring', stiffness: 400, damping: 24 }}
            className={`h-6 w-6 rounded-[5px] border transition-colors ${
              active ? 'border-primary-400/60 bg-primary-400/20' : 'border-surface-800 bg-surface-900'
            }`}
            title={day}
          >
            {active && (
              <div className="flex h-full items-center justify-center">
                <Flame className="h-3 w-3 text-primary-400" aria-hidden="true" />
              </div>
            )}
          </motion.div>
          <span className="font-mono text-[9px] text-surface-600">{day[0]}</span>
        </div>
      ))}
    </div>
  )
}
StreakDots.propTypes = {
  weekly: PropTypes.arrayOf(PropTypes.shape({ active: PropTypes.bool })),
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { profile } = useUserStore()
  const activePathId = useGoalsStore((s) => s.activePathId)
  const { goals, status: goalsStatus, fetchGoals, activate, deletePath } = useGoalsStore()

  const [streak, setStreak] = useState(null)
  const [badges, setBadges] = useState([])
  const [skills, setSkills] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [streakRes, badgesRes, skillsRes] = await Promise.allSettled([
        api.getStreak(),
        api.getBadges(),
        api.getSkillProgress(activePathId),
      ])
      if (streakRes.status === 'fulfilled') setStreak(streakRes.value)
      if (badgesRes.status === 'fulfilled') setBadges(badgesRes.value?.badges || [])
      if (skillsRes.status === 'fulfilled') setSkills(skillsRes.value?.skills || [])
    } catch {
      setError('Failed to load profile data.')
    } finally {
      setLoading(false)
    }
  }, [activePathId])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    fetchGoals()
  }, [fetchGoals])

  const activeGoal = goals.find((g) => g.path_id === activePathId && g.status === 'active')

  const handleActivate = async (pathId) => {
    try {
      const res = await activate(pathId)
      if (res.ok) {
        toast.success('Switched learning role.')
      } else {
        toast.error('Failed to switch role.')
      }
    } catch {
      toast.error('Failed to switch role.')
    }
  }

  const goalLabel =
    activeGoal?.role_label ||
    profile?.goal ||
    (profile?.target_role ? profile.target_role.replace(/_/g, ' ') : null)

  const totalGoals = (goals || []).filter((g) => g.status !== 'archived').length

  const handleDeletePath = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deletePath(deleteTarget.path_id)
      toast.success(`Deleted the ${deleteTarget.role_label} path.`)
      setDeleteTarget(null)
    } catch (err) {
      const detail = err?.response?.data?.detail || ''
      toast.error(detail || 'Failed to delete path.')
    } finally {
      setDeleting(false)
    }
  }

  const experienceLabel = profile?.experience_level
    ? profile.experience_level.charAt(0).toUpperCase() + profile.experience_level.slice(1)
    : null

  const name = profile?.name || profile?.email?.split('@')[0] || 'Learner'

  const initials = name
    .split(' ')
    .map((p) => p.charAt(0))
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const activeRoleCount = goals.filter((g) => g.status === 'active').length

  return (
    <AppShell>
      <PageHeader
        tag="Account"
        icon={User}
        title="My Profile"
        description="Your learning profile, streak, badges, and skill progression."
        actions={
          <Button onClick={() => navigate('/onboarding')} variant="outline">
            <Edit className="h-4 w-4" aria-hidden="true" />
            Edit Profile
          </Button>
        }
      />

      <div className="mt-8 space-y-6">
        {loading && (
          <div className="space-y-6">
            <div className="rounded-[12px] border border-surface-800 bg-surface-925 p-6">
              <div className="flex items-center gap-4">
                <Skeleton className="h-16 w-16 rounded-[16px]" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-2.5 w-56" />
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {[0, 1].map((i) => (
                <div key={i} className="space-y-3 rounded-[12px] border border-surface-800 bg-surface-925 p-5">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-2.5 w-full" />
                  <Skeleton className="h-2.5 w-3/4" />
                </div>
              ))}
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="flex items-center gap-3 rounded-[12px] border border-red-500/25 bg-red-500/[0.04] px-4 py-3">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <p className="text-sm text-red-300">{error}</p>
            <button onClick={loadData} className="ml-auto font-mono text-xs text-red-400 underline hover:text-red-300">
              Retry
            </button>
          </div>
        )}

        {!loading && (
          <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
            {/* Personal hero */}
            <motion.div variants={item}>
              <Card padded className="relative overflow-hidden">
                <div
                  className="pointer-events-none absolute inset-0 bg-[radial-gradient(700px_260px_at_85%_-30%,rgba(250,204,21,0.08),transparent)]"
                  aria-hidden="true"
                />
                <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[18px] border border-primary-400/30 bg-gradient-to-b from-surface-850 to-surface-900 font-mono text-xl font-bold text-primary-400 shadow-glow">
                      {initials || goalLabel?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="section-label text-primary-400/80">Learning goal</p>
                      <h2 className="truncate text-lg font-semibold text-white">{goalLabel || 'No goal set'}</h2>
                      {profile?.email && (
                        <p className="mt-0.5 font-mono text-[11px] text-surface-500">{profile.email}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      onClick={() => navigate('/onboarding')}
                      variant="outline"
                      size="sm"
                    >
                      <Edit className="h-3.5 w-3.5" aria-hidden="true" />
                      Edit Goal
                    </Button>
                  </div>
                </div>

                <div className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-[10px] border border-surface-800 bg-surface-950/60 p-3">
                    <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-surface-500">
                      <Layers className="h-3 w-3" /> Experience
                    </div>
                    <p className="mt-1 text-sm font-semibold capitalize text-white">{experienceLabel || '—'}</p>
                  </div>
                  <div className="rounded-[10px] border border-surface-800 bg-surface-950/60 p-3">
                    <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-surface-500">
                      <Clock className="h-3 w-3" /> Weekly Hours
                    </div>
                    <p className="mt-1 text-sm font-semibold text-white">
                      {profile?.weekly_hours ? `${profile.weekly_hours}h` : '—'}
                    </p>
                  </div>
                  <div className="rounded-[10px] border border-surface-800 bg-surface-950/60 p-3">
                    <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-surface-500">
                      <BookOpen className="h-3 w-3" /> Learning Style
                    </div>
                    <p className="mt-1 text-sm font-semibold capitalize text-white">
                      {profile?.preferred_learning_style || '—'}
                    </p>
                  </div>
                  <div className="rounded-[10px] border border-surface-800 bg-surface-950/60 p-3">
                    <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-surface-500">
                      <Target className="h-3 w-3" /> Target Role
                    </div>
                    <p className="mt-1 truncate text-sm font-semibold capitalize text-white">
                      {profile?.target_role?.replace(/_/g, ' ') || '—'}
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Snapshot stats */}
            <motion.div variants={item}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Card padded className="flex items-center gap-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-primary-400/25 bg-primary-400/[0.08] text-primary-400">
                    <Flame className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="section-label text-surface-500">Current streak</p>
                    <p className="flex items-baseline gap-1">
                      <CountUp value={streak?.current_streak ?? 0} className="text-xl" />
                      <span className="text-xs text-surface-500">days</span>
                    </p>
                  </div>
                </Card>
                <Card padded className="flex items-center gap-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-emerald-500/25 bg-emerald-500/[0.08] text-emerald-400">
                    <Route className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="section-label text-surface-500">Learning roles</p>
                    <p className="flex items-baseline gap-1">
                      <CountUp value={activeRoleCount} className="text-xl" />
                      <span className="text-xs text-surface-500">active</span>
                    </p>
                  </div>
                </Card>
                <Card padded className="flex items-center gap-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-sky-500/25 bg-sky-500/[0.08] text-sky-400">
                    <Trophy className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="section-label text-surface-500">Badges earned</p>
                    <p className="flex items-baseline gap-1">
                      <CountUp value={badges.length} className="text-xl" />
                      <span className="text-xs text-surface-500">total</span>
                    </p>
                  </div>
                </Card>
              </div>
            </motion.div>

            {/* Learning roles */}
            <motion.div variants={item}>
              <Card padded>
                <SectionHeading icon={Layers} trailing={<span className="section-label text-surface-600">{activeRoleCount} active</span>}>
                  Learning Roles
                </SectionHeading>

                <div className="mt-4 flex justify-end">
                  <Button onClick={() => navigate('/onboarding')} variant="outline" size="sm">
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    Add Role
                  </Button>
                </div>

                {goals.length === 0 && goalsStatus !== 'loading' ? (
                  <div className="mt-4">
                    <EmptyState
                      icon={Layers}
                      title="No learning roles yet"
                      description="Create your first learning role to start your roadmap."
                      action={
                        <Button onClick={() => navigate('/onboarding')} size="sm">Set Up Profile</Button>
                      }
                    />
                  </div>
                ) : (
                  <div className="mt-2 space-y-2.5">
                    {goals.map((g) => {
                      const isActive = g.path_id === activePathId
                      const pct = Math.round(g.progress_percentage || 0)
                      return (
                        <div
                          key={g.path_id}
                          className={`rounded-[12px] border px-4 py-3.5 transition-colors ${
                            isActive
                              ? 'border-primary-400/40 bg-primary-400/[0.05]'
                              : 'border-surface-800 bg-surface-950/50 hover:border-surface-700'
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3.5">
                              <span
                                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border font-mono text-sm font-bold ${
                                  isActive
                                    ? 'border-primary-400/50 bg-primary-400/10 text-primary-400'
                                    : 'border-surface-700 bg-surface-900 text-surface-400'
                                }`}
                              >
                                {g.role_label?.charAt(0).toUpperCase() || '?'}
                              </span>
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="truncate text-sm font-semibold text-white">{g.role_label}</p>
                                  {g.is_custom && (
                                    <span className="badge-line font-mono text-[9px]">Custom</span>
                                  )}
                                  {isActive && (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-primary-400/30 bg-primary-400/10 px-2 py-0.5 font-mono text-[9px] font-semibold uppercase text-primary-400">
                                      <span className="h-1 w-1 rounded-full bg-primary-400" aria-hidden="true" />
                                      Active
                                    </span>
                                  )}
                                  {g.path_completed && (
                                    <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[9px] font-semibold uppercase text-emerald-400">
                                      Completed
                                    </span>
                                  )}
                                </div>
                                <p className="mt-0.5 font-mono text-[10px] text-surface-500">
                                  {g.current_step_title
                                    ? `Now: ${g.current_step_title}`
                                    : g.path_completed
                                      ? 'Path completed'
                                      : `Milestone ${g.current_milestone} · ${g.current_milestone_title}`}
                                </p>
                              </div>
                            </div>

                            <div className="flex shrink-0 items-center gap-3">
                              <div className="hidden w-36 sm:block">
                                <div className="mb-1 flex justify-between font-mono text-[10px]">
                                  <span className="text-surface-500">{g.completed_steps}/{g.total_steps} steps</span>
                                  <span className="text-primary-400">{pct}%</span>
                                </div>
                                <ProgressBar
                                  value={pct}
                                  max={100}
                                  tone={g.path_completed ? 'emerald' : 'gold'}
                                  className="h-1.5"
                                />
                              </div>
                              <button
                                onClick={() => setDeleteTarget(g)}
                                disabled={totalGoals <= 1}
                                className="rounded-[8px] p-1.5 text-surface-600 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-30"
                                aria-label={`Delete ${g.role_label} path`}
                                title={totalGoals <= 1 ? 'You need at least one learning path' : `Delete ${g.role_label} path`}
                              >
                                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                              </button>
                              {isActive ? (
                                <span className="flex items-center gap-1 font-mono text-[10px] text-primary-400">
                                  <Check className="h-3 w-3" /> Viewing
                                </span>
                              ) : (
                                <Button onClick={() => handleActivate(g.path_id)} variant="outline" size="sm">
                                  Switch
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </Card>
            </motion.div>

            {/* Streak + Skills */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <motion.div variants={item}>
                <Card padded>
                  <SectionHeading icon={Flame}>Learning Streak</SectionHeading>
                  {streak ? (
                    <div className="mt-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="flex h-11 w-11 items-center justify-center rounded-[12px] border border-primary-400/25 bg-primary-400/[0.08] text-xl" role="img" aria-label="fire">
                            <Flame className="h-5 w-5 text-primary-400" aria-hidden="true" />
                          </span>
                          <div>
                            <p className="flex items-baseline gap-1.5">
                              <CountUp value={streak.current_streak ?? 0} className="text-2xl" />
                              <span className="font-mono text-sm text-primary-400">day{streak.current_streak !== 1 ? 's' : ''}</span>
                            </p>
                            <p className="font-mono text-[11px] text-surface-400">Current streak</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="stat-number text-lg font-semibold text-surface-200">{streak.longest_streak}</p>
                          <p className="font-mono text-[10px] text-surface-500">Longest</p>
                        </div>
                      </div>
                      <StreakDots weekly={streak.weekly_activity} />
                      {streak.last_activity_date && (
                        <p className="font-mono text-[10px] text-surface-500">Last active: {streak.last_activity_date}</p>
                      )}
                    </div>
                  ) : (
                    <div className="mt-4">
                      <EmptyState icon={Flame} title="No streak yet" description="Start learning to build your daily streak." />
                    </div>
                  )}
                </Card>
              </motion.div>

              <motion.div variants={item}>
                <Card padded>
                  <SectionHeading
                    icon={TrendingUp}
                    trailing={activeGoal?.role_label && <span className="section-label text-surface-600">{activeGoal.role_label}</span>}
                  >
                    Skill Progress
                  </SectionHeading>
                  {skills.length > 0 ? (
                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {skills.map((skill) => {
                        const pct = Math.round(skill.progress_percentage ?? 0)
                        return (
                          <div key={skill.skill_name}>
                            <div className="mb-1.5 flex items-center justify-between">
                              <span className="text-xs text-surface-200">{skill.skill_name}</span>
                              <span className="font-mono text-[11px] text-primary-400">{pct}%</span>
                            </div>
                            <ProgressBar value={pct} max={100} tone="gold" className="h-1.5" />
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="mt-4">
                      <EmptyState icon={TrendingUp} title="No skill data yet" description="Complete learning steps to track your skill progress." />
                    </div>
                  )}
                </Card>
              </motion.div>
            </div>

            {/* Badges */}
            <motion.div variants={item}>
              <Card padded>
                <SectionHeading icon={GraduationCap} trailing={<span className="section-label text-surface-600">{badges.length} earned</span>}>
                  Badges Earned
                </SectionHeading>
                {badges.length > 0 ? (
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {badges.map((badge, i) => (
                      <div
                        key={badge.badge_id || i}
                        className="group flex flex-col items-center gap-2.5 rounded-[12px] border border-surface-800 bg-surface-950/60 p-4 text-center transition-all hover:-translate-y-0.5 hover:border-primary-400/30"
                      >
                        <span className="flex h-12 w-12 items-center justify-center rounded-[12px] border border-surface-800 bg-surface-900 text-xl transition-colors group-hover:border-primary-400/40">
                          {badge.icon || '🏅'}
                        </span>
                        <div>
                          <p className="text-xs font-semibold text-white">{badge.badge_name}</p>
                          {badge.description && (
                            <p className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-surface-500">
                              {badge.description}
                            </p>
                          )}
                          {badge.earned_at && (
                            <p className="mt-1 font-mono text-[9px] text-surface-600">{badge.earned_at.split('T')[0]}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4">
                    <EmptyState icon={Trophy} title="No badges earned yet" description="Complete milestones and learning goals to earn badges." />
                  </div>
                )}
              </Card>
            </motion.div>
          </motion.div>
        )}
      </div>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        destructive
        tag="Delete path"
        title={`Delete ${deleteTarget?.role_label || 'learning path'}?`}
        description="This permanently removes the path, its roadmap, progress, skills and badges. This cannot be undone."
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeletePath} loading={deleting}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Delete path
            </Button>
          </>
        }
      >
        <p className="text-sm text-surface-400">
          {deleteTarget?.status === 'active'
            ? `"${deleteTarget?.role_label}" will be removed from your learning paths.${
                deleteTarget?.path_id === activePathId ? ' You will be switched to another path.' : ''
              }`
            : `The completed path "${deleteTarget?.role_label}" will be removed.`}
        </p>
      </Modal>
    </AppShell>
  )
}