import { useNavigate, Link } from 'react-router-dom'
import { Compass, Sparkles, Repeat, TrendingUp } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui/Button'

const FEATURES = [
  {
    icon: Sparkles,
    title: 'Smart profiling',
    desc: 'AI understands your goal and current skills.',
  },
  {
    icon: Repeat,
    title: 'Adaptive paths',
    desc: 'Roadmaps replan as you progress or get stuck.',
  },
  {
    icon: TrendingUp,
    title: 'Clear progress',
    desc: 'Always know what to do next and why.',
  },
]

export default function LandingPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const home = user ? '/dashboard' : '/signup'
  const homeLabel = user ? 'Open dashboard' : 'Get started'

  return (
    <div className="flex min-h-screen flex-col bg-surface-950">
      <header className="flex items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700">
            <Compass className="h-5 w-5 text-white" aria-hidden="true" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white">Pathfinder</span>
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => navigate('/login')}>
            Log in
          </Button>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary-500/20 bg-primary-500/10 px-4 py-2 text-sm font-medium text-primary-400">
          <span className="h-2 w-2 rounded-full bg-primary-400" aria-hidden="true" />
          AI-powered learning
        </div>

        <h1 className="mb-6 max-w-3xl text-center text-4xl font-bold leading-tight md:text-6xl">
          Pathfinder
        </h1>

        <p className="mb-10 max-w-2xl text-center text-lg leading-relaxed text-surface-400">
          Your personalized, AI-powered learning roadmap. Tell us your goal, and we will chart the
          path from where you are to where you want to be.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button size="lg" onClick={() => navigate(home)}>
            {homeLabel}
          </Button>
          <Button size="lg" variant="secondary" onClick={() => navigate('/login')}>
            Log in
          </Button>
        </div>

        <div className="mt-20 grid w-full max-w-3xl grid-cols-1 gap-8 text-center sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="p-4">
              <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-surface-800">
                <f.icon className="h-6 w-6 text-primary-400" aria-hidden="true" />
              </div>
              <h3 className="text-sm font-semibold text-surface-200">{f.title}</h3>
              <p className="mt-1 text-xs text-surface-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-surface-800 px-6 py-6 text-center text-xs text-surface-600">
        Pathfinder · AI-powered personalized learning paths
      </footer>
    </div>
  )
}
