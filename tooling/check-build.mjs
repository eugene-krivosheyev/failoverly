import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, access, readdir } from 'node:fs/promises'
import { resolve, dirname, relative, sep } from 'node:path'
import config from '../site.config.json'
import {
  KIT_FORM_ID,
  KIT_FORM_UID,
  KIT_RUNTIME_SCRIPT,
  KIT_FORM_ACTION,
  KIT_VISIT_URL,
  analyticsScriptSources
} from './security.mjs'

const root = resolve(import.meta.dir, '../dist')
const vercelRoot = resolve(import.meta.dir, '../.vercel/output')
const html = await readFile(resolve(root, 'index.html'), 'utf8')
const privacy = await readFile(resolve(root, 'privacy.html'), 'utf8')
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

let kitRuntimes = 0
for (const [name, document] of [
  ['index.html', html],
  ['privacy.html', privacy]
]) {
  for (const [tag] of document.matchAll(/<(?:script|link|img)\b[^>]*>/g)) {
    if (tag.startsWith('<link') && !/rel="(?:stylesheet|preload|icon|apple-touch-icon)"/.test(tag)) continue
    const reference = tag.match(/(?:src|href)="([^"]+)"/)?.[1]
    if (name === 'index.html' && tag.startsWith('<script') && reference === KIT_RUNTIME_SCRIPT) {
      assert(/\sdefer(?:\s|>|=)/.test(tag), 'Kit must load without blocking HTML parsing.')
      assert(tag.includes('crossorigin="anonymous"'), 'Kit runtime must load without cross-origin credentials.')
      assert(tag.includes('id="kit-runtime"'), 'The Kit runtime needs a stable load-event target.')
      kitRuntimes++
    } else if (reference) {
      await checkAsset(reference, resolve(root, name))
      assert(!tag.startsWith('<script'), 'Local production interactions must remain inline.')
    }
  }
}
assert.equal(kitRuntimes, 1, 'Both forms must share one Kit runtime.')
assert(
  !html.includes(`https://failoverly-app.kit.com/${KIT_FORM_UID}/index.js`),
  'Remove the cookie-setting Kit bootstrap.'
)
const kitForms = [...html.matchAll(/<form\b([^>]*)>([\s\S]*?)<\/form>/g)]
assert.equal(kitForms.length, 2, 'Both signup placements must contain a static HTML form.')
for (const [index, [, attributes, contents]] of kitForms.entries()) {
  const placement = index === 0 ? 'hero' : 'final'
  assert(attributes.includes(`action="${KIT_FORM_ACTION}"`), 'Use the approved Kit subscription endpoint.')
  assert(attributes.includes('method="post"'), 'Email addresses must not be submitted in a URL.')
  assert(attributes.includes(`data-sv-form="${KIT_FORM_ID}"`), 'Kit form ID mismatch.')
  assert(attributes.includes(`data-uid="${KIT_FORM_UID}"`), 'Kit form UID mismatch.')
  const options = attributes.match(/data-options=(["'])(.*?)\1/)?.[2]
  assert(options, 'Preserve Kit form settings in the HTML embed.')
  JSON.parse(options.replaceAll('&quot;', '"').replaceAll('&amp;', '&'))
  assert(contents.includes('name="email_address"'), 'Kit email field missing.')
  assert(contents.includes(`id="${placement}-email"`), 'Each email input needs its own accessible label.')
  assert(contents.includes(`aria-describedby="${placement}-privacy"`), 'Keep the privacy note connected to its input.')
  assert(contents.includes('data-element="submit"'), 'Kit submit hook missing.')
  assert(contents.includes('Built with Kit'), 'Preserve the supplied Kit branding.')
}

assert.equal(privacy.match(/rel="canonical"\s+href="([^"]+)"/)?.[1], `${origin}/privacy.html`)
assert.equal(
  privacy.match(/name="robots"\s+content="([^"]+)"/)?.[1],
  'noindex, follow',
  'Keep the website privacy notice out of search results.'
)
assert.equal((privacy.match(/<h1\b/g) || []).length, 1)
assert(/<script type="module">/.test(privacy), 'Privacy analytics must retain deferred module execution.')
assert(!privacy.includes(KIT_RUNTIME_SCRIPT), 'Do not load signup forms on the privacy document.')
assert(!/<link\b[^>]*rel="stylesheet"/.test(privacy), 'Privacy CSS must be embedded too.')
assert(!html.includes('privacy-template'), 'Remove the obsolete modal privacy placeholder.')
assert.equal(
  (html.match(/href="privacy\.html"/g) || []).length,
  3,
  'Both forms and the footer must link to the privacy page.'
)
assert(!html.includes('data-signup-form'), 'Remove the replaced signup placeholders.')
assert(!html.includes('survey-template'), 'Remove the disconnected survey placeholder.')
assert(!html.includes('Waitlist signup is temporarily unavailable.'), 'Remove the obsolete signup pause notice.')

// Keep the first paint independent of additional stylesheet/font round trips.
assert(!/<link\b[^>]*rel="stylesheet"/.test(html), 'Production CSS must be embedded in the document.')
assert(!/<link\b[^>]*as="font"/.test(html), 'The outlined production logo must not preload a font.')
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
assert.equal(
  await readFile(resolve(vercelRoot, 'static/privacy.html'), 'utf8'),
  privacy,
  'Vercel privacy document differs from preview.'
)
const globalRoute = deployment.routes.find(route => route.continue && route.headers?.['Content-Security-Policy'])
assert(globalRoute && new RegExp(globalRoute.src).test('/'), 'CSP must be an HTTP header on the landing page.')
function checkPolicy(header, document, kitForm = false) {
  const policy = new Map(
    header.split(';').map(directive => {
      const [name, ...values] = directive.trim().split(/\s+/)
      return [name, values]
    })
  )
  for (const directive of ['default-src', 'script-src-attr', 'base-uri', 'object-src', 'frame-ancestors']) {
    assert.deepEqual(policy.get(directive), ["'none'"], `Unexpected CSP permission: ${directive}`)
  }
  assert.deepEqual(policy.get('style-src-attr'), [kitForm ? "'unsafe-inline'" : "'none'"])
  assert.deepEqual(policy.get('img-src'), kitForm ? ["'self'", 'data:'] : ["'self'"])
  assert.deepEqual(policy.get('connect-src'), kitForm ? ["'self'", KIT_VISIT_URL, KIT_FORM_ACTION] : ["'self'"])
  assert.deepEqual(policy.get('form-action'), [kitForm ? KIT_FORM_ACTION : "'none'"])
  assert.deepEqual(
    policy.get('frame-src'),
    kitForm ? ['https://app.kit.com', 'https://app.convertkit.com'] : ["'none'"]
  )
  for (const [tag, directive] of [
    ['script', 'script-src'],
    ['style', 'style-src']
  ]) {
    const expected = [...document.matchAll(new RegExp(`<${tag}\\b([^>]*)>([\\s\\S]*?)<\\/${tag}>`, 'g'))]
      .filter(([, attributes]) => tag !== 'script' || !/\bsrc\s*=/.test(attributes))
      .map(([, , contents]) => `'sha256-${createHash('sha256').update(contents).digest('base64')}'`)
    if (kitForm && tag === 'script') expected.push(KIT_RUNTIME_SCRIPT)
    if (tag === 'script') expected.push(...analyticsScriptSources(origin))
    if (kitForm && tag === 'style') expected.splice(0, expected.length, "'unsafe-inline'")
    assert.deepEqual(
      new Set(policy.get(directive)),
      new Set(expected.length ? expected : ["'none'"]),
      `Unexpected CSP permissions for ${tag}.`
    )
  }
  assert(!/<[^>]+\s(?:style|on\w+)\s*=/i.test(document), 'Inline attributes need refactoring before strict CSP.')
}
checkPolicy(globalRoute.headers['Content-Security-Policy'], html, true)
const privacyRoute = deployment.routes.find(route => route.src === '^/privacy\\.html$' && route.continue)
assert(privacyRoute, 'The privacy page needs its own CSP header.')
checkPolicy(privacyRoute.headers['Content-Security-Policy'], privacy)
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
