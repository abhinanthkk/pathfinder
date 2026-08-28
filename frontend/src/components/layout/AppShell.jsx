import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import PropTypes from 'prop-types'
import { LayoutDashboard, Map, User, LogOut, Menu, X } from 'lucide-react'
import { Logo } from '../shared/Logo'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/roadmap', label: 'Roadmap', icon: Map },
  { to: '/onboarding', label: 'Profile', icon: User },
]

AppShell.propTypes = {
  children: PropTypes.node,
}

export function AppShell({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  const handleLogout = () => {
    logout()
    toast.info('You have been logged out')
    navigate('/login')
  }

  const nav = (
    <nav className="flex-1 space-y-1 px-3" aria-label="Primary">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={() => setMobileOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 ${
              isActive
                ? 'bg-primary-500/15 text-primary-300'
                : 'text-surface-400 hover:bg-surface-800 hover:text-surface-100'
            }`
          }
        >
          <item.icon className="h-5 w-5" aria-hidden="true" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  )

  const userMenu = (
    <div className="border-t border-surface-800 p-3">
      <div className="mb-3 flex items-center gap-3 px-1">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-700 text-sm font-semibold text-surface-100">
          {(user?.name || 'U').charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-surface-200">{user?.name || 'User'}</p>
          <p className="truncate text-xs text-surface-500">{user?.email}</p>
        </div>
      </div>
      <button
        onClick={handleLogout}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-surface-400 transition-colors hover:bg-red-500/10 hover:text-red-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
      >
        <LogOut className="h-5 w-5" aria-hidden="true" />
        Log out
      </button>
    </div>
  )

  return (
    <div className="min-h-screen bg-surface-950">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-surface-800 bg-surface-900/60 lg:flex">
        <div className="flex h-16 items-center px-5">
          <Logo to="/dashboard" />
        </div>
        {nav}
        {userMenu}
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-surface-800 bg-surface-950/90 px-4 backdrop-blur lg:hidden">
        <Logo to="/dashboard" />
        <button
          onClick={() => setMobileOpen(true)}
          className="rounded-lg p-2 text-surface-400 transition-colors hover:text-surface-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
          aria-label="Open navigation"
        >
          <Menu className="h-6 w-6" aria-hidden="true" />
        </button>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-surface-800 bg-surface-900">
            <div className="flex h-16 items-center justify-between px-5">
              <Logo to="/dashboard" />
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-2 text-surface-400 transition-colors hover:text-surface-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
                aria-label="Close navigation"
              >
                <X className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
            {nav}
            {userMenu}
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="px-4 py-6 sm:px-6 lg:pl-72">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  )
}
