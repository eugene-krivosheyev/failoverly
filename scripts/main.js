import { initHeroAnimation } from './hero-animation.js'
import { initHeroRotation } from './hero-rotation.js'
import { initSignupForms } from './signup-forms.js'
import './analytics.js'
import { initMetaPixelConsent } from './meta-pixel.js'

initMetaPixelConsent()
initHeroAnimation()
initHeroRotation()
initSignupForms()

// Rebind interactions from a clean document when Bun updates this entry point.
if (import.meta.hot) import.meta.hot.dispose(() => window.location.reload())
