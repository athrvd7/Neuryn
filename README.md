# Neuryn

A personal content curation and publishing platform. Collect articles, blogs, videos, and research papers in one place — with AI-generated reading gists so you can decide how deep to go before committing.

**Stack:** TypeScript · React · Tailwind CSS · Quarto (`.qmd`) · Vite · Vercel

---

## Features

- **Fullscreen video hero** landing page with a browse page and individual article pages
- **Filterable content grid** — filter by type (article, blog, video, research) or tag
- **AI reading gists** — 1 min / 5 min / 10 min summaries generated via Claude Haiku, stored in frontmatter
- **CLI tooling** for adding content without touching the UI
- **Own work + external content** — flag your own writing or curate third-party links
- **User shelves (accounts)** — signed-in users add their own articles (by URL or by writing them), auto-processed through **Anakin** for gists + tags, shown on a public profile at `/u/:username`

---

## User accounts & Anakin ingestion

The curated CLI flow above is unchanged. On top of it, signed-in users can build
their own **public shelf** of articles:

- **Auth + storage:** Supabase (Postgres + Row-Level Security — anyone can read a
  shelf, only the owner can add/edit/delete).
- **Ingestion:** `POST /api/ingest` (Vercel Serverless Function):
  1. **Scrape** — URL adds are fetched through the **[Anakin.io Scraping API](https://anakin.io)**
     (`/v1/url-scraper`) → clean LLM-ready markdown. Uses `ANAKIN_API_KEY` only (no appId,
     no Pro plan). Set `SCRAPE_PROVIDER=cheerio` to use the local fallback; Anakin also
     falls back to cheerio automatically if a scrape is slow/unavailable.
  2. **Summarize** — an LLM generates the 3-tier gists + tags + category + read-time.
     Engine set by `INGEST_PROVIDER`: `gemini` (default) · `claude` · `anakin`
     (the Anakin *AI-app* platform — a Quick App, which requires Anakin Pro + `ANAKIN_GIST_APP_ID`).
  3. **Save** — inserts the row (RLS ties it to the owner).
- **Routes:** `/login`, `/me` (dashboard + add form), `/u/:username` (public shelf),
  `/a/:id` (reader).

**Setup:**
1. Create a Supabase project → run [`supabase/schema.sql`](./supabase/schema.sql) in the SQL editor.
2. Build the Anakin Quick App → see [`docs/anakin-quickapp.md`](./docs/anakin-quickapp.md).
3. Fill env vars from [`.env.example`](./.env.example): server vars in Vercel, `VITE_*` in `web/.env.local`.
4. `npm install && cd web && npm install` to pull in `@supabase/supabase-js`.

The Anakin API key lives only in the serverless function — never in the browser.

---

## Project Structure

```
neuryn/
├── cli/                    # CLI scripts
│   ├── generate-gists.ts   # AI summary generation
│   ├── add-video.ts        # Add a YouTube video by URL
│   └── add-external.ts     # Add an external article/link by URL
├── content/                # All .qmd content files
│   ├── _template.qmd       # Frontmatter template — copy this
│   ├── articles/
│   ├── blogs/
│   ├── videos/
│   └── research/
├── scripts/
│   └── build-content.ts    # Parses .qmd → JSON for the frontend
├── web/                    # Vite + React frontend
│   └── src/
│       ├── pages/          # Landing, Home, Article
│       └── components/     # Nav, FilterBar, ContentCard, GistPanel, VideoEmbed
├── public/                 # Static assets (favicon, images)
├── package.json
└── vercel.json
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- An [Anthropic API key](https://console.anthropic.com/) — only needed for gist generation

### Install

```bash
git clone https://github.com/athrvd7/Neuryn.git neuryn
cd neuryn
npm install
cd web && npm install && cd ..
```

### Develop

```bash
npm run dev
```

Builds content from `.qmd` files, then starts the Vite dev server at `localhost:5173`.

### Build

```bash
npm run build
npm run preview
```

---

## Adding Content

### Your own articles (manual)

Copy `content/_template.qmd` to the relevant folder and fill in the frontmatter:

```yaml
---
title: "Your Title"
author: "Your Name"
date: 2026-06-30
type: article           # article | blog | video | research
category: "Engineering"
tags: [tag1, tag2]
estimated_read_time: 8
is_own_work: true
---

Write your content here in Markdown.
```

Then run `npm run build:content` (or restart `npm run dev`) to pick it up.

### Images in articles

Copy images to `public/images/` and reference them in `.qmd`:

```markdown
![Alt text](/images/your-image.png)
```

---

## CLI Tools

All commands run from the project root. Set `ANTHROPIC_API_KEY` in your environment first.

### Generate AI reading gists

Reads a `.qmd` file and injects three summaries into its frontmatter (one Claude Haiku call):

```bash
npm run gists -- content/articles/my-article.qmd
```

Writes `gists.quick` (~150 words), `gists.medium` (~600 words), `gists.full` (~1500 words).

### Add a YouTube video

```bash
npm run video -- https://youtube.com/watch?v=VIDEO_ID
```

Fetches metadata + transcript, creates `content/videos/{slug}.qmd` with gists in one API call.

### Add an external article

```bash
npm run add-external -- https://example.com/some-article
npm run add-external -- --type research https://arxiv.org/abs/...
```

Scrapes the URL, extracts title/author/content, creates a `.qmd` with gists in one API call.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | CLI only | Claude Haiku for gist + metadata generation |

Not needed at Vercel deploy time — only for local CLI use.

---

## License

MIT — see [LICENSE](./LICENSE).
