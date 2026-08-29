import { useReducedMotion } from 'framer-motion'

/**
 * Global motion tokens — the shared "editorial stagger" language used across
 * the whole product. Modelled after the Motion UI theme vocabulary:
 *
 *   transitions named by purpose (snap / ui / gentle / lively)
 *   stagger tokens       { tight, base, relaxed }
 *   travel tokens        { enter, section }
 *   inView               { amount, once }
 *   reducedMotion        "calm"  → keep opacity, drop transform/travel
 */

export const EASE = [0.16, 1, 0.3, 1] // the signature editorial easing
export const EASE_OUT = [0.33, 1, 0.68, 1]
export const EASE_SNAPPY = [0.3, 0.4, 0.2, 1]

export const DURATION = {
  fast: 0.15,   // 150ms — immediate feedback
  normal: 0.22, // 220ms — common controls
  section: 0.32,// 320ms — section / surface entrances
}

// Spring transitions, named by purpose (Motion UI vocabulary)
export const TRANSITION = {
  snap: { duration: DURATION.fast, ease: EASE_SNAPPY },
  ui: { type: 'spring', stiffness: 250, damping: 28 },
  gentle: { type: 'spring', stiffness: 90, damping: 18 },
  lively: { type: 'spring', stiffness: 400, damping: 18 },
}

export const STAGGER = {
  tight: 0.04,
  base: 0.08,
  relaxed: 0.15,
}

export const TRAVEL = {
  enter: 32,
  section: 64,
}

// Low-importance / quiet reveals keep a gentle fade. `once` prevents re-runs.
export const VIEWPORT = { once: true, amount: 0.35 }

/**
 * "Calm" reduced-motion behaviour: keep opacity fades, drop travel so nothing
 * lurches. Mirrors Motion UI's `reducedMotion: "calm"`.
 */
export function useCalmMotion() {
  const reduced = useReducedMotion()
  return {
    reduced,
    // transform travel for a given Y; 0 when the user prefers reduced motion
    y: (value = TRAVEL.enter) => (reduced ? 0 : value),
  }
}

/* ------------------------------------------------------------------ */
/*  Variant factories                                                   */
/* ------------------------------------------------------------------ */

/** Fade up entrance used for staggered content (list items, cards, rows). */
export function fadeUp({ y = TRAVEL.enter, duration = DURATION.section, delay = 0 } = {}) {
  return {
    hidden: { opacity: 0, y },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration, delay, ease: EASE },
    },
    exit: {
      opacity: 0,
      y: -8,
      transition: { duration: DURATION.fast, ease: EASE },
    },
  }
}

/** Fade-entrance that deliberately avoids transform (page shell, backdrops). */
export const fade = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: DURATION.fast, ease: EASE_SNAPPY } },
  exit: { opacity: 0, transition: { duration: DURATION.fast, ease: EASE_SNAPPY } },
}

/** Container that staggers its `fadeUp` children. */
export function stagger(staggerChildren = STAGGER.base, delayChildren = 0, delay = 0) {
  return {
    hidden: {},
    show: {
      transition: { delayChildren: delayChildren + delay, staggerChildren },
    },
  }
}

/** Scroll-in variant for larger sections/cards revealed in view. */
export function inViewUp({ y = TRAVEL.section, duration = DURATION.section } = {}) {
  return {
    hidden: { opacity: 0, y },
    show: { opacity: 1, y: 0, transition: { duration, ease: EASE } },
  }
}

/** Scale + fade used by overlays / modals (0.98 → 1 keeps things subtle). */
export const overlayPanel = {
  hidden: { opacity: 0, scale: 0.98, y: 8 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 260, damping: 26 },
  },
  exit: {
    opacity: 0,
    scale: 0.985,
    y: 4,
    transition: { duration: DURATION.fast, ease: EASE },
  },
}

/** Page-level shell transition: quick, no travel compounding, no flicker. */
export const pageShell = {
  initial: { opacity: 0 },
  enter: { opacity: 1, transition: { duration: 0.18, ease: EASE_SNAPPY } },
  exit: { opacity: 0, transition: { duration: 0.14, ease: EASE_SNAPPY } },
}