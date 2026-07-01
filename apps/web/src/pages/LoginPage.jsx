import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import useAuth from '../hooks/useAuth'
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient'

function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, status } = useAuth()
  const [mode, setMode] = useState('sign-in')
  const [form, setForm] = useState({ email: '', password: '' })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const redirectTo = location.state?.from ?? '/dashboard'

  if (status === 'ready' && isAuthenticated) {
    return <Navigate to={redirectTo} replace />
  }

  async function submitAuth(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')

    try {
      if (!isSupabaseConfigured) {
        throw new Error('Supabase is not configured.')
      }

      const request = mode === 'sign-in'
        ? supabase.auth.signInWithPassword(form)
        : supabase.auth.signUp(form)
      const { error: authError } = await request

      if (authError) throw authError

      if (mode === 'sign-up') {
        setMessage('Account created. If email confirmation is enabled, confirm your email before signing in.')
      } else {
        navigate(redirectTo, { replace: true })
      }
    } catch (authError) {
      setError(authError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mx-auto max-w-xl">
      <PageHeader
        eyebrow="HR access"
        title="Sign in"
        description="Access the ViankaX HR dashboard, applicant pipeline, job management, and hiring decisions."
        variant="dark"
      />

      <form onSubmit={submitAuth} className="rounded-lg border border-white/[0.10] bg-[#0B111C] p-5 shadow-xl shadow-black/20">
        <div className="mb-5 grid grid-cols-2 gap-2 rounded-lg border border-white/[0.08] bg-white/[0.04] p-1">
          {[
            ['sign-in', 'Sign in'],
            ['sign-up', 'Create account'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              className={`rounded-md px-3 py-2 text-sm font-semibold ${
                mode === value ? 'bg-[#0084FF] text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <label className="block">
          <span className="text-sm font-semibold text-white">Email</span>
          <input
            type="email"
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            className="mt-2 w-full rounded-md border border-white/[0.10] bg-[#080D14] px-3 py-3 text-white outline-none focus:border-[#0084FF]"
            required
          />
        </label>
        <label className="mt-4 block">
          <span className="text-sm font-semibold text-white">Password</span>
          <input
            type="password"
            value={form.password}
            onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
            className="mt-2 w-full rounded-md border border-white/[0.10] bg-[#080D14] px-3 py-3 text-white outline-none focus:border-[#0084FF]"
            required
          />
        </label>

        {message ? <p className="mt-4 rounded-md border border-emerald-400/25 bg-emerald-500/10 p-3 text-sm text-emerald-300">{message}</p> : null}
        {error ? <p className="mt-4 rounded-md border border-red-400/25 bg-red-500/10 p-3 text-sm text-red-300">{error}</p> : null}

        <button
          type="submit"
          disabled={busy}
          className="mt-5 w-full rounded-md bg-[#0084FF] px-5 py-3 font-semibold text-white disabled:cursor-wait disabled:opacity-70"
        >
          {busy ? 'Working...' : mode === 'sign-in' ? 'Sign in' : 'Create account'}
        </button>
      </form>
    </section>
  )
}

export default LoginPage
