import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getArticleById, toContentItem } from '../lib/userContent'
import type { ContentItem } from '../types/content'
import GistPanel from '../components/GistPanel'
import VideoEmbed from '../components/VideoEmbed'

const TYPE_COLORS: Record<string, string> = {
  article: 'text-blue-600 bg-blue-100',
  blog: 'text-amber-600 bg-amber-100',
  research: 'text-purple-600 bg-purple-100',
  video: 'text-rose-600 bg-rose-100',
}

export default function UserArticle() {
  const { id } = useParams<{ id: string }>()
  const [item, setItem] = useState<ContentItem | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) return
    void (async () => {
      const a = await getArticleById(id)
      if (!a) setNotFound(true)
      else setItem(toContentItem(a))
    })()
  }, [id])

  if (notFound) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20 text-center">
        <p className="text-zinc-500 text-sm">Article not found.</p>
        <Link to="/browse" className="mt-4 inline-block text-violet-600 text-sm">← browse</Link>
      </div>
    )
  }

  if (!item) {
    return <div className="max-w-3xl mx-auto px-4 py-20 text-center text-stone-400 text-sm">Loading…</div>
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <Link to="/browse" className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-zinc-600 text-sm mb-8 transition-colors">
        ← browse
      </Link>

      <header className="mb-8">
        <div className="flex flex-wrap items-center gap-2 mb-4 text-sm">
          <span className={`px-2.5 py-0.5 rounded-md text-xs font-medium ${TYPE_COLORS[item.type] ?? 'text-zinc-600 bg-stone-100'}`}>
            {item.type}
          </span>
          <span className="text-stone-400">{item.category}</span>
          <span className="text-stone-300">·</span>
          <span className="text-stone-400">{item.estimated_read_time} min read</span>
          <span className="text-stone-300">·</span>
          <span className="text-stone-400">
            {new Date(item.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-zinc-800 leading-tight mb-4">{item.title}</h1>

        {(item.author || item.source_url) && (
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            {item.author && <span>by <span className="text-zinc-700">{item.author}</span></span>}
            {item.source_url && (
              <>
                {item.author && <span className="text-stone-300">·</span>}
                <a href={item.source_url} target="_blank" rel="noopener noreferrer"
                  className="text-stone-400 hover:text-zinc-600 transition-colors text-xs">
                  original ↗
                </a>
              </>
            )}
          </div>
        )}

        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {item.tags.map((tag) => (
              <span key={tag} className="text-xs text-stone-400">#{tag}</span>
            ))}
          </div>
        )}
      </header>

      {item.gists && <GistPanel gists={item.gists} />}

      {item.type === 'video' && item.video_url && (
        <VideoEmbed url={item.video_url} title={item.title} />
      )}

      {item.body && (
        <article className="prose-content" dangerouslySetInnerHTML={{ __html: item.body }} />
      )}
    </div>
  )
}
