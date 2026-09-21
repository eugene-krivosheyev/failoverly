import { resolve, sep } from 'node:path'
import { gzipSync } from 'node:zlib'

const root = resolve(import.meta.dir, '../dist')
const configPath = resolve(import.meta.dir, '../.vercel/output/config.json')

async function responseHeaders(pathname) {
  // Read the matching build's headers, including its CSP hashes. Rebuilding while
  // preview is running must not leave the next page load with the previous CSP.
  const config = await Bun.file(configPath).json()
  const headers = new Headers()
  for (const route of config.routes) {
    if (route.continue && route.headers && new RegExp(route.src).test(pathname)) {
      for (const [name, value] of Object.entries(route.headers)) headers.set(name, value)
    }
  }
  return headers
}

/** Serve the actual build with the same cache/security rules used by Vercel. */
export function startPreview(port = 4173) {
  return Bun.serve({
    hostname: '127.0.0.1',
    port,
    async fetch(request) {
      const url = new URL(request.url)
      const headers = await responseHeaders(url.pathname)
      if (!['GET', 'HEAD'].includes(request.method)) {
        headers.set('Allow', 'GET, HEAD')
        return new Response('Method not allowed', { status: 405, headers })
      }
      let pathname
      try {
        pathname = decodeURIComponent(url.pathname)
      } catch {
        return new Response('Bad request', { status: 400, headers })
      }
      const redirect = /^\/index(?:\.html)?\/?$/.test(pathname)
        ? '/'
        : pathname !== '/' && pathname.endsWith('/')
          ? pathname.slice(0, -1)
          : null
      if (redirect) {
        headers.set('Location', redirect)
        return new Response(null, { status: 308, headers })
      }
      const path = resolve(root, pathname === '/' ? 'index.html' : `.${pathname}`)
      if (!path.startsWith(`${root}${sep}`)) return new Response('Not found', { status: 404, headers })
      const file = Bun.file(path)
      if (!(await file.exists())) return new Response('Not found', { status: 404, headers })
      headers.set('Content-Type', file.type)
      headers.set('Vary', 'Accept-Encoding')
      let body = new Uint8Array(await file.arrayBuffer())
      if (
        body.byteLength > 1024 &&
        /text|javascript|json|svg|xml/.test(file.type) &&
        /\bgzip\b/.test(request.headers.get('Accept-Encoding') || '')
      ) {
        body = gzipSync(body)
        headers.set('Content-Encoding', 'gzip')
      }
      headers.set('Content-Length', String(body.byteLength))
      return new Response(request.method === 'HEAD' ? null : body, { headers })
    }
  })
}

if (import.meta.main) {
  const server = startPreview(Number(process.env.PORT) || 4173)
  console.log(`Production preview: ${server.url}`)
}
