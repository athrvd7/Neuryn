#!/usr/bin/env tsx
/**
 * add-external.ts
 * Usage: npm run add-external -- https://example.com/some-article
 *        npm run add-external -- --type research https://arxiv.org/abs/...
 *
 * Fetches the URL, extracts text content, then uses a single LLM call
 * to extract metadata + generate gists. Creates a .qmd in content/{type}/.
 *
 * Uses Claude by default. Pass --gemini (or set LLM_PROVIDER=gemini) to use
 * Gemini Flash instead.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import slugify from 'slugify'
import { generateText, resolveProvider } from './llm.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

// Parse args: optional --type flag
const args = process.argv.slice(2)
let typeOverride: string | undefined
let inputUrl: string | undefined

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--type' && args[i + 1]) {
    typeOverride = args[i + 1]
    i++
  } else if (args[i]?.startsWith('http')) {
    inputUrl = args[i]
  }
}

if (!inputUrl) {
  console.error('Usage: npm run add-external -- [--gemini] [--type article|blog|research] <URL>')
  process.exit(1)
}

async function fetchPageContent(url: string): Promise<{ text: string; html: string }> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; metadata-bot/1.0)',
      Accept: 'text/html,application/xhtml+xml',
    },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`)
  const html = await res.text()

  // Dynamically import cheerio for HTML parsing
  const { load } = await import('cheerio')
  const $ = load(html)

  // Remove noise
  $('script, style, nav, header, footer, aside, .sidebar, .ads, .comments, iframe').remove()

  // Extract meaningful text from common article containers
  const selectors = ['article', 'main', '.post-content', '.article-body', '.entry-content', '#content', 'body']
  let text = ''
  for (const sel of selectors) {
    const el = $(sel).first()
    if (el.length) {
      text = el.text().replace(/\s+/g, ' ').trim()
      if (text.length > 500) break
    }
  }

  return { text: text.slice(0, 12000), html }
}

interface ClaudeArticleAnalysis {
  title: string
  author: string
  author_url: string
  type: 'article' | 'blog' | 'research'
  category: string
  tags: string[]
  estimated_read_time: number
  body_markdown: string
  gists: {
    quick: string
    medium: string
    full: string
  }
}

async function analyzeContent(url: string, pageText: string): Promise<ClaudeArticleAnalysis> {
  const prompt = `Analyze this web page content to extract information for a knowledge platform.

URL: ${url}
Page text (first 12000 chars):
---
${pageText}
---

Return ONLY valid JSON with this exact structure:
{
  "title": "<article title>",
  "author": "<author name or publication name>",
  "author_url": "<author profile URL if findable, else empty string>",
  "type": "<article | blog | research>",
  "category": "<single category: Engineering, Machine Learning, Product, Design, Business, Science, Philosophy, Math, Other>",
  "tags": ["<tag1>", "<tag2>", "<tag3>"],
  "estimated_read_time": <number, minutes>,
  "body_markdown": "<A clean markdown summary/extract of the main content, 300-500 words. Use ## for sub-headings, **bold** for key terms.>",
  "gists": {
    "quick": "<~150 word single paragraph — the single most important takeaway>",
    "medium": "<~600 word summary — key points and context, \\n\\n between paragraphs>",
    "full": "<~1500 word comprehensive overview, \\n\\n between paragraphs>"
  }
}

Return only the JSON object, no other text.`

  const text = await generateText(prompt, { maxTokens: 6000 })
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Model did not return valid JSON')

  return JSON.parse(jsonMatch[0]) as ClaudeArticleAnalysis
}

function buildQmdContent(analysis: ClaudeArticleAnalysis, sourceUrl: string): string {
  const today = new Date().toISOString().slice(0, 10)
  const contentType = typeOverride ?? analysis.type

  const lines: string[] = ['---']
  lines.push(`title: ${JSON.stringify(analysis.title)}`)
  lines.push(`author: ${JSON.stringify(analysis.author)}`)
  if (analysis.author_url) lines.push(`author_url: ${JSON.stringify(analysis.author_url)}`)
  lines.push(`date: ${today}`)
  lines.push(`type: ${contentType}`)
  lines.push(`category: ${JSON.stringify(analysis.category)}`)
  lines.push(`tags: [${analysis.tags.map((t) => `"${t}"`).join(', ')}]`)
  lines.push(`source_url: ${JSON.stringify(sourceUrl)}`)
  lines.push(`estimated_read_time: ${analysis.estimated_read_time}`)
  lines.push(`is_own_work: false`)
  lines.push(`gists:`)
  lines.push(`  quick: ${JSON.stringify(analysis.gists.quick)}`)
  lines.push(`  medium: ${JSON.stringify(analysis.gists.medium)}`)
  lines.push(`  full: ${JSON.stringify(analysis.gists.full)}`)
  lines.push('---')
  lines.push('')
  lines.push(analysis.body_markdown)
  lines.push('')

  return lines.join('\n')
}

async function main() {
  console.log(`Processing: ${inputUrl}`)

  console.log('  Fetching page content...')
  const { text } = await fetchPageContent(inputUrl!)
  console.log(`  Extracted: ${text.length} chars`)

  console.log(`  Calling ${resolveProvider()} (title + author + type + tags + gists in one call)...`)
  const analysis = await analyzeContent(inputUrl!, text)

  const contentType = typeOverride ?? analysis.type
  const outDir = path.join(ROOT, 'content', `${contentType}s`)
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

  const slug = slugify(analysis.title, { lower: true, strict: true }).slice(0, 60)
  const filename = `${slug}.qmd`
  const outPath = path.join(outDir, filename)

  if (fs.existsSync(outPath)) {
    console.error(`File already exists: ${outPath}`)
    process.exit(1)
  }

  const content = buildQmdContent(analysis, inputUrl!)
  fs.writeFileSync(outPath, content, 'utf-8')

  console.log(`\nCreated: content/${contentType}s/${filename}`)
  console.log(`  Title: ${analysis.title}`)
  console.log(`  Author: ${analysis.author}`)
  console.log(`  Type: ${contentType}`)
  console.log(`  Category: ${analysis.category}`)
  console.log(`  Tags: ${analysis.tags.join(', ')}`)
  console.log('\nRun "npm run build:content" to include it in the site.')
}

main().catch((err: unknown) => {
  console.error('Error:', err)
  process.exit(1)
})
