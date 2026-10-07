const ROTATION_DELAY = 2500
const initializedRotators = new WeakSet()

export function initHeroRotation() {
  const rotator = document.querySelector('[data-hero-rotator]')
  if (!rotator || initializedRotators.has(rotator)) return

  const words = [...rotator.querySelectorAll('[data-hero-word]')]
  if (words.length < 2) return
  initializedRotators.add(rotator)

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  let activeIndex = 0
  let timer = null
  let visible = !('IntersectionObserver' in window)

  function showWord(index) {
    activeIndex = index
    words.forEach((word, wordIndex) => {
      word.dataset.active = String(wordIndex === activeIndex)
    })
  }

  function scheduleRotation() {
    window.clearTimeout(timer)
    timer = null
    if (!visible || document.hidden || reducedMotion.matches) return

    timer = window.setTimeout(() => {
      showWord((activeIndex + 1) % words.length)
      scheduleRotation()
    }, ROTATION_DELAY)
  }

  document.addEventListener('visibilitychange', scheduleRotation)
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) showWord(0)
    scheduleRotation()
  })

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      scheduleRotation()
    })
    observer.observe(rotator.closest('h1') || rotator)
  }

  showWord(0)
  scheduleRotation()
}
