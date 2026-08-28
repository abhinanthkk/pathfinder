import { useNavigate } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { Button } from '../components/ui/Button'

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-950 px-6 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-500/15">
        <Compass className="h-8 w-8 text-primary-400" aria-hidden="true" />
      </div>
      <p className="text-sm font-semibold uppercase tracking-widest text-primary-400">404</p>
      <h1 className="mt-2 text-3xl font-bold text-white">Page not found</h1>
      <p className="mt-3 max-w-md text-surface-400">
        The page you are looking for does not exist or may have been moved. Let us get you back on
        track.
      </p>
      <div className="mt-8 flex gap-3">
        <Button onClick={() => navigate('/')}>Back to home</Button>
        <Button variant="secondary" onClick={() => navigate(-1)}>
          Go back
        </Button>
      </div>
    </div>
  )
}
