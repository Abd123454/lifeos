'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Plus, Check, Flame, Target, TrendingUp, Award, Zap, Calendar, PartyPopper, Sparkles } from 'lucide-react'
import { translations } from '@/lib/i18n'
import { motion, AnimatePresence, useSpring } from 'framer-motion'

interface Props {
  userId: string
  language: 'en' | 'ar'
}

const habitColors = [
  { bg: 'from-emerald-400 to-teal-500', light: 'bg-emerald-50 dark:bg-emerald-950/20', ring: '#10b981' },
  { bg: 'from-cyan-400 to-teal-500', light: 'bg-cyan-50 dark:bg-cyan-950/20', ring: '#06b6d4' },
  { bg: 'from-amber-400 to-orange-500', light: 'bg-amber-50 dark:bg-amber-950/20', ring: '#f59e0b' },
  { bg: 'from-rose-400 to-pink-500', light: 'bg-rose-50 dark:bg-rose-950/20', ring: '#f43f5e' },
  { bg: 'from-purple-400 to-pink-500', light: 'bg-purple-50 dark:bg-purple-950/20', ring: '#8b5cf6' },
  { bg: 'from-teal-400 to-green-500', light: 'bg-teal-50 dark:bg-teal-950/20', ring: '#14b8a6' },
]

// Confetti particle component
function ConfettiParticle({ delay }: { delay: number }) {
  const colors = ['#10b981', '#f59e0b', '#f43f5e', '#06b6d4', '#8b5cf6', '#14b8a6']
  const color = colors[Math.floor(Math.random() * colors.length)]
  const xOffset = (Math.random() - 0.5) * 300
  const yOffset = -(Math.random() * 200 + 100)

  return (
    <motion.div
      className="absolute w-2 h-2 rounded-full"
      style={{ backgroundColor: color, left: '50%', top: '50%' }}
      initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
      animate={{
        x: xOffset,
        y: yOffset,
        scale: 0,
        opacity: 0,
        rotate: Math.random() * 720,
      }}
      transition={{ duration: 1.5, delay, ease: 'easeOut' }}
    />
  )
}

export default function HabitsPanel({ userId, language }: Props) {
  const t = translations[language]
  const [habits, setHabits] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', icon: '🎯', color: '#10b981', frequency: 'daily', target: '1' })
  const [justCompleted, setJustCompleted] = useState<string | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)

  const loadHabits = async () => {
    if (!userId) return
    try {
      const res = await fetch(`/api/habits?userId=${userId}&days=14`)
      if (res.ok) {
        const data = await res.json()
        setHabits(Array.isArray(data) ? data : data.habits || [])
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadHabits() }, [userId])

  const addHabit = async () => {
    if (!form.name) return
    await fetch('/api/habits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ...form, target: parseInt(form.target) }),
    })
    setDialogOpen(false)
    setForm({ name: '', description: '', icon: '🎯', color: '#10b981', frequency: 'daily', target: '1' })
    loadHabits()
  }

  const logHabit = useCallback(async (habitId: string) => {
    setJustCompleted(habitId)
    await fetch('/api/habits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, habitId, date: new Date().toISOString() }),
    })
    await loadHabits()
    setTimeout(() => setJustCompleted(null), 800)

    // Check if all habits are now completed
    const updatedRes = await fetch(`/api/habits?userId=${userId}&days=14`)
    if (updatedRes.ok) {
      const updatedData = await updatedRes.json()
      const updatedHabits = Array.isArray(updatedData) ? updatedData : updatedData.habits || []
      const todayStr = new Date().toDateString()
      const allDone = updatedHabits.length > 0 && updatedHabits.every((h: any) =>
        (h.habitLogs || []).some((l: any) => new Date(l.date).toDateString() === todayStr && l.value > 0)
      )
      if (allDone) {
        setShowConfetti(true)
        setTimeout(() => setShowConfetti(false), 3000)
      }
    }
  }, [userId])

  const getStreak = (habit: any) => {
    if (!habit.habitLogs) return 0
    const logs = [...habit.habitLogs].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
    let streak = 0
    const today = new Date()
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today)
      checkDate.setDate(checkDate.getDate() - i)
      const hasLog = logs.some((l: any) => {
        const logDate = new Date(l.date)
        return logDate.toDateString() === checkDate.toDateString() && l.value > 0
      })
      if (hasLog) streak++
      else if (i > 0) break
    }
    return streak
  }

  const getLast7Days = () => {
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      days.push(d)
    }
    return days
  }

  const totalCompletedToday = habits.filter(h =>
    (h.habitLogs || []).some((l: any) => new Date(l.date).toDateString() === new Date().toDateString() && l.value > 0)
  ).length
  const completionRate = habits.length > 0 ? Math.round((totalCompletedToday / habits.length) * 100) : 0
  const longestStreak = habits.length > 0 ? Math.max(...habits.map(getStreak)) : 0
  const totalLogs = habits.reduce((acc, h) => acc + (h.habitLogs || []).filter((l: any) => l.value > 0).length, 0)
  const allDoneToday = habits.length > 0 && totalCompletedToday === habits.length

  if (loading) return <div className="space-y-3">{[1,2,3].map(i => <Card key={i} className="card-elevated animate-pulse"><CardContent className="p-6"><div className="h-20 bg-muted rounded" /></CardContent></Card>)}</div>

  const days = getLast7Days()
  const todayStr = new Date().toDateString()

  return (
    <div className="space-y-4 relative">
      {/* Confetti overlay */}
      <AnimatePresence>
        {showConfetti && (
          <div className="fixed inset-0 pointer-events-none z-50">
            {Array.from({ length: 30 }).map((_, i) => (
              <ConfettiParticle key={i} delay={i * 0.03} />
            ))}
            <motion.div
              className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.3 }}
            >
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-2xl">
                <PartyPopper className="w-12 h-12 mx-auto text-amber-500 mb-2" />
                <p className="font-bold text-lg">All Done! 🎉</p>
                <p className="text-sm text-muted-foreground">You completed all habits today!</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/25">
            <Target className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">{t.habits}</h3>
            <p className="text-xs text-muted-foreground">Build consistency</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 ${
              allDoneToday
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 pulse-glow'
                : 'bg-muted text-muted-foreground hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/20 dark:hover:text-emerald-400'
            }`}
            onClick={() => {
              const el = document.getElementById('habits-list')
              el?.scrollIntoView({ behavior: 'smooth' })
            }}
          >
            <Calendar className="w-3.5 h-3.5 inline me-1" />
            Today
          </motion.button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/25"><Plus className="w-4 h-4 me-2" />{t.addHabit}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-amber-500" />{t.addHabit}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder={t.name} value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                <Input placeholder={t.description} value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="Icon (emoji)" value={form.icon} onChange={e => setForm({...form, icon: e.target.value})} />
                  <Input placeholder="Color" value={form.color} onChange={e => setForm({...form, color: e.target.value})} />
                </div>
                <Input placeholder="Frequency (daily/weekly)" value={form.frequency} onChange={e => setForm({...form, frequency: e.target.value})} />
                <Button onClick={addHabit} className="w-full bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/25">{t.save}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Completion Ring - glass */}
        <Card className="glass card-elevated border-0 bg-gradient-to-br from-emerald-50/80 to-teal-50/80 dark:from-emerald-950/30 dark:to-teal-950/30">
          <CardContent className="p-5 flex flex-col items-center">
            <div className="relative w-20 h-20 mb-2">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" className="text-muted/30" strokeWidth="3" />
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#10b981" strokeWidth="3" strokeDasharray={`${completionRate}, 100`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold stat-value">{completionRate}%</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Today&apos;s Progress</p>
          </CardContent>
        </Card>

        <Card className="card-elevated border-0 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="p-5">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/50 w-fit mb-3">
              <Flame className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <p className="text-xs text-muted-foreground">Longest Streak</p>
            <p className="text-xl font-bold stat-value">{longestStreak} <span className="text-sm font-normal text-muted-foreground">days</span></p>
          </CardContent>
        </Card>

        <Card className="card-elevated border-0 bg-cyan-50 dark:bg-cyan-950/20">
          <CardContent className="p-5">
            <div className="p-2 rounded-xl bg-cyan-100 dark:bg-cyan-900/50 w-fit mb-3">
              <Award className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            </div>
            <p className="text-xs text-muted-foreground">Total Check-ins</p>
            <p className="text-xl font-bold stat-value">{totalLogs}</p>
          </CardContent>
        </Card>

        <Card className="card-elevated border-0 bg-purple-50 dark:bg-purple-950/20">
          <CardContent className="p-5">
            <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-900/50 w-fit mb-3">
              <Zap className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <p className="text-xs text-muted-foreground">Active Habits</p>
            <p className="text-xl font-bold stat-value">{habits.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Calendar Header - gradient background */}
      <Card className="card-elevated overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-50/50 via-transparent to-teal-50/50 dark:from-emerald-950/10 dark:to-teal-950/10">
          <CardContent className="p-4">
            <div className="grid grid-cols-8 gap-2 text-center text-xs text-muted-foreground">
              <div className="font-medium">Habit</div>
              {days.map(d => {
                const isToday = d.toDateString() === todayStr
                return (
                  <div key={d.toDateString()} className={`py-1.5 rounded-lg transition-all duration-200 ${isToday ? 'bg-emerald-100 dark:bg-emerald-900/50 font-bold text-emerald-700 dark:text-emerald-400 shadow-sm' : ''}`}>
                    <div>{d.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { weekday: 'short' })}</div>
                    <div className={`text-base ${isToday ? 'font-bold' : ''}`}>{d.getDate()}</div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </div>
      </Card>

      {/* Habit Cards */}
      <div id="habits-list">
        {habits.length === 0 ? (
          <Card className="card-elevated"><CardContent className="p-8 text-center text-muted-foreground">{t.noData}</CardContent></Card>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {habits.map((habit, i) => {
                const streak = getStreak(habit)
                const logs = habit.habitLogs || []
                const todayLogged = logs.some((l: any) => new Date(l.date).toDateString() === todayStr && l.value > 0)
                const colorScheme = habitColors[i % habitColors.length]
                const weeklyCompletion = days.filter(d =>
                  logs.some((l: any) => new Date(l.date).toDateString() === d.toDateString() && l.value > 0)
                ).length
                const weeklyProgress = Math.round((weeklyCompletion / 7) * 100)
                const isJustCompleted = justCompleted === habit.id

                return (
                  <motion.div
                    key={habit.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: i * 0.05, duration: 0.3 }}
                  >
                    <Card className={`card-elevated card-hover-lift transition-all duration-300 overflow-hidden ${todayLogged ? 'border-emerald-200 dark:border-emerald-800/50' : ''}`}>
                      <div className={`h-1 bg-gradient-to-r ${colorScheme.bg}`} />
                      <CardContent className="p-4">
                        <div className="grid grid-cols-8 gap-2 items-center">
                          {/* Habit Info */}
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{habit.icon}</span>
                              <div className="min-w-0">
                                <h4 className="font-semibold text-sm truncate">{habit.name}</h4>
                                <div className="flex items-center gap-1.5">
                                  {streak > 0 && (
                                    <motion.span
                                      className="flex items-center gap-0.5 text-xs text-amber-600 dark:text-amber-400"
                                      animate={streak >= 3 ? { scale: [1, 1.15, 1] } : {}}
                                      transition={streak >= 3 ? { duration: 0.6, repeat: Infinity, repeatDelay: 2 } : {}}
                                    >
                                      <Flame className={`w-3 h-3 ${streak >= 3 ? 'drop-shadow-[0_0_4px_rgba(245,158,11,0.6)]' : ''}`} />
                                      {streak}
                                    </motion.span>
                                  )}
                                  <Badge variant="outline" className="text-[10px] px-1 py-0">{weeklyCompletion}/7</Badge>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Week Days */}
                          {days.map(d => {
                            const log = logs.find((l: any) => new Date(l.date).toDateString() === d.toDateString())
                            const isToday = d.toDateString() === todayStr
                            const filled = log && log.value > 0
                            return (
                              <div key={d.toDateString()} className="flex justify-center">
                                {isToday ? (
                                  <motion.button
                                    onClick={() => !todayLogged && logHabit(habit.id)}
                                    className={`card-hover-lift w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all duration-200 ${
                                      filled
                                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                                        : 'border-2 border-dashed border-emerald-400 dark:border-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer'
                                    }`}
                                    disabled={filled}
                                    whileTap={!filled ? { scale: 0.85 } : {}}
                                  >
                                    {filled ? (
                                      <motion.div
                                        initial={isJustCompleted ? { scale: 0 } : { scale: 1 }}
                                        animate={{ scale: 1 }}
                                        transition={isJustCompleted ? { type: 'spring', stiffness: 300, damping: 15 } : {}}
                                      >
                                        <Check className="w-4 h-4" />
                                      </motion.div>
                                    ) : ''}
                                  </motion.button>
                                ) : (
                                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${
                                    filled
                                      ? 'bg-emerald-500 text-white'
                                      : 'bg-muted/50'
                                  }`}>
                                    {filled ? <Check className="w-3 h-3" /> : ''}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>

                        {/* Weekly progress bar */}
                        <div className="mt-3 pt-2 border-t border-border/30">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-muted/50 rounded-full overflow-hidden">
                              <motion.div
                                className={`h-full rounded-full bg-gradient-to-r ${colorScheme.bg}`}
                                initial={{ width: 0 }}
                                animate={{ width: `${weeklyProgress}%` }}
                                transition={{ duration: 0.8, delay: i * 0.05, ease: 'easeOut' }}
                              />
                            </div>
                            <span className="text-[10px] text-muted-foreground font-medium stat-value min-w-[28px] text-end">{weeklyCompletion}/7</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
