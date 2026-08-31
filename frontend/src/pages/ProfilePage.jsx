import PropTypes from'prop-types'
import { useEffect, useState, useCallback } from'react'
import { useNavigate } from'react-router-dom'
import { motion } from'framer-motion'
import {
 User, Flame, Trophy, BookOpen, AlertCircle,
 TrendingUp, Target, Clock, Layers, Edit, Check, Trash2,
 Plus, Route, GraduationCap,
} from'lucide-react'
import { AppShell } from'../components/layout/AppShell'
import { PageHeader } from'../components/shared/PageHeader'
import { SectionHeading } from'../components/shared/SectionHeading'
import { Button } from'../components/ui/Button'
import { Card } from'../components/ui/Card'
import { ProgressBar } from'../components/ui/Progress'
import { CountUp } from'../components/ui/CountUp'
import { Skeleton } from'../components/ui/Skeleton'
import { EmptyState } from'../components/ui/EmptyState'
import { Modal } from'../components/ui/Modal'
import api from'../services/api'
import { useAuth } from'../context/AuthContext'
import useUserStore from'../store/useUserStore'
import useGoalsStore from'../store/useGoalsStore'
import { useToast } from'../context/ToastContext'
import { EASE } from'../lib/motion'

const DAY_LABELS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

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
 transition={{ delay: 0.1 + i * 0.04, type:'spring', stiffness: 400, damping: 24 }}
 className={`flex h-6 w-6 items-center justify-center rounded-md border transition-colors ${
 active ?'border-streak-300 bg-streak-50' :'border-line bg-surface-secondary'
 }`}
 title={day}
 >
 {active && (
 <Flame className="h-3 w-3 text-streak-500" aria-hidden="true" />
 )}
 </motion.div>
 <span className="text-[9px] font-medium text-ink-400">{day[0]}</span>
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
 const { user: authUser } = useAuth()
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
 if (streakRes.status ==='fulfilled') setStreak(streakRes.value)
 if (badgesRes.status ==='fulfilled') setBadges(badgesRes.value?.badges || [])
 if (skillsRes.status ==='fulfilled') setSkills(skillsRes.value?.skills || [])
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

 const activeGoal = goals.find((g) => g.path_id === activePathId && g.status ==='active')

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
 (profile?.target_role ? profile.target_role.replace(/_/g,'') : null)

 const totalGoals = (goals || []).filter((g) => g.status !=='archived').length

 const handleDeletePath = async () => {
 if (!deleteTarget) return
 setDeleting(true)
 try {
 await deletePath(deleteTarget.path_id)
 toast.success(`Deleted the ${deleteTarget.role_label} path.`)
 setDeleteTarget(null)
 } catch (err) {
 const detail = err?.response?.data?.detail ||''
 toast.error(detail ||'Failed to delete path.')
 } finally {
 setDeleting(false)
 }
 }

 const experienceLabel = profile?.experience_level
 ? profile.experience_level.charAt(0).toUpperCase() + profile.experience_level.slice(1)
 : null

 const name =
 authUser?.name?.trim() ||
 profile?.name?.trim() ||
 profile?.email?.split('@')[0] ||
'Learner'

 const displayName = name ==='Learner' ?'My Profile' : name

 const initials = name
 .split('')
 .map((p) => p.charAt(0))
 .filter(Boolean)
 .slice(0, 2)
 .join('')
 .toUpperCase()

 const activeRoleCount = goals.filter((g) => g.status ==='active').length

 return (
 <AppShell>
 <PageHeader
 tag="Account"
 icon={User}
 title={displayName}
 description="Your learning profile, streak, badges, and skill progression."
 />

 <div className="mt-8 space-y-6">
 {loading && (
 <div className="space-y-6">
 <div className="rounded-xl border border-line bg-surface p-6 shadow-card">
 <div className="flex items-center gap-4">
 <Skeleton className="h-16 w-16 rounded-2xl" />
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
 <div key={i} className="space-y-3 rounded-xl border border-line bg-surface p-5 shadow-card">
 <Skeleton className="h-3 w-32" />
 <Skeleton className="h-2.5 w-full" />
 <Skeleton className="h-2.5 w-3/4" />
 </div>
 ))}
 </div>
 </div>
 )}

 {error && !loading && (
 <div className="flex items-center gap-3 rounded-xl border border-danger-200 bg-danger-50 px-4 py-3">
 <AlertCircle className="h-4 w-4 shrink-0 text-danger-600" />
 <p className="text-sm text-danger-700">{error}</p>
 <button onClick={loadData} className="ml-auto text-xs font-semibold text-danger-600 underline hover:text-danger-700">
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
 className="pointer-events-none absolute inset-0 bg-[radial-gradient(700px_260px_at_85%_-30%,rgba(217,154,0,0.06),transparent)]"
 aria-hidden="true"
 />
 <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
 <div className="flex items-center gap-4">
 <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-primary-200 bg-gradient-to-br from-primary-50 to-primary-100 text-xl font-bold text-primary-700 shadow-card">
 {initials || goalLabel?.charAt(0)?.toUpperCase() ||'?'}
 </div>
 <div className="min-w-0">
 <p className="section-label text-primary-600">Learning goal</p>
 <h2 className="truncate text-lg font-semibold text-ink">{goalLabel ||'No goal set'}</h2>
 {profile?.email && (
 <p className="mt-0.5 text-[11px] text-ink-400">{profile.email}</p>
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
 <div className="rounded-lg border border-line bg-surface-secondary p-3">
 <div className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wider text-ink-400">
 <Layers className="h-3 w-3" /> Experience
 </div>
 <p className="mt-1 text-sm font-semibold capitalize text-ink">{experienceLabel ||'—'}</p>
 </div>
 <div className="rounded-lg border border-line bg-surface-secondary p-3">
 <div className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wider text-ink-400">
 <Clock className="h-3 w-3" /> Weekly Hours
 </div>
 <p className="mt-1 text-sm font-semibold text-ink">
 {profile?.weekly_hours ?`${profile.weekly_hours}h` :'—'}
 </p>
 </div>
 <div className="rounded-lg border border-line bg-surface-secondary p-3">
 <div className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wider text-ink-400">
 <BookOpen className="h-3 w-3" /> Learning Style
 </div>
 <p className="mt-1 text-sm font-semibold capitalize text-ink">
 {profile?.preferred_learning_style ||'—'}
 </p>
 </div>
 <div className="rounded-lg border border-line bg-surface-secondary p-3">
 <div className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wider text-ink-400">
 <Target className="h-3 w-3" /> Target Role
 </div>
 <p className="mt-1 truncate text-sm font-semibold capitalize text-ink">
 {profile?.target_role?.replace(/_/g,'') ||'—'}
 </p>
 </div>
 </div>
 </Card>
 </motion.div>

 {/* Snapshot stats */}
 <motion.div variants={item}>
 <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
 <Card padded className="flex items-center gap-4">
 <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-streak-200 bg-streak-50 text-streak-500">
 <Flame className="h-4 w-4" aria-hidden="true" />
 </span>
 <div>
 <p className="section-label text-ink-400">Current streak</p>
 <p className="flex items-baseline gap-1">
 <CountUp value={streak?.current_streak ?? 0} className="text-xl text-ink" />
 <span className="text-xs text-ink-400">days</span>
 </p>
 </div>
 </Card>
 <Card padded className="flex items-center gap-4">
 <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-success-200 bg-success-50 text-success-600">
 <Route className="h-4 w-4" aria-hidden="true" />
 </span>
 <div>
 <p className="section-label text-ink-400">Learning roles</p>
 <p className="flex items-baseline gap-1">
 <CountUp value={activeRoleCount} className="text-xl text-ink" />
 <span className="text-xs text-ink-400">active</span>
 </p>
 </div>
 </Card>
 <Card padded className="flex items-center gap-4">
 <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-badge-200 bg-badge-50 text-badge-600">
 <Trophy className="h-4 w-4" aria-hidden="true" />
 </span>
 <div>
 <p className="section-label text-ink-400">Badges earned</p>
 <p className="flex items-baseline gap-1">
 <CountUp value={badges.length} className="text-xl text-ink" />
 <span className="text-xs text-ink-400">total</span>
 </p>
 </div>
 </Card>
 </div>
 </motion.div>

 {/* Learning roles */}
 <motion.div variants={item}>
 <Card padded>
 <SectionHeading icon={Layers} trailing={<span className="section-label text-ink-400">{activeRoleCount} active</span>}>
 Learning Roles
 </SectionHeading>

 <div className="mt-4 flex justify-end">
 <Button onClick={() => navigate('/onboarding')} variant="outline" size="sm">
 <Plus className="h-3.5 w-3.5" aria-hidden="true" />
 Add Role
 </Button>
 </div>

 {goals.length === 0 && goalsStatus !=='loading' ? (
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
 className={`rounded-xl border px-4 py-3.5 transition-colors ${
 isActive
 ?'border-primary-200 bg-primary-50/50'
 :'border-line bg-surface hover:border-line-strong'
 }`}
 >
 <div className="flex flex-wrap items-center justify-between gap-3">
 <div className="flex min-w-0 items-center gap-3.5">
 <span
 className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-sm font-bold ${
 isActive
 ?'border-primary-200 bg-primary-50 text-primary-700'
 :'border-line-strong bg-surface-secondary text-ink-400'
 }`}
 >
 {g.role_label?.charAt(0).toUpperCase() ||'?'}
 </span>
 <div className="min-w-0">
 <div className="flex flex-wrap items-center gap-2">
 <p className="truncate text-sm font-semibold text-ink">{g.role_label}</p>
 {g.is_custom && (
 <span className="badge-line text-[9px]">Custom</span>
 )}
 {isActive && (
 <span className="inline-flex items-center gap-1 rounded-full border border-primary-200 bg-primary-50 px-2 py-0.5 text-[9px] font-semibold uppercase text-primary-700">
 <span className="h-1 w-1 rounded-full bg-primary-600" aria-hidden="true" />
 Active
 </span>
 )}
 {g.path_completed && (
 <span className="inline-flex items-center rounded-full border border-success-200 bg-success-50 px-2 py-0.5 text-[9px] font-semibold uppercase text-success-700">
 Completed
 </span>
 )}
 </div>
 <p className="mt-0.5 text-[10px] text-ink-400">
 {g.current_step_title
 ?`Now: ${g.current_step_title}`
 : g.path_completed
 ?'Path completed'
 :`Milestone ${g.current_milestone} · ${g.current_milestone_title}`}
 </p>
 </div>
 </div>

 <div className="flex shrink-0 items-center gap-3">
 <div className="hidden w-36 sm:block">
 <div className="mb-1 flex justify-between text-[10px]">
 <span className="text-ink-400">{g.completed_steps}/{g.total_steps} steps</span>
 <span className="text-primary-600">{pct}%</span>
 </div>
 <ProgressBar
 value={pct}
 max={100}
 tone={g.path_completed ?'emerald' :'gradient'}
 className="h-1.5"
 />
 </div>
 <button
 onClick={() => setDeleteTarget(g)}
 disabled={totalGoals <= 1}
 className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-danger-50 hover:text-danger-600 disabled:cursor-not-allowed disabled:opacity-30"
 aria-label={`Delete ${g.role_label} path`}
 title={totalGoals <= 1 ?'You need at least one learning path' :`Delete ${g.role_label} path`}
 >
 <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
 </button>
 {isActive ? (
 <span className="flex items-center gap-1 text-[10px] font-medium text-primary-600">
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
 <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-streak-200 bg-gradient-to-br from-streak-500/15 to-streak-500/5" role="img" aria-label="fire">
 <Flame className="h-5 w-5 text-streak-500" aria-hidden="true" />
 </span>
 <div>
 <p className="flex items-baseline gap-1.5">
 <CountUp value={streak.current_streak ?? 0} className="text-2xl text-ink" />
 <span className="text-sm font-semibold text-streak-500">day{streak.current_streak !== 1 ?'s' :''}</span>
 </p>
 <p className="text-[11px] text-ink-400">Current streak</p>
 </div>
 </div>
 <div className="text-right">
 <p className="stat-number text-lg font-semibold text-ink">{streak.longest_streak}</p>
 <p className="text-[10px] text-ink-400">Longest</p>
 </div>
 </div>
 <StreakDots weekly={streak.weekly_activity} />
 {streak.last_activity_date && (
 <p className="text-[10px] text-ink-400">Last active: {streak.last_activity_date}</p>
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
 trailing={activeGoal?.role_label && <span className="section-label text-ink-400">{activeGoal.role_label}</span>}
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
 <span className="text-xs text-ink-300">{skill.skill_name}</span>
 <span className="text-[11px] font-semibold text-primary-600">{pct}%</span>
 </div>
 <ProgressBar value={pct} max={100} tone="gradient" className="h-1.5" />
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
 <SectionHeading icon={GraduationCap} trailing={<span className="section-label text-ink-400">{badges.length} earned</span>}>
 Badges Earned
 </SectionHeading>
 {badges.length > 0 ? (
 <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
 {badges.map((badge, i) => (
 <div
 key={badge.badge_id || i}
 className="group flex flex-col items-center gap-2.5 rounded-xl border border-line bg-surface-secondary p-4 text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-200 hover:bg-surface"
 >
 <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-line-strong bg-gradient-to-br from-badge-500/10 to-primary-500/10 text-xl transition-colors group-hover:border-primary-200">
 {badge.icon ||'🏅'}
 </span>
 <div>
 <p className="text-xs font-semibold text-ink">{badge.badge_name}</p>
 {badge.description && (
 <p className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-ink-400">
 {badge.description}
 </p>
 )}
 {badge.earned_at && (
 <p className="mt-1 text-[9px] text-ink-400">{badge.earned_at.split('T')[0]}</p>
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
 title={`Delete ${deleteTarget?.role_label ||'learning path'}?`}
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
 <p className="text-sm text-ink-400">
 {deleteTarget?.status ==='active'
 ?`"${deleteTarget?.role_label}" will be removed from your learning paths.${
 deleteTarget?.path_id === activePathId ?' You will be switched to another path.' :''
 }`
 :`The completed path"${deleteTarget?.role_label}" will be removed.`}
 </p>
 </Modal>
 </AppShell>
 )
}
