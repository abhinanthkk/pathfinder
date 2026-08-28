import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge conditional class names and resolve Tailwind conflicts.
 * Mirrors the shadcn/ui `cn` helper at the convention path `@/lib/utils`.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
