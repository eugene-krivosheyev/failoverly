export const PLAYBACK_RATE = 1.5
export const TIMING = Object.freeze({
  transition: Math.round(200 / PLAYBACK_RATE),
  iconTransition: Math.round(420 / PLAYBACK_RATE),
  transferDelay: Math.round(1200 / PLAYBACK_RATE)
})

export const PHONE_ICONS = Object.freeze({ x: 842, size: 200, gap: 32, centerY: 982, strokeWidth: 11 })

/** Center one tile or the complete two-tile stack in the iPhone screen. */
export function getPhoneIconPositions(transfer) {
  const singleY = PHONE_ICONS.centerY - PHONE_ICONS.size / 2
  const pairY = PHONE_ICONS.centerY - PHONE_ICONS.size - PHONE_ICONS.gap / 2
  return {
    hotspotY: transfer ? pairY : singleY,
    transferY: pairY + PHONE_ICONS.size + PHONE_ICONS.gap + (transfer ? 0 : 24)
  }
}

export const SCENES = Object.freeze(
  [
    { id: 0, label: 'Primary connection healthy', leds: 'GGGGG', popup: null, transfer: false, duration: 2000 },
    { id: 1, label: 'One red LED', leds: 'GGGGR', popup: null, transfer: false, duration: 1000 },
    { id: 2, label: 'Two red LEDs', leds: 'GGGRR', popup: null, transfer: false, duration: 1000 },
    {
      id: 3,
      label: 'Backup Connection',
      leds: 'GGRRR',
      popup: 'Backup Connection',
      transfer: true,
      transferDelay: TIMING.transferDelay,
      duration: 2500
    },
    {
      id: 4,
      label: 'Four red LEDs · backup active',
      leds: 'GRRRR',
      popup: 'Backup Connection',
      transfer: true,
      duration: 1000
    },
    { id: 5, label: 'All LEDs red', leds: 'RRRRR', popup: null, transfer: true, duration: 1500 },
    { id: 6, label: 'Primary connection recovering', leds: 'GRRRR', popup: null, transfer: true, duration: 1000 },
    {
      id: 7,
      label: 'Primary Connection',
      leds: 'GGRRR',
      popup: 'Primary Connection',
      transfer: false,
      transferDelay: TIMING.transferDelay,
      duration: 2500
    },
    { id: 8, label: 'Three green LEDs', leds: 'GGGRR', popup: 'Primary Connection', transfer: false, duration: 1000 },
    { id: 9, label: 'Four green LEDs', leds: 'GGGGR', popup: 'Primary Connection', transfer: false, duration: 1000 },
    { id: 10, label: 'All LEDs green', leds: 'GGGGG', popup: 'Primary Connection', transfer: false, duration: 2000 }
  ].map(scene => Object.freeze({ ...scene, duration: Math.round(scene.duration / PLAYBACK_RATE) }))
)

/** Keep the phone's previous state visible until the connection popup has settled. */
export function getScenePhases(previous, scene) {
  if (!scene.transferDelay || previous.transfer === scene.transfer) return [scene]
  return [
    { ...scene, transfer: previous.transfer, duration: scene.transferDelay },
    { ...scene, duration: scene.duration - scene.transferDelay }
  ]
}
