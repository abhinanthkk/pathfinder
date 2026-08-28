import PropTypes from 'prop-types'
import { skillLabel } from '../../utils/labels'

SkillPill.propTypes = {
  id: PropTypes.string,
  className: PropTypes.string,
}

export function SkillPill({ id, className = '' }) {
  return (
    <span
      className={`inline-flex items-center rounded-full bg-primary-500/10 px-2.5 py-0.5 text-xs font-medium text-primary-300 ${className}`}
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
      {shown.length === 0 && <span className="text-xs text-surface-500">No skills listed</span>}
      {shown.map((s) => (
        <SkillPill key={s} id={s} />
      ))}
      {extra > 0 && (
        <span className="inline-flex items-center rounded-full bg-surface-800 px-2.5 py-0.5 text-xs font-medium text-surface-400">
          +{extra} more
        </span>
      )}
    </div>
  )
}
