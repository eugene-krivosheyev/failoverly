import { createHash } from 'node:crypto'

// The approved embed and the runtime it loads. These are public form addresses,
// not API credentials; changes to the form's integrations need a CSP review.
export const KIT_FORM_UID = 'eba19436d6'
export const KIT_FORM_SCRIPT = `https://failoverly-app.kit.com/${KIT_FORM_UID}/index.js`
export const KIT_RUNTIME_SCRIPT = 'https://f.convertkit.com/ckjs/ck.5.js'
export const KIT_FORM_ACTION = 'https://app.kit.com/forms/9949657/subscriptions'
export const KIT_VISIT_URL = 'https://app.convertkit.com/forms/9949657/visit'

export const ANALYTICS_SCRIPT_PATH = '/_vercel/insights/script.js'

export function analyticsScriptSources(origin) {
  const url = new URL(origin)
  const domain = url.hostname.replace(/^www\./, '')
  return [domain, `www.${domain}`].map(hostname => {
    url.hostname = hostname
    return new URL(ANALYTICS_SCRIPT_PATH, url).href
  })
}

/** Hash the final inline blocks, after minification and metadata substitution. */
export function contentSecurityPolicy(html, { kitForm = false, analyticsOrigin } = {}) {
  const hashes = tag => {
    const blocks = [...html.matchAll(new RegExp(`<${tag}\\b([^>]*)>([\\s\\S]*?)<\\/${tag}>`, 'g'))].filter(
      ([, attributes]) => tag !== 'script' || !/\bsrc\s*=/.test(attributes)
    )
    // Documents with no inline blocks need no inline script/style permission.
    if (!blocks.length) return "'none'"
    return [
      ...new Set(blocks.map(([, , contents]) => `'sha256-${createHash('sha256').update(contents).digest('base64')}'`))
    ].join(' ')
  }

  const scripts = [hashes('script')]
  if (kitForm) scripts.push(KIT_FORM_SCRIPT, KIT_RUNTIME_SCRIPT)
  if (analyticsOrigin) scripts.push(...analyticsScriptSources(analyticsOrigin))

  return [
    "default-src 'none'",
    `script-src ${scripts.filter(source => source !== "'none'").join(' ') || "'none'"}`,
    "script-src-attr 'none'",
    // Kit injects provider-managed style elements and style attributes. Permit
    // inline CSS only on the landing page; scripts still require hashes or the
    // explicit provider URLs, and the privacy page retains hashed CSS.
    `style-src ${kitForm ? "'unsafe-inline'" : hashes('style')}`,
    `style-src-attr ${kitForm ? "'unsafe-inline'" : "'none'"}`,
    `img-src 'self'${kitForm ? ' data:' : ''}`,
    // Kit records a form visit and submits directly to its subscription URL.
    `connect-src 'self'${kitForm ? ` ${KIT_VISIT_URL} ${KIT_FORM_ACTION}` : ''}`,
    `form-action ${kitForm ? KIT_FORM_ACTION : "'none'"}`,
    // Provider responses can request an anti-abuse or recommendations dialog.
    `frame-src ${kitForm ? 'https://app.kit.com https://app.convertkit.com' : "'none'"}`,
    "base-uri 'none'",
    "object-src 'none'",
    "frame-ancestors 'none'"
  ].join('; ')
}
