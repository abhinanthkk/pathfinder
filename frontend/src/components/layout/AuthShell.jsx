import PropTypes from'prop-types'
import { motion } from'framer-motion'
import { Compass, Network, Activity } from'lucide-react'
import { Logo } from'../shared/Logo'
import { EASE } from'../../lib/motion'

AuthShell.propTypes = {
 children: PropTypes.node.isRequired,
 title: PropTypes.string.isRequired,
 subtitle: PropTypes.string,
 tag: PropTypes.string,
}

const POINTS = [
 {
 icon: Compass,
 tag:'01 / Profiling',
 title:'Precision Skill Mapping',
 body:'Translates goals and existing knowledge into a concrete, non-redundant path.',
 },
 {
 icon: Network,
 tag:'02 / Topology',
 title:'Deterministic Sequencing',
 body:'Structured directed acyclic graphs ensure prerequisites are verified first.',
 },
 {
 icon: Activity,
 tag:'03 / Metrics',
 title:'Adaptive Calibration',
 body:'Dynamically reorganizes milestones based on test results and learning pace.',
 },
]

export function AuthShell({ children, title, subtitle, tag ='Auth session' }) {
 return (
 <div className="flex min-h-screen bg-background text-ink transition-colors duration-300 app-ambient">
 {/* Brand / technical value panel */}
 <aside className="relative hidden w-1/2 flex-col justify-between overflow-hidden border-r border-line/60 bg-gradient-to-b from-primary-50/70 via-surface to-primary-50/50 p-10 lg:flex">
 <div className="pointer-events-none absolute inset-0" aria-hidden="true">
 <div className="absolute -left-24 top-1/3 h-96 w-96 rounded-full bg-primary-200/40 blur-3xl" />
 <div className="absolute -right-16 top-0 h-72 w-72 rounded-full bg-primary-200/30 blur-3xl" />
 <div className="absolute bottom-0 right-1/4 h-72 w-72 rounded-full bg-streak-200/30 blur-3xl" />
 </div>

 <div className="relative z-10">
 <Logo to="/" />
 </div>

 <div className="relative z-10 max-w-md space-y-6">
 <div>
 <span className="section-label text-primary-600">Engineering learning graph</span>
 <h2 className="mt-2 text-3xl font-semibold leading-tight tracking-tight text-ink">
 A learning path engineered around your real skills.
 </h2>
 </div>

 <p className="text-sm leading-relaxed text-ink-400">
 No bloated course catalogs, no redundant tutorials. A focused, adaptive roadmap built around your verified career milestones.
 </p>

 <ul className="space-y-2.5 pt-2">
 {POINTS.map(({ icon: Icon, tag: t, title: pt, body }) => (
 <li
 key={t}
 className="flex gap-3 rounded-xl border border-line bg-surface/90 p-3.5 shadow-card transition-colors hover:border-primary-200"
 >
 <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
 <Icon className="h-3.5 w-3.5" aria-hidden="true" />
 </span>
 <div className="min-w-0">
 <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">{t}</span>
 <p className="text-xs font-semibold text-ink">{pt}</p>
 <p className="mt-0.5 text-xs leading-relaxed text-ink-400">{body}</p>
 </div>
 </li>
 ))}
 </ul>
 </div>

 <p className="relative z-10 text-[11px] font-medium text-ink-400">
 © {new Date().getFullYear()} Pathfinder · Deterministic learning system
 </p>
 </aside>

 {/* Form panel */}
 <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-8">
 <motion.div
 initial={{ opacity: 0, y: 12 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.5, ease: EASE }}
 className="w-full max-w-md"
 >
 <div className="mb-6 flex items-center justify-between lg:hidden">
 <Logo to="/" />
 </div>

 <div className="rounded-xl border border-line bg-surface p-6 shadow-raised sm:p-8">
 <p className="section-label text-primary-600">{tag}</p>
 <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">{title}</h1>
 {subtitle && <p className="mt-1.5 text-xs text-ink-400">{subtitle}</p>}
 <div className="mt-6">{children}</div>
 </div>
 </motion.div>
 </main>
 </div>
 )
}
