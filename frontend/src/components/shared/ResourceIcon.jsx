import PropTypes from'prop-types'
import { BookOpen } from'lucide-react'
import { cn } from'../../lib/utils'

ResourceIcon.propTypes = {
 source: PropTypes.string,
 className: PropTypes.string,
}

const ICON_STYLES = {
 YouTube:'bg-[#FF0000] text-white',
 GeeksforGeeks:'bg-[#2F8D46] text-white',
 W3Schools:'bg-sky-600 text-white',
 Docs:'bg-primary-600 text-white',
}

export function ResourceIcon({ source, className ='' }) {
 const style = ICON_STYLES[source] || ICON_STYLES.Docs
 return (
 <span
 className={cn(
'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold shadow-soft',
 style,
 className
 )}
 aria-hidden="true"
 >
 {source ==='YouTube' ? (
 <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
 <path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.19C0 8.07 0 12 0 12s0 3.93.5 5.81a3.02 3.02 0 0 0 2.12 2.14c1.88.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14C24 15.93 24 12 24 12s0-3.93-.5-5.81ZM9.55 15.57V8.43L15.82 12l-6.27 3.57Z" />
 </svg>
 ) : source ==='GeeksforGeeks' ? (
 <svg viewBox="0 0 24 24" fill="currentColor" className="h-4.5 w-4.5">
 <path d="M12 2 2 5l1 12 9 5 9-5 1-12-10-3Zm0 2.5 7 2.1-7 3.4L5 6.6l7-2.1ZM5 8.6l6 2.9v7.9L5 14.5V8.6Zm9 10.8v-7.9l6-2.9v5.9l-6 4.9Z" />
 </svg>
 ) : source ==='W3Schools' ? (
 <span className="font-bold leading-none">W3</span>
 ) : (
 <BookOpen className="h-4 w-4" />
 )}
 </span>
 )
}
