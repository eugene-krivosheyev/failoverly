// Local previews and Vercel preview deployments must not enter ad reports.
export function isPublishedSite() {
  const canonical = new URL(document.querySelector('link[rel="canonical"]').href)
  const domain = canonical.hostname.replace(/^www\./, '')
  return (
    [domain, `www.${domain}`].includes(window.location.hostname) &&
    window.location.protocol === 'https:' &&
    process.env.VERCEL_ENV !== 'preview' &&
    process.env.VERCEL_ENV !== 'development'
  )
}
