

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import slugify from 'slugify'
import { generateText, resolveProvider } from './llm.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const VIDEOS_DIR = path.join(ROOT, 'content', 'videos')

const inputUrl = process.argv.slice(2).find((a) => !a.startsWith('--'))

if (!inputUrl) {
  console.error('Usage: npm run video -- [--gemini] <YouTube URL>')
  process.exit(1)
}

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/\s]{11})/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m?.[1]) return m[1]
  }
  return null
}

function toEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`
}

function toWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`
}

interface YouTubeMeta {
  title: string
  author: string
  authorUrl: string
  thumbnailUrl: string
}

async function fetchYouTubeMeta(videoId: string): Promise<YouTubeMeta> {
  const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
  const res = await fetch(oembedUrl)
  if (!res.ok) throw new Error(`YouTube oEmbed failed: ${res.status}`)
  const data = await res.json() as {
    title: string
    author_name: string
    author_url: string
    thumbnail_url: string
  }
  return {
    title: data.title,
    author: data.author_name,
    authorUrl: data.author_url,
    thumbnailUrl: data.thumbnail_url,
  }
}

interface TranscriptSegment {
  text: string
  offset: number
  duration: number
}

function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

async function fetchTranscript(videoId: string): Promise<string | null> {
  try {
    // Dynamic import to handle ESM
    const { YoutubeTranscript } = await import('youtube-transcript')
    const segments = await YoutubeTranscript.fetchTranscript(videoId) as TranscriptSegment[]
    // Keep timestamps for chapter/quote extraction
    return segments
      .map((t) => `[${formatTimestamp(t.offset)}] ${t.text}`)
      .join('\n')
      .slice(0, 80000)
  } catch {
    console.log('  Transcript not available — will use title/description only.')
    return null
  }
}

interface Chapter {
  timestamp: string
  title: string
  summary: string
}

interface Quote {
  text: string
  timestamp: string
}

interface ClaudeVideoAnalysis {
  category: string
  tags: string[]
  estimated_read_time: number
  description: string
  gists: {
    short: string
    long: string
    chapters: Chapter[]
    quotes: Quote[]
  }
}

async function analyzeVideo(
  title: string,
  author: string,
  transcript: string | null
): Promise<ClaudeVideoAnalysis> {
  const contentSection = transcript
    ? `Transcript:\n${transcript}`
    : `No transcript available. Base analysis on the title and author.`

  const prompt = `Analyze this YouTube video for a content platform.

Title: "${title}"
Channel: "${author}"
${contentSection}

Return ONLY valid JSON with this exact structure:
{
  "category": "<single category e.g. Engineering, Machine Learning, Product, Design, Business, Science>",
  "tags": ["<tag1>", "<tag2>", "<tag3>", "<tag4>"],
  "estimated_read_time": <number 1-15, minutes to watch/engage>,
  "description": "<one sentence description for the .qmd body>",
  "gists": {
    "short": "<~150 word takeaway — single paragraph, the single most important insight>",
    "long": "<complete explanation of the entire video content — cover every major point, argument, example, and conclusion the speaker makes. Use \\n\\n between paragraphs. Aim for thoroughness over brevity.>",
    "chapters": [
      {
        "timestamp": "<MM:SS from transcript>",
        "title": "<chapter title, 3-7 words>",
        "summary": "<2-3 sentence summary of what is covered in this chapter>"
      }
    ],
    "quotes": [
      {
        "text": "<exact or near-exact quote from the speaker — something insightful or memorable>",
        "timestamp": "<MM:SS where this was said>"
      }
    ]
  }
}

For chapters: identify 4-8 natural topic shifts in the video using the timestamps in the transcript. Each chapter should cover a distinct concept or section.
For quotes: pick 3-5 of the most insightful, quotable lines the speaker actually said.

Return only the JSON, no other text.`

  const text = await generateText(prompt, { maxTokens: 8192 })
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Model did not return valid JSON')

  return JSON.parse(jsonMatch[0]) as ClaudeVideoAnalysis
}

function buildQmdContent(
  meta: YouTubeMeta,
  videoId: string,
  analysis: ClaudeVideoAnalysis,
): string {
  const today = new Date().toISOString().slice(0, 10)

  // Frontmatter — only scalar/array fields; structured content goes in the body
  const lines = ['---']
  lines.push(`title: ${JSON.stringify(meta.title)}`)
  lines.push(`author: ${JSON.stringify(meta.author)}`)
  lines.push(`author_url: ${JSON.stringify(meta.authorUrl)}`)
  lines.push(`date: ${today}`)
  lines.push(`type: "video"`)
  lines.push(`category: ${JSON.stringify(analysis.category)}`)
  lines.push(`tags: [${analysis.tags.map((t) => `"${t}"`).join(', ')}]`)
  lines.push(`video_url: ${JSON.stringify(toEmbedUrl(videoId))}`)
  lines.push(`source_url: ${JSON.stringify(toWatchUrl(videoId))}`)
  lines.push(`estimated_read_time: ${analysis.estimated_read_time}`)
  lines.push(`is_own_work: false`)
  lines.push(`gists:`)
  lines.push(`  short: ${JSON.stringify(analysis.gists.short)}`)
  lines.push(`  long: ${JSON.stringify(analysis.gists.long)}`)
  lines.push('---')
  lines.push('')

  // Description
  lines.push(analysis.description)
  lines.push('')

  // Full explanation
  lines.push('## Overview')
  lines.push('')
  lines.push(analysis.gists.long.replace(/\\n\\n/g, '\n\n'))
  lines.push('')

  // Chapters
  lines.push('## Chapters')
  lines.push('')
  for (const chapter of analysis.gists.chapters) {
    lines.push(`### \`${chapter.timestamp}\` — ${chapter.title}`)
    lines.push('')
    lines.push(chapter.summary)
    lines.push('')
  }

  // Quotes
  if (analysis.gists.quotes.length > 0) {
    lines.push('## Notable Quotes')
    lines.push('')
    for (const quote of analysis.gists.quotes) {
      lines.push(`> "${quote.text}"`)
      lines.push(`> — \`${quote.timestamp}\``)
      lines.push('')
    }
  }

  return lines.join('\n')
}

async function main() {
  console.log(`Processing: ${inputUrl}`)

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const videoId = extractVideoId(inputUrl!)!
  if (!videoId) {
    console.error('Could not extract video ID from URL')
    process.exit(1)
  }

  console.log(`  Video ID: ${videoId}`)

  console.log('  Fetching YouTube metadata...')
  const meta = await fetchYouTubeMeta(videoId)
  console.log(`  Title: ${meta.title}`)
  console.log(`  Author: ${meta.author}`)

  console.log('  Fetching transcript...')
  const transcript = await fetchTranscript(videoId)
  if (transcript) console.log(`  Transcript: ${transcript.length} chars`)

  console.log(`  Calling ${resolveProvider()} (category + tags + gists in one call)...`)
  const analysis = await analyzeVideo(meta.title, meta.author, transcript)

  const slug = slugify(meta.title, { lower: true, strict: true }).slice(0, 60)
  const filename = `${slug}.qmd`
  const outPath = path.join(VIDEOS_DIR, filename)

  if (fs.existsSync(outPath)) {
    console.error(`File already exists: ${outPath}`)
    console.error('Delete it first or rename the video.')
    process.exit(1)
  }

  if (!fs.existsSync(VIDEOS_DIR)) {
    fs.mkdirSync(VIDEOS_DIR, { recursive: true })
  }

  const content = buildQmdContent(meta, videoId, analysis)
  fs.writeFileSync(outPath, content, 'utf-8')

  console.log(`\nCreated: content/videos/${filename}`)
  console.log(`  Category: ${analysis.category}`)
  console.log(`  Tags: ${analysis.tags.join(', ')}`)
  console.log('\nRun "npm run build:content" to include it in the site.')
}

main().catch((err: unknown) => {
  console.error('Error:', err)
  process.exit(1)
})
