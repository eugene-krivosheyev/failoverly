import { mkdtemp, writeFile } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { Resvg } from '@resvg/resvg-js'
import { SCENES, TIMING, getScenePhases, renderSceneSvg } from './hero-animation.mjs'

const output = resolve('images/hero-animation-v1.gif')
const frameDirectory = await mkdtemp('/private/tmp/failoverly-animation-')
const manifest = ['ffconcat version 1.0']
let frameIndex = 0

function visible(value) {
  return value ? 1 : 0
}

function interpolate(from, to, progress) {
  return from + (to - from) * progress
}

function phoneSlideProgress(progress) {
  if (progress === 0 || progress === 1) return progress
  // Match the live icon's cubic-bezier(0.22, 0.61, 0.36, 1) easing.
  const curve = (position, first, second) =>
    3 * (1 - position) ** 2 * position * first + 3 * (1 - position) * position ** 2 * second + position ** 3
  let low = 0
  let high = 1
  for (let iteration = 0; iteration < 20; iteration++) {
    const position = (low + high) / 2
    if (curve(position, 0.22, 0.36) < progress) low = position
    else high = position
  }
  return curve((low + high) / 2, 0.61, 1)
}

function transitionSvg(previous, next, progress, iconProgress) {
  const popupFrom = visible(previous.popup)
  const popupTo = visible(next.popup)
  const opacity = interpolate(popupFrom, popupTo, progress)
  const popupOffset = 8 * (1 - opacity)
  const ledOpacity = [...next.leds].map((state, index) =>
    interpolate(visible(previous.leds[index] === 'R'), visible(state === 'R'), progress)
  )
  // Red overlays fade out to reveal the untouched green lights in the bitmap.
  return renderSceneSvg(
    { ...next, leds: 'RRRRR', popup: next.popup || previous.popup },
    {
      ledOpacity,
      popupOpacity: opacity,
      popupTranslateY: popupOffset,
      transferOpacity: interpolate(visible(previous.transfer), visible(next.transfer), progress),
      phoneTransferProgress: interpolate(
        visible(previous.transfer),
        visible(next.transfer),
        phoneSlideProgress(iconProgress)
      )
    }
  )
}

async function addFrame(svg, duration) {
  const filename = `frame-${String(frameIndex++).padStart(3, '0')}.png`
  const path = join(frameDirectory, filename)
  const rendered = new Resvg(svg, {
    fitTo: { mode: 'width', value: 510 },
    font: { loadSystemFonts: true, defaultFontFamily: 'Arial' }
  }).render()
  await writeFile(path, rendered.asPng())
  manifest.push(`file '${filename}'`, `duration ${(duration / 1000).toFixed(3)}`)
  return filename
}

async function addPhaseFrames(previous, next, duration) {
  const transitionDuration = Math.min(
    duration,
    previous.transfer === next.transfer ? TIMING.transition : Math.max(TIMING.transition, TIMING.iconTransition)
  )
  for (let elapsed = 0; elapsed < transitionDuration; elapsed += 100) {
    await addFrame(
      transitionSvg(
        previous,
        next,
        Math.min(1, elapsed / TIMING.transition),
        Math.min(1, elapsed / TIMING.iconTransition)
      ),
      Math.min(100, transitionDuration - elapsed)
    )
  }
  // Holding the endpoint separately keeps each phase's duration and transfer delay intact.
  return addFrame(renderSceneSvg(next), Math.max(0, duration - transitionDuration))
}

await addFrame(renderSceneSvg(SCENES[0]), SCENES[0].duration)
for (let index = 1; index < SCENES.length; index++) {
  const previous = SCENES[index - 1]
  const scene = SCENES[index]
  let previousPhase = previous
  for (const phase of getScenePhases(previous, scene)) {
    await addPhaseFrames(previousPhase, phase, phase.duration)
    previousPhase = phase
  }
}
const lastFrame = await addPhaseFrames(SCENES.at(-1), SCENES[0], TIMING.transition)
// The concat demuxer needs a final repeated frame to honor its last duration.
manifest.push(`file '${lastFrame}'`)
const manifestPath = join(frameDirectory, 'frames.txt')
await writeFile(manifestPath, `${manifest.join('\n')}\n`)

const result = spawnSync(
  'ffmpeg',
  [
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    manifestPath,
    '-filter_complex',
    '[0:v]fps=10,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=sierra2_4a:diff_mode=rectangle',
    '-loop',
    '0',
    output
  ],
  { encoding: 'utf8' }
)
if (result.error || result.status !== 0) {
  throw result.error || new Error(result.stderr || 'GIF export failed.')
}
console.log(`Animated preview: ${output}`)
console.log(`Rendered frames: ${frameDirectory}`)
