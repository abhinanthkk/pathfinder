import PropTypes from 'prop-types'
import { motion } from 'framer-motion'
import { Terminal, Network, Activity } from 'lucide-react'
import { Logo } from '../shared/Logo'
import { EASE } from '../../lib/motion'

AuthShell.propTypes = {
  children: PropTypes.node.isRequired,
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  tag: PropTypes.string,
}

const POINTS = [
  {
    icon: Terminal,
    tag: '01 / Profiling',
    title: 'Precision Skill Mapping',
    body: 'Translates goals and existing knowledge into a concrete, non-redundant path.',
  },
  {
    icon: Network,
    tag: '02 / Topology',
    title: 'Deterministic Sequencing',
    body: 'Structured directed acyclic graphs ensure prerequisites are verified first.',
  },
  {
    icon: Activity,
    tag: '03 / Metrics',
    title: 'Adaptive Calibration',
    body: 'Dynamically reorganizes milestones based on test results and learning pace.',
  },
]

export function AuthShell({ children, title, subtitle, tag = 'Auth session' }) {
  return (
    <div className="flex min-h-screen bg-surface-950 bg-app-ambient text-surface-100">
      {/* Brand / technical value panel */}
      <aside className="relative hidden w-1/2 flex-col justify-between overflow-hidden border-r border-surface-800/70 bg-surface-925 p-10 lg:flex">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute -left-24 top-1/3 h-96 w-96 rounded-full bg-primary-400/[0.06] blur-3xl" />
          <div className="absolute -right-16 top-0 h-72 w-72 rounded-full bg-sky-500/[0.04] blur-3xl" />
        </div>

        <div className="relative z-10">
          <Logo to="/" />
        </div>

        <div className="relative z-10 max-w-md space-y-6">
          <div>
            <span className="section-label text-primary-400">Engineering learning graph</span>
            <h2 className="mt-2 text-3xl font-semibold leading-tight tracking-tight text-white">
              A learning path engineered around your real skills.
            </h2>
          </div>

          <p className="text-sm leading-relaxed text-surface-400">
            No bloated course catalogs, no redundant tutorials. A focused, adaptive roadmap built around your verified career milestones.
          </p>

          <ul className="space-y-2.5 pt-2">
            {POINTS.map(({ icon: Icon, tag: t, title: pt, body }) => (
              <li
                key={t}
                className="flex gap-3 rounded-[12px] border border-surface-800 bg-surface-925/80 p-3.5 transition-colors hover:border-surface-700"
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border border-surface-700 bg-surface-900">
                  <Icon className="h-3.5 w-3.5 text-primary-400" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <span className="font-mono text-[10px] font-medium uppercase tracking-wider text-surface-500">{t}</span>
                  <p className="text-xs font-semibold text-white">{pt}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-surface-400">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 font-mono text-[11px] text-surface-500">
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
          <div className="mb-6 lg:hidden">
            <Logo to="/" />
          </div>

          <div className="rounded-[16px] border border-surface-800 bg-surface-925 p-6 shadow-panel sm:p-8">
            <p className="section-label text-primary-400">{tag}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">{title}</h1>
            {subtitle && <p className="mt-1.5 text-xs text-surface-400">{subtitle}</p>}
            <div className="mt-6">{children}</div>
          </div>
        </motion.div>
      </main>
    </div>
  )
}