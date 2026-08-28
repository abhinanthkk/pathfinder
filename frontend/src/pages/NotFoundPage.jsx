import { useNavigate } from 'react-router-dom'
import { Terminal, ArrowLeft } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Logo } from '../components/shared/Logo'

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-950 px-6 text-center text-surface-100">
      <div className="mb-6">
        <Logo to="/" />
      </div>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[6px] border border-surface-700 bg-surface-900">
        <Terminal className="h-6 w-6 text-primary-400" aria-hidden="true" />
      </div>
      <p className="font-mono text-xs font-semibold uppercase tracking-widest text-primary-400">
        &gt; ERROR 404 / NOT FOUND
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
        Resource not located
      </h1>
      <p className="mt-3 max-w-md text-xs sm:text-sm text-surface-400 leading-relaxed">
        The requested routing node does not exist in the active graph topology.
      </p>
      <div className="mt-8 flex gap-3">
        <Button onClick={() => navigate('/dashboard')} className="font-mono text-xs">
          RETURN TO DASHBOARD
        </Button>
        <Button variant="secondary" onClick={() => navigate(-1)} className="font-mono text-xs">
          <ArrowLeft className="h-3.5 w-3.5" />
          GO BACK
        </Button>
      </div>
    </div>
  )
}

