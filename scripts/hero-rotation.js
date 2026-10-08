import { PLAYBACK_RATE } from './hero-animation-scenes.js'

const ROTATION_DELAY = Math.round(2500 / PLAYBACK_RATE)
const initializedRotators = new WeakSet()

export function initHeroRotation() {
  const rotator = document.querySelector('[data-hero-rotator]')
  if (!rotator || initializedRotators.has(rotator)) return

  const words = [...rotator.querySelectorAll('[data-hero-word]')]
  if (words.length < 2) return
  initializedRotators.add(rotator)

  // Keep this headline animated on touch devices, even with iOS Reduce Motion.
  const reducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce) and (hover: hover), (prefers-reduced-motion: reduce) and (pointer: fine)'
  )
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
  window.addEventListener('pageshow', scheduleRotation)
  function updateMotionPreference() {
    if (reducedMotion.matches) showWord(0)
    scheduleRotation()
  }
  if (reducedMotion.addEventListener) reducedMotion.addEventListener('change', updateMotionPreference)
  else reducedMotion.addListener(updateMotionPreference)

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
