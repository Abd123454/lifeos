'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  MessageCircle, Send, Bot, User, Copy, ThumbsUp, ThumbsDown,
  RotateCcw, Download, Sparkles, Moon, ListChecks, Target, Wallet, Brain
} from 'lucide-react'
import { translations } from '@/lib/i18n'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  userId: string
  language: 'en' | 'ar'
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  reaction?: 'up' | 'down' | null
}

const suggestions = [
  { en: "What's my mood trend?", ar: 'ما هو اتجاه مزاجي؟', icon: Brain, color: 'from-rose-500 to-pink-600' },
  { en: 'Summarize my tasks', ar: 'لخص مهامي', icon: ListChecks, color: 'from-amber-500 to-orange-600' },
  { en: 'Give me a habit tip', ar: 'أعطني نصيحة عن العادات', icon: Sparkles, color: 'from-emerald-500 to-teal-600' },
  { en: "How's my budget?", ar: 'كيف ميزانيتي؟', icon: Wallet, color: 'from-cyan-500 to-blue-600' },
  { en: 'Set a goal for me', ar: 'ضع لي هدفاً', icon: Target, color: 'from-purple-500 to-pink-600' },
  { en: 'Analyze my sleep', ar: 'حلل نومي', icon: Moon, color: 'from-teal-500 to-emerald-600' },
]

export default function ChatPanel({ userId, language }: Props) {
  const t = translations[language]
  const isRTL = language === 'ar'

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const showSuggestions = messages.length < 3

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading])

  const sendMessage = useCallback(async (text?: string) => {
    const msgText = text || input.trim()
    if (!msgText || loading) return
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    const userMsg: Message = { role: 'user', content: msgText, timestamp: new Date(), reaction: null }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          message: msgText,
          history: messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.response || data.message || (isRTL ? 'عذراً، لم أتمكن من إنشاء رد.' : 'I apologize, but I couldn\'t generate a response.'),
          timestamp: new Date(),
          reaction: null,
        }])
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: isRTL ? 'عذراً، حدث خطأ. يرجى المحاولة مرة أخرى.' : 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date(),
          reaction: null,
        }])
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: isRTL ? 'عذراً، أواجه مشكلة في الاتصال. يرجى المحاولة مرة أخرى.' : 'Sorry, I\'m having trouble connecting. Please try again.',
        timestamp: new Date(),
        reaction: null,
      }])
    }
    setLoading(false)
  }, [input, loading, messages, userId, isRTL])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    // Auto-resize
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  const newChat = () => {
    setMessages([])
    setInput('')
  }

  const exportChat = () => {
    if (messages.length === 0) return
    const text = messages.map(m => `[${m.role === 'user' ? (isRTL ? 'أنت' : 'You') : (isRTL ? 'المساعد' : 'AI')}]\n${m.content}`).join('\n\n---\n\n')
    navigator.clipboard.writeText(text)
  }

  const copyMessage = (content: string, idx: number) => {
    navigator.clipboard.writeText(content)
    setCopiedIdx(idx)
    setTimeout(() => setCopiedIdx(null), 2000)
  }

  const toggleReaction = (idx: number, type: 'up' | 'down') => {
    setMessages(prev => prev.map((m, i) =>
      i === idx ? { ...m, reaction: m.reaction === type ? null : type } : m
    ))
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString(isRTL ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' })
  }

  const charCount = input.length
  const maxChars = 500

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)]">
      <Card className="flex-1 flex flex-col overflow-hidden">
        {/* Gradient top border */}
        <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-500" />

        {/* Header */}
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                {/* Online indicator */}
                <div className="absolute -bottom-0.5 -end-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-background" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm">{t.chat}</p>
                  <Badge className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-0 text-[10px] px-2 py-0 h-5">
                    AI Assistant
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-xs text-muted-foreground">
                    {isRTL ? 'متصل الآن' : 'Online'}
                  </p>
                  {messages.length > 0 && (
                    <>
                      <span className="text-muted-foreground/40">·</span>
                      <p className="text-xs text-muted-foreground">
                        {messages.length} {isRTL ? 'رسالة' : 'messages'}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={newChat}
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isRTL ? 'محادثة جديدة' : 'New Chat'}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={exportChat}
                    disabled={messages.length === 0}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isRTL ? 'تصدير المحادثة' : 'Export Chat'}</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </CardHeader>

        {/* Messages */}
        <CardContent className="flex-1 overflow-hidden p-0">
          <div ref={scrollRef} className="h-full overflow-y-auto p-4 space-y-4 scrollbar-thin">
            {/* Empty State / Welcome Screen */}
            {messages.length === 0 && !loading && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center h-full min-h-[300px] text-center"
              >
                <div className="relative mb-6">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                    <Bot className="w-10 h-10 text-white" />
                  </div>
                  <div className="absolute -bottom-1 -end-1 w-6 h-6 bg-emerald-500 rounded-full border-3 border-background flex items-center justify-center">
                    <Sparkles className="w-3 h-3 text-white" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  {isRTL ? 'مرحباً بك في مساعد LifeOS' : 'Welcome to LifeOS Assistant'}
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm mb-6">
                  {isRTL
                    ? 'أنا هنا لمساعدتك في إدارة مهامك، تتبع عاداتك، تحليل أنماط مزاجك، والمزيد.'
                    : 'I\'m here to help you manage your tasks, track your habits, analyze your mood patterns, and more.'}
                </p>

                {/* Suggestion chips in welcome */}
                <div className="flex flex-wrap justify-center gap-2 max-w-md">
                  {suggestions.map((s, i) => {
                    const Icon = s.icon
                    return (
                      <motion.button
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + i * 0.05 }}
                        onClick={() => sendMessage(isRTL ? s.ar : s.en)}
                        className="flex items-center gap-2 px-3 py-2 rounded-full border border-border/60 bg-background hover:bg-muted/80 text-sm transition-all duration-200 hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700"
                      >
                        <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${s.color} flex items-center justify-center shrink-0`}>
                          <Icon className="w-2.5 h-2.5 text-white" />
                        </div>
                        <span>{isRTL ? s.ar : s.en}</span>
                      </motion.button>
                    )
                  })}
                </div>
              </motion.div>
            )}

            {/* Message list */}
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`group flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-emerald-400 to-emerald-600'
                    : 'bg-gradient-to-br from-emerald-500 to-teal-600'
                }`}>
                  {msg.role === 'user'
                    ? <User className="w-4 h-4 text-white" />
                    : <Bot className="w-4 h-4 text-white" />
                  }
                </div>

                {/* Bubble */}
                <div className={`max-w-[80%] space-y-1.5 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`rounded-2xl px-4 py-3 text-sm relative ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-tr-md'
                      : 'bg-muted/80 border-s-4 border-s-teal-500 dark:border-s-teal-400 rounded-tl-md'
                  }`}>
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  </div>

                  {/* Meta row: timestamp + actions */}
                  <div className={`flex items-center gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <span className="text-[10px] text-muted-foreground/60">
                      {formatTime(msg.timestamp)}
                    </span>

                    {/* AI message actions */}
                    {msg.role === 'assistant' && (
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => copyMessage(msg.content, i)}
                              className="p-1 rounded hover:bg-muted transition-colors"
                            >
                              <Copy className={`w-3 h-3 ${copiedIdx === i ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {copiedIdx === i
                              ? (isRTL ? 'تم النسخ!' : 'Copied!')
                              : (isRTL ? 'نسخ' : 'Copy')
                            }
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => toggleReaction(i, 'up')}
                              className={`p-1 rounded hover:bg-muted transition-colors ${
                                msg.reaction === 'up' ? 'text-emerald-500' : 'text-muted-foreground'
                              }`}
                            >
                              <ThumbsUp className="w-3 h-3" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>{isRTL ? 'مفيد' : 'Helpful'}</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => toggleReaction(i, 'down')}
                              className={`p-1 rounded hover:bg-muted transition-colors ${
                                msg.reaction === 'down' ? 'text-rose-500' : 'text-muted-foreground'
                              }`}
                            >
                              <ThumbsDown className="w-3 h-3" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>{isRTL ? 'غير مفيد' : 'Not helpful'}</TooltipContent>
                        </Tooltip>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-muted/80 border-s-4 border-s-teal-500 dark:border-s-teal-400 rounded-2xl rounded-tl-md px-5 py-3.5">
                  <div className="flex gap-1.5 items-center">
                    <motion.div
                      className="w-2 h-2 bg-emerald-500 rounded-full"
                      animate={{ y: [0, -6, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                    />
                    <motion.div
                      className="w-2 h-2 bg-teal-500 rounded-full"
                      animate={{ y: [0, -6, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }}
                    />
                    <motion.div
                      className="w-2 h-2 bg-amber-500 rounded-full"
                      animate={{ y: [0, -6, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Suggestion chips below header when conversation is short */}
            {showSuggestions && messages.length > 0 && messages.length < 3 && !loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="pt-2"
              >
                <div className="flex flex-wrap gap-2">
                  {suggestions.slice(0, 4).map((s, i) => {
                    const Icon = s.icon
                    return (
                      <motion.button
                        key={i}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                        onClick={() => sendMessage(isRTL ? s.ar : s.en)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/60 bg-background hover:bg-muted/80 text-xs transition-all duration-200 hover:shadow-sm hover:border-emerald-300 dark:hover:border-emerald-700"
                      >
                        <div className={`w-4 h-4 rounded-full bg-gradient-to-br ${s.color} flex items-center justify-center shrink-0`}>
                          <Icon className="w-2 h-2 text-white" />
                        </div>
                        <span>{isRTL ? s.ar : s.en}</span>
                      </motion.button>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </div>
        </CardContent>

        {/* Input area */}
        <div className="border-t p-4">
          <form onSubmit={e => { e.preventDefault(); sendMessage() }} className="space-y-2">
            <div className="flex gap-2 items-end">
              <div className="flex-1 relative">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={handleTextareaChange}
                  onKeyDown={handleKeyDown}
                  placeholder={t.typeMessage}
                  disabled={loading}
                  rows={1}
                  maxLength={maxChars}
                  className="resize-none min-h-[40px] max-h-[120px] pr-3 py-2.5 text-sm"
                />
              </div>
              <Button
                type="submit"
                disabled={loading || !input.trim()}
                className="h-10 w-10 p-0 bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-md hover:shadow-lg transition-all duration-200 shrink-0"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground/50">
                {isRTL ? 'Shift + Enter لسطر جديد' : 'Shift + Enter for new line'}
              </span>
              <span className={`text-[10px] ${charCount > maxChars * 0.9 ? 'text-amber-500' : 'text-muted-foreground/50'}`}>
                {charCount}/{maxChars}
              </span>
            </div>
          </form>
        </div>
      </Card>
    </div>
  )
}
