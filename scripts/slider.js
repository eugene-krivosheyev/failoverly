export function createSlideController(transitions, { onSettle } = {}) {
  const lastSlide = transitions.length
  let current = 0
  let animating = false

  function settle() {
    animating = false
    if (onSettle) onSettle(current)
  }

  function stepForward(onDone) {
    const tl = transitions[current]
    current += 1
    tl.eventCallback('onComplete', onDone)
    tl.play(0)
  }

  function stepBackward(onDone) {
    current -= 1
    const tl = transitions[current]
    tl.eventCallback('onReverseComplete', onDone)
    tl.reverse()
  }

  function next() {
    if (animating || current >= lastSlide) return
    animating = true
    stepForward(settle)
  }

  function prev() {
    if (animating || current <= 0) return
    animating = true
    stepBackward(settle)
  }

  function goTo(target) {
    target = Math.max(0, Math.min(lastSlide, target))
    if (animating || target === current) return
    animating = true

    function advance() {
      if (current === target) {
        settle()
        return
      }
      if (current < target) stepForward(advance)
      else stepBackward(advance)
    }

    advance()
  }

  function destroy() {
    transitions.forEach(tl => tl.kill())
  }

  return { next, prev, goTo, destroy }
}

export function bindWheelAndTouchNavigation(
  controller,
  { gestureGap = 120, dipThreshold = 10, riseThreshold = 20, peakFloor = 30, wheelThreshold = 2, touchThreshold = 80 } = {}
) {
  // Один жест = ровно один слайд. Реальный профиль событий тачпада (см. запись):
  // повторный свайп во время инерции НЕ создаёт паузы - касание мгновенно гасит
  // инерцию (дельта падает до <=10 за одно событие), и новый жест разгоняется с нуля
  // в том же непрерывном потоке. Поэтому границы жестов определяем не по паузам,
  // а по сигнатуре "провал до dipThreshold -> разгон выше riseThreshold".
  // peakFloor защищает от ложного взвода на пологом старте самого первого разгона,
  // а дрожание внутри жеста в записи не опускается ниже 17 - порог 10 его не ловит.
  // Паузы длиннее gestureGap в потоке тачпада не встречаются (макс. 50мс), так что
  // gap-сброс нужен только для раздельных жестов и щелчков колеса мыши.
  let stepTaken = false
  let armed = false
  let peak = 0
  let lastTime = 0

  function step(deltaY) {
    stepTaken = true
    armed = false
    peak = 0
    if (deltaY > 0) controller.next()
    else controller.prev()
  }

  function handleWheel(event) {
    event.preventDefault()

    const now = event.timeStamp || Date.now()
    const delta = Math.abs(event.deltaY)

    if (now - lastTime > gestureGap) {
      stepTaken = false
      armed = false
      peak = 0
    }
    lastTime = now

    if (!stepTaken) {
      if (delta >= wheelThreshold) step(event.deltaY)
      return
    }

    if (delta > peak) peak = delta

    if (delta <= dipThreshold && peak >= peakFloor) {
      armed = true
      return
    }
    if (armed && delta >= riseThreshold) step(event.deltaY)
  }

  let touchStartY = null

  function handleTouchStart(event) {
    touchStartY = event.touches[0].clientY
  }

  function handleTouchMove(event) {
    event.preventDefault()
  }

  function handleTouchEnd(event) {
    if (touchStartY === null) return
    const deltaY = touchStartY - event.changedTouches[0].clientY
    touchStartY = null
    if (Math.abs(deltaY) < touchThreshold) return
    if (deltaY > 0) controller.next()
    else controller.prev()
  }

  window.addEventListener('wheel', handleWheel, { passive: false })
  window.addEventListener('touchstart', handleTouchStart, { passive: true })
  window.addEventListener('touchmove', handleTouchMove, { passive: false })
  window.addEventListener('touchend', handleTouchEnd)

  return () => {
    window.removeEventListener('wheel', handleWheel)
    window.removeEventListener('touchstart', handleTouchStart)
    window.removeEventListener('touchmove', handleTouchMove)
    window.removeEventListener('touchend', handleTouchEnd)
  }
}
