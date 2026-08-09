/**
 * Anakin.ai integration — "Run a Quick App".
 *
 * Docs: https://apidocs.anakin.ai/
 *   POST https://api.anakin.ai/v1/quickapps/{appId}/runs
 *   Headers: Authorization: Bearer <token>, X-Anakin-Api-Version: 2024-05-06
 *   Body:    { "inputs": { ... }, "stream": false }
 *
 * You build ONE Quick App in Anakin whose pre-prompt takes the inputs below
 * and returns a single JSON object (see ANALYSIS_JSON_SHAPE in ../README or
 * docs/anakin-quickapp.md). This module calls it and returns the raw text so
 * the caller can parse the JSON out of it.
 */

const ANAKIN_BASE = 'https://api.anakin.ai/v1'
const ANAKIN_API_VERSION = '2024-05-06'

export interface AnakinRunInputs {
  // These keys must match the input variable names configured in your Quick App.
  title: string
  content: string
  source_url: string
  type_hint: string
}

/** Run the Quick App and return the model's raw text output. */
export async function runQuickApp(inputs: AnakinRunInputs): Promise<string> {
  const token = process.env.ANAKIN_API_KEY
  const appId = process.env.ANAKIN_GIST_APP_ID
  if (!token) throw new Error('ANAKIN_API_KEY is not set')
  if (!appId) throw new Error('ANAKIN_GIST_APP_ID is not set')

  const res = await fetch(`${ANAKIN_BASE}/quickapps/${appId}/runs`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Anakin-Api-Version': ANAKIN_API_VERSION,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ inputs, stream: false }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Anakin API ${res.status}: ${detail.slice(0, 500)}`)
  }

  const raw = await res.text()
  return extractOutputText(raw)
}

/**
 * Anakin's non-streaming response shape can vary by app/version, so pull the
 * generated text defensively from the most common fields, falling back to the
 * raw body (which may itself already be the text/JSON we want).
 */
function extractOutputText(raw: string): string {
  try {
    const json = JSON.parse(raw) as Record<string, unknown>
    const candidate =
      pickString(json, 'content') ??
      pickString(json, 'output') ??
      pickString(json, 'text') ??
      pickString(json, 'answer') ??
      pickString((json.data as Record<string, unknown>) ?? {}, 'content') ??
      pickString((json.data as Record<string, unknown>) ?? {}, 'output')
    return candidate ?? raw
  } catch {
    // Not JSON — likely already plain text.
    return raw
  }
}

function pickString(obj: Record<string, unknown>, key: string): string | undefined {
  const v = obj?.[key]
  return typeof v === 'string' && v.trim() ? v : undefined
}
