import { useEffect, useState, useMemo } from 'react'
import type { ContentMeta, ContentType } from '../types/content'
import ContentCard from '../components/ContentCard'
import FilterBar from '../components/FilterBar'

interface ContentIndex {
  items: ContentMeta[]
  generated_at: string
}

export default function Home() {
  const [index, setIndex] = useState<ContentIndex | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeType, setActiveType] = useState<ContentType | 'all'>('all')
  const [activeTag, setActiveTag] = useState<string | null>(null)

  useEffect(() => {
    fetch('/content-index.json')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<ContentIndex>
      })
      .then(setIndex)
      .catch((e: unknown) => setError(String(e)))
  }, [])

  const allTags = useMemo(() => {
    if (!index) return []
    const set = new Set<string>()
    for (const item of index.items) for (const tag of item.tags) set.add(tag)
    return Array.from(set).sort()
  }, [index])

  const filtered = useMemo(() => {
    if (!index) return []
    return index.items.filter((item) => {
      if (activeType !== 'all' && item.type !== activeType) return false
      if (activeTag && !item.tags.includes(activeTag)) return false
      return true
    })
  }, [index, activeType, activeTag])

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 text-center">
        <p className="text-zinc-500 text-sm">
          Could not load content. Run <code className="text-violet-600">npm run build:content</code> first.
        </p>
      </div>
    )
  }

  if (!index) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 text-center">
        <p className="text-stone-400 text-sm">Loading…</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-zinc-800 mb-2 tracking-tight">Neuryn</h1>
        <p className="text-zinc-500 text-sm">curated articles, research, videos, and notes worth your time</p>
      </div>

      <div className="mb-8">
        <FilterBar
          active={activeType}
          tags={allTags}
          activeTag={activeTag}
          onTypeChange={(t) => { setActiveType(t); setActiveTag(null) }}
          onTagChange={setActiveTag}
        />
      </div>

      <p className="text-xs text-stone-400 mb-6">
        {filtered.length} {filtered.length === 1 ? 'item' : 'items'}
        {activeType !== 'all' && ` · ${activeType}`}
        {activeTag && ` · #${activeTag}`}
      </p>

      {filtered.length === 0 ? (
        <p className="text-stone-400 text-sm py-12 text-center">Nothing here yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <ContentCard key={item.slug} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}
