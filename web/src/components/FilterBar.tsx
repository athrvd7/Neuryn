import type { ContentType } from '../types/content'

const TYPES: Array<{ value: ContentType | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'article', label: 'Articles' },
  { value: 'blog', label: 'Blogs' },
  { value: 'research', label: 'Research' },
  { value: 'video', label: 'Videos' },
]

interface FilterBarProps {
  active: ContentType | 'all'
  tags: string[]
  activeTag: string | null
  onTypeChange: (type: ContentType | 'all') => void
  onTagChange: (tag: string | null) => void
}

export default function FilterBar({ active, tags, activeTag, onTypeChange, onTagChange }: FilterBarProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {TYPES.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => onTypeChange(value)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              active === value
                ? 'bg-violet-600 text-white'
                : 'bg-stone-100 text-zinc-500 hover:bg-stone-200 hover:text-zinc-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <button
              key={tag}
              onClick={() => onTagChange(activeTag === tag ? null : tag)}
              className={`px-2.5 py-0.5 rounded text-xs transition-colors ${
                activeTag === tag
                  ? 'bg-violet-100 text-violet-700'
                  : 'bg-stone-100 text-stone-500 hover:text-zinc-700'
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
