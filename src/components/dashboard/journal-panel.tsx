'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Plus, BookOpen, PenLine, Calendar, Sparkles, Heart } from 'lucide-react'
import { translations } from '@/lib/i18n'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  userId: string
  language: 'en' | 'ar'
}

const moodConfig: Record<string, { emoji: string; label: string; gradient: string; bg: string; border: string; color: string }> = {
  happy: { emoji: '😊', label: 'Happy', gradient: 'from-emerald-400 to-teal-500', bg: 'bg-emerald-50 dark:bg-emerald-950/20', border: 'border-emerald-200 dark:border-emerald-800/50', color: '#10b981' },
  calm: { emoji: '😌', label: 'Calm', gradient: 'from-cyan-400 to-teal-500', bg: 'bg-cyan-50 dark:bg-cyan-950/20', border: 'border-cyan-200 dark:border-cyan-800/50', color: '#06b6d4' },
  energetic: { emoji: '⚡', label: 'Energetic', gradient: 'from-amber-400 to-orange-500', bg: 'bg-amber-50 dark:bg-amber-950/20', border: 'border-amber-200 dark:border-amber-800/50', color: '#f59e0b' },
  tired: { emoji: '😴', label: 'Tired', gradient: 'from-gray-400 to-gray-500', bg: 'bg-gray-50 dark:bg-gray-950/20', border: 'border-gray-200 dark:border-gray-800/50', color: '#6b7280' },
  anxious: { emoji: '😰', label: 'Anxious', gradient: 'from-orange-400 to-red-500', bg: 'bg-orange-50 dark:bg-orange-950/20', border: 'border-orange-200 dark:border-orange-800/50', color: '#f97316' },
  sad: { emoji: '😢', label: 'Sad', gradient: 'from-rose-400 to-pink-500', bg: 'bg-rose-50 dark:bg-rose-950/20', border: 'border-rose-200 dark:border-rose-800/50', color: '#f43f5e' },
}

const motivationalQuotes = [
  "Every day is a new beginning. Take a deep breath and start again.",
  "Your journal is your private universe. Make it beautiful.",
  "Writing is the best way to talk without being interrupted.",
  "The palest ink is better than the best memory.",
  "Start where you are. Use what you have. Do what you can.",
  "Your story matters. Keep writing it.",
  "Today's thoughts are tomorrow's memories.",
  "One word at a time, you build your world.",
  "Reflect. Release. Renew.",
  "The page is patient — it waits for your truth.",
]

export default function JournalPanel({ userId, language }: Props) {
  const t = translations[language]
  const [entries, setEntries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ title: '', content: '', mood: 'calm', tags: '', date: new Date().toISOString().split('T')[0] })
  const [animatingCheckin, setAnimatingCheckin] = useState<string | null>(null)

  const loadEntries = async () => {
    if (!userId) return
    try {
      const res = await fetch(`/api/journal?userId=${userId}&days=30`)
      if (res.ok) {
        const data = await res.json()
        setEntries(Array.isArray(data) ? data : data.journals || [])
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadEntries() }, [userId])

  const addEntry = async () => {
    if (!form.content) return
    setAnimatingCheckin('new')
    await fetch('/api/journal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ...form, date: new Date(form.date) }),
    })
    setDialogOpen(false)
    setForm({ title: '', content: '', mood: 'calm', tags: '', date: new Date().toISOString().split('T')[0] })
    loadEntries()
    setTimeout(() => setAnimatingCheckin(null), 600)
  }

  // Stats
  const totalEntries = entries.length
  const moodCounts = entries.reduce((acc, e) => {
    if (e.mood) acc[e.mood] = (acc[e.mood] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  const topMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]
  const wordsWritten = entries.reduce((s, e) => s + (e.content?.split(/\s+/).length || 0), 0)
  const todayQuote = motivationalQuotes[new Date().getDate() % motivationalQuotes.length]

  if (loading) return <div className="space-y-3">{[1,2,3].map(i => <Card key={i} className="card-elevated animate-pulse"><CardContent className="p-6"><div className="h-24 bg-muted rounded" /></CardContent></Card>)}</div>

  return (
    <div className="space-y-4">
      {/* Header with gradient background */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-rose-500/10 dark:from-amber-500/20 dark:via-orange-500/10 dark:to-rose-500/20 p-4 -m-0">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(245, 158, 11, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(244, 63, 94, 0.1) 0%, transparent 50%)' }} />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/25">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">{t.journal}</h3>
              <p className="text-xs text-muted-foreground">Reflect & grow</p>
            </div>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/25"><Plus className="w-4 h-4 me-2" />{t.addJournal}</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle className="flex items-center gap-2"><PenLine className="w-5 h-5 text-amber-500" />{t.addJournal}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <Input placeholder={t.title} value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
                <Textarea placeholder="Write your thoughts..." rows={5} value={form.content} onChange={e => setForm({...form, content: e.target.value})} />
                <div>
                  <p className="text-sm font-medium mb-2">How are you feeling?</p>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(moodConfig).map(([key, config]) => (
                      <motion.button
                        key={key}
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setForm({...form, mood: key})}
                        className={`card-hover-lift flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all duration-200 ${
                          form.mood === key
                            ? `border-emerald-500 ${config.bg} shadow-md`
                            : 'border-transparent bg-muted/50 hover:bg-muted'
                        }`}
                      >
                        <span className="text-2xl">{config.emoji}</span>
                        <span className="text-xs font-medium">{config.label}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>
                <Input placeholder="Tags (comma separated)" value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} />
                <Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                <Button onClick={addEntry} className="w-full bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/25">
                  <motion.span
                    animate={animatingCheckin === 'new' ? { scale: [1, 1.2, 1] } : {}}
                    transition={{ duration: 0.4 }}
                  >
                    <Sparkles className="w-4 h-4 me-2 inline" />
                  </motion.span>
                  {t.save}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Stats - glass-card */}
      <div className="glass-card rounded-xl p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card className="card-elevated border-0 bg-amber-50 dark:bg-amber-950/20">
            <CardContent className="p-5 text-center">
              <PenLine className="w-5 h-5 mx-auto text-amber-600 dark:text-amber-400 mb-2" />
              <p className="text-2xl font-bold stat-value">{totalEntries}</p>
              <p className="text-xs text-muted-foreground">Entries</p>
            </CardContent>
          </Card>
          <Card className="card-elevated border-0 bg-purple-50 dark:bg-purple-950/20">
            <CardContent className="p-5 text-center">
              <Sparkles className="w-5 h-5 mx-auto text-purple-600 dark:text-purple-400 mb-2" />
              <p className="text-3xl font-bold stat-value bg-gradient-to-r from-purple-500 to-pink-500 text-gradient">{wordsWritten.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Words Written</p>
            </CardContent>
          </Card>
          <Card className="card-elevated border-0 bg-emerald-50 dark:bg-emerald-950/20 col-span-2 md:col-span-1">
            <CardContent className="p-5 text-center">
              <span className="text-2xl">{topMood ? moodConfig[topMood[0]]?.emoji : '✍️'}</span>
              <p className="text-lg font-bold mt-1 stat-value">{topMood ? moodConfig[topMood[0]]?.label : 'N/A'}</p>
              <p className="text-xs text-muted-foreground">Top Mood</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Journal Entries Timeline */}
      {entries.length === 0 ? (
        <Card className="card-elevated relative overflow-hidden noise-overlay">
          <CardContent className="relative z-10 p-10 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 flex items-center justify-center">
              <Heart className="w-8 h-8 text-amber-500" />
            </div>
            <p className="text-muted-foreground mb-2">{t.noData}</p>
            <p className="text-sm text-muted-foreground/70 italic">&ldquo;{todayQuote}&rdquo;</p>
          </CardContent>
        </Card>
      ) : (
        <div className="relative">
          {/* Timeline gradient connector */}
          <div className="absolute start-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-amber-400 via-emerald-400 to-teal-400 opacity-30 rounded-full" />

          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {entries.map((entry, i) => {
                const config = moodConfig[entry.mood] || moodConfig.calm
                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: i * 0.08, duration: 0.4, ease: 'easeOut' }}
                    className="relative ps-12"
                  >
                    {/* Timeline dot */}
                    <div className="absolute start-3.5 top-5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-800 shadow-md" style={{ backgroundColor: config.color }} />

                    <Card className={`card-elevated card-hover-lift transition-all duration-300 overflow-hidden ${config.border}`}>
                      <div className={`h-1 bg-gradient-to-r ${config.gradient}`} />
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`p-2.5 rounded-xl ${config.bg}`}>
                              <span className="text-xl">{config.emoji}</span>
                            </div>
                            <div>
                              <h4 className="font-semibold">{entry.title || 'Untitled Entry'}</h4>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(entry.date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                              </p>
                            </div>
                          </div>
                          <Badge className={`${config.bg} ${config.border} border text-xs`}>{config.label}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">{entry.content}</p>
                        {entry.tags && (
                          <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-border/50">
                            {entry.tags.split(',').map((tag: string) => (
                              <Badge key={tag} variant="outline" className="text-xs bg-muted/50">{tag.trim()}</Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  )
}
