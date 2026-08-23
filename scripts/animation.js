import { gsap } from 'gsap'

export const firstScreenLeave = 500
export const firstScreenFadeOut = 150

export const supheaderWidth = 290
export const flyScale = 0.15

export const INTRO_DURATION = 0.3
export const LOGO_INTRO_DURATION = 2
export const FIRST_SCREEN_LEAVE_DURATION = 0.4
export const CARD_TRANSITION_DURATION = 0.3
export const TRANSITION_EASE = 'power2.inOut'

export function updateFlyingClone(clone, target, progress, endScale) {
  gsap.set(clone, { x: 0, y: 0, scale: 1 })
  const cloneRect = clone.getBoundingClientRect()
  const targetRect = target.getBoundingClientRect()
  const dx = targetRect.left + targetRect.width / 2 - (cloneRect.left + cloneRect.width / 2)
  const dy = targetRect.top + targetRect.height / 2 - (cloneRect.top + cloneRect.height / 2)
  const scale = typeof endScale === 'function' ? endScale(cloneRect, targetRect) : endScale

  gsap.set(clone, {
    x: dx * progress,
    y: dy * progress,
    scale: gsap.utils.interpolate(1, scale, progress),
    opacity: 1 - progress
  })
}

export function playFirstScreenIntro() {
  const tl = gsap.timeline({ defaults: { ease: TRANSITION_EASE } })
  tl.fromTo('.first_screen_image', { opacity: 0 }, { opacity: 1, duration: LOGO_INTRO_DURATION })
  tl.fromTo('.first_screen_text', { opacity: 0 }, { opacity: 1, duration: LOGO_INTRO_DURATION }, '<')
  return tl
}

function addFirstScreenLeave(timeline, position, { fadeDuration, totalDuration, flyLogo = true }) {
  timeline.to('.first_screen', { backgroundColor: '#f7f7f7', duration: fadeDuration, ease: 'none' }, position)
  timeline.to('.first_screen_text', { opacity: 0, duration: fadeDuration, ease: 'none' }, position)
  timeline.to('.first_screen', { autoAlpha: 0, duration: totalDuration, ease: 'none' }, position)

  if (!flyLogo) return

  const firstScreenLogo = document.querySelector('.first_screen_image img:not(.flying_clone)')
  const firstScreenLogoClone = document.querySelector('.first_screen_image .flying_clone')
  const headerLogo = document.querySelector('.header .left_part img')

  timeline.set(firstScreenLogo, { opacity: 0 }, position)

  const logoFlyState = { p: 0 }
  timeline.to(
    logoFlyState,
    {
      p: 1,
      duration: totalDuration,
      ease: 'none',
      onUpdate: () =>
        updateFlyingClone(
          firstScreenLogoClone,
          headerLogo,
          logoFlyState.p,
          (cloneRect, targetRect) => targetRect.width / cloneRect.width
        )
    },
    position
  )
}

export function buildFirstScreenLeaveTimeline() {
  const tl = gsap.timeline({ paused: true, defaults: { ease: TRANSITION_EASE } })
  const fadeDuration = FIRST_SCREEN_LEAVE_DURATION * (firstScreenFadeOut / firstScreenLeave)

  addFirstScreenLeave(tl, 0, {
    fadeDuration,
    totalDuration: FIRST_SCREEN_LEAVE_DURATION
  })

  return tl.pause(0)
}

function growSupheaderIcon(tl, supItem) {
  tl.to(supItem, { width: supheaderWidth, duration: CARD_TRANSITION_DURATION, ease: 'none' }, 0)
}

function flyCardImageIntoIcon(tl, fromItem, supItem) {
  const realImg = fromItem.querySelector('.image_part img:not(.flying_clone)')
  const clone = fromItem.querySelector('.flying_clone')
  const targetIcon = supItem.querySelector('.supheader_item_image')
  const flyState = { p: 0 }

  tl.set(realImg, { opacity: 0 }, 0)
  tl.to(
    flyState,
    {
      p: 1,
      duration: CARD_TRANSITION_DURATION,
      ease: 'none',
      onUpdate: () => updateFlyingClone(clone, targetIcon, flyState.p, flyScale)
    },
    0
  )
}

function fadeOutCardText(tl, fromItem) {
  tl.to(fromItem.querySelector('.text_part'), { opacity: 0, duration: CARD_TRANSITION_DURATION * 0.6, ease: 'none' }, 0)
}

function slideInNextCard(tl, toItem) {
  tl.fromTo(toItem, { left: '100%' }, { left: '0%', duration: CARD_TRANSITION_DURATION, ease: 'none' }, 0)
}

export function buildCardTransitionTimeline(supItem, fromItem, toItem) {
  const tl = gsap.timeline({ paused: true, defaults: { ease: TRANSITION_EASE } })

  growSupheaderIcon(tl, supItem)
  flyCardImageIntoIcon(tl, fromItem, supItem)
  fadeOutCardText(tl, fromItem)
  slideInNextCard(tl, toItem)

  return tl.pause(0)
}
