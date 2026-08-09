import { supabase } from './supabase'
import type { ContentItem, ContentType, Gists } from '../types/content'

/** A row from the user_articles table. */
export interface UserArticle {
  id: string
  user_id: string
  title: string
  author: string
  author_url: string | null
  type: ContentType
  category: string
  tags: string[]
  source_url: string | null
  video_url: string | null
  body: string
  excerpt: string
  estimated_read_time: number
  gists: Gists
  is_own_work: boolean
  created_at: string
}

export interface Profile {
  id: string
  username: string
  display_name: string | null
  bio: string | null
  avatar_url: string | null
}

/** Adapt a UserArticle into the ContentItem shape the reader components expect. */
export function toContentItem(a: UserArticle): ContentItem {
  return {
    slug: a.id,
    title: a.title,
    author: a.author,
    author_url: a.author_url ?? undefined,
    date: a.created_at,
    type: a.type,
    category: a.category,
    tags: a.tags ?? [],
    source_url: a.source_url ?? undefined,
    video_url: a.video_url ?? undefined,
    estimated_read_time: a.estimated_read_time,
    is_own_work: a.is_own_work,
    excerpt: a.excerpt,
    gists: a.gists,
    body: a.body,
  }
}

export async function getProfileByUsername(username: string): Promise<Profile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .maybeSingle()
  return (data as Profile) ?? null
}

export async function getMyProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  return (data as Profile) ?? null
}

export async function upsertProfile(p: {
  id: string
  username: string
  display_name?: string
  bio?: string
}): Promise<{ error: string | null }> {
  const { error } = await supabase.from('profiles').upsert({
    id: p.id,
    username: p.username,
    display_name: p.display_name ?? null,
    bio: p.bio ?? null,
  })
  return { error: error?.message ?? null }
}

export async function getArticlesByUser(userId: string): Promise<UserArticle[]> {
  const { data } = await supabase
    .from('user_articles')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  return (data as UserArticle[]) ?? []
}

export async function getArticleById(id: string): Promise<UserArticle | null> {
  const { data } = await supabase
    .from('user_articles')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  return (data as UserArticle) ?? null
}

export async function deleteArticle(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('user_articles').delete().eq('id', id)
  return { error: error?.message ?? null }
}

/** Call the server /api/ingest function to process + save a new article. */
export async function ingestArticle(input: {
  mode: 'url' | 'text'
  url?: string
  text?: string
  title?: string
  type?: ContentType
}): Promise<{ article?: UserArticle; error?: string }> {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) return { error: 'You need to be signed in.' }

  const res = await fetch('/api/ingest', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  })

  // The response may not be JSON (e.g. a 404 HTML page when the API isn't
  // running locally). Parse defensively so the user sees a clear message.
  const raw = await res.text()
  let json: { article?: UserArticle; error?: string } = {}
  try {
    json = raw ? (JSON.parse(raw) as typeof json) : {}
  } catch {
    if (res.status === 404) {
      return { error: 'The /api/ingest endpoint isn\'t running. Start it with `npm run dev:api` (or use `vercel dev`).' }
    }
    return { error: `Unexpected response (${res.status}).` }
  }
  if (!res.ok) return { error: json.error ?? `Request failed (${res.status})` }
  return { article: json.article }
}
