import PropTypes from 'prop-types'
import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  User, Flame, Trophy, BookOpen, AlertCircle,
  TrendingUp, Target, Clock, Layers, Edit, Check,
} from 'lucide-react'
import { AppShell } from '../components/layout/AppShell'
import { PageHeader } from '../components/shared/PageHeader'
import { Button } from '../components/ui/Button'
import { SkeletonCard } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'
import api from '../services/api'
import useUserStore from '../store/useUserStore'
import useGoalsStore from '../store/useGoalsStore'
import { useToast } from '../context/ToastContext'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function StreakDots({ weekly }) {
  const slots = DAY_LABELS.map((day, i) => ({
    day,
    active: weekly?.[i]?.active ?? false,
  }))
  return (
    <div className="flex items-center gap-1.5">
      {slots.map(({ day, active }) => (
        <div key={day} className="flex flex-col items-center gap-1">
          <div
            className={`h-6 w-6 rounded-[4px] border transition-all ${
              active ? 'border-primary-400/60 bg-primary-400/20' : 'border-surface-800 bg-surface-900'
            }`}
            title={day}
          >
            {active && (
              <div className="flex h-full items-center justify-center">
                <Flame className="h-3 w-3 text-primary-400" aria-hidden="true" />
              </div>
            )}
          </div>
          <span className="font-mono text-[9px] text-surface-600">{day}</span>
        </div>
      ))}
    </div>
  )
}
StreakDots.propTypes = {
  weekly: PropTypes.arrayOf(PropTypes.shape({ active: PropTypes.bool })),
}

function SkillBar({ skill }) {
  const pct = Math.round(skill.progress_percentage ?? 0)
  return (
    <div>
      <div className="mb-1 flex items-center justify-between font-mono text-[10px]">
        <span className="text-surface-300">{skill.skill_name}</span>
        <span className="text-primary-400 font-bold">{pct}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-800">
        <div
          className="h-full rounded-full bg-primary-400 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
SkillBar.propTypes = {
  skill: PropTypes.shape({
    skill_name: PropTypes.string,
    progress_percentage: PropTypes.number,
  }).isRequired,
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { profile } = useUserStore()
  const activePathId = useGoalsStore((s) => s.activePathId)
  const { goals, status: goalsStatus, fetchGoals, activate } = useGoalsStore()

  const [streak, setStreak] = useState(null)
  const [badges, setBadges] = useState([])
  const [skills, setSkills] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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

  const experienceLabel = profile?.experience_level
    ? profile.experience_level.charAt(0).toUpperCase() + profile.experience_level.slice(1)
    : null

  return (
    <AppShell>
      <PageHeader
        tag="PATHFINDER / ACCOUNT"
        icon={User}
        title="MY PROFILE"
        description="Your learning profile, streak, badges, and skill progression."
        actions={
          <Button onClick={() => navigate('/onboarding')} variant="outline" className="font-mono text-xs">
            <Edit className="h-3.5 w-3.5" aria-hidden="true" />
            Edit Profile
          </Button>
        }
      />

      <div className="mt-8 space-y-6">
        {loading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => <SkeletonCard key={i} className="h-28" />)}
          </div>
        )}

        {error && !loading && (
          <div className="flex items-center gap-3 rounded-[8px] border border-red-500/30 bg-red-500/5 px-4 py-3">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <p className="text-sm text-red-300">{error}</p>
            <button onClick={loadData} className="ml-auto font-mono text-xs text-red-400 hover:text-red-300 underline">
              Retry
            </button>
          </div>
        )}

        {!loading && (
          <>
            {/* Profile overview */}
            <div className="rounded-[8px] border border-surface-800 bg-surface-900/60 p-5 sm:p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[8px] border border-surface-700 bg-surface-850 text-2xl font-bold text-primary-400">
                  {goalLabel ? goalLabel.charAt(0).toUpperCase() : '?'}
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-surface-500">&gt; LEARNING GOAL</p>
                  <h2 className="mt-0.5 text-base font-semibold text-white">{goalLabel || 'No goal set'}</h2>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-[6px] border border-surface-800 bg-surface-800 sm:grid-cols-4">
                <div className="flex flex-col gap-1 bg-surface-950/80 p-3">
                  <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-surface-500">
                    <Layers className="h-3 w-3" /> Experience
                  </div>
                  <p className="text-sm font-semibold text-white capitalize">{experienceLabel || '—'}</p>
                </div>
                <div className="flex flex-col gap-1 bg-surface-950/80 p-3">
                  <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-surface-500">
                    <Clock className="h-3 w-3" /> Weekly Hours
                  </div>
                  <p className="text-sm font-semibold text-white">
                    {profile?.weekly_hours ? `${profile.weekly_hours}h` : '—'}
                  </p>
                </div>
                <div className="flex flex-col gap-1 bg-surface-950/80 p-3">
                  <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-surface-500">
                    <BookOpen className="h-3 w-3" /> Learning Style
                  </div>
                  <p className="text-sm font-semibold text-white capitalize">
                    {profile?.preferred_learning_style || '—'}
                  </p>
                </div>
                <div className="flex flex-col gap-1 bg-surface-950/80 p-3">
                  <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-surface-500">
                    <Target className="h-3 w-3" /> Target Role
                  </div>
                  <p className="text-sm font-semibold text-white capitalize">
                    {profile?.target_role?.replace(/_/g, ' ') || '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* Learning roles (multi-role) */}
            <div className="rounded-[8px] border border-surface-800 bg-surface-900/60 p-5 sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-primary-400">
                  <Layers className="h-3.5 w-3.5" />
                  &gt; LEARNING ROLES
                  <span className="rounded-[3px] border border-surface-700 bg-surface-900 px-1.5 py-0.5 text-surface-400">
                    {goals.filter((g) => g.status === 'active').length} / 2
                  </span>
                </div>
                {!goalsStatus?.startsWith('loading') && goals.filter((g) => g.status === 'active').length < 2 && (
                  <button
                    onClick={() => navigate('/onboarding')}
                    className="rounded-[4px] border border-surface-700 px-2.5 py-1 font-mono text-[10px] text-surface-300 transition-all hover:border-primary-400/50 hover:text-primary-400"
                  >
                    + Add Role
                  </button>
                )}
              </div>

              {goals.length === 0 && goalsStatus !== 'loading' ? (
                <EmptyState
                  icon={Layers}
                  title="No learning roles yet"
                  description="Create your first learning role to start your roadmap."
                  action={
                    <Button onClick={() => navigate('/onboarding')} className="font-mono text-xs" size="sm">
                      Set Up Profile
                    </Button>
                  }
                />
              ) : (
                <div className="space-y-2">
                  {goals.map((g) => {
                    const isActive = g.path_id === activePathId
                    return (
                      <div
                        key={g.path_id}
                        className={`flex flex-wrap items-center justify-between gap-3 rounded-[8px] border px-4 py-3 ${
                          isActive
                            ? 'border-primary-400/40 bg-primary-400/5'
                            : 'border-surface-800 bg-surface-950/50'
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] border font-mono text-sm font-bold ${
                              isActive
                                ? 'border-primary-400/50 bg-primary-400/10 text-primary-400'
                                : 'border-surface-700 bg-surface-850 text-surface-400'
                            }`}
                          >
                            {g.role_label?.charAt(0).toUpperCase() || '?'}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-semibold text-white">{g.role_label}</p>
                              {g.is_custom && (
                                <span className="rounded-[3px] border border-surface-700 bg-surface-900 px-1.5 py-0.5 font-mono text-[9px] text-surface-500">
                                  CUSTOM
                                </span>
                              )}
                              {isActive && (
                                <span className="rounded-[3px] bg-primary-400 px-1.5 py-0.5 font-mono text-[9px] font-bold text-black">
                                  ACTIVE
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

                        <div className="flex shrink-0 items-center gap-4">
                          <div className="hidden w-36 sm:block">
                            <div className="mb-1 flex justify-between font-mono text-[10px]">
                              <span className="text-surface-500">{g.completed_steps}/{g.total_steps} steps</span>
                              <span className="text-primary-400">{Math.round(g.progress_percentage || 0)}%</span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-800">
                              <div
                                className={`h-full rounded-full ${g.path_completed ? 'bg-emerald-400' : 'bg-primary-400'}`}
                                style={{ width: `${g.progress_percentage || 0}%` }}
                              />
                            </div>
                          </div>
                          {isActive ? (
                            <span className="flex items-center gap-1 rounded-[4px] border border-transparent px-2.5 py-1 font-mono text-[10px] text-primary-400">
                              <Check className="h-3 w-3" /> Viewing
                            </span>
                          ) : (
                            <Button
                              onClick={() => handleActivate(g.path_id)}
                              variant="outline"
                              size="sm"
                              className="font-mono text-[10px]"
                            >
                              Switch
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Streak */}
            <div className="rounded-[8px] border border-surface-800 bg-surface-900/60 p-5">
              <div className="mb-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-primary-400">
                <Flame className="h-3.5 w-3.5" />
                &gt; LEARNING STREAK
              </div>
              {streak ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl" role="img" aria-label="fire">🔥</span>
                      <div>
                        <p className="text-2xl font-bold text-white">
                          {streak.current_streak}
                          <span className="ml-1 font-mono text-sm font-normal text-primary-400">
                            day{streak.current_streak !== 1 ? 's' : ''}
                          </span>
                        </p>
                        <p className="font-mono text-[11px] text-surface-400">Current streak</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-base font-bold text-surface-200">{streak.longest_streak}</p>
                      <p className="font-mono text-[10px] text-surface-500">Longest streak</p>
                    </div>
                  </div>
                  <StreakDots weekly={streak.weekly_activity} />
                  {streak.last_activity_date && (
                    <p className="font-mono text-[10px] text-surface-500">Last active: {streak.last_activity_date}</p>
                  )}
                </div>
              ) : (
                <EmptyState icon={Flame} title="No streak yet" description="Start learning to build your daily streak." />
              )}
            </div>

            {/* Skill progress */}
            <div className="rounded-[8px] border border-surface-800 bg-surface-900/60 p-5">
              <div className="mb-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-primary-400">
                <TrendingUp className="h-3.5 w-3.5" />
                &gt; SKILL PROGRESS
                {activeGoal?.role_label && (
                  <span className="text-surface-500 normal-case">· {activeGoal.role_label}</span>
                )}
              </div>
              {skills.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {skills.map((skill) => <SkillBar key={skill.skill_name} skill={skill} />)}
                </div>
              ) : (
                <EmptyState icon={TrendingUp} title="No skill data yet" description="Complete learning steps to track your skill progress." />
              )}
            </div>

            {/* Badges */}
            <div className="rounded-[8px] border border-surface-800 bg-surface-900/60 p-5">
              <div className="mb-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-primary-400">
                <Trophy className="h-3.5 w-3.5" />
                &gt; BADGES EARNED
              </div>
              {badges.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {badges.map((badge, i) => (
                    <div
                      key={badge.badge_id || i}
                      className="flex flex-col items-center gap-2 rounded-[8px] border border-surface-800 bg-surface-950/60 p-4 text-center transition-all hover:border-surface-700"
                    >
                      <span className="text-3xl" role="img" aria-label={badge.badge_name}>{badge.icon || '🏅'}</span>
                      <div>
                        <p className="text-xs font-semibold text-white">{badge.badge_name}</p>
                        {badge.description && (
                          <p className="mt-0.5 text-[10px] text-surface-500 leading-relaxed line-clamp-2">{badge.description}</p>
                        )}
                        {badge.earned_at && (
                          <p className="mt-1 font-mono text-[9px] text-surface-600">{badge.earned_at.split('T')[0]}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon={Trophy} title="No badges earned yet" description="Complete milestones and learning goals to earn badges." />
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}
