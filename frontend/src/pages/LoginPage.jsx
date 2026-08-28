import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { AuthLayout } from '../components/shared/AuthLayout'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

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
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = 'Enter a valid email address'
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
      toast.success('Welcome back!')
      navigate(from, { replace: true })
    } catch (err) {
      const detail = err?.response?.data?.detail
      if (detail === 'Incorrect email or password') {
        setErrors({ form: 'The email or password you entered is incorrect.' })
      } else if (err?.response?.status === 401) {
        setErrors({ form: 'The email or password you entered is incorrect.' })
      } else if (err?.response?.status === 422) {
        setErrors({ form: 'Please check your email and password.' })
      } else {
        setErrors({ form: 'Unable to log in. Please check your connection and try again.' })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout altTitle="Don't have an account?" altHref="/signup" altLink="Sign up">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-500/15">
          <LogIn className="h-6 w-6 text-primary-400" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Welcome back</h2>
          <p className="text-sm text-surface-400">Log in to continue your learning journey.</p>
        </div>
      </div>

      {errors.form && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-300"
        >
          {errors.form}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Input
          type="email"
          label="Email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          required
        />
        <Input
          type="password"
          label="Password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          required
        />
        <Button type="submit" loading={loading} className="w-full">
          {loading ? 'Logging in…' : 'Log in'}
        </Button>
      </form>
    </AuthLayout>
  )
}

export default LoginPage
