/**
 * Local dev server for the Vercel Serverless Functions in /api.
 *
 * `npm run dev` (Vite) does NOT serve /api — this does. Run it alongside Vite;
 * the Vite proxy (see web/vite.config.ts) forwards /api/* here on port 3001.
 *
 *   Terminal 1:  npm run dev:api
 *   Terminal 2:  npm run dev
 *
 * In production, Vercel serves /api natively and this file is unused.
 */
import http from 'http'
import 'dotenv/config'
import ingest from '../api/ingest.js'

const PORT = 3001

// Map of route -> Vercel-style handler. Add more as you add functions.
const routes: Record<string, (req: any, res: any) => Promise<void> | void> = {
  '/api/ingest': ingest as any,
}

const server = http.createServer((rawReq, rawRes) => {
  const url = (rawReq.url ?? '').split('?')[0]
  const handler = routes[url]
  if (!handler) {
    rawRes.statusCode = 404
    rawRes.setHeader('Content-Type', 'application/json')
    rawRes.end(JSON.stringify({ error: `No local handler for ${url}` }))
    return
  }

  const chunks: Buffer[] = []
  rawReq.on('data', (c) => chunks.push(c as Buffer))
  rawReq.on('end', () => {
    const bodyText = Buffer.concat(chunks).toString('utf-8')
    let body: unknown = undefined
    try {
      body = bodyText ? JSON.parse(bodyText) : undefined
    } catch {
      body = bodyText
    }

    // Shim the minimal { status, json } contract the handlers use.
    const res = {
      status(code: number) {
        rawRes.statusCode = code
        return this
      },
      json(data: unknown) {
        rawRes.setHeader('Content-Type', 'application/json')
        rawRes.end(JSON.stringify(data))
      },
    }
    const req = { method: rawReq.method, headers: rawReq.headers, body }

    Promise.resolve(handler(req, res)).catch((err: unknown) => {
      rawRes.statusCode = 500
      rawRes.setHeader('Content-Type', 'application/json')
      rawRes.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Unexpected error' }))
    })
  })
})

server.listen(PORT, () => {
  console.log(`[dev-api] listening on http://localhost:${PORT} (proxied from Vite /api)`)
})
