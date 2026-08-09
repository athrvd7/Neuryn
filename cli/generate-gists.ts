import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { generateText, resolveProvider } from './llm.js'

const filePath = process.argv.slice(2).find((a) => !a.startsWith('--'))

if (!filePath) {
  console.error('Usage: npm run gists -- [--gemini] <path-to-file.qmd>')
  process.exit(1)
}

const absPath = path.resolve(process.cwd(), filePath)

if (!fs.existsSync(absPath)) {
  console.error(`File not found: ${absPath}`)
  process.exit(1)
}

function extractVideoId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/\s]{11})/)
  return m?.[1] ?? null
}

async function fetchTranscript(videoId: string): Promise<string | null> {
  try {
    const { YoutubeTranscript } = await import('youtube-transcript')
    const transcript = await YoutubeTranscript.fetchTranscript(videoId)
    return transcript.map((t: { text: string }) => t.text).join(' ').slice(0, 10000)
  } catch {
    console.log('  Transcript not available — will use title/description only.')
    return null
  }
}

async function generateVideoGists(title: string, author: string, transcript: string | null) {
  console.log(`Calling ${resolveProvider()} (short + long gists)...`)

  const contentSection = transcript
    ? `Transcript (first 10000 chars):\n${transcript}`
    : `No transcript available. Base analysis on the title and author.`

  const prompt = `Analyze this YouTube video for a content platform.

Title: "${title}"
Channel: "${author}"
${contentSection}

Return ONLY valid JSON with this exact structure:
{
  "short": "<~150 word takeaway — single paragraph, the single most important insight>",
  "long": "<complete explanation of the entire video content — cover every major point, argument, example, and conclusion the speaker makes. Use \\n\\n between paragraphs. Aim for thoroughness over brevity.>"
}

Return only the JSON, no other text.`

  const text = await generateText(prompt, { maxTokens: 4096 })
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Model did not return valid JSON')

  const gists = JSON.parse(jsonMatch[0]) as { short: string; long: string }
  if (!gists.short || !gists.long) throw new Error('Missing gist fields in model response')
  return gists
}

async function generateTextGists(title: string, body: string) {
  console.log(`Calling ${resolveProvider()} (quick + medium + full gists)...`)

  const prompt = `You are summarizing a piece of writing titled "${title}" for a content platform.

Generate THREE summaries at different levels of depth. Return ONLY valid JSON with this exact structure:
{
  "quick": "<~150 word summary — single paragraph, the single most important takeaway>",
  "medium": "<~600 word summary — key points and context, use \\n\\n between paragraphs>",
  "full": "<~1500 word summary — comprehensive overview covering main arguments, evidence, and implications, use \\n\\n between paragraphs>"
}

The content to summarize:
---
${body.slice(0, 12000)}
---

Return only the JSON object, no other text.`

  const text = await generateText(prompt, { maxTokens: 4096 })
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Model did not return valid JSON')

  const gists = JSON.parse(jsonMatch[0]) as { quick: string; medium: string; full: string }
  if (!gists.quick || !gists.medium || !gists.full) throw new Error('Missing gist fields in model response')
  return gists
}

async function main() {
  const raw = fs.readFileSync(absPath, 'utf-8')
  const { data, content } = matter(raw)

  const title = (data['title'] as string) ?? path.basename(absPath, '.qmd')
  const contentType = data['type'] as string | undefined

  if (contentType === 'video') {
    const author = (data['author'] as string) ?? ''
    const sourceUrl = (data['source_url'] as string) ?? ''
    const videoId = extractVideoId(sourceUrl)

    let transcript: string | null = null
    if (videoId) {
      console.log(`  Fetching transcript for video ID: ${videoId}`)
      transcript = await fetchTranscript(videoId)
      if (transcript) console.log(`  Transcript: ${transcript.length} chars`)
    }

    console.log(`Generating video gists for: "${title}"`)
    const gists = await generateVideoGists(title, author, transcript)
    data['gists'] = gists

    const updated = matter.stringify(content, data)
    fs.writeFileSync(absPath, updated, 'utf-8')

    console.log('Gists written to frontmatter:')
    console.log(`  short: ${gists.short.slice(0, 80)}...`)
    console.log(`  long: ${gists.long.slice(0, 80)}...`)
  } else {
    console.log(`Generating gists for: "${title}"`)
    const gists = await generateTextGists(title, content)
    data['gists'] = gists

    const updated = matter.stringify(content, data)
    fs.writeFileSync(absPath, updated, 'utf-8')

    console.log('Gists written to frontmatter:')
    console.log(`  quick: ${gists.quick.slice(0, 80)}...`)
    console.log(`  medium: ${gists.medium.slice(0, 80)}...`)
    console.log(`  full: ${gists.full.slice(0, 80)}...`)
  }

  console.log(`\nUpdated: ${absPath}`)
}

main().catch((err: unknown) => {
  console.error('Error:', err)
  process.exit(1)
})
