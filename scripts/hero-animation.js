import { getPhoneIconPositions, getScenePhases, PHONE_ICONS, SCENES } from './hero-animation-scenes.js'

const initializedAnimations = new WeakSet()

export function initHeroAnimation() {
  document.querySelectorAll('[data-hero-animation]').forEach(root => {
    if (initializedAnimations.has(root)) return

    const leds = [...root.querySelectorAll('[data-led]')]
    const popup = root.querySelector('#connection-popup')
    const popupLabel = root.querySelector('#connection-label')
    const hotspotIcon = root.querySelector('#hotspot-icon')
    const transferIcon = root.querySelector('#transfer-icon')
    if (leds.length !== 5 || !popup || !popupLabel || !hotspotIcon || !transferIcon) return
    initializedAnimations.add(root)

    // Keep the connection demo animated on touch devices, even with iOS Reduce Motion.
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce) and (hover: hover), (prefers-reduced-motion: reduce) and (pointer: fine)'
    )
    let visible = !('IntersectionObserver' in window)
    let sceneIndex = 0
    let phases = [SCENES[0]]
    let phaseIndex = 0
    let timer = null
    let remaining = SCENES[0].duration
    let deadline = 0

    function showPhase() {
      const phase = phases[phaseIndex]
      leds.forEach((led, index) => {
        // The approved bitmap supplies the green LEDs; only red overlays fade.
        led.setAttribute('fill', '#ed453b')
        led.setAttribute('opacity', phase.leds[index] === 'R' ? '1' : '0')
      })
      if (phase.popup) popupLabel.textContent = phase.popup
      popup.setAttribute('opacity', phase.popup ? '1' : '0')
      popup.setAttribute('transform', phase.popup ? 'translate(0 0)' : 'translate(0 8)')
      const positions = getPhoneIconPositions(phase.transfer)
      hotspotIcon.setAttribute('transform', `translate(${PHONE_ICONS.x} ${positions.hotspotY})`)
      transferIcon.setAttribute('transform', `translate(${PHONE_ICONS.x} ${positions.transferY})`)
      transferIcon.setAttribute('opacity', phase.transfer ? '1' : '0')
      remaining = phase.duration
    }

    function pauseClock() {
      if (timer === null) return
      window.clearTimeout(timer)
      timer = null
      remaining = Math.max(0, deadline - performance.now())
    }

    function schedulePhase() {
      if (!visible || document.hidden || reducedMotion.matches) {
        pauseClock()
        return
      }
      if (timer !== null) return

      deadline = performance.now() + remaining
      timer = window.setTimeout(() => {
        timer = null
        if (phaseIndex + 1 < phases.length) {
          phaseIndex += 1
        } else {
          const previous = SCENES[sceneIndex]
          sceneIndex = (sceneIndex + 1) % SCENES.length
          phases = getScenePhases(previous, SCENES[sceneIndex])
          phaseIndex = 0
        }
        showPhase()
        schedulePhase()
      }, remaining)
    }

    document.addEventListener('visibilitychange', schedulePhase)
    window.addEventListener('pageshow', schedulePhase)
    function updateMotionPreference() {
      if (reducedMotion.matches) {
        pauseClock()
        sceneIndex = 0
        phases = [SCENES[0]]
        phaseIndex = 0
        showPhase()
      }
      schedulePhase()
    }
    if (reducedMotion.addEventListener) reducedMotion.addEventListener('change', updateMotionPreference)
    else reducedMotion.addListener(updateMotionPreference)

    if ('IntersectionObserver' in window) {
      const observer = new window.IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting
        schedulePhase()
      })
      observer.observe(root)
    }

    showPhase()
    schedulePhase()
  })
}
