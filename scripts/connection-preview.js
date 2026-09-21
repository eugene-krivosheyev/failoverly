const ROTATION_DELAY = 5000

export function initConnectionPreview() {
  const preview = document.querySelector('.preview')
  if (!preview) return

  const refresh = preview.querySelector('.preview-refresh')
  const caption = preview.querySelector('#preview-caption')
  const wifiState = preview.querySelector('#wifi-state')
  const phoneState = preview.querySelector('#phone-state')
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  let timer = null
  let stopped = false
  let hovered = false
  let visible = !('IntersectionObserver' in window)

  function updateControl() {
    const action = preview.dataset.backup === 'true' ? 'Show primary internet connection' : 'Show iPhone hotspot'
    const description =
      stopped || reducedMotion.matches
        ? `${action}. Automatic changes are stopped.`
        : `${action} and stop automatic changes. Focusing this control also stops them.`
    refresh.setAttribute('aria-label', description)
    refresh.title = description
    caption.setAttribute('aria-live', stopped || reducedMotion.matches ? 'polite' : 'off')
  }

  function showConnection(backup) {
    preview.dataset.backup = String(backup)
    wifiState.textContent = backup ? 'Outage or slowdown' : 'Active'
    phoneState.textContent = backup ? 'Active' : 'Ready'
    caption.textContent = backup ? 'Same session, now on your iPhone hotspot.' : 'Your iPhone hotspot is ready.'
    updateControl()
  }

  function scheduleRotation() {
    window.clearTimeout(timer)
    timer = null
    if (stopped || hovered || !visible || document.hidden || reducedMotion.matches) return
    timer = window.setTimeout(() => {
      showConnection(preview.dataset.backup !== 'true')
      scheduleRotation()
    }, ROTATION_DELAY)
  }

  function stopRotation() {
    stopped = true
    scheduleRotation()
    updateControl()
  }

  refresh.addEventListener('click', () => {
    stopRotation()
    showConnection(preview.dataset.backup !== 'true')
  })
  preview.addEventListener('focusin', stopRotation)
  preview.addEventListener('pointerenter', event => {
    if (event.pointerType === 'touch') return
    hovered = true
    scheduleRotation()
  })
  preview.addEventListener('pointerleave', () => {
    hovered = false
    scheduleRotation()
  })
  document.addEventListener('visibilitychange', scheduleRotation)
  reducedMotion.addEventListener('change', () => {
    updateControl()
    scheduleRotation()
  })

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      scheduleRotation()
    })
    observer.observe(preview)
  }

  caption.setAttribute('aria-atomic', 'true')
  showConnection(preview.dataset.backup === 'true')
  refresh.disabled = false
  scheduleRotation()
}
