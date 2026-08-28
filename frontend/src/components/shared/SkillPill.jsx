import PropTypes from 'prop-types'
import { skillLabel } from '../../utils/labels'

SkillPill.propTypes = {
  id: PropTypes.string,
  className: PropTypes.string,
}

export function SkillPill({ id, className = '' }) {
  return (
    <span
      className={`inline-flex items-center rounded-[4px] border border-surface-700 bg-surface-850 px-2.5 py-1 text-xs font-medium text-surface-200 transition-colors hover:border-surface-600 ${className}`}
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
      {shown.length === 0 && <span className="text-xs text-surface-500 font-mono">No skills recorded</span>}
      {shown.map((s) => (
        <SkillPill key={s} id={s} />
      ))}
      {extra > 0 && (
        <span className="inline-flex items-center rounded-[4px] border border-surface-800 bg-surface-900 px-2 py-0.5 font-mono text-[11px] font-medium text-surface-400">
          +{extra} more
        </span>
      )}
    </div>
  )
}

