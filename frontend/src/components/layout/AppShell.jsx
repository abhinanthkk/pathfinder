import { useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import PropTypes from 'prop-types'
import { LayoutDashboard, Map, User, LogOut, Menu, X, Sparkles, Activity } from 'lucide-react'
import { Logo } from '../shared/Logo'
import { AskPathfinder } from '../shared/AskPathfinder'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { RoleSwitcher } from '../roles/RoleSwitcher'

const NAV_GROUPS = [
  {
    label: 'OVERVIEW',
    items: [{ to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'LEARNING',
    items: [
      { to: '/roadmap', label: 'Roadmap', icon: Map },
      { to: '/dashboard#progress', label: 'Progress', icon: Activity },
    ],
  },
  {
    label: 'ACCOUNT',
    items: [
      { to: '/profile', label: 'My Profile', icon: User },
      { to: '/onboarding', label: 'Edit Goal', icon: Map },
    ],
  },
]

const HOVER_OPEN_DELAY = 120
const HOVER_CLOSE_DELAY = 250
const FOCUS_CLOSE_DELAY = 200

const labelCls = (visible) =>
  `min-w-0 whitespace-nowrap overflow-hidden transition-[max-width,opacity] duration-200 ${
    visible ? 'max-w-40 opacity-100' : 'max-w-0 opacity-0'
  }`

const tooltipCls =
  'pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-[4px] border border-surface-800 bg-surface-900 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-surface-200 opacity-0 shadow-panel transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100'

AppShell.propTypes = {
  children: PropTypes.node,
}

export function AppShell({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [assistantOpen, setAssistantOpen] = useState(false)
  // true = expanded (hover/focus); false = collapsed icon rail (desktop)
  const [expanded, setExpanded] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const drawerRef = useRef(null)
  const closeButtonRef = useRef(null)
  const previouslyFocused = useRef(null)
  const openTimer = useRef(null)
  const closeTimer = useRef(null)

  // Clear any pending expand/collapse timers on unmount
  useEffect(() => {
    return () => {
      clearTimeout(openTimer.current)
      clearTimeout(closeTimer.current)
    }
  }, [])

  // Desktop hover-intent: a short delay prevents twitchy/near-edge expansion.
  const handleMouseEnter = () => {
    clearTimeout(closeTimer.current)
    openTimer.current = setTimeout(() => setExpanded(true), HOVER_OPEN_DELAY)
  }

  const handleMouseLeave = () => {
    clearTimeout(openTimer.current)
    closeTimer.current = setTimeout(() => setExpanded(false), HOVER_CLOSE_DELAY)
  }

  // Keyboard: expand while focus is inside the sidebar, collapse after it leaves.
  const handleFocus = () => {
    clearTimeout(closeTimer.current)
    clearTimeout(openTimer.current)
    setExpanded(true)
  }

  const handleBlur = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      clearTimeout(openTimer.current)
      closeTimer.current = setTimeout(() => setExpanded(false), FOCUS_CLOSE_DELAY)
    }
  }

  const handleLogout = () => {
    logout()
    toast.info('You have been logged out')
    navigate('/login')
  }

  const closeMobile = () => setMobileOpen(false)

  // Focus management for the mobile drawer
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
    <nav
      className="flex-1 space-y-6 overflow-y-auto overflow-x-hidden py-4"
      aria-label="Primary"
    >
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <p
            className={`mb-2 flex items-center px-3 font-mono text-[10px] font-medium uppercase tracking-widest text-surface-500 ${labelCls(isExpanded)}`}
          >
            &gt; {group.label}
          </p>
          <div className="space-y-0.5 px-2">
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={closeMobile}
                className={({ isActive }) =>
                  `group relative flex h-9 items-center rounded-[6px] text-sm font-medium transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-primary-400 ${
                    isExpanded ? 'gap-3 px-3' : 'justify-center gap-0 px-0'
                  } ${
                    isActive
                      ? 'border-l-2 border-primary-400 bg-primary-400/10 text-primary-300'
                      : 'text-surface-400 hover:bg-surface-850/60 hover:text-surface-100'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      className={`h-4 w-4 shrink-0 transition-colors ${
                        isActive ? 'text-primary-400' : 'text-surface-500 group-hover:text-surface-300'
                      }`}
                      aria-hidden="true"
                    />
                    <span className={labelCls(isExpanded)}>{item.label}</span>
                    {!isExpanded && (
                      <span role="tooltip" className={tooltipCls}>
                        {item.label}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      ))}

      {/* AI Assistant trigger */}
      <div className="px-2 pt-2">
        <button
          onClick={() => {
            setAssistantOpen(true)
            setMobileOpen(false)
          }}
          className={`group relative flex h-9 items-center rounded-[6px] border border-surface-700 bg-surface-900 transition-all hover:border-primary-400/60 hover:bg-surface-850 ${
            isExpanded
              ? 'gap-2.5 px-3 text-left'
              : 'justify-center gap-0 border-transparent bg-transparent px-0 hover:border-surface-700 hover:bg-surface-850'
          }`}
          aria-label="Open Ask Pathfinder AI assistant"
        >
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] bg-primary-400/10 text-primary-400">
            <Sparkles className="h-3 w-3" aria-hidden="true" />
          </div>
          <span className={`flex items-center gap-2 ${labelCls(isExpanded)}`}>
            <span className="font-mono text-[11px] uppercase tracking-wider text-primary-400">
              Ask Pathfinder
            </span>
            <span className="font-mono text-[10px] text-surface-500 group-hover:text-primary-400">AI</span>
          </span>
          {!isExpanded && (
            <span role="tooltip" className={tooltipCls}>
              Ask Pathfinder
            </span>
          )}
        </button>
      </div>
    </nav>
  )

  const renderUserMenu = (isExpanded) => (
    <div className="shrink-0 border-t border-surface-800 bg-surface-950/60 p-3">
      <div
        className={`mb-2 flex items-center gap-2.5 rounded-[4px] ${
          isExpanded ? 'px-2 py-1.5' : 'justify-center px-0'
        }`}
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[4px] border border-surface-700 bg-surface-850 text-xs font-semibold text-primary-400">
          {(user?.name || 'U').charAt(0).toUpperCase()}
        </div>
        {isExpanded && (
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-surface-200">{user?.name || 'User'}</p>
            {user?.email && <p className="truncate font-mono text-[10px] text-surface-500">{user.email}</p>}
          </div>
        )}
      </div>
      {isExpanded && (
        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2.5 rounded-[6px] px-2.5 py-1.5 text-xs font-medium text-surface-400 transition-colors hover:bg-red-500/10 hover:text-red-400 focus:outline-none focus-visible:ring-1 focus-visible:ring-red-400"
        >
          <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
          Log out
        </button>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-surface-950 text-surface-100">
      {/* Desktop hover-collapsible sidebar */}
      <aside
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={`fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-surface-800 bg-surface-950 transition-[width] duration-300 ease-out lg:flex ${
          expanded ? 'w-64' : 'w-16'
        }`}
      >
        <div
          className={`flex h-14 shrink-0 items-center border-b border-surface-800 transition-all duration-300 ${
            expanded ? 'justify-between px-4' : 'justify-center px-0'
          }`}
        >
          <Logo to="/dashboard" compact={!expanded} />
          {expanded && (
            <span className="rounded-[4px] border border-surface-800 bg-surface-900 px-1.5 py-0.5 font-mono text-[10px] text-surface-500">
              v0.1
            </span>
          )}
        </div>
        {renderNav(expanded)}
        <RoleSwitcher expanded={expanded} onExpand={() => setExpanded(true)} />
        {renderUserMenu(expanded)}
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-surface-800 bg-surface-950/90 px-4 backdrop-blur lg:hidden">
        <Logo to="/dashboard" />
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAssistantOpen(true)}
            className="flex items-center gap-1.5 rounded-[6px] border border-surface-700 bg-surface-900 px-2.5 py-1 text-xs font-medium text-primary-400"
          >
            <Sparkles className="h-3 w-3" />
            <span className="font-mono text-[10px]">AI</span>
          </button>
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-[6px] p-2 text-surface-400 transition-colors hover:text-surface-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-primary-400"
            aria-label="Open navigation"
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={closeMobile}
            aria-hidden="true"
          />
          <div
            id="mobile-nav"
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-surface-800 bg-surface-950"
          >
            <div className="flex h-14 items-center justify-between border-b border-surface-800 px-4">
              <Logo to="/dashboard" />
              <button
                ref={closeButtonRef}
                onClick={closeMobile}
                className="rounded-[6px] p-1.5 text-surface-400 transition-colors hover:text-surface-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-primary-400"
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
          </div>
        </div>
      )}

      {/* Persistent AI Assistant Drawer */}
      <AskPathfinder isOpen={assistantOpen} onClose={() => setAssistantOpen(false)} />

      {/* Floating AI assistant button (bottom-right) */}
      <button
        onClick={() => setAssistantOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-primary-400/40 bg-surface-900 shadow-2xl hover:bg-surface-800 hover:border-primary-400/70 transition-all"
        aria-label="Open AI Assistant"
      >
        <Sparkles className="h-6 w-6 text-primary-400" />
      </button>

      {/* Main content — adapts to collapsed/expanded sidebar, never overlaps it */}
      <main
        className={`px-4 py-6 transition-[padding-left] duration-300 ease-out sm:px-8 ${
          expanded ? 'lg:pl-72' : 'lg:pl-24'
        }`}
      >
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  )
}
