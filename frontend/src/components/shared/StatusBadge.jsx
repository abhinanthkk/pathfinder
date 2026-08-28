import PropTypes from 'prop-types'
import { Badge } from '../ui/Badge'
import { humanize } from '../../utils/labels'

const STATUS_MAP = {
  completed: { variant: 'success', label: 'COMPLETED' },
  in_progress: { variant: 'primary', label: 'IN PROGRESS' },
  available: { variant: 'info', label: 'READY' },
  locked: { variant: 'neutral', label: 'LOCKED' },
  skipped: { variant: 'neutral', label: 'SKIPPED' },
  failed: { variant: 'danger', label: 'REVISIT' },
}

export function StatusBadge({ status, fallback = 'Unknown', className = '' }) {
  const meta = STATUS_MAP[status] || {
    variant: 'neutral',
    label: (fallback || humanize(status)).toUpperCase(),
  }
  return (
    <Badge variant={meta.variant} className={className}>
      {meta.label}
    </Badge>
  )
}

StatusBadge.propTypes = {
  status: PropTypes.string,
  fallback: PropTypes.string,
  className: PropTypes.string,
}

