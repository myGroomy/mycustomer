import type { Variants } from 'framer-motion'

// Shared premium easing curve (mass & spring physics)
export const FLUID_EASE: [number, number, number, number] = [0.32, 0.72, 0, 1]

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, delay: 0.05 + i * 0.08, ease: FLUID_EASE },
  }),
}

export const heroMaskReveal: Variants = {
  hidden: { y: '115%' },
  show: {
    y: 0,
    transition: { duration: 1.1, ease: FLUID_EASE },
  },
}

export const wordReveal: Variants = {
  hidden: { opacity: 0.12 },
  show: (i: number = 0) => ({
    opacity: 1,
    transition: { duration: 1.2, delay: i * 0.06, ease: FLUID_EASE },
  }),
}
