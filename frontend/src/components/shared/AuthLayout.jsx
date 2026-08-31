import { Link } from 'react-router-dom'
import PropTypes from 'prop-types'
import { Logo } from '../shared/Logo'

AuthLayout.propTypes = {
  children: PropTypes.node,
  altTitle: PropTypes.string,
  altHref: PropTypes.string,
  altLink: PropTypes.string,
}

export function AuthLayout({ children, altTitle, altHref, altLink }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-ink app-ambient">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo to="/" />
        </div>
        <div className="rounded-xl border border-line bg-surface p-6 shadow-raised sm:p-8">
          {children}
        </div>
        {altTitle && (
          <p className="mt-6 text-center text-sm text-ink-400">
            {altTitle}{' '}
            <Link
              to={altHref}
              className="font-medium text-primary-600 transition-colors hover:text-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 rounded"
            >
              {altLink}
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}
