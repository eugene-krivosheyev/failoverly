import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { throttling } from 'lighthouse/core/config/constants.js'
import { startPreview } from './preview.mjs'

const slow3G = process.argv.includes('--3g')
const slow4G = process.argv.includes('--4g')
if (slow3G && slow4G) throw new Error('Choose one network profile: --3g or --4g.')
const profile = slow3G ? 'slow-3g' : slow4G ? 'slow-4g' : 'default'
const suffix = profile === 'default' ? '' : `-${profile}`

// Audit the production build, not the development server or the wireframe.
const build = Bun.spawn(['bun', 'run', 'build'], { stdout: 'inherit', stderr: 'inherit' })
if (await build.exited) process.exit(1)
await mkdir('reports', { recursive: true })
const server = startPreview(0)
const summary = []
try {
  for (const device of ['mobile', 'desktop']) {
    const output = resolve('reports', `lighthouse-${device}${suffix}`)
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
    if (slow4G) {
      // Lighthouse's own slow4G constants include the adjustment factors needed
      // for real DevTools throttling. Use the same network on both devices;
      // the desktop preset otherwise uses a much faster broadband connection.
      const network = throttling.mobileSlow4G
      args.push(
        '--throttling-method=devtools',
        `--throttling.rttMs=${network.rttMs}`,
        `--throttling.throughputKbps=${network.throughputKbps}`,
        `--throttling.requestLatencyMs=${network.requestLatencyMs}`,
        `--throttling.downloadThroughputKbps=${network.downloadThroughputKbps}`,
        `--throttling.uploadThroughputKbps=${network.uploadThroughputKbps}`,
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
  await writeFile(`reports/summary${suffix}.json`, `${JSON.stringify(summary, null, 2)}\n`)
  // Keep the actual measurements. The default profile gates every category at
  // 100; real 4G permits Performance 99, with other categories still at 100.
  // Slow 3G remains a diagnostic stress profile without a score gate.
  const belowThreshold = summary.some(({ scores }) =>
    Object.entries(scores).some(([category, score]) => score < (slow4G && category === 'performance' ? 99 : 100))
  )
  if (!slow3G && belowThreshold) {
    console.error(
      slow4G
        ? '4G requires Performance ≥99 and other categories 100. Open the reports in reports/ to inspect failures.'
        : 'A category is below 100. Open the reports in reports/ to inspect it.'
    )
    process.exitCode = 1
  }
} finally {
  server.stop(true)
}
