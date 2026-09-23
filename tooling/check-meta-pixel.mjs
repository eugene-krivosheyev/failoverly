// Browser integration check: real public SDKs, intercepted visits/subscriptions.
// No Meta events, Kit subscriptions, or Vercel page views reach the providers.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

// Reuse the browser driver installed by the project's Lighthouse dependency.
const require = createRequire(import.meta.url)
const driver = require.resolve('puppeteer-core', { paths: [dirname(require.resolve('lighthouse/package.json'))] })
const { default: puppeteer } = await import(pathToFileURL(driver).href)
const root = resolve(import.meta.dirname, '..')
const deployment = JSON.parse(await readFile(resolve(root, '.vercel/output/config.json'), 'utf8'))
const { metaPixelId } = JSON.parse(await readFile(resolve(root, 'site.config.json'), 'utf8'))
const origin = 'https://www.failoverly.app'
const metaScript = 'https://connect.facebook.net/en_US/fbevents.js'
const kitScript = 'https://f.convertkit.com/ckjs/ck.5.js'
const consentKey = 'failoverly.adConsent.v1'
const email = 'mock-only@example.test'
const emailHash = createHash('sha256').update(email).digest('hex')
const reports = []
const debugPages = []
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
async function until(predicate) {
  const deadline = Date.now() + 20000
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error('Timed out waiting for intercepted provider event.')
    await pause(100)
  }
}
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--disable-extensions', '--no-first-run']
})

async function fixture(options = {}) {
  const host = options.origin || origin
  const context = await browser.createBrowserContext()
  const page = await context.newPage()
  // Meta drops HeadlessChrome events before transport. Use the installed
  // browser's normal UA, while continuing to intercept every tracking request.
  await page.setUserAgent((await browser.userAgent()).replace('HeadlessChrome/', 'Chrome/'))
  const report = {
    name: options.name,
    requests: [],
    responses: [],
    failures: [],
    events: [],
    errors: [],
    warnings: [],
    violations: [],
    submissions: 0
  }
  reports.push(report)
  debugPages.push({ page, report })
  let delayedRequest
  let succeed = false
  await page.setViewport(options.mobile ? { width: 390, height: 844, isMobile: true } : { width: 1440, height: 1000 })
  await page.exposeFunction('reportViolation', violation => report.violations.push(violation))
  await page.evaluateOnNewDocument(
    ({ saved, gpc, blockedStorage, consentKey }) => {
      if (gpc) Object.defineProperty(navigator, 'globalPrivacyControl', { value: true })
      if (saved) localStorage.setItem(consentKey, JSON.stringify(saved))
      if (blockedStorage) {
        // Exercise our storage fallback without replacing provider internals.
        for (const method of ['getItem', 'setItem']) {
          const original = Storage.prototype[method]
          Storage.prototype[method] = function (key, ...args) {
            if (key === consentKey) throw new Error('Consent storage blocked')
            return original.call(this, key, ...args)
          }
        }
      }
      document.addEventListener('securitypolicyviolation', event =>
        window.reportViolation({
          directive: event.violatedDirective,
          uri: event.blockedURI
        })
      )
    },
    { saved: options.saved, gpc: options.gpc, blockedStorage: options.blockedStorage, consentKey }
  )
  page.on('pageerror', error => report.errors.push(error.message))
  page.on('response', response => {
    if (response.url().includes('facebook')) report.responses.push({ url: response.url(), status: response.status() })
  })
  page.on('requestfailed', request => report.failures.push({ url: request.url(), reason: request.failure() }))
  page.on('console', message => {
    if (['warn', 'error'].includes(message.type())) report.warnings.push(message.text())
  })
  await page.setRequestInterception(true)
  page.on('request', async request => {
    const url = new URL(request.url())
    report.requests.push(url.href)
    const cors = {
      'access-control-allow-origin': host,
      'access-control-allow-headers': 'accept,content-type,x-ckjs-version',
      'access-control-allow-methods': 'POST,OPTIONS'
    }
    if (url.hostname === 'www.facebook.com') {
      const data = url.search || request.postData() || ''
      if (url.pathname === '/tr/') report.events.push(Object.fromEntries(new URLSearchParams(data)))
      return request.respond({
        status: 200,
        headers: cors,
        contentType: 'image/gif',
        body: Buffer.from('R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=', 'base64')
      })
    }
    if (url.href === metaScript && options.blocked) return request.abort('blockedbyclient')
    if (url.href === metaScript && options.delayed) {
      delayedRequest = request
      return
    }
    if (url.pathname.startsWith('/signals/config/') && options.delayedConfig) {
      delayedRequest = request
      return
    }
    if (url.hostname === 'connect.facebook.net') return request.continue()
    if (url.href === kitScript) return request.continue()
    if (url.pathname.endsWith('/subscriptions') || url.pathname.endsWith('/visit')) {
      if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers: cors })
      if (url.pathname.endsWith('/subscriptions')) report.submissions++
      return request.respond({
        status: 200,
        headers: cors,
        contentType: 'application/json',
        body: JSON.stringify(
          url.pathname.endsWith('/visit')
            ? {}
            : succeed
              ? { status: 'success' }
              : { status: 'error', errors: { fields: ['email_address'], messages: ['Mock error'] } }
        )
      })
    }
    if (url.origin !== host) return url.protocol === 'data:' ? request.continue() : request.abort()
    if (url.pathname.startsWith('/_vercel/'))
      return request.respond({ status: 200, contentType: 'application/javascript', body: '' })
    const path = url.pathname === '/' ? '/index.html' : url.pathname
    try {
      const headers = {}
      for (const route of deployment.routes)
        if (route.continue && route.headers && new RegExp(route.src).test(url.pathname))
          Object.assign(headers, route.headers)
      return request.respond({
        status: 200,
        headers,
        contentType: path.endsWith('.html') ? 'text/html' : path.endsWith('.png') ? 'image/png' : 'image/svg+xml',
        body: await readFile(resolve(root, `dist${path}`))
      })
    } catch {
      return request.abort()
    }
  })
  const url = `${host}${options.path || '/'}?utm_source=qa&utm_campaign=pixel_test`
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 45000 })
  if (!options.path) await page.waitForFunction(() => window.__sv_forms?.length === 2)
  const metaRequests = () => report.requests.filter(url => /facebook\.(net|com)/.test(url))
  const allow = () => page.click('[data-ad-consent="granted"]')
  const reject = () => page.click('[data-ad-consent="denied"]')
  const reopen = () => page.click('[data-cookie-settings]')
  async function submit(success = true, placement = 'hero') {
    succeed = success
    await page.$eval(
      `#${placement}-email`,
      (input, value) => {
        input.value = value
        input.form.requestSubmit()
      },
      email
    )
    await page.waitForSelector(success ? '[data-element="success"]' : '[data-element="errors"] li')
    await pause(350)
  }
  async function close() {
    assert.deepEqual(report.errors, [], `${report.name}: JavaScript errors`)
    assert.deepEqual(report.violations, [], `${report.name}: CSP violations`)
    assert(!JSON.stringify(report.events).includes(emailHash), 'Do not send matched email hashes.')
    assert(!JSON.stringify(report.events).includes(email), 'Do not send email addresses.')
    assert(
      report.events.every(event => event.id === metaPixelId && ['PageView', 'Lead'].includes(event.ev)),
      'Only approved events/pixel.'
    )
    console.log(`PASS ${report.name}: ${report.events.map(event => event.ev).join(', ') || 'zero events'}`)
    await context.close()
  }
  return {
    page,
    context,
    report,
    metaRequests,
    allow,
    reject,
    reopen,
    submit,
    close,
    release: async () => {
      await until(() => delayedRequest)
      await delayedRequest.continue()
    }
  }
}

try {
  await mkdir(resolve(root, 'reports'), { recursive: true })
  for (const mobile of [false, true]) {
    const f = await fixture({ name: mobile ? 'mobile consent + bottom form' : 'desktop consent + top form', mobile })
    assert.equal(f.metaRequests().length, 0, 'No Meta resources before consent.')
    assert.equal(await f.page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
    await f.page.screenshot({ path: resolve(root, `reports/meta-consent-${mobile ? 'mobile' : 'desktop'}.png`) })
    await f.allow()
    await until(() => f.report.events.some(event => event.ev === 'PageView'))
    await f.submit(false, mobile ? 'final' : 'hero')
    assert.equal(f.report.events.filter(event => event.ev === 'Lead').length, 0, 'Errors cannot count as leads.')
    await f.submit(true, mobile ? 'final' : 'hero')
    await until(() => f.report.events.some(event => event.ev === 'Lead'))
    await f.page.evaluate(() => {
      document.querySelector('form').dispatchEvent(new CustomEvent('ckjs:submission:complete', { bubbles: true }))
      window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))
    })
    await pause(500)
    assert.deepEqual(
      f.report.events.map(event => event.ev),
      ['PageView', 'Lead'],
      'No duplicate conversions or automatic BFCache events.'
    )
    await f.reopen()
    await f.reject()
    assert.equal((await f.context.cookies()).filter(cookie => ['_fbp', '_fbc'].includes(cookie.name)).length, 0)
    f.report.requests.length = 0
    await f.page.reload({ waitUntil: 'networkidle0' })
    assert.equal(f.metaRequests().length, 0, 'Reject survives reload.')
    await f.close()
  }
  {
    const f = await fixture({ name: 'denied signup is never replayed' })
    await f.reject()
    await f.submit(true)
    assert.equal(f.metaRequests().length, 0)
    await f.reopen()
    await f.allow()
    await until(() => f.report.events.length)
    assert.deepEqual(
      f.report.events.map(event => event.ev),
      ['PageView']
    )
    await f.close()
  }
  {
    const f = await fixture({ name: 'withdraw while SDK is downloading', delayed: true })
    await f.allow()
    await f.reopen()
    await f.reject()
    await f.release()
    await f.page.waitForFunction(() => window.fbq?.callMethod)
    await f.submit(true)
    assert.equal(f.report.events.length, 0)
    await f.reopen()
    await f.allow()
    await until(() => f.report.events.length)
    assert.deepEqual(
      f.report.events.map(event => event.ev),
      ['PageView']
    )
    await f.close()
  }
  {
    const f = await fixture({ name: 'withdraw before pixel configuration arrives', delayedConfig: true })
    await f.allow()
    await f.page.waitForFunction(() => window.fbq?.queue?.some(command => command[0] === 'trackSingle'))
    await f.submit(true)
    await f.reopen()
    await f.reject()
    await f.release()
    await pause(1000)
    assert.equal(f.report.events.length, 0, 'Withdrawal discards events waiting for configuration.')
    await f.reopen()
    await f.allow()
    await until(() => f.report.events.length)
    assert.deepEqual(
      f.report.events.map(event => event.ev),
      ['PageView'],
      'Do not replay the discarded lead.'
    )
    await f.close()
  }
  for (const options of [
    {
      name: 'stored consent on privacy',
      path: '/privacy.html',
      saved: { value: 'granted', expiresAt: Date.now() + 60000 }
    },
    { name: 'GPC overrides stored consent', gpc: true, saved: { value: 'granted', expiresAt: Date.now() + 60000 } },
    { name: 'localhost never tracks', origin: 'http://127.0.0.1:4173' },
    { name: 'preview host never tracks', origin: 'https://failoverly-preview.vercel.app' },
    { name: 'consent preference storage unavailable', path: '/privacy.html', blockedStorage: true },
    { name: 'blocked SDK does not block signup', blocked: true }
  ]) {
    const f = await fixture(options)
    if (options.saved && !options.gpc) {
      await until(() => f.report.events.length)
      assert.deepEqual(
        f.report.events.map(event => event.ev),
        ['PageView']
      )
    } else if (options.gpc) {
      assert.equal(f.metaRequests().length, 0)
      await f.reopen()
      assert.equal(await f.page.$eval('[data-ad-consent="granted"]', button => button.disabled), true)
      await f.reject()
      await f.submit(true)
      assert.equal(f.metaRequests().length, 0)
    } else {
      assert.equal(f.metaRequests().length, 0)
      await f.allow()
      if (options.blockedStorage) await until(() => f.report.events.length)
      else {
        await f.submit(true)
        assert.equal(f.report.events.length, 0)
      }
      if (options.origin) assert.equal(f.metaRequests().length, 0)
    }
    await f.close()
  }
} finally {
  for (const { page, report } of debugPages) {
    if (!page.isClosed())
      report.sdk = await page.evaluate(() => ({
        queue: window.fbq?.queue,
        state: window.fbq?.getState?.(),
        locks: window.fbq?.instance?.locks,
        eventQueue: window.fbq?.instance?.eventQueue
      }))
  }
  await writeFile(resolve(root, 'reports/meta-pixel-check.json'), `${JSON.stringify(reports, null, 2)}\n`)
  await browser.close()
}
