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

function transitionSvg(previous, next, progress) {
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
      transferOpacity: interpolate(visible(previous.transfer), visible(next.transfer), progress)
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

await addFrame(renderSceneSvg(SCENES[0]), SCENES[0].duration)
for (let index = 1; index < SCENES.length; index++) {
  const previous = SCENES[index - 1]
  const scene = SCENES[index]
  let previousPhase = previous
  for (const phase of getScenePhases(previous, scene)) {
    await addFrame(transitionSvg(previousPhase, phase, 0.5), TIMING.transition / 2)
    await addFrame(transitionSvg(previousPhase, phase, 1), phase.duration - TIMING.transition / 2)
    previousPhase = phase
  }
}
await addFrame(transitionSvg(SCENES.at(-1), SCENES[0], 0.5), TIMING.transition / 2)
const lastFrame = await addFrame(renderSceneSvg(SCENES[0]), TIMING.transition / 2)
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
