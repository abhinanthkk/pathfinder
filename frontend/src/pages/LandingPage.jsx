import { useNavigate } from 'react-router-dom'
import { ArrowRight, Terminal, Network, Activity, Cpu } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Logo } from '../components/shared/Logo'
import { Button } from '../components/ui/Button'

const PILLARS = [
  {
    tag: '01 / PROFILING',
    icon: Terminal,
    title: 'AI PROFILING',
    desc: 'Extracts your exact skill boundaries, weekly capacity, and career objective to eliminate generic tutorial loops.',
  },
  {
    tag: '02 / ARCHITECTURE',
    icon: Network,
    title: 'PERSONALIZED ROADMAP',
    desc: 'Generates a topologically ordered learning graph with clear milestones, estimated hours, and prerequisites.',
  },
  {
    tag: '03 / METRICS',
    icon: Activity,
    title: 'PROGRESS TRACKING',
    desc: 'Tracks completion velocity and projects realistic completion dates calibrated to your actual study hours.',
  },
  {
    tag: '04 / COMPILATION',
    icon: Cpu,
    title: 'ADAPTIVE LEARNING',
    desc: 'Dynamically reorganizes future milestones when you verify masteries, fail assessments, or accelerate.',
  },
]

const PIPELINE_NODES = [
  { step: '01', title: 'FOUNDATIONS', status: 'COMPLETED', hours: '12h', active: false },
  { step: '02', title: 'CORE ARCHITECTURE', status: 'IN PROGRESS', hours: '18h', active: true },
  { step: '03', title: 'DISTRIBUTED SYSTEMS', status: 'READY', hours: '24h', active: false },
  { step: '04', title: 'PRODUCTION DEPLOYMENT', status: 'LOCKED', hours: '16h', active: false },
]

export default function LandingPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const ctaRoute = user ? '/dashboard' : '/signup'
  const ctaLabel = user ? 'OPEN DASHBOARD' : 'BUILD MY PATH'

  return (
    <div className="min-h-screen bg-surface-950 text-surface-100 selection:bg-primary-400 selection:text-surface-950">
      {/* Navigation */}
      <header className="sticky top-0 z-40 border-b border-surface-800 bg-surface-950/90 backdrop-blur-md">
        <nav className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-8" aria-label="Primary">
          <Logo to="/" />
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => document.querySelector('#capabilities')?.scrollIntoView({ behavior: 'smooth' })}
              className="hidden sm:inline-flex font-mono text-xs"
            >
              CAPABILITIES
            </Button>
            {user ? (
              <Button size="sm" onClick={() => navigate('/dashboard')}>
                DASHBOARD
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate('/login')} className="font-mono text-xs">
                  LOG IN
                </Button>
                <Button size="sm" onClick={() => navigate('/signup')}>
                  GET STARTED
                </Button>
              </>
            )}
          </div>
        </nav>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative mx-auto w-full max-w-6xl px-4 pt-16 pb-20 sm:px-8 md:pt-24 md:pb-28">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-[4px] border border-surface-700 bg-surface-900 px-2.5 py-1 font-mono text-[11px] font-medium tracking-wider text-surface-300">
              <span className="h-1.5 w-1.5 rounded-full bg-primary-400" />
              &gt; SYSTEM / DETERMINISTIC LEARNING ENGINE
            </div>

            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl md:text-6xl leading-[1.08]">
              Your learning path, <br />
              <span className="text-primary-400">built around you.</span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-relaxed text-surface-400 sm:text-lg">
              AI-powered learning paths based on your skills, goals and experience. Deterministic sequencing, adaptive milestones, zero generic fluff.
            </p>

            <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <Button size="lg" onClick={() => navigate(ctaRoute)} className="w-full sm:w-auto font-mono text-xs tracking-wider">
                {ctaLabel}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
              {!user && (
                <Button
                  size="lg"
                  variant="secondary"
                  onClick={() => navigate('/login')}
                  className="w-full sm:w-auto font-mono text-xs tracking-wider"
                >
                  SIGN IN →
                </Button>
              )}
            </div>
          </div>

          {/* Technical Architecture Preview */}
          <div className="mt-14 overflow-hidden rounded-[8px] border border-surface-700 bg-surface-900/60 p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between border-b border-surface-800 pb-3 font-mono text-[11px] text-surface-500">
              <span className="flex items-center gap-2 text-surface-300">
                <span className="h-2 w-2 rounded-full bg-primary-400" />
                ACTIVE_GRAPH: BACKEND_SYSTEMS_ENGINEER
              </span>
              <span>EST_TOTAL: 70 HOURS</span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {PIPELINE_NODES.map((node) => (
                <div
                  key={node.step}
                  className={`rounded-[6px] border p-4 transition-colors ${
                    node.active
                      ? 'border-primary-400 bg-primary-400/5 shadow-highlight'
                      : 'border-surface-800 bg-surface-950/60'
                  }`}
                >
                  <div className="flex items-center justify-between font-mono text-[10px]">
                    <span className={node.active ? 'text-primary-400 font-bold' : 'text-surface-500'}>
                      {node.step}
                    </span>
                    <span
                      className={`rounded-[3px] border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider ${
                        node.status === 'COMPLETED'
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                          : node.status === 'IN PROGRESS'
                            ? 'border-primary-400/40 bg-primary-400/10 text-primary-400'
                            : 'border-surface-800 bg-surface-900 text-surface-500'
                      }`}
                    >
                      {node.status}
                    </span>
                  </div>
                  <h3 className="mt-2.5 text-xs font-semibold text-white">
                    {node.title}
                  </h3>
                  <p className="mt-1 font-mono text-[11px] text-surface-500">
                    Est. {node.hours}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Capabilities Grid */}
        <section id="capabilities" className="border-y border-surface-800 bg-surface-900/30 py-20">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-8">
            <div className="mb-12 max-w-xl">
              <p className="font-mono text-xs font-medium uppercase tracking-widest text-primary-400">
                &gt; CORE PRINCIPLES
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Engineered for maximum skill acquisition.
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-px overflow-hidden rounded-[8px] border border-surface-800 bg-surface-800 sm:grid-cols-2 lg:grid-cols-4">
              {PILLARS.map((p) => (
                <div key={p.title} className="bg-surface-950 p-6 flex flex-col justify-between">
                  <div>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-surface-500">
                      {p.tag}
                    </span>
                    <div className="mt-4 mb-3 flex h-8 w-8 items-center justify-center rounded-[4px] border border-surface-700 bg-surface-900">
                      <p.icon className="h-4 w-4 text-primary-400" aria-hidden="true" />
                    </div>
                    <h3 className="text-sm font-semibold text-white">
                      {p.title}
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed text-surface-400">
                      {p.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Minimal Bottom CTA */}
        <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-8">
          <div className="rounded-[8px] border border-surface-700 bg-surface-900/50 p-8 sm:p-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="max-w-xl">
              <p className="font-mono text-xs uppercase tracking-widest text-primary-400">
                &gt; START PROFILING
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Ready to calibrate your roadmap?
              </h2>
              <p className="mt-2 text-sm text-surface-400">
                Complete a 3-minute guided profiling session to generate your adaptive sequence.
              </p>
            </div>
            <Button size="lg" onClick={() => navigate(ctaRoute)} className="shrink-0 font-mono text-xs tracking-wider">
              {ctaLabel} →
            </Button>
          </div>
        </section>
      </main>

      {/* Technical Footer */}
      <footer className="border-t border-surface-800 px-4 py-8 sm:px-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 font-mono text-xs text-surface-500 sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-primary-400" />
            <span>PATHFINDER · DETERMINISTIC LEARNING GRAPH</span>
          </div>
          <span>© {new Date().getFullYear()} PATHFINDER PLATFORM</span>
        </div>
      </footer>
    </div>
  )
}

