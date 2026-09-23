import { inject } from '@vercel/analytics'

// Track the published site only, including Vercel's www domain redirect.
// The build replaces VERCEL_ENV; a local prebuilt release still uses this host guard.
const canonical = new URL(document.querySelector('link[rel="canonical"]').href)
const domain = canonical.hostname.replace(/^www\./, '')
const isPublishedHost = [domain, `www.${domain}`].includes(window.location.hostname)

if (
  isPublishedHost &&
  window.location.protocol === 'https:' &&
  process.env.VERCEL_ENV !== 'preview' &&
  process.env.VERCEL_ENV !== 'development'
) {
  inject({
    mode: 'production',
    beforeSend(event) {
      // General traffic statistics need only the page path. Keep email, tokens
      // and campaign parameters out of analytics URLs without changing Kit's URL.
      const url = new URL(event.url)
      url.search = ''
      url.hash = ''
      return { ...event, url: url.href }
    }
  })
}
