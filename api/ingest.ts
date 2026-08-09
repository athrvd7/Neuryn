/**
 * POST /api/ingest — turn a URL or raw text into a fully-processed article on
 * the signed-in user's shelf.
 *
 *   1. Verify the caller's Supabase session (must be signed in).
 *   2. URL mode  → scrape the page for text.  Text mode → use the given text.
 *   3. Run the Anakin Quick App → gists + tags + category + read-time + excerpt.
 *   4. Insert a row into user_articles (RLS ensures it's owned by the caller).
 *
 * Runs as a Vercel Serverless Function. The Anakin key lives only here — it is
 * never exposed to the browser.
 */
import { createClient } from '@supabase/supabase-js'
import { marked } from 'marked'
import { runQuickApp } from './_lib/anakin.js'
import { fetchPageText } from './_lib/scrape.js'
import { generateText } from '../cli/llm.js'

// Which engine produces the analysis JSON:
//   'gemini' (default) | 'claude' | 'anakin'
// Anakin needs a Pro plan + ANAKIN_GIST_APP_ID; gemini/claude just need their key.
const INGEST_PROVIDER = (process.env.INGEST_PROVIDER ?? 'gemini').toLowerCase()

marked.setOptions({ gfm: true, breaks: false })

interface AnalysisJson {
  title: string
  author: string
  author_url?: string
  type: 'article' | 'blog' | 'research' | 'video'
  category: string
  tags: string[]
  estimated_read_time: number
  body_markdown: string
  gists: { quick: string; medium: string; full: string }
}

// Minimal typing so we don't depend on @vercel/node types being installed.
interface Req {
  method?: string
  headers: Record<string, string | string[] | undefined>
  body: unknown
}
interface Res {
  status: (code: number) => Res
  json: (data: unknown) => void
}

export default async function handler(req: Req, res: Res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const supabase = createClient(
      requireEnv('SUPABASE_URL'),
      requireEnv('SUPABASE_ANON_KEY'),
      { auth: { persistSession: false, autoRefreshToken: false } },
    )

    // --- 1. Auth: identify the caller from their bearer token -------------
    const token = bearer(req.headers['authorization'])
    if (!token) {
      res.status(401).json({ error: 'Not signed in.' })
      return
    }
    const { data: userData, error: userErr } = await supabase.auth.getUser(token)
    if (userErr || !userData.user) {
      res.status(401).json({ error: 'Invalid or expired session.' })
      return
    }
    const userId = userData.user.id

    // --- 2. Gather source text -------------------------------------------
    const body = (req.body ?? {}) as {
      mode?: string
      url?: string
      text?: string
      title?: string
      type?: string
    }
    const mode = body.mode === 'text' ? 'text' : 'url'

    let sourceText = ''
    let sourceUrl = ''
    if (mode === 'url') {
      if (!body.url || !/^https?:\/\//.test(body.url)) {
        res.status(400).json({ error: 'Please provide a valid URL.' })
        return
      }
      sourceUrl = body.url
      sourceText = await fetchPageText(body.url)
      if (sourceText.length < 200) {
        res.status(422).json({ error: 'Could not extract enough readable text from that URL.' })
        return
      }
    } else {
      sourceText = (body.text ?? '').trim()
      if (sourceText.length < 200) {
        res.status(400).json({ error: 'Please provide at least a couple of paragraphs of text.' })
        return
      }
    }

    // --- 3. Analyze: metadata + gists in one call ------------------------
    const rawOutput = await analyze({
      title: body.title ?? '',
      content: sourceText,
      sourceUrl,
      typeHint: body.type ?? '',
    })
    const analysis = parseAnalysis(rawOutput)

    // --- 4. Persist (RLS ties the row to the caller) ---------------------
    const gistsHtml = {
      quick: await mdToHtml(analysis.gists.quick),
      medium: await mdToHtml(analysis.gists.medium),
      full: await mdToHtml(analysis.gists.full),
    }

    const authed = createClient(
      requireEnv('SUPABASE_URL'),
      requireEnv('SUPABASE_ANON_KEY'),
      {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: `Bearer ${token}` } },
      },
    )

    const { data: inserted, error: insertErr } = await authed
      .from('user_articles')
      .insert({
        user_id: userId,
        title: analysis.title,
        author: analysis.author || '',
        author_url: analysis.author_url || null,
        type: (body.type as string) || analysis.type || 'article',
        category: analysis.category || 'Other',
        tags: analysis.tags ?? [],
        source_url: sourceUrl || null,
        body: await mdToHtml(analysis.body_markdown),
        excerpt: (analysis.gists.quick || sourceText).slice(0, 200),
        estimated_read_time: analysis.estimated_read_time || 1,
        gists: gistsHtml,
        is_own_work: mode === 'text',
      })
      .select()
      .single()

    if (insertErr) {
      res.status(500).json({ error: `Could not save: ${insertErr.message}` })
      return
    }

    res.status(200).json({ article: inserted })
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unexpected error' })
  }
}

// --- helpers ---------------------------------------------------------------

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`${name} is not set`)
  return v
}

function bearer(header: string | string[] | undefined): string | null {
  const h = Array.isArray(header) ? header[0] : header
  if (!h) return null
  const m = h.match(/^Bearer\s+(.+)$/i)
  return m ? m[1] : null
}

async function mdToHtml(md: string): Promise<string> {
  if (!md) return ''
  return marked.parse(md)
}

/** Produce the raw analysis text (JSON) from the configured provider. */
async function analyze(args: {
  title: string
  content: string
  sourceUrl: string
  typeHint: string
}): Promise<string> {
  if (INGEST_PROVIDER === 'anakin') {
    return runQuickApp({
      title: args.title,
      content: args.content,
      source_url: args.sourceUrl,
      type_hint: args.typeHint,
    })
  }
  const provider = INGEST_PROVIDER === 'claude' ? 'claude' : 'gemini'
  return generateText(buildAnalysisPrompt(args), { provider, maxTokens: 6000 })
}

/** Prompt mirroring the add-external CLI so gemini/claude return the same shape. */
function buildAnalysisPrompt(args: {
  title: string
  content: string
  sourceUrl: string
  typeHint: string
}): string {
  return `Analyze this content for a knowledge platform called Neuryn.

${args.sourceUrl ? `URL: ${args.sourceUrl}` : ''}
${args.title ? `Provided title (prefer this): ${args.title}` : ''}
${args.typeHint ? `Suggested type: ${args.typeHint}` : ''}

Content:
---
${args.content.slice(0, 12000)}
---

Return ONLY valid JSON with this exact structure:
{
  "title": "<title; use the provided title if given>",
  "author": "<author or publication name, else empty string>",
  "author_url": "<author URL if findable, else empty string>",
  "type": "<article | blog | research | video>",
  "category": "<one of: Engineering, Machine Learning, Product, Design, Business, Science, Philosophy, Math, Other>",
  "tags": ["<3-5 lowercase topical tags>"],
  "estimated_read_time": <number, minutes>,
  "body_markdown": "<clean 300-500 word markdown extract/summary; ## sub-headings, **bold** key terms>",
  "gists": {
    "quick": "<~150 word single paragraph — the single most important takeaway>",
    "medium": "<~600 word summary — key points and context, \\n\\n between paragraphs>",
    "full": "<~1500 word comprehensive overview, \\n\\n between paragraphs>"
  }
}

Return only the JSON object, no other text.`
}

/** Pull the JSON object out of the model output and validate it. */
function parseAnalysis(raw: string): AnalysisJson {
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Anakin app did not return JSON. Check the Quick App pre-prompt.')
  let parsed: Partial<AnalysisJson>
  try {
    parsed = JSON.parse(match[0]) as Partial<AnalysisJson>
  } catch {
    throw new Error('Anakin app returned malformed JSON.')
  }
  if (!parsed.title || !parsed.gists?.quick) {
    throw new Error('Anakin app response is missing required fields (title/gists).')
  }
  return {
    title: parsed.title,
    author: parsed.author ?? '',
    author_url: parsed.author_url,
    type: parsed.type ?? 'article',
    category: parsed.category ?? 'Other',
    tags: Array.isArray(parsed.tags) ? parsed.tags : [],
    estimated_read_time: parsed.estimated_read_time ?? 1,
    body_markdown: parsed.body_markdown ?? '',
    gists: {
      quick: parsed.gists.quick,
      medium: parsed.gists.medium ?? '',
      full: parsed.gists.full ?? '',
    },
  }
}
