import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { AuthShell } from '../components/layout/AuthShell'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'

const LoginPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  const validate = () => {
    const next = {}
    if (!email.trim()) next.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      next.email = 'Enter a valid email address'
    if (!password) next.password = 'Password is required'
    return next
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const next = validate()
    setErrors(next)
    if (Object.keys(next).length > 0) return

    setLoading(true)
    try {
      await login(email.trim(), password)
      const from = location.state?.from?.pathname || '/dashboard'
      toast.success('Authentication successful')
      navigate(from, { replace: true })
    } catch (err) {
      const detail = err?.response?.data?.detail
      if (detail === 'Incorrect email or password' || err?.response?.status === 401) {
        setErrors({ form: 'The email or password you entered is incorrect.' })
      } else if (err?.response?.status === 422) {
        setErrors({ form: 'Please check your email and password format.' })
      } else {
        setErrors({ form: 'Unable to authenticate. Verify server connection and retry.' })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      tag="Auth / Login"
      title="Welcome back"
      subtitle="Authenticate to access your active learning roadmap."
    >
      {errors.form && (
        <div
          role="alert"
          className="mb-4 rounded-[6px] border border-red-500/30 bg-red-500/10 px-3.5 py-2 font-mono text-xs text-red-300"
        >
          {errors.form}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Input
          type="email"
          label="Email address"
          autoComplete="email"
          placeholder="engineer@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          required
        />
        <Input
          type="password"
          label="Password"
          autoComplete="current-password"
          placeholder="••••••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          required
        />
        <div className="pt-2">
          <Button type="submit" size="lg" loading={loading} className="w-full">
            {loading ? 'Authenticating…' : 'Log in'}
          </Button>
        </div>
      </form>

      <div className="mt-6 border-t border-surface-800 pt-4 text-center font-mono text-xs text-surface-400">
        <span>Need an account? </span>
        <Link to="/signup" className="font-semibold text-primary-400 transition-colors hover:text-primary-300">
          Sign up →
        </Link>
      </div>
    </AuthShell>
  )
}

export default LoginPage

