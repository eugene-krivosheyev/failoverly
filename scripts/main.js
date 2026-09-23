import { initConnectionPreview } from './connection-preview.js'
import { initSignupForms } from './signup-forms.js'
import './analytics.js'

initConnectionPreview()
initSignupForms()

// Rebind interactions from a clean document when Bun updates this entry point.
if (import.meta.hot) import.meta.hot.dispose(() => window.location.reload())
