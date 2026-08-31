import PropTypes from'prop-types'
import { motion } from'framer-motion'
import { AlertTriangle } from'lucide-react'
import { Button } from'./Button'
import { EASE } from'../../lib/motion'

ErrorState.propTypes = {
 title: PropTypes.string,
 description: PropTypes.string,
 onRetry: PropTypes.func,
 className: PropTypes.string,
}

export function ErrorState({ title ='Something went wrong', description, onRetry, className ='' }) {
 return (
 <motion.div
 role="alert"
 initial={{ opacity: 0, y: 8 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.25, ease: EASE }}
 className={`flex flex-col items-center justify-center gap-3 rounded-xl border border-danger-100 bg-danger-50/50 px-6 py-10 text-center ${className}`}
 >
 <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-danger-100 text-danger-600">
 <AlertTriangle className="h-5 w-5" aria-hidden="true" />
 </div>
 <div>
 <h3 className="text-sm font-semibold text-ink">{title}</h3>
 {description && (
 <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-ink-400">{description}</p>
 )}
 </div>
 {onRetry && (
 <Button variant="secondary" size="sm" onClick={onRetry} className="mt-2">
 Try again
 </Button>
 )}
 </motion.div>
 )
}
