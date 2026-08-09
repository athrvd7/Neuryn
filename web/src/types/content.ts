export type ContentType = 'article' | 'blog' | 'research' | 'video'

export interface Gists {
  // Articles, blogs, research
  quick?: string
  medium?: string
  full?: string
  // Videos
  short?: string
  long?: string
}

export interface ContentMeta {
  slug: string
  title: string
  author: string
  author_url?: string
  date: string
  type: ContentType
  category: string
  tags: string[]
  source_url?: string       // original URL for curated content
  video_url?: string        // YouTube / Vimeo embed URL
  estimated_read_time: number  // minutes
  is_own_work: boolean
  excerpt: string           // first 200 chars of body, for card preview
  gists?: Gists
}

export interface ContentItem extends ContentMeta {
  body: string  // rendered HTML
}

export interface ContentIndex {
  items: ContentMeta[]
  generated_at: string
}
