import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { TIMING, SCENES, PHONE_ICONS, getPhoneIconPositions, getScenePhases } from '../scripts/hero-animation-scenes.js'

export { TIMING, SCENES, PHONE_ICONS, getPhoneIconPositions, getScenePhases }

const modulePath = fileURLToPath(import.meta.url)
const projectRoot = resolve(dirname(modulePath), '..')
const bitmapPath = resolve(projectRoot, 'images/hero-illustration-v1.png')
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
let bitmap

export const GEOMETRY = Object.freeze({
  leds: Object.freeze([145.2, 179.9, 213.8, 247.2, 280.9].map(x => Object.freeze({ x, y: 495.1, radius: 8 }))),
  popup: Object.freeze({ x: 155.5, y: 758, width: 420, height: 90, anchorX: 365.5, anchorY: 747, fontSize: 35 }),
  transfer: Object.freeze({
    x: PHONE_ICONS.x,
    y: getPhoneIconPositions(false).transferY,
    width: PHONE_ICONS.size,
    height: PHONE_ICONS.size
  })
})

export const LED_COLORS = Object.freeze({ G: '#01fb00', R: '#ed453b' })

function readBitmap() {
  if (bitmap) return bitmap
  const bytes = readFileSync(bitmapPath)
  if (bytes.length < 24 || !bytes.subarray(0, 8).equals(pngSignature) || bytes.toString('ascii', 12, 16) !== 'IHDR') {
    throw new Error(`Expected a PNG with an IHDR header at ${bitmapPath}`)
  }
  bitmap = {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
    dataUri: `data:image/png;base64,${bytes.toString('base64')}`
  }
  return bitmap
}

function escapeXml(value) {
  return String(value).replace(
    /[&<>"']/g,
    character =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&apos;'
      })[character]
  )
}

function normalizedScene(scene) {
  const result = typeof scene === 'number' ? SCENES[scene] : scene
  if (!result || !/^[GR]{5}$/.test(result.leds)) throw new Error('A scene must contain exactly five G/R LED states.')
  if (result.popup != null && !['Backup Connection', 'Primary Connection'].includes(result.popup)) {
    throw new Error('The connection popup must be Backup Connection or Primary Connection.')
  }
  return result
}

function boundedOpacity(value, fallback) {
  if (value === undefined) return fallback
  if (!Number.isFinite(value)) throw new Error('Opacity must be a finite number.')
  return Math.max(0, Math.min(1, value))
}

/** Render one scene; the base image is embedded without modifying its bytes. */
export function renderSceneSvg(scene = SCENES[0], options = {}) {
  const currentScene = normalizedScene(scene)
  const image = readBitmap()
  const popup = GEOMETRY.popup
  const imageHref = escapeXml(options.imageHref || image.dataUri)
  const popupOpacity = boundedOpacity(options.popupOpacity, currentScene.popup ? 1 : 0)
  const transferOpacity = boundedOpacity(options.transferOpacity, currentScene.transfer ? 1 : 0)
  const phoneTransferProgress = boundedOpacity(options.phoneTransferProgress, currentScene.transfer ? 1 : 0)
  const singleIcon = getPhoneIconPositions(false)
  const pairedIcons = getPhoneIconPositions(true)
  const hotspotY = singleIcon.hotspotY + (pairedIcons.hotspotY - singleIcon.hotspotY) * phoneTransferProgress
  const transferY = singleIcon.transferY + (pairedIcons.transferY - singleIcon.transferY) * phoneTransferProgress
  const popupTranslateY = options.popupTranslateY ?? (currentScene.popup ? 0 : 8)
  if (!Number.isFinite(popupTranslateY)) throw new Error('Popup translation must be a finite number.')
  const ledOpacity = options.ledOpacity
  if (ledOpacity !== undefined && (!Array.isArray(ledOpacity) || ledOpacity.length !== 5)) {
    throw new Error('ledOpacity must contain exactly five opacity values.')
  }
  const leds = GEOMETRY.leds
    .map((led, index) => {
      const state = currentScene.leds[index]
      // Transparent green overlays preserve every original green pixel.
      const opacity = boundedOpacity(ledOpacity?.[index], state === 'R' ? 1 : 0)
      return `    <circle id="led-${index + 1}" class="led" data-led="${index + 1}" cx="${led.x}" cy="${led.y}" r="${led.radius}" fill="${LED_COLORS[state]}" opacity="${opacity}"/>`
    })
    .join('\n')
  const pointer = `${popup.anchorX - 14},${popup.y + 1} ${popup.anchorX},${popup.anchorY} ${popup.anchorX + 14},${popup.y + 1}`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${image.width}" height="${image.height}" viewBox="0 0 ${image.width} ${image.height}" role="img" aria-labelledby="scene-title">
  <title id="scene-title">Failoverly: ${escapeXml(currentScene.label || 'Connection failover illustration')}</title>
  <defs>
    <filter id="popup-shadow" x="-20%" y="-50%" width="140%" height="210%" color-interpolation-filters="sRGB">
      <feDropShadow dx="0" dy="6" stdDeviation="9" flood-color="#172329" flood-opacity="0.16"/>
    </filter>
  </defs>
  <image id="approved-artwork" x="0" y="0" width="${image.width}" height="${image.height}" href="${imageHref}"/>
  <g id="iphone-charging" aria-hidden="true">
    <defs>
      <filter id="charging-icon-softness" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="0.15" />
      </filter>
      <linearGradient id="charging-plug-body" x1="918.5" y1="0" x2="966.5" y2="0" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#090b0c" />
        <stop offset="0.14" stop-color="#22282e" />
        <stop offset="0.3" stop-color="#181c20" />
        <stop offset="0.65" stop-color="#0e1011" />
        <stop offset="0.88" stop-color="#080a0b" />
        <stop offset="1" stop-color="#171b20" />
      </linearGradient>
      <linearGradient id="charging-plug-contact" x1="0" y1="1338" x2="0" y2="1344" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#000" stop-opacity="0.4" />
        <stop offset="1" stop-color="#000" stop-opacity="0" />
      </linearGradient>
      <clipPath id="charging-plug-clip">
        <rect x="918.5" y="1338" width="48" height="36" rx="1.5" />
      </clipPath>
    </defs>
    <g clip-path="url(#charging-plug-clip)">
      <rect x="918.5" y="1338" width="48" height="36" fill="url(#charging-plug-body)" />
      <rect x="922.75" y="1339.5" width="1.5" height="34.5" rx="0.75" fill="#5c6471" opacity="0.3" />
      <rect x="963" y="1339.5" width="1" height="34.5" rx="0.5" fill="#38404b" opacity="0.4" />
      <rect x="918.5" y="1338" width="48" height="6" fill="url(#charging-plug-contact)" />
    </g>
    <g filter="url(#charging-icon-softness)">
      <rect x="1074.5" y="655" width="16.5" height="8.5" rx="1" fill="#40c75c" />
      <path
        d="M 1085.5 652.5 L 1079.5 660.5 H 1083.1 L 1081.5 666.5 L 1087.5 658.5 H 1083.9 Z"
        fill="#f8faf9"
        stroke="#56636a"
        stroke-width="0.55"
        stroke-linejoin="round"
      />
    </g>
  </g>
  <g id="led-overlays" aria-hidden="true">
${leds}
  </g>
  <g id="connection-popup" opacity="${popupOpacity}" transform="translate(0 ${popupTranslateY})" aria-hidden="true">
    <g filter="url(#popup-shadow)">
      <rect x="${popup.x}" y="${popup.y}" width="${popup.width}" height="${popup.height}" rx="16" fill="#fff" stroke="#d9dfe2" stroke-width="1.5"/>
      <polygon points="${pointer}" fill="#fff" stroke="#d9dfe2" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M ${popup.anchorX - 13} ${popup.y + 1} H ${popup.anchorX + 13}" fill="none" stroke="#fff" stroke-width="3"/>
    </g>
    <text id="connection-label" x="${popup.x + popup.width / 2}" y="${popup.y + popup.height / 2}" fill="#172126" font-family="Arial, Helvetica, sans-serif" font-size="${popup.fontSize}" font-weight="500" text-anchor="middle" dominant-baseline="central">${escapeXml(currentScene.popup || 'Backup Connection')}</text>
  </g>
  <g id="phone-icons" aria-hidden="true">
    <defs>
      <linearGradient id="phone-screen-cover" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#f6f9fc" />
        <stop offset="0.46" stop-color="#f4fafc" />
        <stop offset="1" stop-color="#f3f9fb" />
      </linearGradient>
      <filter id="phone-screen-blend" x="-10%" y="-10%" width="120%" height="120%">
        <feGaussianBlur stdDeviation="3" />
      </filter>
      <clipPath id="phone-icon-shape">
        <rect width="${PHONE_ICONS.size}" height="${PHONE_ICONS.size}" rx="48" />
      </clipPath>
      <linearGradient id="phone-icon-green" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#22a548" />
        <stop offset="1" stop-color="#1f9d42" />
      </linearGradient>
    </defs>
    <!-- Cover the baked icon, then move an exact crop of the approved hotspot artwork. -->
    <rect x="828" y="820" width="228" height="231" fill="url(#phone-screen-cover)" filter="url(#phone-screen-blend)" />
    <g id="hotspot-icon" transform="translate(${PHONE_ICONS.x} ${hotspotY})">
      <g clip-path="url(#phone-icon-shape)">
        <image x="-842" y="-835" width="${image.width}" height="${image.height}" href="${imageHref}" />
      </g>
    </g>
    <g id="transfer-icon" opacity="${transferOpacity}" transform="translate(${PHONE_ICONS.x} ${transferY})">
      <rect width="${PHONE_ICONS.size}" height="${PHONE_ICONS.size}" rx="48" fill="url(#phone-icon-green)" />
      <g fill="none" stroke="#fff" stroke-width="${PHONE_ICONS.strokeWidth}" stroke-linecap="round" stroke-linejoin="round">
        <path d="M 70 146 V 54 M 47 77 L 70 54 L 93 77" />
        <path d="M 130 54 V 146 M 107 123 L 130 146 L 153 123" />
      </g>
    </g>
  </g>
</svg>`
}

function renderPreviewHtml() {
  const artwork = renderSceneSvg(SCENES[0])
  const sceneData = JSON.stringify(SCENES).replace(/</g, '\\u003c')
  const paletteData = JSON.stringify(LED_COLORS)
  const phoneIconData = JSON.stringify(PHONE_ICONS)
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Failoverly hero animation preview</title>
    <style>
      :root { color-scheme: light; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #253139; background: #f4f6f5; }
      * { box-sizing: border-box; }
      body { margin: 0; padding: 24px 16px 40px; }
      main { width: min(100%, 590px); margin: 0 auto; }
      h1 { margin: 0 0 6px; font-size: 20px; font-weight: 650; letter-spacing: -0.02em; }
      .intro { margin: 0 0 20px; color: #637078; font-size: 14px; }
      .artwork { width: min(100%, 510px); margin: 0 auto; line-height: 0; }
      .artwork svg { display: block; width: 100%; height: auto; }
      .led { transition: fill ${TIMING.transition}ms ease, opacity ${TIMING.transition}ms ease; }
      #connection-popup { transition: opacity ${TIMING.transition}ms ease, transform ${TIMING.transition}ms ease; }
      #hotspot-icon, #transfer-icon { transition: transform ${TIMING.iconTransition}ms cubic-bezier(0.22, 0.61, 0.36, 1), opacity ${TIMING.transition}ms ease; }
      .controls { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 8px; margin-top: 22px; }
      button { appearance: none; min-height: 44px; padding: 10px 16px; border: 1px solid #cdd5d6; border-radius: 9px; background: #fff; color: inherit; font: inherit; font-size: 14px; cursor: pointer; }
      button:hover { background: #e9efed; }
      button:focus-visible { outline: 3px solid #79b79c; outline-offset: 3px; }
      #play-toggle { min-width: 86px; background: #243f34; border-color: #243f34; color: #fff; }
      #play-toggle:hover { background: #315645; }
      .scene-status { min-height: 40px; margin: 14px 0 0; text-align: center; font-size: 14px; line-height: 1.5; }
      .hint { margin: 6px 0 0; text-align: center; font-size: 12px; color: #637078; }
      @media (prefers-reduced-motion: reduce) {
        .led, #connection-popup, #hotspot-icon, #transfer-icon { transition: none; }
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Hero animation preview</h1>
      <p class="intro">Connection loss, automatic backup, and return to primary.</p>
      <div class="artwork">
${artwork}
      </div>
      <div class="controls" aria-label="Animation controls">
        <button id="previous-scene" type="button">Previous scene</button>
        <button id="play-toggle" type="button" aria-pressed="false">Play</button>
        <button id="next-scene" type="button">Next scene</button>
      </div>
      <p class="scene-status"><output id="scene-status" aria-live="polite">Scene 0 / 10 · Primary connection healthy</output></p>
      <p class="hint">Stepping pauses playback. Playback pauses while this tab is hidden.</p>
    </main>
    <script>
      const scenes = ${sceneData}
      const colors = ${paletteData}
      const PHONE_ICONS = ${phoneIconData}
      const getPhoneIconPositions = ${getPhoneIconPositions.toString()}
      const getScenePhases = ${getScenePhases.toString()}
      const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
      const playToggle = document.querySelector('#play-toggle')
      const popup = document.querySelector('#connection-popup')
      const popupLabel = document.querySelector('#connection-label')
      const hotspotIcon = document.querySelector('#hotspot-icon')
      const transferIcon = document.querySelector('#transfer-icon')
      const leds = [...document.querySelectorAll('[data-led]')]
      const sceneStatus = document.querySelector('#scene-status')
      const sceneTitle = document.querySelector('#scene-title')
      let sceneIndex = 0
      let phases = [scenes[0]]
      let phaseIndex = 0
      let playing = !reducedMotion.matches
      let timer = null
      let remaining = scenes[0].duration
      let deadline = 0

      function updateControls() {
        playToggle.textContent = playing ? 'Pause' : 'Play'
        playToggle.setAttribute('aria-pressed', String(playing))
      }

      function showPhase() {
        const scene = phases[phaseIndex]
        leds.forEach((led, index) => {
          led.setAttribute('fill', colors[scene.leds[index]])
          led.setAttribute('opacity', scene.leds[index] === 'R' ? '1' : '0')
        })
        if (scene.popup) popupLabel.textContent = scene.popup
        popup.setAttribute('opacity', scene.popup ? '1' : '0')
        popup.setAttribute('transform', scene.popup ? 'translate(0 0)' : 'translate(0 8)')
        const positions = getPhoneIconPositions(scene.transfer)
        hotspotIcon.setAttribute('transform', 'translate(' + PHONE_ICONS.x + ' ' + positions.hotspotY + ')')
        transferIcon.setAttribute('transform', 'translate(' + PHONE_ICONS.x + ' ' + positions.transferY + ')')
        transferIcon.setAttribute('opacity', scene.transfer ? '1' : '0')
        sceneTitle.textContent = 'Failoverly: ' + scene.label
        sceneStatus.textContent = 'Scene ' + sceneIndex + ' / ' + (scenes.length - 1) + ' · ' + scene.label
        remaining = scene.duration
      }

      function showScene(index, animate = true) {
        sceneIndex = (index + scenes.length) % scenes.length
        const previous = scenes[(sceneIndex + scenes.length - 1) % scenes.length]
        phases = animate ? getScenePhases(previous, scenes[sceneIndex]) : [scenes[sceneIndex]]
        phaseIndex = 0
        showPhase()
      }

      function stopClock() {
        if (timer !== null) {
          clearTimeout(timer)
          timer = null
          remaining = Math.max(0, deadline - performance.now())
        }
      }

      function startClock() {
        if (!playing || document.hidden || timer !== null) return
        deadline = performance.now() + remaining
        timer = setTimeout(() => {
          timer = null
          if (phaseIndex + 1 < phases.length) {
            phaseIndex++
            showPhase()
          } else showScene(sceneIndex + 1)
          startClock()
        }, remaining)
      }

      function step(direction) {
        stopClock()
        playing = false
        showScene(sceneIndex + direction, false)
        updateControls()
      }

      playToggle.addEventListener('click', () => {
        if (playing) stopClock()
        playing = !playing
        updateControls()
        startClock()
      })
      document.querySelector('#previous-scene').addEventListener('click', () => step(-1))
      document.querySelector('#next-scene').addEventListener('click', () => step(1))
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) stopClock()
        else startClock()
      })
      reducedMotion.addEventListener('change', (event) => {
        if (!event.matches) return
        stopClock()
        playing = false
        updateControls()
      })

      showScene(0)
      updateControls()
      startClock()
    </script>
  </body>
</html>
`
}

export function writePreview() {
  const previewDirectory = resolve(projectRoot, 'previews')
  mkdirSync(previewDirectory, { recursive: true })
  const htmlPath = resolve(previewDirectory, 'hero-animation.html')
  const svgPath = resolve(previewDirectory, 'hero-animation.svg')
  writeFileSync(htmlPath, renderPreviewHtml())
  writeFileSync(svgPath, renderSceneSvg(SCENES[0]))
  return { htmlPath, svgPath, width: readBitmap().width, height: readBitmap().height }
}

if (process.argv[1] && resolve(process.argv[1]) === modulePath) {
  const preview = writePreview()
  console.log(`Animation preview: ${preview.htmlPath}`)
  console.log(`Baseline SVG: ${preview.svgPath} (${preview.width} × ${preview.height})`)
}
