/**
 * Mailing-list integration boundary.
 *
 * These placeholders deliberately make no requests and do not persist or log
 * email addresses or survey answers. Replace their bodies when the service is
 * ready, leaving the UI independent of the provider.
 *
 * A connected provider must return { mode: 'success', signupId } only after a
 * signup is accepted. Profile submission receives that opaque signupId, not
 * the email address. Reject on failure; the UI supplies safe error messages.
 *
 * TODO (runtime): implement a server endpoint for the chosen mailing provider.
 * Configure its API key and list/audience ID in Vercel's server-side Production
 * environment. These browser modules must never contain provider credentials.
 * TODO (launch): replace preview notices, llms.txt status and the privacy-policy
 * placeholder only after the real integration is ready.
 */

/** @param {{ email: string }} _signup */
export async function submitWaitlist(_signup) {
  // TODO (runtime): POST to the server endpoint and handle its confirmed response.
  return { mode: 'preview' }
}

/** @param {{ signupId?: string, activities: string[], frequency: string | null }} _profile */
export async function submitProfile(_profile) {
  // TODO (runtime): send optional answers using the opaque signupId from signup.
  return { mode: 'preview' }
}
