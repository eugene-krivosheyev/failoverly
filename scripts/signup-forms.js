// The forms and their accessible labels are already in HTML. Kit owns validation,
// requests, attribution, and confirmation; no custom signup API is needed.
export function initSignupForms() {
  const containers = document.querySelectorAll('[data-kit-signup]')
  const query = new URLSearchParams(window.location.search)

  containers.forEach(container => {
    const fallback = container.querySelector('[data-kit-fallback]')
    const url = new URL(fallback.href)

    // Preserve campaign attribution if someone uses the hosted form instead.
    // Forward only campaign tags, never arbitrary query values or email addresses.
    for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) {
      if (query.has(key)) url.searchParams.set(key, query.get(key))
    }
    fallback.href = url.href
  })

  const updateReady = () => {
    // Kit registers each HTML form here after attaching its submit handler.
    // A rendered input alone does not mean the external runtime has loaded.
    containers.forEach(container => {
      const form = container.querySelector('.formkit-form')
      const initialized = window.__sv_forms?.some(entry => entry.element === form && entry.initialized)
      container.dataset.kitReady = String(Boolean(initialized))
    })
  }

  updateReady()
  document.getElementById('kit-runtime')?.addEventListener('load', updateReady, { once: true })
  // Covers either execution order of the deferred Kit script and our module.
  document.addEventListener('DOMContentLoaded', updateReady, { once: true })

  // Kit gives success messages the form UID as a page-wide ID. Both placements
  // share that UID, so mirror its confirmation instead of leaving a second form
  // that cannot show its own success message. Kit still owns the submission.
  document.addEventListener('ckjs:submission:complete', event => {
    const source = event.target
    if (![...containers].some(container => container.contains(source))) return
    // Kit inserts the success message immediately after dispatching this event.
    queueMicrotask(() => {
      const confirmation = source.querySelector('[data-element="success"]')
      if (!confirmation) return
      containers.forEach(container => {
        const form = container.querySelector('.formkit-form')
        if (form === source || form.dataset.uid !== source.dataset.uid) return
        const message = confirmation.cloneNode(true)
        message.removeAttribute('id')
        form.querySelector('[data-element="fields"]')?.replaceWith(message)
      })
    })
  })
}
