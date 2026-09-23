import { inject } from '@vercel/analytics'
import { isPublishedSite } from './deployment.js'

// Track the published site only, including Vercel's www domain redirect.
// The build replaces VERCEL_ENV; a local prebuilt release still uses this host guard.
if (isPublishedSite()) {
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
