import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  getProfileByUsername,
  getArticlesByUser,
  toContentItem,
  type Profile as ProfileT,
  type UserArticle,
} from '../lib/userContent'
import ContentCard from '../components/ContentCard'

export default function Profile() {
  const { username } = useParams<{ username: string }>()
  const [profile, setProfile] = useState<ProfileT | null>(null)
  const [articles, setArticles] = useState<UserArticle[]>([])
  const [state, setState] = useState<'loading' | 'ready' | 'notfound'>('loading')

  useEffect(() => {
    if (!username) return
    void (async () => {
      const p = await getProfileByUsername(username)
      if (!p) {
        setState('notfound')
        return
      }
      setProfile(p)
      setArticles(await getArticlesByUser(p.id))
      setState('ready')
    })()
  }, [username])

  if (state === 'loading') {
    return <div className="max-w-6xl mx-auto px-4 py-20 text-center text-stone-400 text-sm">Loading…</div>
  }

  if (state === 'notfound' || !profile) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center">
        <p className="text-zinc-500 text-sm">No shelf found for @{username}.</p>
        <Link to="/browse" className="mt-4 inline-block text-violet-600 text-sm">← browse</Link>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-zinc-800 tracking-tight">
          {profile.display_name || `@${profile.username}`}
        </h1>
        <p className="text-sm text-stone-400 mt-1">@{profile.username}'s shelf</p>
        {profile.bio && <p className="text-sm text-zinc-500 mt-3 max-w-xl">{profile.bio}</p>}
      </header>

      {articles.length === 0 ? (
        <p className="text-stone-400 text-sm py-12 text-center">This shelf is empty.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {articles.map((a) => (
            <ContentCard key={a.id} item={toContentItem(a)} to={`/a/${a.id}`} />
          ))}
        </div>
      )}
    </div>
  )
}
