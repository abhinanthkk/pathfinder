import PropTypes from 'prop-types'
import { Terminal, Network, Activity } from 'lucide-react'
import { Logo } from '../shared/Logo'

AuthShell.propTypes = {
  children: PropTypes.node.isRequired,
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  tag: PropTypes.string,
}

const POINTS = [
  {
    icon: Terminal,
    tag: '01 / PROFILING',
    title: 'Precision Skill Mapping',
    body: 'Translates goals and existing knowledge into a concrete, non-redundant path.',
  },
  {
    icon: Network,
    tag: '02 / TOPOLOGY',
    title: 'Deterministic Sequencing',
    body: 'Structured directed acyclic graphs ensure prerequisites are verified first.',
  },
  {
    icon: Activity,
    tag: '03 / METRICS',
    title: 'Adaptive Calibration',
    body: 'Dynamically reorganizes milestones based on test results and learning pace.',
  },
]

export function AuthShell({ children, title, subtitle, tag = 'AUTH / SESSION' }) {
  return (
    <div className="flex min-h-screen bg-surface-950 text-surface-100">
      {/* Brand / technical value panel */}
      <aside className="relative hidden w-1/2 flex-col justify-between overflow-hidden border-r border-surface-800 bg-surface-950 p-10 lg:flex">
        <div className="relative z-10">
          <Logo to="/" />
        </div>

        <div className="relative z-10 max-w-md space-y-6">
          <div>
            <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-primary-400">
              &gt; ENGINEERING LEARNING GRAPH
            </span>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white leading-tight">
              A learning path engineered around your real skills.
            </h2>
          </div>

          <p className="text-sm leading-relaxed text-surface-400">
            No bloated course catalogs, no redundant tutorials. A focused, adaptive roadmap built around your verified career milestones.
          </p>

          <ul className="space-y-4 pt-2">
            {POINTS.map(({ icon: Icon, tag: t, title: pt, body }) => (
              <li key={t} className="flex gap-3 rounded-[6px] border border-surface-800 bg-surface-900/50 p-3.5">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[4px] border border-surface-700 bg-surface-950">
                  <Icon className="h-3.5 w-3.5 text-primary-400" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <span className="font-mono text-[10px] font-medium text-surface-500 uppercase">{t}</span>
                  <p className="text-xs font-semibold text-white">{pt}</p>
                  <p className="mt-0.5 text-xs text-surface-400 leading-relaxed">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 font-mono text-[11px] text-surface-500">
          © {new Date().getFullYear()} PATHFINDER · DETERMINISTIC LEARNING SYSTEM
        </p>
      </aside>

      {/* Form panel */}
      <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-6 lg:hidden">
            <Logo to="/" />
          </div>

          <div className="rounded-[8px] border border-surface-700 bg-surface-900/70 p-6 sm:p-8 shadow-2xl">
            <p className="font-mono text-[10px] font-medium uppercase tracking-widest text-primary-400">
              &gt; {tag}
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">{title}</h1>
            {subtitle && <p className="mt-1.5 text-xs text-surface-400">{subtitle}</p>}
            <div className="mt-6">{children}</div>
          </div>
        </div>
      </main>
    </div>
  )
}

