import { useNavigate } from'react-router-dom'
import { Compass, ArrowLeft } from'lucide-react'
import { Button } from'../components/ui/Button'
import { Logo } from'../components/shared/Logo'

export default function NotFoundPage() {
 const navigate = useNavigate()

 return (
 <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center text-ink app-ambient">
 <div className="mb-6">
 <Logo to="/" />
 </div>
 <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-primary-200 bg-primary-50">
 <Compass className="h-6 w-6 text-primary-600" aria-hidden="true" />
 </div>
 <p className="text-xs font-semibold uppercase tracking-widest text-primary-600">
 Error 404 · Not found
 </p>
 <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
 Resource not located
 </h1>
 <p className="mt-3 max-w-md text-xs leading-relaxed text-ink-400 sm:text-sm">
 The page you&apos;re looking for doesn&apos;t exist in the current graph topology.
 </p>
 <div className="mt-8 flex gap-3">
 <Button onClick={() => navigate('/dashboard')} className="text-xs">
 Return to dashboard
 </Button>
 <Button variant="secondary" onClick={() => navigate(-1)} className="text-xs">
 <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
 Go back
 </Button>
 </div>
 </div>
 )
}
