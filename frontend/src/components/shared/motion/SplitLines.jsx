import { useEffect, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import { motion, useReducedMotion } from 'framer-motion'
import { EASE } from '../../../lib/motion'
import { cn } from '../../../lib/utils'

/**
 * SplitLines — the editorial masked line-by-line headline reveal.
 *
 * The headline is split into words, grouped into their *visual* lines, and
 * each line is revealed from beneath an overflow mask with the signature
 * easing. The effect is measured against real layout so it stays correct on
 * any breakpoint.
 *
 * - Accepts `parts` so a segment can be re-styled (e.g. an accent word).
 * - `ariaLabel` announces the full headline to assistive tech; the animated
 *   markup is hidden from the tree.
 * - Respects `prefers-reduced-motion` by rendering a plain, fully-visible
 *   headline (anchored by an opacity cross-fade handled by the caller).
 */
function SplitLines({
  parts,
  className = '',
  lineClassName = '',
  wordClassName = '',
  delay = 0,
  stagger = 0.06,
  duration = 0.7,
  as: Tag = 'div',
  ariaLabel,
  mount = false,
  id,
}) {
  const reduced = useReducedMotion()

  const words = []
  parts.forEach((part) => {
    part.text.split(' ').filter(Boolean).forEach((w) => {
      words.push({ token: w, cls: part.className })
    })
  })

  const [lines, setLines] = useState(null)
  const containerRef = useRef(null)
  const measureRef = useRef(null)

  useEffect(() => {
    if (reduced || words.length === 0) return undefined

    const measure = () => {
      const spans = measureRef.current?.querySelectorAll('[data-word]')
      if (!spans || spans.length === 0) return
      const grouped = []
      let current = []
      let lastTop = null
      spans.forEach((span) => {
        const top = span.getBoundingClientRect().top
        if (lastTop !== null && Math.abs(top - lastTop) > 1) {
          grouped.push(current)
          current = []
        }
        current.push(span.dataset.index)
        lastTop = top
      })
      if (current.length > 0) grouped.push(current)
      setLines((prev) => {
        const next = JSON.stringify(grouped)
        const prevStr = JSON.stringify(prev)
        return prevStr === next ? prev : grouped
      })
    }

    // Measure after layout settles and again once webfonts finish loading.
    const raf = requestAnimationFrame(() => requestAnimationFrame(measure))
    document.fonts?.ready?.then(measure).catch(() => {})
    window.addEventListener('resize', measure)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', measure)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, parts])

  const showMasked = !reduced && lines && lines.length > 0

  if (!showMasked) {
    return (
      <Tag id={id} className={className} aria-label={ariaLabel}>
        {parts.map((p, i) => (
          <span key={`${p.text}-${i}`} className={p.className}>
            {p.text}
          </span>
        ))}
      </Tag>
    )
  }

  return (
    <Tag id={id} ref={containerRef} className={cn('relative', className)} aria-label={ariaLabel}>
      <span aria-hidden="true" className="contents">
        {lines.map((line, lineIndex) => (
          <span
            key={lineIndex}
            className={cn('block overflow-hidden', lineClassName)}
          >
            <motion.span
              className="block will-change-transform"
              initial={{ y: '115%' }}
              whileInView={mount ? undefined : { y: '0%' }}
              animate={mount ? { y: '0%' } : undefined}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ duration, delay: delay + lineIndex * stagger, ease: EASE }}
            >
              {line.map((wordIndex) => {
                const w = words[Number(wordIndex)]
                return (
                  <span key={`${wordIndex}-${w.token}`} className={cn(w.cls, wordClassName)}>
                    {w.token}
                    {'\u00A0'}
                  </span>
                )
              })}
            </motion.span>
          </span>
        ))}
      </span>
      {/* Measuring copy — invisible, only used to derive visual lines */}
      <span ref={measureRef} aria-hidden="true" className="pointer-events-none absolute inset-0 z-[-1] opacity-0">
        {words.map((w, i) => (
          <span key={i} data-word data-index={i} className={w.cls}>
            {w.token}
            {'\u00A0'}
          </span>
        ))}
      </span>
    </Tag>
  )
}

SplitLines.propTypes = {
  parts: PropTypes.arrayOf(
    PropTypes.shape({ text: PropTypes.string.isRequired, className: PropTypes.string })
  ).isRequired,
  className: PropTypes.string,
  lineClassName: PropTypes.string,
  wordClassName: PropTypes.string,
  delay: PropTypes.number,
  stagger: PropTypes.number,
  duration: PropTypes.number,
  as: PropTypes.oneOfType([PropTypes.string, PropTypes.elementType]),
  ariaLabel: PropTypes.string,
  mount: PropTypes.bool,
  id: PropTypes.string,
}

export default SplitLines