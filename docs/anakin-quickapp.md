# Anakin Quick App — "Neuryn Ingest"

The `/api/ingest` function sends scraped-page-text or user-written text to **one**
Anakin Quick App and expects a single JSON object back. Build the app once, copy
its `appId`, and set `ANAKIN_GIST_APP_ID`.

## 1. Create the Quick App
1. Sign in to https://app.anakin.ai → **Create App → Quick App**.
2. Add these **input variables** (names must match exactly — the function sends them):

   | Variable      | Type       | Notes                                  |
   |---------------|------------|----------------------------------------|
   | `title`       | Short text | Optional user-provided title           |
   | `content`     | Long text  | The article text to analyze            |
   | `source_url`  | Short text | Original URL (empty for written posts) |
   | `type_hint`   | Short text | article \| blog \| research \| video   |

3. Pick a model (Claude / GPT / Gemini — any works).
4. Paste the **pre-prompt** below.
5. Publish, then open **Integration → API** to copy the **appId** and your **API Access Token**.

## 2. Pre-prompt (paste verbatim)

```
You extract structured metadata and reading summaries for a curation platform
called Neuryn.

Source URL: {{source_url}}
Suggested type: {{type_hint}}
Provided title (may be empty): {{title}}

Content to analyze:
---
{{content}}
---

Return ONLY a single valid JSON object, no markdown fences, no commentary, with
this exact structure:
{
  "title": "<the piece's title; use the provided title if given>",
  "author": "<author or publication name, else empty string>",
  "author_url": "<author URL if findable, else empty string>",
  "type": "<article | blog | research | video>",
  "category": "<one of: Engineering, Machine Learning, Product, Design, Business, Science, Philosophy, Math, Other>",
  "tags": ["<3-5 lowercase topical tags>"],
  "estimated_read_time": <integer minutes>,
  "body_markdown": "<clean 300-500 word markdown extract/summary of the main content; ## sub-headings, **bold** key terms>",
  "gists": {
    "quick":  "<~150 words, one paragraph, the single most important takeaway>",
    "medium": "<~600 words, key points and context, \n\n between paragraphs>",
    "full":   "<~1500 words, comprehensive overview, \n\n between paragraphs>"
  }
}

Output only the JSON object.
```

## 3. Wire it up
- `ANAKIN_API_KEY` = your API Access Token
- `ANAKIN_GIST_APP_ID` = the Quick App's `appId`

That's it — the function parses the JSON, converts the markdown fields to HTML,
and stores the row so the existing reader components render it.

> Scraping note: `api/_lib/scrape.ts` fetches + extracts page text with cheerio
> (same as the `add-external` CLI). To use Anakin's dedicated scraping API
> instead, swap the body of `fetchPageText` — the rest of the flow is unchanged.
