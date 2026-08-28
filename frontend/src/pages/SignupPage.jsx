import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserPlus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { AuthLayout } from '../components/shared/AuthLayout'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

const SignupPage = () => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const { signup } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const validate = () => {
    const next = {}
    if (!name.trim()) next.name = 'Name is required'
    if (!email.trim()) next.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      next.email = 'Enter a valid email address'
    if (!password) next.password = 'Password is required'
    else if (password.length < 8) next.password = 'Password must be at least 8 characters'
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
      toast.success('Account created! Let’s set up your profile.')
      navigate('/onboarding')
    } catch (err) {
      const detail = err?.response?.data?.detail
      if (detail === 'Email already registered') {
        setErrors({ form: 'An account with this email already exists. Try logging in instead.' })
      } else if (err?.response?.status === 422) {
        setErrors({ form: 'Please enter a valid email address.' })
      } else {
        setErrors({ form: 'Unable to create your account. Please try again.' })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout altTitle="Already have an account?" altHref="/login" altLink="Log in">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-500/15">
          <UserPlus className="h-6 w-6 text-primary-400" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Create your account</h2>
          <p className="text-sm text-surface-400">Start building your personalized learning path.</p>
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
          label="Name"
          autoComplete="name"
          placeholder="Jane Doe"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          required
        />
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
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          required
          hint="Use at least 8 characters."
        />
        <Button type="submit" loading={loading} className="w-full">
          {loading ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
    </AuthLayout>
  )
}

export default SignupPage
