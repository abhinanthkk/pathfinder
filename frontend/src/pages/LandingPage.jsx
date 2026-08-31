import { useNavigate } from'react-router-dom'
import { ArrowRight, Target, Route, Activity, RefreshCw } from'lucide-react'
import { useAuth } from'../context/AuthContext'
import { Logo } from'../components/shared/Logo'
import { Button } from'../components/ui/Button'
import SplitLines from'../components/shared/motion/SplitLines'
import Stagger from'../components/shared/motion/Stagger'
import StaggerItem from'../components/shared/motion/StaggerItem'
import Reveal from'../components/shared/motion/Reveal'

const PILLARS = [
 {
 tag:'01 / PROFILING',
 icon: Target,
 title:'AI Profiling',
 desc:'Extracts your exact skill boundaries, weekly capacity, and career objective to eliminate generic tutorial loops.',
 },
 {
 tag:'02 / ROADMAPS',
 icon: Route,
 title:'Personalized Roadmap',
 desc:'Generates a topologically ordered learning graph with clear milestones, estimated hours, and prerequisites.',
 },
 {
 tag:'03 / METRICS',
 icon: Activity,
 title:'Progress Tracking',
 desc:'Tracks completion velocity and projects realistic completion dates calibrated to your actual study hours.',
 },
 {
 tag:'04 / ADAPTIVE',
 icon: RefreshCw,
 title:'Adaptive Learning',
 desc:'Dynamically reorganizes future milestones when you verify masteries, fail assessments, or accelerate.',
 },
]

const PIPELINE_NODES = [
 { step:'01', title:'Foundations', status:'Completed', hours:'12h', active: false },
 { step:'02', title:'Core Architecture', status:'In progress', hours:'18h', active: true },
 { step:'03', title:'Distributed Systems', status:'Ready', hours:'24h', active: false },
 { step:'04', title:'Production Deployment', status:'Locked', hours:'16h', active: false },
]

const STATUS_STYLES = {
'Completed':'border-success-200 bg-success-50 text-success-600',
'In progress':'border-primary-200 bg-primary-50 text-primary-600',
'Ready':'border-line-strong bg-white text-ink-300',
'Locked':'border-line-strong bg-surface-secondary text-ink-400',
}

export default function LandingPage() {
 const navigate = useNavigate()
 const { user } = useAuth()
 const ctaRoute = user ?'/dashboard' :'/signup'
 const ctaLabel = user ?'Open dashboard' :'Build my path'

 return (
 <div className="min-h-screen bg-background text-ink transition-colors duration-300 app-ambient">
 {/* Navigation */}
 <header className="sticky top-0 z-40 border-b border-line bg-surface/80 backdrop-blur-md">
 <nav className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-8" aria-label="Primary">
 <Logo to="/" />
 <div className="flex items-center gap-3">
 <Button
 variant="ghost"
 size="sm"
 onClick={() => document.querySelector('#capabilities')?.scrollIntoView({ behavior:'smooth' })}
 className="hidden sm:inline-flex"
 >
 Capabilities
 </Button>
 {user ? (
 <Button size="sm" onClick={() => navigate('/dashboard')}>
 Dashboard
 <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
 </Button>
 ) : (
 <>
 <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
 Log in
 </Button>
 <Button size="sm" onClick={() => navigate('/signup')}>
 Get started
 </Button>
 </>
 )}
 </div>
 </nav>
 </header>

 <main>
 {/* Hero Section */}
 <section className="relative mx-auto w-full max-w-6xl px-4 pt-16 pb-20 sm:px-8 md:pt-24 md:pb-28">
 <Stagger className="max-w-3xl" staggerChildren={0.09} delayChildren={0.05}>
 <StaggerItem>
 <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-[11px] font-medium tracking-wide text-ink-400 shadow-soft">
 <span className="relative flex h-1.5 w-1.5">
 <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-500 opacity-60" />
 <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary-500" />
 </span>
 Deterministic learning engine
 </div>
 </StaggerItem>

 <StaggerItem>
 <SplitLines
 parts={[
 { text:'Your learning path,' },
 { text:'built around you.', className:'text-primary-600' },
 ]}
 as="h1"
 ariaLabel="Your learning path, built around you."
 mount
 delay={0.1}
 stagger={0.08}
 className="text-4xl font-semibold leading-[1.08] tracking-tight text-ink sm:text-5xl md:text-6xl"
 />
 </StaggerItem>

 <StaggerItem y={24}>
 <p className="mt-6 max-w-xl text-base leading-relaxed text-ink-400 sm:text-lg">
 AI-powered learning paths based on your skills, goals and experience. Deterministic sequencing, adaptive milestones, zero generic fluff.
 </p>
 </StaggerItem>

 <StaggerItem>
 <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
 <Button size="lg" onClick={() => navigate(ctaRoute)} className="w-full sm:w-auto">
 {ctaLabel}
 <ArrowRight className="h-4 w-4" aria-hidden="true" />
 </Button>
 {!user && (
 <Button size="lg" variant="secondary" onClick={() => navigate('/login')} className="w-full sm:w-auto">
 Log in
 </Button>
 )}
 </div>
 </StaggerItem>
 </Stagger>

 {/* Roadmap Preview */}
 <Reveal y={48} delay={0.15} className="mt-14">
 <div className="overflow-hidden rounded-xl border border-line bg-surface p-5 shadow-card sm:p-6">
 <div className="mb-4 flex items-center justify-between border-b border-line pb-3 text-[11px] text-ink-400">
 <span className="flex items-center gap-2 font-medium text-ink-300">
 <span className="h-2 w-2 rounded-full bg-primary-500" />
 Machine Learning Engineer · Roadmap
 </span>
 <span className="hidden sm:inline">Estimated total · 70 hours</span>
 </div>

 <Stagger className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4" staggerChildren={0.07}>
 {PIPELINE_NODES.map((node) => (
 <StaggerItem key={node.step} y={20}>
 <div
 className={`rounded-lg border p-4 transition-all ${
 node.active
 ?'border-primary-300 bg-primary-50 shadow-soft'
 :'border-line bg-surface'
 }`}
 >
 <div className="flex items-center justify-between text-[10px]">
 <span className={node.active ?'font-bold text-primary-700' :'text-ink-400'}>
 {node.step}
 </span>
 <span
 className={`rounded-md border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${STATUS_STYLES[node.status]}`}
 >
 {node.status}
 </span>
 </div>
 <h3 className="mt-2.5 text-xs font-semibold text-ink">
 {node.title}
 </h3>
 <p className="mt-1 text-[11px] text-ink-400">
 Est. {node.hours}
 </p>
 </div>
 </StaggerItem>
 ))}
 </Stagger>
 </div>
 </Reveal>
 </section>

 {/* Capabilities Grid */}
 <section id="capabilities" className="border-y border-line bg-surface py-20">
 <div className="mx-auto w-full max-w-6xl px-4 sm:px-8">
 <Reveal className="mb-12 max-w-xl">
 <p className="section-label text-primary-600">Core principles</p>
 <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
 Engineered for maximum skill acquisition.
 </h2>
 </Reveal>

 <Stagger staggerChildren={0.1} className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
 {PILLARS.map((p) => (
 <StaggerItem key={p.title} y={24} className="flex flex-col justify-between bg-surface p-6">
 <div>
 <span className="text-[10px] font-semibold uppercase tracking-widest text-ink-400">
 {p.tag}
 </span>
 <div className="mb-3 mt-4 flex h-8 w-8 items-center justify-center rounded-lg border border-primary-200 bg-primary-50">
 <p.icon className="h-4 w-4 text-primary-600" aria-hidden="true" />
 </div>
 <h3 className="text-sm font-semibold text-ink">
 {p.title}
 </h3>
 <p className="mt-2 text-xs leading-relaxed text-ink-400">
 {p.desc}
 </p>
 </div>
 </StaggerItem>
 ))}
 </Stagger>
 </div>
 </section>

 {/* Minimal Bottom CTA */}
 <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-8">
 <Reveal y={32}>
 <div className="flex flex-col items-start justify-between gap-6 rounded-xl border border-line bg-surface p-8 shadow-card sm:flex-row sm:items-center sm:p-12">
 <div className="max-w-xl">
 <p className="section-label text-primary-600">Start profiling</p>
 <h2 className="mt-1 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
 Ready to build your roadmap?
 </h2>
 <p className="mt-2 text-sm text-ink-400">
 Complete a 3-minute guided profiling session to generate your adaptive sequence.
 </p>
 </div>
 <Button size="lg" onClick={() => navigate(ctaRoute)} className="shrink-0">
 {ctaLabel} →
 </Button>
 </div>
 </Reveal>
 </section>
 </main>

 {/* Footer */}
 <footer className="border-t border-line px-4 py-8 sm:px-8">
 <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 text-xs text-ink-400 sm:flex-row">
 <div className="flex items-center gap-2">
 <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />
 <span className="font-medium text-ink-300">Pathfinder · Deterministic learning graph</span>
 </div>
 <span>© {new Date().getFullYear()} Pathfinder Platform</span>
 </div>
 </footer>
 </div>
 )
}
