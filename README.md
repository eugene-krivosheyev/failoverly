# Animation Project (HTML / SCSS / JS)

Quick scaffold for a small animation project using plain HTML, SCSS and ES modules.

Structure
- `index.html` — HTML entry, links `css/main.css` and `scripts/main.js`
- `scss/` — SCSS sources (`_reset.scss`, `main.scss`)
- `css/` — compiled CSS (`main.css`) included for immediate preview
- `scripts/` — JS modules (`main.js`); GSAP comes from npm (`bun install`), not a CDN
- `images/`, `fonts/` — asset folders (place your images and fonts here)

Develop (bun)

```bash
bun install       # once
bun run dev       # dev server at http://localhost:8000 + SCSS watch
```

Other scripts:

```bash
bun run serve     # dev server only, no SCSS watch
bun run styles    # compile SCSS once (scss/main.scss -> css/main.css)
bun run build     # production build -> dist/ (bundled, minified, hashed assets)
```

Deploy the contents of `dist/` — it is self-contained (JS bundled with GSAP and minified, CSS minified, assets hashed).

Notes
- `css/main.css` is compiled from `scss/` — edit styles in `scss/main.scss` only, never `css/main.css` directly.
- Compiled `css/main.css` is committed, so `index.html` can be opened without a build step; recompile after any SCSS change.
- The dev server is Bun's built-in frontend server (`bun index.html`) with hot reloading; change the port via the `--port` flag in `package.json`.
