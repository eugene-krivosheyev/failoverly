// ВРЕМЕННО: снимает профиль событий колеса для отладки скролла. Удалить после.
const events = []
let flushTimer = null
addEventListener(
  'wheel',
  e => {
    events.push({ d: Math.round(e.deltaY * 100) / 100, t: Math.round(performance.now()) })
    clearTimeout(flushTimer)
    flushTimer = setTimeout(() => {
      if (!events.length) return
      const batch = events.splice(0)
      fetch('http://localhost:8099', { method: 'POST', body: JSON.stringify(batch) }).catch(() => {})
      console.log('[wheel-trace] отправлено событий:', batch.length)
    }, 1500)
  },
  { passive: true, capture: true }
)
