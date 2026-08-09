import { Link } from 'react-router-dom'
import type { ContentMeta } from '../types/content'

const TYPE_COLORS: Record<string, string> = {
  article: 'bg-blue-100 text-blue-700',
  blog: 'bg-amber-100 text-amber-700',
  research: 'bg-purple-100 text-purple-700',
  video: 'bg-rose-100 text-rose-700',
}

const TYPE_ICONS: Record<string, string> = {
  article: '',
  blog: '',
  research: '',
  video: '',
}

interface ContentCardProps {
  item: ContentMeta
  to?: string
}

export default function ContentCard({ item, to }: ContentCardProps) {
  return (
    <Link
      to={to ?? `/read/${item.slug}`}
      className="group block bg-white border border-stone-200 rounded-xl p-5 hover:border-stone-300 hover:shadow-sm transition-all duration-200"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium ${TYPE_COLORS[item.type] ?? 'bg-stone-100 text-zinc-600'}`}>
          <span>{TYPE_ICONS[item.type]}</span>
          {item.type}
        </span>
        <span className="text-xs text-stone-400 shrink-0">{item.estimated_read_time} min read</span>
      </div>

      <h2 className="font-semibold text-zinc-800 text-base leading-snug mb-2 group-hover:text-violet-600 transition-colors line-clamp-2">
        {item.title}
      </h2>

      <p className="text-zinc-500 text-sm leading-relaxed mb-3 line-clamp-3">
        {item.excerpt}
      </p>

      <div className="flex items-center justify-between text-xs">
        <div className="text-stone-400">
          {item.author}
          {!item.is_own_work && <span className="ml-1.5 text-stone-300">(curated)</span>}
        </div>
        <div className="text-stone-300">
          {new Date(item.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
        </div>
      </div>

      {item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-stone-100">
          {item.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="text-xs text-stone-400">#{tag}</span>
          ))}
        </div>
      )}
    </Link>
  )
}
