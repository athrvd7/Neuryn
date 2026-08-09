/**
 * URL scraping for the "add by link" flow.
 *
 * Primary path: Anakin.io scraping API (https://anakin.io) — turns any URL into
 * clean LLM-ready markdown, keyed by ANAKIN_API_KEY alone (no appId needed).
 * It's async (submit → poll), so we cap the wait and fall back to a local
 * cheerio extraction if it's slow or unavailable. Set SCRAPE_PROVIDER=cheerio
 * to skip Anakin entirely.
 */

const ANAKIN_SCRAPE_BASE =
  process.env.ANAKIN_SCRAPE_URL ?? 'https://api.anakin.io/v1/url-scraper'

export async function fetchPageText(url: string): Promise<string> {
  const provider = (process.env.SCRAPE_PROVIDER ?? 'anakin').toLowerCase()
  const useAnakin = provider === 'anakin' && Boolean(process.env.ANAKIN_API_KEY)

  if (useAnakin) {
    try {
      const md = await anakinScrape(url, 45_000)
      if (md.trim().length > 200) return md.slice(0, 12_000)
      console.warn('[scrape] Anakin returned too little content, falling back to cheerio')
    } catch (err) {
      console.warn(`[scrape] Anakin failed (${(err as Error).message}), falling back to cheerio`)
    }
  }
  return cheerioScrape(url)
}

/** Submit a scrape job to Anakin and poll until it completes (or times out). */
async function anakinScrape(url: string, timeoutMs: number): Promise<string> {
  const key = process.env.ANAKIN_API_KEY
  if (!key) throw new Error('ANAKIN_API_KEY not set')
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }

  const submit = await fetch(ANAKIN_SCRAPE_BASE, {
    method: 'POST',
    headers,
    body: JSON.stringify({ url }),
  })
  if (!submit.ok) throw new Error(`submit HTTP ${submit.status}`)
  const { jobId } = (await submit.json()) as { jobId?: string }
  if (!jobId) throw new Error('no jobId in response')

  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 2_500))
    const res = await fetch(`${ANAKIN_SCRAPE_BASE}/${jobId}`, { headers })
    const job = (await res.json()) as { status?: string; markdown?: string }
    if (job.status === 'completed') return job.markdown ?? ''
    if (job.status === 'failed') throw new Error('scrape job failed')
  }
  throw new Error('scrape timed out')
}

/** Local fallback: fetch + extract readable text with cheerio. */
async function cheerioScrape(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; neuryn-bot/1.0)',
      Accept: 'text/html,application/xhtml+xml',
    },
  })
  if (!res.ok) throw new Error(`Could not fetch the URL (HTTP ${res.status}).`)
  const html = await res.text()

  const { load } = await import('cheerio')
  const $ = load(html)
  $('script, style, nav, header, footer, aside, .sidebar, .ads, .comments, iframe').remove()

  const selectors = ['article', 'main', '.post-content', '.article-body', '.entry-content', '#content', 'body']
  let text = ''
  for (const sel of selectors) {
    const el = $(sel).first()
    if (el.length) {
      text = el.text().replace(/\s+/g, ' ').trim()
      if (text.length > 500) break
    }
  }
  return text.slice(0, 12_000)
}
