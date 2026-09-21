import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { startPreview } from './preview.mjs'

const slow3G = process.argv.includes('--3g')
const profile = slow3G ? 'slow-3g' : 'default'

// Audit the production build, not the development server or the wireframe.
const build = Bun.spawn(['bun', 'run', 'build'], { stdout: 'inherit', stderr: 'inherit' })
if (await build.exited) process.exit(1)
await mkdir('reports', { recursive: true })
const server = startPreview(0)
const summary = []
try {
  for (const device of ['mobile', 'desktop']) {
    const output = resolve('reports', `lighthouse-${device}${slow3G ? '-slow-3g' : ''}`)
    const args = [
      'node',
      resolve('node_modules/lighthouse/cli/index.js'),
      server.url.href,
      '--only-categories=performance,accessibility,best-practices,seo',
      '--output=json',
      '--output=html',
      `--output-path=${output}`,
      '--chrome-flags=--headless --disable-gpu --disable-dev-shm-usage',
      '--quiet'
    ]
    if (device === 'desktop') args.push('--preset=desktop')
    if (slow3G) {
      // Use real DevTools throttling, including its two-second HTTP latency.
      // CPU matches the normal Lighthouse mobile/desktop profiles.
      args.push(
        '--throttling-method=devtools',
        '--throttling.requestLatencyMs=2000',
        '--throttling.downloadThroughputKbps=400',
        '--throttling.uploadThroughputKbps=400',
        `--throttling.cpuSlowdownMultiplier=${device === 'mobile' ? 4 : 1}`
      )
    }
    const audit = Bun.spawn(args, { stdout: 'inherit', stderr: 'inherit' })
    if (await audit.exited) throw new Error(`Lighthouse failed for ${device}.`)
    const report = JSON.parse(await readFile(`${output}.report.json`, 'utf8'))
    const scores = Object.fromEntries(
      Object.entries(report.categories).map(([name, category]) => [name, Math.round(category.score * 100)])
    )
    const entry = {
      device,
      profile,
      lighthouseVersion: report.lighthouseVersion,
      browser: report.environment.hostUserAgent,
      testedAt: report.fetchTime,
      scores,
      throttlingMethod: report.configSettings.throttlingMethod,
      throttling: report.configSettings.throttling,
      metrics: Object.fromEntries(
        [
          'first-contentful-paint',
          'largest-contentful-paint',
          'speed-index',
          'total-blocking-time',
          'cumulative-layout-shift'
        ].map(name => [name, report.audits[name].numericValue])
      )
    }
    summary.push(entry)
    console.log(device, scores)
  }
  await writeFile(`reports/summary${slow3G ? '-slow-3g' : ''}.json`, `${JSON.stringify(summary, null, 2)}\n`)
  // The stress profile measures cold high-latency loads; the normal profile
  // remains the all-100 regression gate. Both retain the actual observed scores.
  if (!slow3G && summary.some(({ scores }) => Object.values(scores).some(score => score < 100))) {
    console.error('A category is below 100. Open the reports in reports/ to inspect it.')
    process.exitCode = 1
  }
} finally {
  server.stop(true)
}
