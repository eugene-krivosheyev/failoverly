import { submitWaitlist, submitProfile, WAITLIST_ENABLED } from './waitlist.js'

function checkResult(result) {
  if (result?.mode !== 'preview' && result?.mode !== 'success') {
    throw new Error('The waitlist adapter returned an unsupported result.')
  }
  return result
}

function setMessage(message, text = '', error = false) {
  message.classList.toggle('error', error)
  message.textContent = text
}

function setBusy(form, busy) {
  form.setAttribute('aria-busy', String(busy))
  form.querySelectorAll('input, button[type="submit"]').forEach(control => {
    control.disabled = busy
  })
}

function mountDialog(templateId, returnFocus) {
  const fragment = document.querySelector(templateId).content.cloneNode(true)
  const dialog = fragment.querySelector('dialog')
  dialog.addEventListener(
    'close',
    () => {
      dialog.remove()
      if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true })
    },
    { once: true }
  )
  document.body.append(fragment)
  return dialog
}

function openSurvey(form, signup) {
  const survey = mountDialog('#survey-template', form.querySelector('button[type="submit"]'))
  const surveyForm = survey.querySelector('#survey-form')
  const submitButton = surveyForm.querySelector('button[type="submit"]')
  const activityInputs = [...surveyForm.querySelectorAll('[name="activities"]')]
  const isPreview = signup.mode === 'preview'
  const description = survey.querySelector('.survey-preview')
  const title = survey.querySelector('#survey-title')
  const message = document.createElement('p')
  let pending = false

  description.id = 'survey-description'
  description.textContent = isPreview ? 'Form preview only · no data sent or saved' : 'Optional · help shape Failoverly'
  survey.setAttribute('aria-describedby', description.id)
  title.textContent = isPreview ? 'Preview the optional questions.' : 'You’re on the list.'
  submitButton.textContent = isPreview ? 'Preview answers' : 'Save answers'
  message.id = 'survey-message'
  message.className = 'form-message'
  message.setAttribute('role', 'status')
  message.setAttribute('aria-live', 'polite')
  surveyForm.querySelector('.survey-actions').before(message)

  activityInputs.forEach(input => {
    input.addEventListener('change', () => {
      if (!input.checked) return
      activityInputs.forEach(other => {
        if (other !== input && (input.value === 'none' || other.value === 'none')) {
          other.checked = false
        }
      })
    })
  })

  surveyForm.addEventListener('input', () => setMessage(message))
  surveyForm.addEventListener('submit', async event => {
    event.preventDefault()
    if (pending) return
    const activities = activityInputs.filter(input => input.checked).map(input => input.value)
    const frequency = surveyForm.querySelector('[name="frequency"]:checked')?.value ?? null
    if (!activities.length && !frequency) {
      survey.close()
      return
    }

    pending = true
    setBusy(surveyForm, true)
    setMessage(message)
    submitButton.textContent = 'Please wait…'
    try {
      const result = checkResult(await submitProfile({ signupId: signup.signupId, activities, frequency }))
      // The dialog may have been dismissed with Skip or Escape while awaiting a provider.
      if (!survey.isConnected) return
      const preview = isPreview || result.mode === 'preview'
      survey.querySelector('#survey-done-title').textContent = preview ? 'Preview complete.' : 'Thanks for sharing.'
      survey.querySelector('#survey-done p').textContent = preview
        ? 'Your answers were not sent or saved. Waitlist signup is not connected yet.'
        : 'Your answers will help us understand where unreliable internet gets in the way.'
      survey.querySelector('#survey-questions').hidden = true
      survey.querySelector('#survey-done').hidden = false
      survey.querySelector('#skip-survey').hidden = true
      survey.setAttribute('aria-labelledby', 'survey-done-title')
      survey.querySelector('#survey-done-title').focus()
    } catch {
      if (survey.isConnected)
        setMessage(message, 'We couldn’t save your answers. Please try again, or skip this step.', true)
    } finally {
      pending = false
      setBusy(surveyForm, false)
      submitButton.textContent = isPreview ? 'Preview answers' : 'Save answers'
    }
  })
  survey.querySelector('#skip-survey').addEventListener('click', () => survey.close())
  survey.querySelector('#close-survey').addEventListener('click', () => survey.close())
  setBusy(surveyForm, false)
  survey.showModal()
  title.focus()
}

export function initSignupForms() {
  const forms = [...document.querySelectorAll('[data-signup-form]')]
  let pending = false

  forms.forEach(form => {
    const input = form.querySelector('input[name="email"]')
    const button = form.querySelector('button[type="submit"]')
    const message = form.querySelector('.form-message')
    const buttonLabel = button.textContent

    form.addEventListener('submit', async event => {
      event.preventDefault()
      if (!WAITLIST_ENABLED || pending) return
      input.value = input.value.trim()
      if (!input.validity.valid) {
        input.setAttribute('aria-invalid', 'true')
        setMessage(message, 'Please enter a valid email address.', true)
        input.focus()
        return
      }

      input.removeAttribute('aria-invalid')
      setMessage(message)
      pending = true
      forms.forEach(signupForm => setBusy(signupForm, true))
      button.textContent = 'Please wait…'
      let signup
      try {
        signup = checkResult(await submitWaitlist({ email: input.value }))
        setMessage(
          message,
          signup.mode === 'preview'
            ? 'Form preview only. Waitlist signup is not connected; your email was not sent or saved.'
            : 'You’re on the list. We’ll email you when Failoverly launches.'
        )
      } catch {
        setMessage(message, 'We couldn’t submit your signup. Please try again.', true)
      } finally {
        pending = false
        forms.forEach(signupForm => setBusy(signupForm, false))
        button.textContent = buttonLabel
      }
      if (signup) openSurvey(form, signup)
    })

    input.addEventListener('input', () => {
      input.removeAttribute('aria-invalid')
      setMessage(message)
    })
    // Leave the initial disabled HTML controls in place while signup is paused.
    // If resumed, enable only after submit handlers prevent native navigation.
    if (WAITLIST_ENABLED) setBusy(form, false)
  })
}
