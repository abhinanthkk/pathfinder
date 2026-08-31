import PropTypes from 'prop-types'
import { skillLabel } from '../../utils/labels'

SkillPill.propTypes = {
  id: PropTypes.string,
  className: PropTypes.string,
}

export function SkillPill({ id, className = '' }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink-300 transition-colors hover:border-primary-300 hover:text-primary-700 ${className}`}
    >
      {skillLabel(id)}
    </span>
  )
}

SkillPillList.propTypes = {
  skills: PropTypes.arrayOf(PropTypes.string),
  limit: PropTypes.number,
  className: PropTypes.string,
}

export function SkillPillList({ skills = [], limit = 6, className = '' }) {
  const shown = skills.slice(0, limit)
  const extra = skills.length - shown.length
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {shown.length === 0 && <span className="text-xs text-ink-400">No skills recorded</span>}
      {shown.map((s) => (
        <SkillPill key={s} id={s} />
      ))}
      {extra > 0 && (
        <span className="inline-flex items-center rounded-full border border-line bg-surface-secondary px-2.5 py-1 text-[11px] font-medium text-ink-400">
          +{extra} more
        </span>
      )}
    </div>
  )
}
