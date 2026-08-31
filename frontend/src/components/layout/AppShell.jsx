import { useEffect, useRef, useState } from'react'
import { NavLink, useLocation, useNavigate } from'react-router-dom'
import PropTypes from'prop-types'
import { motion, AnimatePresence } from'framer-motion'
import {
 LayoutDashboard, Route, User, LogOut, Menu, X, Sparkles, Activity,
 PanelLeftClose, PanelLeftOpen,
} from'lucide-react'
import { Logo } from'../shared/Logo'
import { AskPathfinder } from'../shared/AskPathfinder'
import { PathPicker } from'../roles/PathPicker'
import { useAuth } from'../../context/AuthContext'
import { useToast } from'../../context/ToastContext'
import { cn } from'../../lib/utils'
import ErrorBoundary from'../shared/ErrorBoundary'

const NAV_GROUPS = [
 {
 label:'Overview',
 items: [{ to:'/dashboard', label:'Dashboard', icon: LayoutDashboard }],
 },
 {
 label:'Learning',
 items: [
 { to:'/progress', label:'Progress', icon: Activity },
 { to:'/roadmap', label:'Roadmap', icon: Route },
 ],
 },
 {
 label:'Account',
 items: [{ to:'/profile', label:'Profile', icon: User }],
 },
]

const PAGE_TITLES = {
'/dashboard':'Dashboard',
'/progress':'Progress',
'/roadmap':'Learning Roadmap',
'/profile':'Profile',
}

const labelCls = (visible) =>
`min-w-0 flex-1 whitespace-nowrap overflow-hidden text-left transition-[max-width,opacity] duration-200 ${
 visible ?'max-w-40 opacity-100' :'max-w-0 opacity-0'
 }`

AppShell.propTypes = {
 children: PropTypes.node,
}

export function AppShell({ children }) {
 const [mobileOpen, setMobileOpen] = useState(false)
 const [assistantOpen, setAssistantOpen] = useState(false)
 const [collapsed, setCollapsed] = useState(false)
 const { user, logout } = useAuth()
 const navigate = useNavigate()
 const toast = useToast()
 const location = useLocation()
 const drawerRef = useRef(null)
 const closeButtonRef = useRef(null)
 const previouslyFocused = useRef(null)

 const expanded = !collapsed
 const pageTitle = PAGE_TITLES[location.pathname] ||''

 const handleLogout = () => {
 logout()
 toast.info('You have been logged out')
 navigate('/login')
 }

 const closeMobile = () => setMobileOpen(false)

 useEffect(() => {
 if (!mobileOpen) return undefined
 previouslyFocused.current = document.activeElement
 const handleKeyDown = (e) => {
 if (e.key ==='Escape') {
 setMobileOpen(false)
 return
 }
 if (e.key ==='Tab' && drawerRef.current) {
 const focusables = drawerRef.current.querySelectorAll(
'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
 )
 if (focusables.length === 0) return
 const first = focusables[0]
 const last = focusables[focusables.length - 1]
 if (e.shiftKey && document.activeElement === first) {
 e.preventDefault()
 last.focus()
 } else if (!e.shiftKey && document.activeElement === last) {
 e.preventDefault()
 first.focus()
 }
 }
 }
 document.addEventListener('keydown', handleKeyDown)
 document.body.style.overflow ='hidden'
 const t = setTimeout(() => closeButtonRef.current?.focus(), 10)

 return () => {
 clearTimeout(t)
 document.removeEventListener('keydown', handleKeyDown)
 document.body.style.overflow =''
 previouslyFocused.current?.focus?.()
 }
 }, [mobileOpen])

 const renderNav = (isExpanded) => (
 <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-5" aria-label="Primary">
 {NAV_GROUPS.map((group, gi) => {
 const activeInGroup = group.items.some((item) => item.to === location.pathname)
 return (
 <div
 key={group.label}
 className={cn('mb-2', gi > 0 &&'mt-6 border-t border-line/60 pt-5')}
 >
 <p
 className={cn(
'mb-1.5 flex items-center gap-2 px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-400',
 isExpanded ?'' :'justify-center'
 )}
 >
 {isExpanded ? (
 group.label
 ) : (
 <span
 className={cn('h-px w-5', activeInGroup ?'bg-primary-400' :'bg-line-strong')}
 aria-hidden="true"
 />
 )}
 </p>
 <div className={cn('space-y-0.5', isExpanded ?'' :'space-y-1')}>
 {group.items.map((item) => (
 <NavLink
 key={item.to}
 to={item.to}
 onClick={closeMobile}
 title={item.label}
 className={({ isActive }) =>
 cn(
'group relative flex h-9 items-center rounded-lg text-[13px] font-medium transition-all duration-200 focus:outline-none',
 isExpanded ?'gap-2.5 px-2' :'justify-center px-0',
 isActive
 ?'bg-primary-50 text-primary-700'
 :'text-ink-400 hover:bg-primary-50/60 hover:text-ink'
 )
 }
 >
 {({ isActive }) => (
 <>
 {isActive && (
 <motion.span
 layoutId="nav-active-indicator"
 className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full bg-primary-600"
 style={{ width: 3, height: 16 }}
 transition={{ type:'spring', stiffness: 420, damping: 34 }}
 aria-hidden="true"
 />
 )}
 <span
 className={cn(
'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors duration-200',
 isActive
 ?'text-primary-600'
 :'text-ink-400 group-hover:text-ink',
 !isExpanded &&'mx-auto'
 )}
 >
 <item.icon className="h-[18px] w-[18px]" aria-hidden="true" />
 </span>
 <span className={cn(labelCls(isExpanded), isActive &&'font-medium')}>
 {item.label}
 </span>
 </>
 )}
 </NavLink>
 ))}
 </div>
 </div>
 )
 })}

 {/* AI group */}
 <div className="mt-6 border-t border-line/60 pt-5">
 <p
 className={cn(
'mb-1.5 flex items-center gap-2 px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-400',
 isExpanded ?'' :'justify-center'
 )}
 >
 {isExpanded ? (
'AI'
 ) : (
 <span className="h-px w-5 bg-line-strong" aria-hidden="true" />
 )}
 </p>
 <div className={cn('space-y-0.5', isExpanded ?'' :'space-y-1')}>
 <button
 onClick={() => {
 setAssistantOpen(true)
 setMobileOpen(false)
 }}
 title="Ask Pathfinder"
 className={cn(
'group relative flex h-9 items-center rounded-lg text-[13px] font-medium transition-all duration-200 focus:outline-none',
 isExpanded ?'gap-2.5 px-2' :'justify-center px-0',
'text-ink-400 hover:bg-gradient-to-r hover:from-ai-500/10 hover:to-primary-500/10 hover:text-ai-600'
 )}
 aria-label="Open Ask Pathfinder AI assistant"
 >
 <span
 className={cn(
'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors duration-200 text-ai-500 group-hover:text-ai-600',
 !isExpanded &&'mx-auto'
 )}
 >
 <Sparkles className="h-[18px] w-[18px]" aria-hidden="true" />
 </span>
 <span className={labelCls(isExpanded)}>Ask Pathfinder</span>
 {isExpanded && (
 <span className="ml-auto mr-0.5 rounded-full border border-ai-200 bg-ai-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-ai-600">
 AI
 </span>
 )}
 </button>
 </div>
 </div>
 </nav>
 )

 const renderUserMenu = (isExpanded) => (
 <div className="shrink-0 border-t border-line/60 bg-surface-secondary/50 p-3">
 <div
 className={cn(
'flex items-center gap-2.5 rounded-lg',
 isExpanded ?'px-1.5 py-1.5' :'justify-center px-0'
 )}
 >
 <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line-strong bg-gradient-to-br from-primary-50 to-primary-100 text-xs font-semibold text-primary-700 shadow-soft">
 {(user?.name ||'U').charAt(0).toUpperCase()}
 </div>
 {isExpanded && (
 <div className="min-w-0 flex-1">
 <p className="truncate text-[13px] font-medium text-ink">
 {user?.name ||'User'}
 </p>
 {user?.email && (
 <p className="truncate text-[10px] text-ink-400">{user.email}</p>
 )}
 </div>
 )}
 </div>
 <div className={cn('mt-2', !isExpanded &&'hidden')}>
 <button
 onClick={handleLogout}
 className="flex w-full items-center justify-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-ink-400 transition-colors hover:bg-danger-50 hover:text-danger-600 focus:outline-none"
 >
 <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
 Log out
 </button>
 </div>
 {!isExpanded && (
 <button
 onClick={handleLogout}
 className="mx-auto mt-0 flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-danger-50 hover:text-danger-600"
 aria-label="Log out"
 title="Log out"
 >
 <LogOut className="h-4 w-4" aria-hidden="true" />
 </button>
 )}
 </div>
 )

 const sidebarInner = (isExpanded) => (
 <>
 <div
 className={cn(
'flex h-14 shrink-0 items-center border-b border-line/60 transition-all',
 isExpanded ?'justify-between px-4' :'justify-center px-0'
 )}
 >
 <Logo to="/dashboard" compact={!isExpanded} />
 {isExpanded && (
 <button
 onClick={() => setCollapsed(true)}
 className="rounded-md p-1.5 text-ink-400 transition-colors hover:bg-surface-secondary hover:text-ink"
 aria-label="Collapse sidebar"
 title="Collapse sidebar"
 >
 <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
 </button>
 )}
 </div>
 {renderNav(isExpanded)}
 {renderUserMenu(isExpanded)}
 </>
 )

 const topBar = (
 <header className="sticky top-0 z-30 -mx-4 mb-8 border-b border-line-strong/60 bg-surface px-4 transition-colors sm:-mx-8 sm:px-8 xl:-mx-10 xl:px-10">
 <div className="flex h-14 items-center justify-between gap-3">
 <div className="flex min-w-0 items-center gap-3">
 {pageTitle && (
 <h1 className="truncate text-[15px] font-semibold tracking-tight text-ink">
 {pageTitle}
 </h1>
 )}
 </div>
 <div className="flex shrink-0 items-center gap-2">
 <PathPicker align="end" className="hidden sm:block" />
 <button
 onClick={() => setAssistantOpen(true)}
 className="flex h-9 items-center gap-1.5 rounded-lg border border-ai-200 bg-ai-50 px-2.5 text-ai-700 transition-all duration-200 hover:bg-ai-100 hover:shadow-glow-ai focus:outline-none focus-visible:ring-1 focus-visible:ring-ai-400"
 aria-label="Open Ask Pathfinder AI assistant"
 >
 <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
 <span className="text-[10px] font-semibold uppercase tracking-wide">AI</span>
 </button>
 <button
 onClick={() => navigate('/profile')}
 className="flex h-9 w-9 items-center justify-center rounded-lg border border-line-strong bg-gradient-to-br from-primary-50 to-primary-100 text-xs font-semibold text-primary-700 shadow-soft transition-all duration-200 hover:border-primary-300 hover:shadow-glow-primary focus:outline-none focus-visible:ring-1 focus-visible:ring-primary-400"
 aria-label="Open profile"
 title="Profile"
 >
 {(user?.name ||'U').charAt(0).toUpperCase()}
 </button>
 </div>
 </div>
 </header>
 )

 return (
 <div className="min-h-screen bg-background text-ink transition-colors duration-300 app-ambient">
 {/* Desktop sidebar */}
 <aside
 className={cn(
'fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-line-strong/60 bg-surface transition-[width] duration-300 ease-out lg:flex',
 expanded ?'w-60' :'w-[68px]'
 )}
 >
 <div
 className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary-400/40 to-transparent"
 aria-hidden="true"
 />
 {sidebarInner(expanded)}
 {collapsed && (
 <button
 onClick={() => setCollapsed(false)}
 className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border border-line-strong bg-surface text-ink-400 shadow-card transition-all duration-200 hover:border-primary-400 hover:text-primary-600"
 aria-label="Expand sidebar"
 title="Expand sidebar"
 >
 <PanelLeftOpen className="h-3.5 w-3.5" aria-hidden="true" />
 </button>
 )}
 </aside>

 {/* Mobile top bar */}
 <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-line/60 bg-surface px-4 transition-colors lg:hidden">
 <Logo to="/dashboard" />
 <div className="flex items-center gap-2">
 <button
 onClick={() => setAssistantOpen(true)}
 className="flex items-center gap-1.5 rounded-lg border border-ai-200 bg-ai-50 px-2.5 py-1.5 text-ai-700"
 aria-label="Open Ask Pathfinder AI assistant"
 >
 <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
 <span className="text-[10px] font-semibold uppercase tracking-wide">AI</span>
 </button>
 <button
 onClick={() => setMobileOpen(true)}
 className="rounded-lg p-2 text-ink-400 transition-colors hover:bg-surface-secondary hover:text-ink focus:outline-none"
 aria-label="Open navigation"
 aria-expanded={mobileOpen}
 aria-controls="mobile-nav"
 >
 <Menu className="h-5 w-5" aria-hidden="true" />
 </button>
 </div>
 </header>

 {/* Mobile path selector row */}
 <div className="sticky top-14 z-30 border-b border-line/60 bg-surface px-4 py-2 transition-colors lg:hidden">
 <PathPicker align="start" />
 </div>

 {/* Mobile drawer */}
 <AnimatePresence>
 {mobileOpen && (
 <div className="fixed inset-0 z-50 lg:hidden">
 <motion.div
 className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 transition={{ duration: 0.18 }}
 onClick={closeMobile}
 aria-hidden="true"
 />
 <motion.div
 id="mobile-nav"
 ref={drawerRef}
 role="dialog"
 aria-modal="true"
 aria-label="Navigation menu"
 initial={{ x: -280 }}
 animate={{ x: 0 }}
 exit={{ x: -280 }}
 transition={{ type:'spring', stiffness: 300, damping: 34 }}
 className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-line/60 bg-surface"
 >
 <div className="flex h-14 shrink-0 items-center justify-between border-b border-line/60 px-4">
 <Logo to="/dashboard" />
 <button
 ref={closeButtonRef}
 onClick={closeMobile}
 className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-surface-secondary hover:text-ink"
 aria-label="Close navigation"
 >
 <X className="h-5 w-5" aria-hidden="true" />
 </button>
 </div>
 <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
 {renderNav(true)}
 </div>
 {renderUserMenu(true)}
 </motion.div>
 </div>
 )}
 </AnimatePresence>

 {/* Persistent AI Assistant Drawer */}
 <ErrorBoundary>
 <AskPathfinder isOpen={assistantOpen} onClose={() => setAssistantOpen(false)} />
 </ErrorBoundary>

 {/* Floating AI assistant button (bottom-right) */}
 <motion.button
 initial={{ scale: 0.9, opacity: 0, y: 8 }}
 animate={{ scale: 1, opacity: 1, y: 0 }}
 transition={{ delay: 0.5, type:'spring', stiffness: 240, damping: 22 }}
 onClick={() => setAssistantOpen(true)}
 className="fixed bottom-6 right-6 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-ai-200 bg-gradient-to-br from-primary-500 via-primary-400 to-primary-600 text-white shadow-glow-ai transition-all duration-200 hover:-translate-y-0.5 hover:shadow-panel"
 aria-label="Open AI Assistant"
 >
 <Sparkles className="h-5 w-5" aria-hidden="true" />
 </motion.button>

 {/* Main content */}
 <main
 className={cn(
'transition-[padding] duration-300 ease-out',
 expanded ?'lg:pl-72' :'lg:pl-28'
 )}
 >
 <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 lg:py-8 xl:px-10">
 <div className={cn('hidden lg:block')}>{topBar}</div>
 {children}
 </div>
 </main>
 </div>
 )
}
