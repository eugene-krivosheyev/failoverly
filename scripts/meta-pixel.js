import config from '../site.config.json'
import { isPublishedSite } from './deployment.js'

const pixelId = config.metaPixelId
const consentKey = 'failoverly.adConsent.v1'
const consentLifetime = 180 * 24 * 60 * 60 * 1000
const scriptUrl = 'https://connect.facebook.net/en_US/fbevents.js'
let choice = readChoice()
let banner
let settingsTrigger
let loading = false
let initialized = false
let pageViewSent = false
let pendingLead = false
let leadSent = false

function readChoice() {
  try {
    const saved = JSON.parse(localStorage.getItem(consentKey))
    if (['granted', 'denied'].includes(saved?.value) && saved.expiresAt > Date.now()) return saved
  } catch {
    // Storage may be unavailable. The choice still works for the current page.
  }
  return null
}

function hasConsent() {
  return navigator.globalPrivacyControl !== true && choice?.value === 'granted' && choice.expiresAt > Date.now()
}

function clearPixelCookies() {
  // We can remove our readable first-party cookies, not Meta's third-party ones.
  const host = window.location.hostname
  const parts = host.split('.')
  const domains = ['', ...parts.slice(0, -1).map((_, index) => parts.slice(index).join('.'))]
  for (const name of ['_fbp', '_fbc']) {
    for (const domain of domains) {
      document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax${domain ? `; Domain=${domain}` : ''}${window.location.protocol === 'https:' ? '; Secure' : ''}`
    }
  }
}

function stopTracking() {
  pendingLead = false
  window.fbq?.('consent', 'revoke')
  // The SDK can hold events behind configuration/async-data locks. Revoking
  // consent alone preserves those queues and can replay them on a later grant.
  // Remove only this pixel's pending events, keeping other SDK commands intact.
  const discard = (queue, describe) => {
    if (!Array.isArray(queue)) return
    for (let index = queue.length - 1; index >= 0; index--) {
      const event = describe(queue[index])
      if (String(event?.id) !== pixelId) continue
      if (event.name === 'PageView') pageViewSent = false
      if (event.name === 'Lead') leadSent = false
      queue.splice(index, 1)
    }
  }
  discard(window.fbq?.queue, command => {
    if (command[0] === 'fire') return { id: command[1]?.pixelId, name: command[1]?.eventName }
    if (command[0] === 'trackSingle' || command[0] === 'trackSingleCustom') return { id: command[1], name: command[2] }
    return null
  })
  discard(window.fbq?.instance?.eventQueue, event => ({ id: event.id, name: event.eventName }))
  clearPixelCookies()
}

function sendEvents() {
  if (!initialized || !hasConsent()) return
  if (!pageViewSent) {
    pageViewSent = true
    window.fbq('trackSingle', pixelId, 'PageView')
  }
  if (pendingLead && !leadSent) {
    pendingLead = false
    leadSent = true
    // No email, form values, or fabricated purchase value are sent.
    window.fbq('trackSingle', pixelId, 'Lead')
  }
}

function startTracking() {
  if (!hasConsent() || !isPublishedSite() || !/^\d+$/.test(pixelId || '')) return
  if (initialized) {
    window.fbq('consent', 'grant')
    sendEvents()
    return
  }
  if (loading) return

  // Bootstrap only after consent. The noscript tracking image is intentionally
  // omitted: it would send a visit without allowing someone to make a choice.
  const fbq = (window.fbq ||= function () {
    fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments)
  })
  window._fbq ||= fbq
  fbq.push = fbq
  fbq.loaded = true
  fbq.version = '2.0'
  fbq.queue ||= []
  fbq.disablePushState = true
  loading = true

  const script = document.createElement('script')
  script.async = true
  script.src = scriptUrl
  script.id = 'meta-pixel-runtime'
  script.addEventListener(
    'load',
    () => {
      loading = false
      // Rejecting while the download is pending must not release queued events.
      if (!hasConsent()) return
      initializePixel()
    },
    { once: true }
  )
  script.addEventListener(
    'error',
    () => {
      loading = false
      script.remove()
    },
    { once: true }
  )
  // The library may already have loaded before a previous choice was revoked.
  if (fbq.callMethod) {
    loading = false
    initializePixel()
  } else document.head.append(script)
}

function initializePixel() {
  if (initialized || !hasConsent()) return
  // Keep event collection explicit even if the dashboard enables automatic
  // matching. Also disable these options in Events Manager (see README).
  window.fbq('optOut', pixelId, 'AutomaticMatching')
  window.fbq('optOut', pixelId, 'AutomaticMatchingForPartnerIntegrations')
  window.fbq('set', 'autoConfig', false, pixelId)
  window.fbq('consent', 'grant')
  window.fbq('init', pixelId)
  // Suppress SDK-generated broadcast events (including back/forward restores).
  // Our two events use trackSingle explicitly.
  window.fbq('set', 'trackSingleOnly', true, pixelId)
  initialized = true
  sendEvents()
}

function closeBanner() {
  banner?.remove()
  banner = null
  document.documentElement.classList.remove('ad-consent-open')
  settingsTrigger?.focus({ preventScroll: true })
  settingsTrigger = null
}

function showBanner(trigger) {
  if (banner) {
    banner.querySelector('button:not([hidden]):not(:disabled)')?.focus()
    return
  }
  settingsTrigger = trigger
  const template = document.getElementById('ad-consent-template')
  banner = template.content.firstElementChild.cloneNode(true)
  const gpc = navigator.globalPrivacyControl === true
  const status = banner.querySelector('[data-consent-status]')
  if (gpc) {
    status.hidden = false
    status.textContent = 'Your browser’s Global Privacy Control keeps advertising cookies off.'
    banner.querySelector('[data-ad-consent="granted"]').disabled = true
  }
  const close = banner.querySelector('[data-consent-close]')
  close.hidden = !trigger
  close.addEventListener('click', closeBanner)
  banner.querySelectorAll('[data-ad-consent]').forEach(button => {
    button.addEventListener('click', () => {
      choice = { value: button.dataset.adConsent, expiresAt: Date.now() + consentLifetime }
      try {
        localStorage.setItem(consentKey, JSON.stringify(choice))
      } catch {
        /* Session-only choice. */
      }
      if (hasConsent()) startTracking()
      else stopTracking()
      closeBanner()
    })
  })
  banner.addEventListener('keydown', event => {
    if (event.key === 'Escape' && trigger) closeBanner()
  })
  document.body.append(banner)
  document.documentElement.classList.add('ad-consent-open')
  if (trigger) banner.querySelector('[data-ad-consent="denied"]').focus()
}

export function initMetaPixelConsent() {
  if (!pixelId) return
  document.querySelectorAll('[data-cookie-settings]').forEach(button => {
    button.hidden = false
    button.addEventListener('click', () => showBanner(button))
  })
  if (hasConsent()) startTracking()
  else {
    stopTracking()
    if (!choice && navigator.globalPrivacyControl !== true) showBanner()
  }
  // Keep other open tabs in sync when someone changes their choice.
  window.addEventListener('storage', event => {
    if (event.key !== consentKey && event.key !== null) return
    choice = readChoice()
    if (hasConsent()) startTracking()
    else stopTracking()
    closeBanner()
    if (!choice && navigator.globalPrivacyControl !== true) showBanner()
  })
  window.addEventListener('pageshow', event => {
    if (!event.persisted) return
    choice = readChoice()
    if (hasConsent()) startTracking()
    else stopTracking()
    if (!choice && navigator.globalPrivacyControl !== true) showBanner()
  })
}

export function trackWaitlistLead() {
  // Do not retrospectively send signups completed before consent.
  if (!hasConsent() || !isPublishedSite() || leadSent) return
  pendingLead = true
  startTracking()
}
