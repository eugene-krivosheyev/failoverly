import { mkdir, readFile, writeFile, copyFile, cp, rm } from 'node:fs/promises'
import { resolve, posix } from 'node:path'
import config from '../site.config.json'
import hosting from '../vercel.json'
import { contentSecurityPolicy, KIT_RUNTIME_SCRIPT } from './security.mjs'

// A single origin drives canonical, social metadata, structured data, and sitemap.
const siteUrl = new URL(process.env.SITE_URL || config.url)
if (siteUrl.protocol !== 'https:' || siteUrl.pathname !== '/' || siteUrl.search || siteUrl.hash) {
  throw new Error('SITE_URL must be an HTTPS origin, e.g. https://failoverly.app')
}
const origin = siteUrl.origin
// An editorial date, not the build time: repeat builds must not fake freshness.
const lastModified = config.contentLastModified
if (
  !/^\d{4}-\d{2}-\d{2}$/.test(lastModified || '') ||
  Number.isNaN(Date.parse(lastModified)) ||
  new Date(lastModified).toISOString().slice(0, 10) !== lastModified ||
  lastModified > new Date().toISOString().slice(0, 10)
) {
  throw new Error('contentLastModified must be a real, non-future date (YYYY-MM-DD).')
}
const outdir = resolve(import.meta.dir, '../dist')
await rm(outdir, { recursive: true, force: true })

const result = await Bun.build({
  entrypoints: ['index.html', 'privacy.html'],
  outdir,
  target: 'browser',
  minify: true,
  define: {
    // Local prebuilt releases are supported; the runtime host check excludes localhost.
    'process.env.VERCEL_ENV': JSON.stringify(process.env.VERCEL_ENV || 'production')
  },
  // The editable logo's font is removed after its text is replaced with outlines.
  external: ['*.woff2', KIT_RUNTIME_SCRIPT],
  sourcemap: 'none',
  naming: {
    entry: '[name].[ext]',
    chunk: 'assets/[name]-[hash].[ext]',
    asset: 'assets/[name]-[hash].[ext]'
  }
})
if (!result.success) {
  for (const log of result.logs) console.error(log)
  process.exit(1)
}

const exportedLogo = await readFile('images/logo.svg', 'utf8')
const logoContents = exportedLogo
  .match(/<svg\b[^>]*>([\s\S]*?)<\/svg>/)?.[1]
  .replace(/<(?:title|desc)\b[^>]*>[\s\S]*?<\/(?:title|desc)>/g, '')
  // The enclosing inline SVG already has the complete accessible brand name.
  .replace(/\saria-label="[^"]*"/g, '')
const inlineLogo = /(<svg\b(?=[^>]*class="brand-logo")[^>]*>)[\s\S]*?<\/svg>/
const pages = new Map()
const embeddedFiles = new Set()
for (const name of ['index.html', 'privacy.html']) {
  const htmlPath = resolve(outdir, name)
  let html = await readFile(htmlPath, 'utf8')
  if (name === 'index.html') {
    if (!logoContents || !inlineLogo.test(html) || /<text\b/.test(logoContents)) {
      throw new Error('Expected an outlined brand asset and an inline production logo.')
    }
    html = html.replace(inlineLogo, (_, opening) => `${opening}${logoContents}</svg>`)
  }
  html = html.replace(/<link\b(?=[^>]*rel="preload")(?=[^>]*href="fonts\/inter-latin-var\.woff2")[^>]*>/g, '')

  // This small site's stylesheet belongs in each document: an extra
  // render-blocking request adds an entire round trip on a high-latency connection.
  for (const [tag, href] of html.matchAll(/<link\b(?=[^>]*rel="stylesheet")[^>]*href="([^"]+)"[^>]*>/g)) {
    const stylesheetPath = resolve(outdir, href)
    let css = await readFile(stylesheetPath, 'utf8')
    css = css.replace(/@font-face\{[^}]*font-family:Inter;[^}]*\}/g, '')
    // Bundled asset references were relative to the CSS file, not the document.
    css = css.replace(/url\((['"]?)([^)'"\s]+)\1\)/g, (original, quote, url) =>
      /^(?:[a-z]+:|\/|#)/i.test(url) ? original : `url(${quote}${posix.join(posix.dirname(href), url)}${quote})`
    )
    html = html.replace(tag, () => `<style>${css}</style>`)
    embeddedFiles.add(stylesheetPath)
  }

  // The complete interaction bundle is small enough to travel with the page.
  // Inline modules still defer until parsing finishes, without a second network
  // round trip before signup controls and the connection preview become usable.
  for (const [tag, src] of html.matchAll(/<script\b(?=[^>]*type="module")[^>]*src="([^"]+)"[^>]*>\s*<\/script>/g)) {
    const scriptPath = resolve(outdir, src)
    const script = (await readFile(scriptPath, 'utf8')).replace(/<\/script/gi, '<\\/script')
    // Bun may emit an empty module for a CSS-only HTML entry point.
    html = html.replace(tag, () => (script.trim() ? `<script type="module">${script}</script>` : ''))
    embeddedFiles.add(scriptPath)
  }
  html = html.replaceAll('https://failoverly.app', origin)
  // Vercel preview builds should not compete with the real domain in search.
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production') {
    html = html.replace('content="index, follow"', 'content="noindex, nofollow"')
  }
  await writeFile(htmlPath, html)
  pages.set(name, html)
}
// Shared CSS bundles can be referenced by both pages. Remove them only after
// every document has embedded its copy and CSP hashes can use the final bytes.
for (const file of embeddedFiles) await rm(file)

// The social card needs a stable metadata URL. Other images are bundled once
// under assets/, including the logo used on the privacy page.
await mkdir(resolve(outdir, 'images'), { recursive: true })
for (const name of ['social-card.png']) {
  await copyFile(resolve('images', name), resolve(outdir, 'images', name))
}
await mkdir(resolve(outdir, 'fonts'), { recursive: true })
await copyFile('fonts/OFL.txt', resolve(outdir, 'fonts/OFL.txt'))
const robots = await readFile('robots.txt', 'utf8')
await writeFile(resolve(outdir, 'robots.txt'), robots.replaceAll('https://failoverly.app', origin))
await writeFile(
  resolve(outdir, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${origin}/</loc><lastmod>${lastModified}</lastmod></url>\n</urlset>\n`
)
const llms = await readFile('llms.txt', 'utf8')
await writeFile(resolve(outdir, 'llms.txt'), llms.replaceAll('https://failoverly.app', origin))

// Vercel's Build Output API delivers generated CSP as an HTTP header in both
// hosted builds and `vercel deploy --prebuilt`. Preserve .vercel/project.json
// and any pulled environment files; only replace our generated static output.
const vercelOutput = resolve(import.meta.dir, '../.vercel/output')
await mkdir(vercelOutput, { recursive: true })
await rm(resolve(vercelOutput, 'static'), { recursive: true, force: true })
await cp(outdir, resolve(vercelOutput, 'static'), { recursive: true })
const routes = hosting.headers.map(({ source, headers }) => ({
  src: source,
  headers: Object.fromEntries(headers.map(({ key, value }) => [key, value])),
  continue: true
}))
routes[0].headers['Content-Security-Policy'] = contentSecurityPolicy(pages.get('index.html'), {
  kitForm: true,
  analyticsOrigin: origin
})
routes[0].headers['Cache-Control'] = 'public, max-age=0, must-revalidate'
routes.push(
  {
    src: '^/privacy\\.html$',
    headers: {
      'Content-Security-Policy': contentSecurityPolicy(pages.get('privacy.html'), { analyticsOrigin: origin })
    },
    continue: true
  },
  { src: '^/index(?:\\.html)?/?$', headers: { Location: '/' }, status: 308 },
  { src: '^/(.+)/$', headers: { Location: '/$1' }, status: 308 },
  { src: '^/$', dest: '/index.html' },
  { handle: 'filesystem' }
)
await writeFile(resolve(vercelOutput, 'config.json'), `${JSON.stringify({ version: 3, routes }, null, 2)}\n`)
console.log(`Built production site for ${origin} in dist/.`)
