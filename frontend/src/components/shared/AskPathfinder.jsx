import { useState, useRef, useEffect, useCallback } from'react'
import PropTypes from'prop-types'
import {
 Sparkles, X, Send, Bot, CornerDownLeft, Check,
 Zap, Target, TrendingUp, Gauge,
} from'lucide-react'
import { AnimatePresence, motion } from'framer-motion'
import { EASE, DURATION } from'../../lib/motion'
import api from'../../services/api'
import useUserStore from'../../store/useUserStore'
import usePathStore from'../../store/usePathStore'
import { cn } from'../../lib/utils'

const QUICK_PROMPTS = [
 { id:'next', label:'What should I learn next?', icon: Zap, send:'What should I learn next?' },
 { id:'milestone', label:'Explain current milestone', icon: Target, send:'Explain my current milestone' },
 { id:'progress', label:'Review my progress', icon: TrendingUp, send:'Review my progress' },
 { id:'gaps', label:'Identify skill gaps', icon: Gauge, send:'Identify my skill gaps' },
]

const INITIAL_MESSAGE = {
 role:'assistant',
 content:
'Welcome to Pathfinder AI. I am your specialized learning advisor, synchronized with your active roadmap and skill verification graph. How can I assist your engineering progression today?',
 time: new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }),
}

AskPathfinder.propTypes = {
 isOpen: PropTypes.bool.isRequired,
 onClose: PropTypes.func.isRequired,
}

export function AskPathfinder({ isOpen, onClose }) {
 const [messages, setMessages] = useState([INITIAL_MESSAGE])
 const [input, setInput] = useState('')
 const [loading, setLoading] = useState(false)
 const chatEndRef = useRef(null)
 const inputRef = useRef(null)
 const messageListRef = useRef(null)

 const { profile } = useUserStore()
 const { path } = usePathStore()

 // Keep background scroll locked while the drawer is open.
 useEffect(() => {
 if (!isOpen) return undefined
 const prevOverflow = document.body.style.overflow
 document.body.style.overflow ='hidden'
 const t = setTimeout(() => inputRef.current?.focus(), 120)
 return () => {
 clearTimeout(t)
 document.body.style.overflow = prevOverflow
 }
 }, [isOpen])

 // Auto-expand the textarea as the user types.
 useEffect(() => {
 const el = inputRef.current
 if (!el) return
 el.style.height ='auto'
 el.style.height =`${Math.min(el.scrollHeight, 128)}px`
 }, [input])

 useEffect(() => {
 chatEndRef.current?.scrollIntoView({ behavior:'smooth', block:'end' })
 }, [messages, loading])

 useEffect(() => {
 const handleKeyDown = (e) => {
 if (e.key ==='Escape' && isOpen) onClose()
 }
 window.addEventListener('keydown', handleKeyDown)
 return () => window.removeEventListener('keydown', handleKeyDown)
 }, [isOpen, onClose])

 const appendMessage = useCallback((role, content) => {
 setMessages((prev) => [
 ...prev,
 {
 role,
 content,
 time: new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }),
 },
 ])
 }, [])

 const handleSend = async (queryText) => {
 const textToSend = (queryText || input).trim()
 if (!textToSend || loading) return

 setInput('')
 appendMessage('user', textToSend)
 setLoading(true)

 try {
 let queryPrompt = textToSend
 if (textToSend ==='Explain my current milestone') {
 const currentMilestone =
 path?.milestones?.find((m) =>
 m.nodes?.some((n) => n.status ==='in_progress' || n.status ==='available')
 ) || path?.milestones?.[0]
 if (currentMilestone) {
 queryPrompt =`Please explain my current milestone"${currentMilestone.title}" (Milestone #${currentMilestone.number}) in detail, why it is sequenced here, and how to master it efficiently.`
 }
 } else if (textToSend ==='Identify my skill gaps') {
 queryPrompt =`Review my current target role (${profile?.target_role || profile?.goal ||'Engineering'}) and tell me what skill gaps I need to address next.`
 }

 const res = await api.sendChatMessage(
 queryPrompt,
 messages.map((m) => ({ role: m.role, content: m.content }))
 )

 appendMessage('assistant', res.reply ||'Analysis completed according to your learning path.')
 } catch {
 appendMessage(
'assistant',
'Unable to communicate with the Pathfinder AI advisor. Please check your network connection and try again.'
 )
 } finally {
 setLoading(false)
 }
 }

 const handleSubmit = (e) => {
 e.preventDefault()
 handleSend()
 }

 const handleKeyDown = (e) => {
 if (e.key ==='Enter' && !e.shiftKey) {
 e.preventDefault()
 handleSend()
 }
 }

 const canSend = input.trim().length > 0 && !loading

 return (
 <AnimatePresence>
 {isOpen && (
 <motion.div
 key="backdrop"
 className="fixed inset-0 z-40"
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 transition={{ duration: DURATION.fast, ease: EASE }}
 >
 <div
 className="absolute inset-0 bg-[#0F172A]/15 backdrop-blur-[2px]"
 onClick={onClose}
 aria-hidden="true"
 />
 </motion.div>
 )}

 {isOpen && (
 <motion.aside
 key="drawer"
 role="dialog"
 aria-modal="true"
 aria-labelledby="assistant-title"
 initial={{ x:'100%', opacity: 0 }}
 animate={{ x: 0, opacity: 1 }}
 exit={{ x:'100%', opacity: 0 }}
 transition={{ duration: 0.32, ease: EASE }}
 className="fixed inset-y-0 right-0 z-50 flex h-full w-full flex-col border-l border-line bg-surface shadow-[-10px_0_40px_rgba(0,0,0,0.12)] sm:max-w-[420px] lg:max-w-[450px] xl:max-w-[480px]"
 >
 {/* Header */}
 <header className="flex shrink-0 items-center justify-between border-b border-line bg-surface-secondary/50 px-5 py-4">
 <div className="flex items-center gap-3">
 <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-emphasis">
 <Sparkles className="h-[18px] w-[18px]" aria-hidden="true" />
 </div>
 <div className="min-w-0">
 <h2
 id="assistant-title"
 className="tech-label flex items-center gap-1.5 text-ink"
 >
 Pathfinder AI
 </h2>
 <p className="truncate text-[11px] text-ink-400">
 Your personal learning assistant
 </p>
 </div>
 </div>
 <div className="flex items-center gap-2">
 <span className="hidden items-center gap-1.5 rounded-full border border-success-200 bg-success-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-success-600 sm:inline-flex">
 <span className="h-1.5 w-1.5 rounded-full bg-success-500" />
 Online
 </span>
 <button
 onClick={onClose}
 className="group rounded-lg p-2 text-ink-400 transition-colors duration-150 hover:bg-surface-secondary hover:text-ink focus:outline-none"
 aria-label="Close assistant"
 >
 <X
 className="h-[18px] w-[18px] transition-transform duration-150 group-hover:rotate-90"
 aria-hidden="true"
 />
 </button>
 </div>
 </header>

 {/* Quick actions */}
 <div className="shrink-0 border-b border-line px-5 py-3">
 <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-ink-400">
 How can I help?
 </p>
 <div className="grid grid-cols-2 gap-1.5">
 {QUICK_PROMPTS.map((p) => {
 const Icon = p.icon
 return (
 <button
 key={p.id}
 type="button"
 onClick={() => handleSend(p.send)}
 disabled={loading}
 className="group flex items-center gap-2 rounded-lg border border-line bg-surface-secondary/60 px-2.5 py-2 text-left text-[11px] font-medium text-ink-400 shadow-soft transition-all duration-150 hover:-translate-y-px hover:border-primary-200 hover:bg-primary-50/60 hover:shadow-card hover:text-primary-700 disabled:opacity-50"
 >
 <Icon
 className="h-3.5 w-3.5 shrink-0 text-ai-500 transition-colors group-hover:text-primary-500"
 aria-hidden="true"
 />
 <span className="truncate">{p.label}</span>
 </button>
 )
 })}
 </div>
 </div>

 {/* Messages */}
 <div
 ref={messageListRef}
 className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-5 py-5 scrollbar-thin"
 >
 <div className="space-y-4">
 {messages.map((m, idx) => {
 const isUser = m.role ==='user'
 return (
 <motion.div
 key={idx}
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.22, ease: EASE }}
 className={cn('flex', isUser ?'justify-end' :'justify-start')}
 >
 {!isUser && (
 <div className="mr-2.5 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 text-white">
 <Bot className="h-3.5 w-3.5" aria-hidden="true" />
 </div>
 )}
 <div className={cn('flex max-w-[82%] flex-col', isUser ?'items-end' :'items-start')}>
 <div
 className={cn(
'rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed',
 isUser
 ?'rounded-tr-sm bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-soft'
 :'rounded-tl-sm border border-line bg-surface-secondary text-ink shadow-soft'
 )}
 >
 <p className="whitespace-pre-wrap">{m.content}</p>
 </div>
 {m.time && (
 <span className="mt-1 text-[9px] font-medium uppercase tracking-wide text-ink-400/70">
 {m.time}
 </span>
 )}
 </div>
 </motion.div>
 )
 })}

 {loading && (
 <div className="flex justify-start">
 <div className="mr-2.5 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 text-white">
 <Bot className="h-3.5 w-3.5" aria-hidden="true" />
 </div>
 <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm border border-line bg-surface-secondary px-3.5 py-2.5">
 <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ai-500" />
 <span className="text-xs text-ink-400">Analyzing your roadmap...</span>
 </div>
 </div>
 )}
 <div ref={chatEndRef} />
 </div>
 </div>

 {/* Input */}
 <div className="shrink-0 border-t border-line bg-surface-secondary/40 px-4 pt-3 [padding-bottom:max(0.75rem,env(safe-area-inset-bottom))]">
 <form onSubmit={handleSubmit} className="flex items-end gap-2">
 <textarea
 ref={inputRef}
 value={input}
 onChange={(e) => setInput(e.target.value)}
 onKeyDown={handleKeyDown}
 rows={1}
 placeholder="Ask Pathfinder about skills, milestones..."
 aria-label="Message Pathfinder AI"
 className="max-h-32 min-h-[44px] w-full resize-none rounded-xl border border-line-strong bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-500 outline-none transition-colors focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
 />
 <button
 type="submit"
 disabled={!canSend}
 className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-emphasis transition-all duration-150 hover:from-primary-600 hover:to-primary-700 disabled:cursor-not-allowed disabled:opacity-45"
 aria-label="Send message"
 >
 <Send className="h-4 w-4" aria-hidden="true" />
 </button>
 </form>
 <div className="mt-1.5 flex items-center justify-between text-[9px] font-medium text-ink-400/80">
 <span className="flex items-center gap-1">
 <CornerDownLeft className="h-2.5 w-2.5" aria-hidden="true" />
 Enter to send
 </span>
 <span className="flex items-center gap-1">
 <Check className="h-2.5 w-2.5" aria-hidden="true" />
 Synchronized with your path
 </span>
 </div>
 </div>
 </motion.aside>
 )}
 </AnimatePresence>
 )
}
