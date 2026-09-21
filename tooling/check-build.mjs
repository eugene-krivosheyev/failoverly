import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, access, readdir } from 'node:fs/promises'
import { resolve, dirname, relative, sep } from 'node:path'
import config from '../site.config.json'

const root = resolve(import.meta.dir, '../dist')
const vercelRoot = resolve(import.meta.dir, '../.vercel/output')
const html = await readFile(resolve(root, 'index.html'), 'utf8')
const origin = new URL(process.env.SITE_URL || config.url).origin
const checked = new Set()

async function checkAsset(reference, fromFile) {
  if (/^(data:|#)/.test(reference)) return
  assert(!/^https?:\/\//.test(reference), `Runtime asset must be local: ${reference}`)
  const file = reference.startsWith('/') ? resolve(root, `.${reference}`) : resolve(dirname(fromFile), reference)
  assert(file.startsWith(`${root}${sep}`), `Asset escapes build directory: ${reference}`)
  await access(file)
  assert.deepEqual(
    await readFile(resolve(vercelRoot, 'static', relative(root, file))),
    await readFile(file),
    `Vercel asset differs from local preview: ${reference}`
  )
  checked.add(file)
  if (file.endsWith('.css')) {
    const css = await readFile(file, 'utf8')
    for (const [, url] of css.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
      await checkAsset(url, file)
    }
  }
}

for (const [tag] of html.matchAll(/<(?:script|link|img)\b[^>]*>/g)) {
  if (tag.startsWith('<link') && !/rel="(?:stylesheet|preload|icon|apple-touch-icon)"/.test(tag)) continue
  const reference = tag.match(/(?:src|href)="([^"]+)"/)?.[1]
  if (reference) await checkAsset(reference, resolve(root, 'index.html'))
}

// Keep the first paint independent of additional stylesheet/font round trips.
assert(!/<link\b[^>]*rel="stylesheet"/.test(html), 'Production CSS must be embedded in the document.')
assert(!/<link\b[^>]*as="font"/.test(html), 'The outlined production logo must not preload a font.')
assert(!/<script\b[^>]*src=/.test(html), 'Production controls must not wait for a separate script request.')
assert(/<script type="module">/.test(html), 'Inline interactions must retain deferred module execution.')
for (const [, css] of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)) {
  for (const [, url] of css.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
    await checkAsset(url, resolve(root, 'index.html'))
  }
}

const canonical = html.match(/rel="canonical"\s+href="([^"]+)"/)?.[1]
assert.equal(canonical, `${origin}/`)
const structuredData = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1]
assert(structuredData, 'Structured data is missing.')
JSON.parse(structuredData)
const socialImage = html.match(/property="og:image"\s+content="([^"]+)"/)?.[1]
assert.equal(new URL(socialImage).origin, origin)
await checkAsset(new URL(socialImage).pathname, resolve(root, 'index.html'))
assert.equal((html.match(/<h1\b/g) || []).length, 1, 'Expected one primary heading.')
assert(!html.includes('data-preview-form'), 'Prototype form hooks remain.')
const isPreview = process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production'
const indexing = html.match(/name="robots"\s+content="([^"]+)"/)?.[1]
assert.equal(indexing, isPreview ? 'noindex, nofollow' : 'index, follow', 'Incorrect indexing for this environment.')
const sitemap = await readFile(resolve(root, 'sitemap.xml'), 'utf8')
assert(sitemap.includes(`<loc>${origin}/</loc>`), 'Sitemap must include the canonical landing page.')
assert.equal((sitemap.match(/<loc>/g) || []).length, 1, 'Only the published landing page belongs in the sitemap.')
assert(
  sitemap.includes(`<lastmod>${config.contentLastModified}</lastmod>`),
  'Sitemap must use the editorial update date.'
)
const robots = await readFile(resolve(root, 'robots.txt'), 'utf8')
const rules = robots.split('\n').filter(line => line.trim() && !line.trim().startsWith('#'))
assert.deepEqual(
  rules,
  ['User-agent: *', 'Allow: /', `Sitemap: ${origin}/sitemap.xml`],
  'Public crawling must remain open.'
)
const llms = await readFile(resolve(root, 'llms.txt'), 'utf8')
assert(llms.startsWith('# Failoverly\n\n> '), 'llms.txt must start with the product name and summary.')
const sourceLinks = [...llms.matchAll(/\[[^\]]+\]\((https:\/\/[^)]+)\)/g)]
assert(sourceLinks.length > 0, 'llms.txt needs links to primary product information.')
for (const [, href] of sourceLinks) {
  const url = new URL(href)
  assert.equal(url.origin, origin, `Wrong canonical origin in llms.txt: ${href}`)
  assert.equal(url.pathname, '/', `llms.txt links to an unpublished page: ${href}`)
  if (url.hash) assert(html.includes(`id="${url.hash.slice(1)}"`), `Missing llms.txt section target: ${href}`)
}
assert(!html.includes('Connect Buddy'), 'Outdated product name remains.')

// Verify deployment headers against the exact bytes that the browser will read.
const deployment = JSON.parse(await readFile(resolve(vercelRoot, 'config.json'), 'utf8'))
assert.equal(deployment.version, 3, 'Expected Vercel Build Output API v3.')
assert.equal(
  await readFile(resolve(vercelRoot, 'static/index.html'), 'utf8'),
  html,
  'Vercel HTML differs from preview.'
)
const globalRoute = deployment.routes.find(route => route.continue && route.headers?.['Content-Security-Policy'])
assert(globalRoute && new RegExp(globalRoute.src).test('/'), 'CSP must be an HTTP header on the landing page.')
const policy = new Map(
  globalRoute.headers['Content-Security-Policy'].split(';').map(directive => {
    const [name, ...values] = directive.trim().split(/\s+/)
    return [name, values]
  })
)
for (const directive of [
  'default-src',
  'script-src-attr',
  'style-src-attr',
  'form-action',
  'base-uri',
  'object-src',
  'frame-ancestors'
]) {
  assert.deepEqual(policy.get(directive), ["'none'"], `Unexpected CSP permission: ${directive}`)
}
assert.deepEqual(policy.get('img-src'), ["'self'"])
assert.deepEqual(policy.get('connect-src'), ["'self'"])
for (const [tag, directive] of [
  ['script', 'script-src'],
  ['style', 'style-src']
]) {
  const expected = [...html.matchAll(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'g'))].map(
    ([, contents]) => `'sha256-${createHash('sha256').update(contents).digest('base64')}'`
  )
  assert(expected.length > 0)
  assert.deepEqual(
    new Set(policy.get(directive)),
    new Set(expected),
    `CSP hashes must match final ${tag} contents only.`
  )
}
assert(!/<[^>]+\s(?:style|on\w+)\s*=/i.test(html), 'Inline attributes need refactoring before strict CSP.')
assert(
  deployment.routes.some(route => route.src === '^/$' && route.dest === '/index.html'),
  'Missing root document route.'
)
assert(
  deployment.routes.some(route => route.status === 308 && new RegExp(route.src).test('/index.html')),
  'Missing canonical redirect.'
)
assert(!deployment.routes.some(route => route.dest && route.src !== '^/$'), 'Do not turn missing URLs into soft 404s.')

// Each public file should have one output URL; Vercel gets a separate deployment
// copy, but duplicate favicons under dist/images and dist/assets are unnecessary.
const fingerprints = new Map()
for (const name of await readdir(root, { recursive: true, withFileTypes: true })) {
  if (!name.isFile()) continue
  const file = resolve(name.parentPath, name.name)
  const fingerprint = createHash('sha256')
    .update(await readFile(file))
    .digest('hex')
  assert(!fingerprints.has(fingerprint), `Duplicate public output: ${file} and ${fingerprints.get(fingerprint)}`)
  fingerprints.set(fingerprint, file)
}
console.log(`Production checks passed; crawler files, indexing and ${checked.size} local assets resolve.`)
for (const file of checked) console.log(`  ${relative(root, file)}`)
