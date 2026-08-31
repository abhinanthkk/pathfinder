import { useState, useRef, useEffect } from 'react'
import PropTypes from 'prop-types'
import { Sparkles, X, Send, Bot, User, CornerDownLeft } from 'lucide-react'
import api from '../../services/api'

const WELCOME = {
  role: 'assistant',
  content:
    "I'm Pathfinder AI. I can help you complete this screen — ask what a field means, how to choose a value, or any Pathfinder question.",
}

export function PathfinderAssistant({ context = null, label = 'Need help?' }) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([WELCOME])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const chatEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 150)
  }, [isOpen])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) setIsOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  const handleSend = async (e) => {
    e?.preventDefault()
    if (!input.trim() || loading) return

    const question = input.trim()
    setInput('')
    setError('')
    setMessages((prev) => [...prev, { role: 'user', content: question }])
    setLoading(true)

    try {
      const contextual =
        context && !question.toLowerCase().includes(context.field.toLowerCase())
          ? `[Current screen context: ${context.field}] ${question}`
          : question
      const res = await api.askQuestion(contextual)
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: res.answer || res.reply || 'I could not produce an answer right now.' },
      ])
    } catch {
      setError('Unable to reach Pathfinder AI. Please try again.')
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'I could not reach the assistant service. Please check your connection and try again.',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-[70] flex flex-col items-end">
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Pathfinder AI assistant"
          className="mb-3 flex h-[min(70vh,26rem)] w-[calc(100vw-2.5rem)] max-w-[22rem] flex-col overflow-hidden rounded-xl border border-line bg-white shadow-panel sm:w-[22rem]"
        >
          <div className="flex items-center justify-between border-b border-line bg-surface-secondary px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-50">
                <Sparkles className="h-3.5 w-3.5 text-primary-600" aria-hidden="true" />
              </div>
              <div>
                <p className="tech-label text-primary-600">Pathfinder AI</p>
                <h2 className="text-sm font-semibold text-ink">Learning Assistant</h2>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-surface-secondary hover:text-ink focus:outline-none focus-visible:ring-1 focus-visible:ring-primary-400"
              aria-label="Close assistant"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {context && (
              <div className="rounded-lg border border-line bg-surface-secondary px-3 py-2 text-xs text-ink-400">
                <span className="font-semibold text-primary-600">Context:</span> {context.field}
              </div>
            )}
            {messages.map((m, idx) => (
              <div key={idx} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-400">
                  {m.role === 'user' ? (
                    <>
                      <User className="h-2.5 w-2.5" aria-hidden="true" />
                      <span>You</span>
                    </>
                  ) : (
                    <>
                      <Bot className="h-2.5 w-2.5 text-primary-600" aria-hidden="true" />
                      <span className="text-primary-600">Pathfinder AI</span>
                    </>
                  )}
                </div>
                <div
                  className={`rounded-lg p-3 text-xs leading-relaxed ${
                    m.role === 'user'
                      ? 'max-w-[85%] bg-primary-600 text-white'
                      : 'max-w-[95%] border border-line bg-surface-secondary text-ink'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex flex-col items-start">
                <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-primary-600">
                  <Bot className="h-2.5 w-2.5 text-primary-600" aria-hidden="true" />
                  <span>Thinking…</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-line bg-surface-secondary p-3 text-xs text-ink-400">
                  <span className="h-1.5 w-1.5 animate-ping rounded-full bg-primary-600" />
                  <span>Consulting learning advisor…</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="border-t border-line bg-surface-secondary p-3">
            <form onSubmit={handleSend} className="relative flex items-center">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about a field or a concept…"
                disabled={loading}
                aria-label={error || 'Ask Pathfinder AI'}
                className="h-10 w-full rounded-lg border border-line-strong bg-white px-3.5 pr-16 text-xs text-ink placeholder:text-ink-500 transition-colors focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 disabled:opacity-50"
              />
              <div className="absolute right-1.5">
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="inline-flex h-7 items-center gap-1 rounded-md bg-primary-600 px-2.5 text-xs font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-40 disabled:hover:bg-primary-600"
                >
                  <Send className="h-3 w-3" aria-hidden="true" />
                  <span className="hidden sm:inline">Ask</span>
                </button>
              </div>
            </form>
            <div className="mt-2 flex items-center justify-between text-[10px] font-medium text-ink-400">
              <span>Pathfinder Learning Advisor</span>
              <span className="flex items-center gap-1">
                Esc <CornerDownLeft className="h-2.5 w-2.5" aria-hidden="true" />
              </span>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        aria-controls="pathfinder-assistant-panel"
        className="inline-flex items-center gap-2 rounded-lg border border-line-strong bg-white px-3.5 py-2.5 text-xs font-semibold text-ink shadow-raised transition-colors hover:border-primary-300 hover:text-primary-700 focus:outline-none focus-visible:ring-1 focus-visible:ring-primary-400"
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary-50">
          <Sparkles className="h-3 w-3 text-primary-600" aria-hidden="true" />
        </span>
        <span className="flex flex-col items-start leading-tight">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-primary-600">Pathfinder AI</span>
          <span className="text-ink-300">{label}</span>
        </span>
      </button>
    </div>
  )
}

PathfinderAssistant.propTypes = {
  context: PropTypes.shape({ field: PropTypes.string }),
  label: PropTypes.string,
}
