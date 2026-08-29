import { useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import PropTypes from 'prop-types'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Route, User, LogOut, Menu, X, Sparkles, Activity,
  PencilLine, PanelLeftClose, PanelLeftOpen, Compass,
} from 'lucide-react'
import { Logo } from '../shared/Logo'
import { AskPathfinder } from '../shared/AskPathfinder'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { RoleSwitcher } from '../roles/RoleSwitcher'
import { cn } from '../../lib/utils'

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [{ to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'Learning',
    items: [
      { to: '/progress', label: 'Progress', icon: Activity },
      { to: '/roadmap', label: 'Roadmap', icon: Route },
    ],
  },
  {
    label: 'Account',
    items: [
      { to: '/profile', label: 'Profile', icon: User },
      { to: '/onboarding', label: 'Edit Goal', icon: PencilLine },
    ],
  },
]

const labelCls = (visible) =>
  `min-w-0 flex-1 whitespace-nowrap overflow-hidden text-left transition-[max-width,opacity] duration-200 ${
    visible ? 'max-w-40 opacity-100' : 'max-w-0 opacity-0'
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
  const drawerRef = useRef(null)
  const closeButtonRef = useRef(null)
  const previouslyFocused = useRef(null)

  const expanded = !collapsed

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
      if (e.key === 'Escape') {
        setMobileOpen(false)
        return
      }
      if (e.key === 'Tab' && drawerRef.current) {
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
    document.body.style.overflow = 'hidden'
    const t = setTimeout(() => closeButtonRef.current?.focus(), 10)

    return () => {
      clearTimeout(t)
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
      previouslyFocused.current?.focus?.()
    }
  }, [mobileOpen])

  const renderNav = (isExpanded) => (
    <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-5" aria-label="Primary">
      {NAV_GROUPS.map((group, gi) => (
        <div key={group.label} className={cn('mb-2', gi > 0 && 'mt-6 border-t border-surface-800/60 pt-5')}>
          <p
            className={cn(
              'mb-1.5 flex items-center gap-2 px-2 font-mono text-[9px] font-medium uppercase tracking-[0.16em] text-surface-600',
              isExpanded ? '' : 'justify-center'
            )}
          >
            {isExpanded ? (
              group.label
            ) : (
              <span className="h-px w-5 bg-surface-800" aria-hidden="true" />
            )}
          </p>
          <div className={cn('space-y-0.5', isExpanded ? '' : 'space-y-1')}>
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={closeMobile}
                title={item.label}
                className={({ isActive }) =>
                  cn(
                    'group relative flex h-9 items-center rounded-[8px] text-[13px] font-medium transition-all duration-150 focus:outline-none',
                    isExpanded ? 'gap-2.5 px-2.5' : 'justify-center gap-0 px-0',
                    isActive
                      ? 'text-primary-300'
                      : 'text-surface-400 hover:bg-surface-850/70 hover:text-surface-100'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span
                        layoutId="nav-active-indicator"
                        className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full bg-primary-400"
                        style={{ width: 3, height: 18 }}
                        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                        aria-hidden="true"
                      />
                    )}
                    <span className={cn(
                      'relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-[7px] transition-colors',
                      isActive ? 'bg-primary-400/[0.12] text-primary-400' : 'text-surface-500 group-hover:text-surface-200',
                      !isExpanded && 'bg-transparent'
                    )}>
                      <item.icon className="h-[18px] w-[18px]" aria-hidden="true" />
                    </span>
                    <span className={cn(labelCls(isExpanded), isActive && 'font-medium')}>
                      {item.label}
                    </span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      ))}

      {/* AI group */}
      <div className="mt-6 border-t border-surface-800/60 pt-5">
        <p
          className={cn(
            'mb-1.5 flex items-center gap-2 px-2 font-mono text-[9px] font-medium uppercase tracking-[0.16em] text-surface-600',
            isExpanded ? '' : 'justify-center'
          )}
        >
          {isExpanded ? 'AI' : <span className="h-px w-5 bg-surface-800" aria-hidden="true" />}
        </p>
        <div className={cn('space-y-0.5', isExpanded ? '' : 'space-y-1')}>
          <button
            onClick={() => {
              setAssistantOpen(true)
              setMobileOpen(false)
            }}
            title="Ask Pathfinder"
            className={cn(
              'group relative flex h-9 items-center rounded-[8px] text-[13px] font-medium transition-all duration-150 focus:outline-none',
              isExpanded ? 'gap-2.5 px-2.5' : 'justify-center px-0',
              'text-surface-400 hover:bg-surface-850/70 hover:text-primary-300'
            )}
            aria-label="Open Ask Pathfinder AI assistant"
          >
            <span className={cn(
              'relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-[7px] border border-primary-400/20 bg-primary-400/[0.07] text-primary-400 transition-colors group-hover:border-primary-400/40 group-hover:bg-primary-400/[0.12]',
              !isExpanded && 'bg-transparent border-transparent'
            )}>
              <Sparkles className="h-[18px] w-[18px]" aria-hidden="true" />
            </span>
            <span className={labelCls(isExpanded)}>
              Ask Pathfinder
            </span>
            {isExpanded && (
              <span className="ml-auto flex h-4 items-center rounded-full border border-primary-400/25 bg-primary-400/10 px-1.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-primary-400">
                AI
              </span>
            )}
          </button>
        </div>
      </div>

      <div className={cn('mt-1', isExpanded ? 'block' : 'hidden')}>
        <NavLink
          to="/onboarding"
          onClick={closeMobile}
          className="group flex items-center gap-2.5 rounded-[6px] px-2.5 py-1.5 text-xs text-surface-500 transition-colors hover:bg-surface-850/50 hover:text-primary-300"
          title="Create a new learning path"
        >
          <Compass className="h-3.5 w-3.5" aria-hidden="true" />
          <span>New learning path</span>
        </NavLink>
      </div>
    </nav>
  )

  const renderUserMenu = (isExpanded) => (
    <div className="shrink-0 border-t border-surface-800/80 bg-surface-925/80 p-3">
      <div
        className={cn(
          'flex items-center gap-2.5 rounded-[8px]',
          isExpanded ? 'px-2 py-1.5' : 'justify-center px-0'
        )}
      >
        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] border border-surface-700 bg-gradient-to-b from-surface-800 to-surface-900 text-sm font-semibold text-primary-400 shadow-subtle">
          {(user?.name || 'U').charAt(0).toUpperCase()}
        </div>
        {isExpanded && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-surface-100">{user?.name || 'User'}</p>
            {user?.email && <p className="truncate font-mono text-[10px] text-surface-500">{user.email}</p>}
          </div>
        )}
      </div>
      <div className={cn('mt-2', !isExpanded && 'hidden')}>
        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-[8px] px-2.5 py-2 text-xs font-medium text-surface-400 transition-colors hover:bg-red-500/10 hover:text-red-400 focus:outline-none"
        >
          <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
          Log out
        </button>
      </div>
      {!isExpanded && (
        <button
          onClick={handleLogout}
          className="mt-0 flex h-9 w-9 items-center justify-center rounded-[8px] text-surface-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
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
          'flex h-16 shrink-0 items-center border-b border-surface-800/80 transition-all',
          isExpanded ? 'justify-between px-4' : 'justify-center px-0'
        )}
      >
        <Logo to="/dashboard" compact={!isExpanded} />
        {isExpanded && (
          <button
            onClick={() => setCollapsed(true)}
            className="rounded-[7px] p-1.5 text-surface-500 transition-colors hover:bg-surface-850 hover:text-surface-200"
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
          >
            <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
      {renderNav(isExpanded)}
      <RoleSwitcher expanded={isExpanded} onExpand={() => setCollapsed(false)} />
      {renderUserMenu(isExpanded)}
    </>
  )

  return (
    <div className="min-h-screen bg-surface-950 bg-app-ambient text-surface-100">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-surface-800/80 bg-surface-925/95 backdrop-blur transition-[width] duration-300 ease-out-expo lg:flex',
          expanded ? 'w-60' : 'w-[68px]'
        )}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary-400/40 to-transparent" aria-hidden="true" />
        {sidebarInner(expanded)}
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="absolute -right-3.5 top-20 flex h-7 w-7 items-center justify-center rounded-full border border-surface-700 bg-surface-900 text-surface-400 shadow-panel transition-all hover:border-primary-400/50 hover:text-primary-400"
            aria-label="Expand sidebar"
            title="Expand sidebar"
          >
            <PanelLeftOpen className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-surface-800/80 bg-surface-950/85 px-4 backdrop-blur-md lg:hidden">
        <Logo to="/dashboard" />
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAssistantOpen(true)}
            className="flex items-center gap-1.5 rounded-[8px] border border-primary-400/25 bg-surface-900 px-2.5 py-1.5 text-primary-400"
            aria-label="Open Ask Pathfinder AI assistant"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="font-mono text-[10px] font-semibold uppercase">AI</span>
          </button>
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-[8px] p-2 text-surface-400 transition-colors hover:bg-surface-850 hover:text-surface-100 focus:outline-none"
            aria-label="Open navigation"
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
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
              transition={{ type: 'spring', stiffness: 300, damping: 34 }}
              className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-surface-800 bg-surface-925"
            >
              <div className="flex h-16 shrink-0 items-center justify-between border-b border-surface-800/80 px-4">
                <Logo to="/dashboard" />
                <button
                  ref={closeButtonRef}
                  onClick={closeMobile}
                  className="rounded-[8px] p-1.5 text-surface-400 transition-colors hover:bg-surface-850 hover:text-surface-100"
                  aria-label="Close navigation"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
                {renderNav(true)}
                <RoleSwitcher expanded onExpand={() => {}} />
              </div>
              {renderUserMenu(true)}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Persistent AI Assistant Drawer */}
      <AskPathfinder isOpen={assistantOpen} onClose={() => setAssistantOpen(false)} />

      {/* Floating AI assistant button (bottom-right) */}
      <motion.button
        initial={{ scale: 0.9, opacity: 0, y: 8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 240, damping: 22 }}
        onClick={() => setAssistantOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-primary-400/25 bg-surface-925 text-primary-400 shadow-subtle transition-all hover:-translate-y-0.5 hover:border-primary-400/50 hover:text-primary-300"
        aria-label="Open AI Assistant"
      >
        <Sparkles className="h-5 w-5" aria-hidden="true" />
      </motion.button>

      {/* Main content */}
      <main
        className={cn(
          'px-4 py-8 transition-[padding] duration-300 ease-out sm:px-8',
          'lg:py-10 xl:px-10',
          expanded ? 'lg:pl-72' : 'lg:pl-28'
        )}
      >
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  )
}