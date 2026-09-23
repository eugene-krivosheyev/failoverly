// The forms and their accessible labels are already in HTML. Kit owns validation,
// requests, attribution, and confirmation; no custom signup API is needed.
export function initSignupForms() {
  const containers = document.querySelectorAll('[data-kit-signup]')

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
