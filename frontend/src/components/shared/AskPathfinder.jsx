import { useState, useRef, useEffect } from 'react'
import PropTypes from 'prop-types'
import { Sparkles, X, Send, Bot, User, ArrowRight, CornerDownLeft } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { Button } from '../ui/Button'
import { EASE } from '../../lib/motion'
import api from '../../services/api'
import useUserStore from '../../store/useUserStore'
import usePathStore from '../../store/usePathStore'

const QUICK_PROMPTS = [
  { id: 'next', label: 'What should I learn next?' },
  { id: 'milestone', label: 'Explain my current milestone' },
  { id: 'progress', label: 'Review my progress' },
  { id: 'gaps', label: 'Identify my skill gaps' },
]

AskPathfinder.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
}

export function AskPathfinder({ isOpen, onClose }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        'Welcome to Pathfinder AI. I am your specialized learning advisor, synchronized with your active roadmap and skill verification graph. How can I assist your engineering progression today?',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const chatEndRef = useRef(null)
  const inputRef = useRef(null)
  const drawerRef = useRef(null)

  const { profile } = useUserStore()
  const { path } = usePathStore()

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [isOpen])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const handleSend = async (queryText) => {
    const textToSend = queryText || input
    if (!textToSend.trim() || loading) return

    const userMsg = textToSend.trim()
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)

    try {
      let queryPrompt = userMsg
      if (userMsg === 'Explain my current milestone') {
        const currentMilestone = path?.milestones?.find((m) =>
          m.nodes?.some((n) => n.status === 'in_progress' || n.status === 'available')
        ) || path?.milestones?.[0]
        if (currentMilestone) {
          queryPrompt = `Please explain my current milestone "${currentMilestone.title}" (Milestone #${currentMilestone.number}) in detail, why it is sequenced here, and how to master it efficiently.`
        }
      } else if (userMsg === 'Identify my skill gaps') {
        queryPrompt = `Review my current target role (${profile?.target_role || profile?.goal || 'Engineering'}) and tell me what skill gaps I need to address next.`
      }

      const res = await api.sendChatMessage(
        queryPrompt,
        messages.map((m) => ({ role: m.role, content: m.content }))
      )

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: res.reply || 'Analysis completed according to your learning path.',
        },
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            'Unable to communicate with the Pathfinder AI advisor. Please check your network connection and try again.',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[80] flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-labelledby="assistant-title"
        >
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: EASE }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Assistant Drawer Panel */}
          <motion.div
            ref={drawerRef}
            initial={{ x: 420 }}
            animate={{ x: 0 }}
            exit={{ x: 420 }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            className="relative z-10 flex h-full w-full max-w-lg flex-col border-l border-surface-700 bg-surface-950 shadow-2xl"
          >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-surface-800 px-5 py-4 bg-surface-900/70">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-[5px] border border-primary-400/40 bg-primary-400/10">
              <Sparkles className="h-3.5 w-3.5 text-primary-400" aria-hidden="true" />
            </div>
            <div>
              <p className="font-mono text-[10px] font-medium uppercase tracking-widest text-primary-400">
                &gt; PATHFINDER AI
              </p>
              <h2 id="assistant-title" className="text-sm font-semibold text-white">
                YOUR LEARNING ASSISTANT
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1 rounded-[4px] border border-surface-700 bg-surface-850 px-2 py-0.5 font-mono text-[10px] text-surface-400 uppercase">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              ONLINE
            </span>
            <button
              onClick={onClose}
              className="rounded-[6px] p-1.5 text-surface-400 transition-colors hover:bg-surface-800 hover:text-white focus:outline-none focus-visible:ring-1 focus-visible:ring-primary-400"
              aria-label="Close assistant"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="border-b border-surface-800/80 bg-surface-900/30 px-5 py-3">
          <p className="mb-2 font-mono text-[10px] font-medium uppercase tracking-wider text-surface-500">
            &gt; HOW CAN I HELP?
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p.id}
                onClick={() => handleSend(p.label)}
                disabled={loading}
                className="group flex items-center justify-between rounded-[6px] border border-surface-800 bg-surface-900/90 px-2.5 py-1.5 text-left text-xs font-medium text-surface-300 transition-all hover:border-primary-400/50 hover:bg-surface-850 hover:text-white disabled:opacity-50"
              >
                <span className="truncate">{p.label}</span>
                <ArrowRight className="h-3 w-3 shrink-0 text-surface-500 transition-transform group-hover:translate-x-0.5 group-hover:text-primary-400" />
              </button>
            ))}
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className="mb-1 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-surface-500">
                {m.role === 'user' ? (
                  <>
                    <span>&gt; YOU</span>
                    <User className="h-2.5 w-2.5" />
                  </>
                ) : (
                  <>
                    <Bot className="h-2.5 w-2.5 text-primary-400" />
                    <span className="text-primary-400/90">&gt; PATHFINDER AI</span>
                  </>
                )}
              </div>
              <div
                className={`rounded-[8px] p-3.5 text-xs sm:text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'border border-primary-400/40 bg-primary-400/10 text-white max-w-[85%]'
                    : 'border border-surface-800 bg-surface-900/90 text-surface-200 max-w-[95%]'
                }`}
              >
                <p className="whitespace-pre-wrap">{m.content}</p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex flex-col items-start">
              <div className="mb-1 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-primary-400">
                <Bot className="h-2.5 w-2.5 text-primary-400" />
                <span>&gt; ANALYZING CONTEXT</span>
              </div>
              <div className="flex items-center gap-2 rounded-[8px] border border-surface-800 bg-surface-900/90 p-3 text-xs text-surface-400">
                <span className="h-1.5 w-1.5 animate-ping rounded-full bg-primary-400" />
                <span className="font-mono">Processing path metadata…</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <div className="border-t border-surface-800 bg-surface-900/80 p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
            className="relative flex items-center"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Pathfinder about skills, milestones, or concepts…"
              disabled={loading}
              className="h-10 w-full rounded-[6px] border border-surface-700 bg-surface-950 px-3.5 pr-20 text-xs sm:text-sm text-white placeholder:text-surface-600 transition-colors focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400 disabled:opacity-50"
            />
            <div className="absolute right-1.5 flex items-center gap-1">
              <Button
                type="submit"
                size="sm"
                disabled={!input.trim() || loading}
                className="h-7 px-2.5 text-xs font-semibold"
              >
                <Send className="h-3 w-3" aria-hidden="true" />
                <span className="hidden sm:inline">Ask</span>
              </Button>
            </div>
          </form>
          <div className="mt-2 flex items-center justify-between font-mono text-[10px] text-surface-500">
            <span>Deterministic AI Advisor</span>
            <span className="flex items-center gap-1">
              Press Enter <CornerDownLeft className="h-2.5 w-2.5" />
            </span>
          </div>
        </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  )
}
