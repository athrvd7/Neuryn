import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import {
  getMyProfile,
  upsertProfile,
  getArticlesByUser,
  deleteArticle,
  type Profile,
  type UserArticle,
} from '../lib/userContent'
import AddArticleForm from '../components/AddArticleForm'

export default function Dashboard() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [articles, setArticles] = useState<UserArticle[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!loading && !user) navigate('/login')
  }, [user, loading, navigate])

  useEffect(() => {
    if (!user) return
    void (async () => {
      const [p, list] = await Promise.all([getMyProfile(user.id), getArticlesByUser(user.id)])
      setProfile(p)
      setArticles(list)
      setReady(true)
    })()
  }, [user])

  if (loading || !ready) {
    return <div className="max-w-3xl mx-auto px-4 py-20 text-center text-stone-400 text-sm">Loading…</div>
  }

  // First-time users must claim a handle before adding content.
  if (!profile) {
    return <ClaimHandle onDone={setProfile} />
  }

  async function remove(id: string) {
    if (!confirm('Delete this from your shelf?')) return
    const { error } = await deleteArticle(id)
    if (!error) setArticles((prev) => prev.filter((a) => a.id !== id))
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-baseline justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-800">My shelf</h1>
          <p className="text-sm text-stone-400 mt-1">
            Public at{' '}
            <Link to={`/u/${profile.username}`} className="text-violet-600 hover:underline">
              /u/{profile.username}
            </Link>
          </p>
        </div>
      </div>

      <div className="mb-10">
        <AddArticleForm onAdded={(a) => setArticles((prev) => [a, ...prev])} />
      </div>

      <h2 className="text-sm font-medium text-zinc-600 mb-4">
        {articles.length} {articles.length === 1 ? 'item' : 'items'}
      </h2>

      {articles.length === 0 ? (
        <p className="text-stone-400 text-sm py-8 text-center">Nothing on your shelf yet.</p>
      ) : (
        <ul className="space-y-3">
          {articles.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between gap-4 bg-white border border-stone-200 rounded-xl px-4 py-3"
            >
              <Link to={`/a/${a.id}`} className="min-w-0 group">
                <p className="text-sm font-medium text-zinc-800 truncate group-hover:text-violet-600">
                  {a.title}
                </p>
                <p className="text-xs text-stone-400 truncate">
                  {a.type} · {a.estimated_read_time} min · {a.tags.slice(0, 3).map((t) => `#${t}`).join(' ')}
                </p>
              </Link>
              <button
                onClick={() => void remove(a.id)}
                className="text-xs text-stone-400 hover:text-red-600 shrink-0 transition-colors"
              >
                delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ClaimHandle({ onDone }: { onDone: (p: Profile) => void }) {
  const { user } = useAuth()
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setError(null)
    setBusy(true)
    const handle = username.trim().toLowerCase()
    const { error } = await upsertProfile({ id: user.id, username: handle, display_name: displayName.trim() })
    setBusy(false)
    if (error) {
      setError(error.includes('duplicate') ? 'That handle is taken.' : error)
      return
    }
    onDone({ id: user.id, username: handle, display_name: displayName.trim() || null, bio: null, avatar_url: null })
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-20">
      <h1 className="text-2xl font-bold text-zinc-800 mb-2">Claim your handle</h1>
      <p className="text-sm text-stone-500 mb-8">This becomes your public shelf URL.</p>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="text-xs text-stone-500">Handle</label>
          <div className="flex items-center mt-1">
            <span className="text-sm text-stone-400 pr-1">/u/</span>
            <input
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="yourname"
              pattern="[a-zA-Z0-9_-]{3,30}"
              title="3–30 characters: letters, numbers, - or _"
              className="flex-1 px-3 py-2 rounded-lg border border-stone-300 text-sm focus:outline-none focus:border-violet-400"
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-stone-500">Display name (optional)</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full mt-1 px-3 py-2 rounded-lg border border-stone-300 text-sm focus:outline-none focus:border-violet-400"
          />
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full py-2.5 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Continue'}
        </button>
      </form>
    </div>
  )
}
