// Kit owns validation, requests, attribution, and the confirmation message.
// This module adds the landing's visible labels and email keyboard/autofill hints.
export function initSignupForms() {
  document.querySelectorAll('[data-kit-signup]').forEach(container => {
    const placement = container.dataset.kitSignup
    const fallback = container.querySelector('[data-kit-fallback]')
    const url = new URL(fallback.href)

    // Preserve campaign attribution if a blocked embed sends someone to the hosted form.
    // Forward only campaign tags, never arbitrary query values or email addresses.
    const query = new URLSearchParams(window.location.search)
    for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) {
      if (query.has(key)) url.searchParams.set(key, query.get(key))
    }
    fallback.href = url.href

    const enhance = () => {
      const form = container.querySelector('.formkit-form')
      const input = form?.querySelector('input[name="email_address"]')
      if (!input) return false

      form.setAttribute('aria-label', 'Join the Failoverly waitlist')
      input.id = `${placement}-email`
      input.type = 'email'
      input.autocomplete = 'email'
      input.inputMode = 'email'
      input.spellcheck = false
      input.setAttribute('aria-describedby', `${placement}-privacy`)
      input.placeholder = 'you@example.com'
      // Kit adds status text inside this group after its API responds.
      form.querySelector('[data-style="clean"]')?.setAttribute('aria-live', 'polite')
      return true
    }

    // Async scripts may finish before or after this module. Observe each slot only
    // until its form arrives; no polling or custom submit handlers are needed.
    if (enhance()) return
    const observer = new MutationObserver(() => {
      if (enhance()) observer.disconnect()
    })
    observer.observe(container, { childList: true, subtree: true })
  })
}
