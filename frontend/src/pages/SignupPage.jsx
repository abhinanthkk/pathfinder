import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { AuthShell } from '../components/layout/AuthShell'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'

const SignupPage = () => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const { signup } = useAuth()
  const navigate = useNavigate()

  const validate = () => {
    const next = {}
    if (!name.trim()) next.name = 'Name is required'
    if (!email.trim()) next.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      next.email = 'Enter a valid email address'
    if (!password) next.password = 'Password is required'
    else if (password.length < 8)
      next.password = 'Password must be at least 8 characters'
    return next
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const next = validate()
    setErrors(next)
    if (Object.keys(next).length > 0) return

    setLoading(true)
    try {
      await signup(name.trim(), email.trim(), password)
      navigate('/onboarding')
    } catch (err) {
      const detail = err?.response?.data?.detail
      if (detail === 'Email already registered') {
        setErrors({ form: 'An account with this email already exists. Log in instead.' })
      } else if (err?.response?.status === 422) {
        setErrors({ form: 'Please verify your credentials and format.' })
      } else {
        setErrors({ form: 'Unable to initialize account. Verify connection and retry.' })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      tag="Auth / Registration"
      title="Create your account"
      subtitle="Set up your profile and start your learning trajectory."
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
          label="Full name"
          autoComplete="name"
          placeholder="Jane Doe"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          required
        />
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
          autoComplete="new-password"
          placeholder="Minimum 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          required
          hint="Minimum 8 alphanumeric characters."
        />
        <div className="pt-2">
          <Button type="submit" size="lg" loading={loading} className="w-full">
            {loading ? 'Creating account…' : 'Create account'}
          </Button>
        </div>
      </form>

      <div className="mt-6 border-t border-surface-800 pt-4 text-center font-mono text-xs text-surface-400">
        <span>Already have an account? </span>
        <Link to="/login" className="font-semibold text-primary-400 transition-colors hover:text-primary-300">
          Log in →
        </Link>
      </div>
    </AuthShell>
  )
}

export default SignupPage

