import { useState } from 'react'
import { ingestArticle, type UserArticle } from '../lib/userContent'
import type { ContentType } from '../types/content'

const TYPES: ContentType[] = ['article', 'blog', 'research', 'video']

export default function AddArticleForm({ onAdded }: { onAdded: (a: UserArticle) => void }) {
  const [mode, setMode] = useState<'url' | 'text'>('url')
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [type, setType] = useState<ContentType>('article')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const { article, error } = await ingestArticle(
      mode === 'url'
        ? { mode, url: url.trim(), type }
        : { mode, text, title: title.trim(), type },
    )
    setBusy(false)
    if (error) {
      setError(error)
      return
    }
    if (article) {
      setUrl('')
      setText('')
      setTitle('')
      onAdded(article)
    }
  }

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-5">
      <div className="flex gap-1 mb-5 bg-stone-100 rounded-lg p-1 w-fit text-sm">
        <button
          onClick={() => setMode('url')}
          className={`px-3 py-1.5 rounded-md transition-colors ${mode === 'url' ? 'bg-white text-zinc-800 shadow-sm' : 'text-zinc-500'}`}
        >
          Paste a link
        </button>
        <button
          onClick={() => setMode('text')}
          className={`px-3 py-1.5 rounded-md transition-colors ${mode === 'text' ? 'bg-white text-zinc-800 shadow-sm' : 'text-zinc-500'}`}
        >
          Write your own
        </button>
      </div>

      <form onSubmit={submit} className="space-y-4">
        {mode === 'url' ? (
          <input
            type="url"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/some-article"
            className="w-full px-4 py-2.5 rounded-lg border border-stone-300 text-sm focus:outline-none focus:border-violet-400"
          />
        ) : (
          <>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              className="w-full px-4 py-2.5 rounded-lg border border-stone-300 text-sm focus:outline-none focus:border-violet-400"
            />
            <textarea
              required
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Write or paste your article here (Markdown supported)…"
              rows={8}
              className="w-full px-4 py-2.5 rounded-lg border border-stone-300 text-sm focus:outline-none focus:border-violet-400 resize-y"
            />
          </>
        )}

        <div className="flex items-center gap-3">
          <label className="text-xs text-stone-500">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as ContentType)}
            className="px-3 py-1.5 rounded-lg border border-stone-300 text-sm bg-white"
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="px-4 py-2.5 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors"
        >
          {busy ? 'Processing with Anakin…' : 'Add to my shelf'}
        </button>
        {busy && (
          <p className="text-xs text-stone-400">
            Scraping, summarizing, and tagging — this can take ~10–20s.
          </p>
        )}
      </form>
    </div>
  )
}
