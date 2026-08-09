# Contributing to Neuryn

Thanks for your interest. This is a personal platform, so contributions are intentionally scoped — but bug reports, fixes, and well-reasoned suggestions are welcome.

---

## What Is and Isn't in Scope

**In scope**
- Bug fixes (broken builds, CLI errors, render issues)
- Accessibility improvements to the frontend
- Performance improvements that don't change the content model
- Documentation corrections

**Out of scope**
- Changes to content curation criteria or editorial choices
- New content types without prior discussion
- Opinionated UI redesigns

---

## Development Setup

```bash
git clone https://github.com/athrvd7/Neuryn.git neuryn
cd neuryn
npm install
cd web && npm install && cd ..
npm run dev
```

Set `ANTHROPIC_API_KEY` in your environment if you need to test gist generation.

---

## Conventions

### Code

- TypeScript strict mode throughout
- React functional components only
- Tailwind CSS utility classes — avoid inline styles
- No magic strings for content types; use the `ContentType` union from `web/src/types/content.ts`

### Content files

- Always start from `content/_template.qmd`
- `type` must be one of: `article`, `blog`, `video`, `research`
- Set `is_own_work: false` for any third-party content

### Commits

Use concise imperative messages:

```
fix: resolve broken slug for titles with special characters
feat: add tag filtering to FilterBar
docs: update CLI usage in README
```

---

## Submitting Changes

1. Fork and create a branch from `main`:
   ```bash
   git checkout -b fix/your-fix-name
   ```
2. Make changes and verify the build passes:
   ```bash
   npm run build
   ```
3. Open a pull request against `main` with a clear description of what changed and why.

---

## Reporting Bugs

Open a GitHub Issue with:

- What you expected vs. what happened
- Steps to reproduce
- OS, Node version, and relevant error output

---

## License

By contributing, you agree your contributions will be licensed under the [MIT License](./LICENSE).
