

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import matter from 'gray-matter'
import { marked } from 'marked'
import slugify from 'slugify'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const CONTENT_DIR = path.join(ROOT, 'content')
const PUBLIC_DIR = path.join(ROOT, 'public')
const CONTENT_OUT_DIR = path.join(PUBLIC_DIR, 'content')

// Configure marked
marked.setOptions({ gfm: true, breaks: false })

interface ContentMeta {
  slug: string
  title: string
  author: string
  author_url?: string
  date: string
  type: 'article' | 'blog' | 'research' | 'video'
  category: string
  tags: string[]
  source_url?: string
  video_url?: string
  estimated_read_time: number
  is_own_work: boolean
  excerpt: string
  gists?: {
    quick?: string
    medium?: string
    full?: string
    short?: string
    long?: string
  }
}

interface ContentItem extends ContentMeta {
  body: string
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function makeSlug(filePath: string, title: string): string {
  const basename = path.basename(filePath, '.qmd')
  return slugify(basename, { lower: true, strict: true }) ||
    slugify(title, { lower: true, strict: true })
}

function makeExcerpt(body: string, maxLen = 200): string {
  // Strip markdown syntax for a plain-text excerpt
  const plain = body
    .replace(/^#{1,6}\s+.*/gm, '')      // remove headings
    .replace(/\*\*(.+?)\*\*/g, '$1')    // bold
    .replace(/\*(.+?)\*/g, '$1')        // italic
    .replace(/`{1,3}[^`]*`{1,3}/g, '') // code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
    .replace(/^\s*[-*+]\s+/gm, '')      // list markers
    .replace(/\n{2,}/g, ' ')
    .replace(/\n/g, ' ')
    .trim()
  return plain.length > maxLen ? plain.slice(0, maxLen).trimEnd() + '…' : plain
}

function estimateReadTime(body: string): number {
  const words = body.split(/\s+/).length
  return Math.max(1, Math.ceil(words / 200))
}

function walkContentDir(): string[] {
  const types = ['articles', 'blogs', 'research', 'videos']
  const files: string[] = []
  for (const type of types) {
    const dir = path.join(CONTENT_DIR, type)
    if (!fs.existsSync(dir)) continue
    for (const file of fs.readdirSync(dir)) {
      if (file.endsWith('.qmd')) {
        files.push(path.join(dir, file))
      }
    }
  }
  return files
}

async function processFile(filePath: string): Promise<{ meta: ContentMeta; item: ContentItem }> {
  const raw = fs.readFileSync(filePath, 'utf-8')
  const { data, content } = matter(raw)

  const slug = makeSlug(filePath, data['title'] as string ?? 'untitled')
  const bodyHtml = await marked(content)
  const excerpt = makeExcerpt(content)
  const readTime = (data['estimated_read_time'] as number) ?? estimateReadTime(content)

  // Render gists from markdown → HTML (they may contain **bold**, ## headings, etc.)
  type RawGists = { quick?: string; medium?: string; full?: string; short?: string; long?: string }
  const rawGists = data['gists'] as RawGists | undefined
  let renderedGists: RawGists | undefined
  if (rawGists) {
    renderedGists = {}
    if (rawGists.quick) renderedGists.quick = await marked(rawGists.quick)
    if (rawGists.medium) renderedGists.medium = await marked(rawGists.medium)
    if (rawGists.full) renderedGists.full = await marked(rawGists.full)
    if (rawGists.short) renderedGists.short = await marked(rawGists.short)
    if (rawGists.long) renderedGists.long = await marked(rawGists.long)
  }

  const meta: ContentMeta = {
    slug,
    title: (data['title'] as string) ?? 'Untitled',
    author: (data['author'] as string) ?? 'Unknown',
    author_url: data['author_url'] as string | undefined,
    date: data['date']
      ? (data['date'] instanceof Date
          ? data['date'].toISOString().slice(0, 10)
          : String(data['date']).slice(0, 10))
      : new Date().toISOString().slice(0, 10),
    type: (data['type'] as ContentMeta['type']) ?? 'article',
    category: (data['category'] as string) ?? 'General',
    tags: (data['tags'] as string[]) ?? [],
    source_url: data['source_url'] as string | undefined,
    video_url: data['video_url'] as string | undefined,
    estimated_read_time: readTime,
    is_own_work: (data['is_own_work'] as boolean) ?? true,
    excerpt,
    gists: renderedGists,
  }

  const item: ContentItem = { ...meta, body: bodyHtml }
  return { meta, item }
}

async function build() {
  ensureDir(PUBLIC_DIR)
  ensureDir(CONTENT_OUT_DIR)

  const files = walkContentDir()
  if (files.length === 0) {
    console.log('No .qmd files found in content/. Nothing to build.')
    return
  }

  // Remove stale content JSONs that no longer have a matching .qmd
  if (fs.existsSync(CONTENT_OUT_DIR)) {
    for (const f of fs.readdirSync(CONTENT_OUT_DIR)) {
      fs.unlinkSync(path.join(CONTENT_OUT_DIR, f))
    }
  }

  const allMeta: ContentMeta[] = []

  for (const filePath of files) {
    const { meta, item } = await processFile(filePath)
    allMeta.push(meta)
    fs.writeFileSync(
      path.join(CONTENT_OUT_DIR, `${meta.slug}.json`),
      JSON.stringify(item, null, 2)
    )
    console.log(`  built: ${meta.slug} (${meta.type})`)
  }

  // Sort by date descending
  allMeta.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  fs.writeFileSync(
    path.join(PUBLIC_DIR, 'content-index.json'),
    JSON.stringify({ items: allMeta, generated_at: new Date().toISOString() }, null, 2)
  )

  console.log(`\nBuilt ${files.length} content items → public/`)
}

build().catch((err) => {
  console.error('Build failed:', err)
  process.exit(1)
})
