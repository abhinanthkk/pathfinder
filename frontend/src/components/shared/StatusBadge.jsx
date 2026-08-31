import PropTypes from 'prop-types'
import { Badge } from '../ui/Badge'
import { humanize } from '../../utils/labels'

const STATUS_MAP = {
  completed: { variant: 'success', label: 'Completed' },
  in_progress: { variant: 'primary', label: 'In progress' },
  available: { variant: 'info', label: 'Ready' },
  locked: { variant: 'neutral', label: 'Locked' },
  skipped: { variant: 'neutral', label: 'Skipped' },
  failed: { variant: 'danger', label: 'Revisit' },
}

export function StatusBadge({ status, fallback = 'Unknown', className = '' }) {
  const meta = STATUS_MAP[status] || {
    variant: 'neutral',
    label: fallback || humanize(status),
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
