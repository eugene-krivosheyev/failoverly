/**
 * Rebuild the production brand assets with `node tooling/brand-assets.mjs`.
 *
 * The approved inline logo in index.html is the source of truth:
 * preserve its paths, optical kerning, clipped slash, and tagline baseline.
 * All exported text is outlined from the local Inter Regular font, so these
 * files render without downloading fonts or relying on installed fonts.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { openSync } from 'fontkit'
import { Resvg } from '@resvg/resvg-js'

const root = new URL('../', import.meta.url)
const output = new URL('images/', root)
const source = await readFile(new URL('index.html', root), 'utf8')
const font = openSync(fileURLToPath(new URL('fonts/inter-latin-var.woff2', root)))
const inlineLogo = source.match(/<svg\b(?=[^>]*class="brand-logo")[^>]*>([\s\S]*?)<\/svg>/)?.[1]

if (!inlineLogo || font.subfamilyName !== 'Regular') {
  throw new Error('Expected the approved inline brand logo and Inter Regular.')
}

const tagline = 'Internet failover for Mac'
const title = `Failoverly — ${tagline}`
const taglineElement = /<text\b(?=[^>]*class="brand-tagline")[^>]*>\s*Internet failover for Mac\s*<\/text>/
const taglineSource = inlineLogo.match(taglineElement)?.[0]
if (!taglineSource) {
  throw new Error('The approved tagline changed; review its outline settings.')
}
// The editable inline logo owns positioning, including optical sidebearing offsets.
const taglinePosition = Object.fromEntries(
  ['x', 'y', 'textLength'].map(attribute => {
    const value = Number(taglineSource.match(new RegExp(`\\b${attribute}="([^"]+)"`))?.[1])
    if (!Number.isFinite(value)) throw new Error(`Missing tagline ${attribute}.`)
    return [attribute, value]
  })
)

const format = value => Number(value.toFixed(8))
const escapeXml = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;')

/** Outline text without stretching glyphs. textLength matches SVG spacing. */
function outlineText(text, { x, y, size, textLength, label = text }) {
  const run = font.layout(text)
  const scale = size / font.unitsPerEm
  const spacing =
    textLength === undefined || run.glyphs.length < 2
      ? 0
      : (textLength - run.advanceWidth * scale) / (run.glyphs.length - 1)
  let cursor = x
  const paths = run.glyphs
    .map((glyph, index) => {
      const position = run.positions[index]
      const path = glyph.path.toSVG()
      const transform = `translate(${format(cursor + position.xOffset * scale)} ${format(y - position.yOffset * scale)}) scale(${format(scale)} ${format(-scale)})`
      cursor += position.xAdvance * scale + spacing
      return path ? `    <path transform="${transform}" d="${path}"/>` : ''
    })
    .filter(Boolean)
  return `  <g aria-label="${escapeXml(label)}">\n${paths.join('\n')}\n  </g>`
}

const logoContents = inlineLogo
  .replace(taglineElement, outlineText(tagline, { ...taglinePosition, size: 15 }))
  .split('\n')
  .map(line => line.trim())
  .filter(Boolean)
  .map(line => `  ${line}`)
  .join('\n')

function svgDocument({ width, height, viewBox = `0 0 ${width} ${height}`, title: name, description, contents }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${viewBox}" fill="#000000" role="img" aria-labelledby="title description">\n  <title id="title">${escapeXml(name)}</title>\n  <desc id="description">${escapeXml(description)}</desc>\n${contents}\n</svg>\n`
}

const logo = svgDocument({
  width: 183.45,
  height: 62,
  viewBox: '100 4.84033 183.45 62',
  title,
  description:
    'Approved optically spaced wordmark with a slashed o. Tagline outlined in Inter Regular at its original y=62 baseline.',
  contents: logoContents
})

// Use the exact approved o and its clipping outline, independent of wordmark
// kerning. Its 24 px height leaves a 4 px safe area in a 32 px favicon.
const clipping = inlineLogo.match(/<defs>([\s\S]*?)<\/defs>/)?.[0]
const letterO = inlineLogo.match(/<g\b(?=[^>]*data-letter="o")[^>]*>([\s\S]*?)<\/g>/)?.[1]
if (!clipping || !letterO) throw new Error('The approved clipped slashed o is missing.')

function icon(size, rounded) {
  const scale = 24 / (38.2938 - 13.9221)
  return svgDocument({
    width: size,
    height: size,
    viewBox: '0 0 32 32',
    title: 'Failoverly',
    description: 'Black slashed lowercase o on white.',
    contents: `  <rect width="32" height="32"${rounded ? ' rx="6"' : ''} fill="#ffffff"/>\n  ${clipping}\n  <g transform="translate(16 16) scale(${format(scale)}) translate(-175.8265 -26.10795)">\n    ${letterO}\n  </g>`
  })
}

const favicon = icon(32, true)
const socialCard = svgDocument({
  width: 1200,
  height: 630,
  title: 'Failoverly — Your internet slows or drops. Your session stays.',
  description: 'Automatic internet failover for macOS.',
  contents: `  <rect width="1200" height="630" fill="#ffffff"/>\n  <g transform="translate(72 64) scale(1.4) translate(-100 -4.84033)">\n${logoContents}\n  </g>\n${outlineText('Your internet slows or drops.', { x: 72, y: 308, size: 72 })}\n${outlineText('Your session stays.', { x: 72, y: 394, size: 72 })}\n${outlineText('Automatic internet failover for macOS', { x: 72, y: 532, size: 28 })}`
})

async function saveSvg(name, svg) {
  svg = svg.replace(/[ \t]+$/gm, '')
  await writeFile(new URL(name, output), svg)
  console.info(`images/${name}: ${Buffer.byteLength(svg).toLocaleString('en-US')} bytes`)
}

async function savePng(name, svg, width, height) {
  const image = new Resvg(svg, { font: { loadSystemFonts: false } }).render()
  if (image.width !== width || image.height !== height) {
    throw new Error(`Unexpected dimensions for ${name}: ${image.width}×${image.height}`)
  }
  const png = image.asPng()
  await writeFile(new URL(name, output), png)
  console.info(`images/${name}: ${width}×${height}, ${png.length.toLocaleString('en-US')} bytes`)
}

await mkdir(output, { recursive: true })
await saveSvg('logo.svg', logo)
await saveSvg('favicon.svg', favicon)
await savePng('favicon-32.png', favicon, 32, 32)
await savePng('apple-touch-icon.png', icon(180, false), 180, 180)
await savePng('social-card.png', socialCard, 1200, 630)
