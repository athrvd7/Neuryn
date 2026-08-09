import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { isSupabaseConfigured } from '../lib/supabase'

export default function Login() {
  const { user, signInWithEmail } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (user) navigate('/me')
  }, [user, navigate])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const { error } = await signInWithEmail(email.trim())
    setBusy(false)
    if (error) setError(error)
    else setSent(true)
  }

  return (
    <div className="max-w-sm mx-auto px-4 sm:px-6 py-20">
      <h1 className="text-2xl font-bold text-zinc-800 mb-2">Sign in</h1>
      <p className="text-zinc-500 text-sm mb-8">
        Sign in to build your own shelf of articles, notes, and videos.
      </p>

      {!isSupabaseConfigured && (
        <p className="mb-6 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
          Supabase isn't configured yet. Add <code>VITE_SUPABASE_URL</code> and{' '}
          <code>VITE_SUPABASE_ANON_KEY</code> to <code>web/.env.local</code>.
        </p>
      )}

      {sent ? (
        <div className="text-sm text-zinc-600 bg-white border border-stone-200 rounded-xl p-5">
          Check <span className="font-medium text-zinc-800">{email}</span> for a magic link.
          Open it to finish signing in.
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full px-4 py-2.5 rounded-lg border border-stone-300 bg-white text-sm text-zinc-800 focus:outline-none focus:border-violet-400"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={busy || !isSupabaseConfigured}
            className="w-full py-2.5 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors"
          >
            {busy ? 'Sending…' : 'Send magic link'}
          </button>
        </form>
      )}

      <Link to="/browse" className="mt-8 inline-block text-stone-400 hover:text-zinc-600 text-sm">
        ← back to browse
      </Link>
    </div>
  )
}
