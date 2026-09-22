import { createHash } from 'node:crypto'

/** Hash the final inline blocks, after minification and metadata substitution. */
export function contentSecurityPolicy(html) {
  const hashes = tag => {
    const blocks = [...html.matchAll(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'g'))]
    // A document such as the privacy page intentionally has no JavaScript.
    if (!blocks.length) return "'none'"
    return [
      ...new Set(blocks.map(([, contents]) => `'sha256-${createHash('sha256').update(contents).digest('base64')}'`))
    ].join(' ')
  }

  return [
    "default-src 'none'",
    `script-src ${hashes('script')}`,
    "script-src-attr 'none'",
    `style-src ${hashes('style')}`,
    "style-src-attr 'none'",
    "img-src 'self'",
    // Same-origin requests also let Chrome's audit read robots.txt. External
    // connections remain blocked. TODO (live forms): if an API uses another
    // origin, explicitly allow that origin here. Native forms are not used.
    "connect-src 'self'",
    "form-action 'none'",
    "base-uri 'none'",
    "object-src 'none'",
    "frame-ancestors 'none'"
  ].join('; ')
}
