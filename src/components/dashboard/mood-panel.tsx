'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Plus, Smile, Frown, Meh, TrendingUp, TrendingDown, Activity, Heart, Calendar, Flame, ArrowUpRight, ArrowDownRight, BarChart3, Zap } from 'lucide-react'
import { translations } from '@/lib/i18n'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  userId: string
  language: 'en' | 'ar'
}

const COLORS = ['#10b981', '#14b8a6', '#f59e0b', '#6b7280', '#ef4444', '#8b5cf6']
const moodEmojis: Record<string, string> = { happy: '😊', calm: '😌', energetic: '⚡', tired: '😴', anxious: '😰', sad: '😢' }
const moodLabels: Record<string, string> = { happy: 'Happy', calm: 'Calm', energetic: 'Energetic', tired: 'Tired', anxious: 'Anxious', sad: 'Sad' }

export default function MoodPanel({ userId, language }: Props) {
  const t = translations[language]
  const [moods, setMoods] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [hoveredDay, setHoveredDay] = useState<{ date: Date; value: number | null; label: string | null } | null>(null)
  const [form, setForm] = useState({ value: 7, label: 'happy', notes: '', date: new Date().toISOString().split('T')[0] })

  const loadMoods = async () => {
    if (!userId) return
    try {
      const res = await fetch(`/api/mood?userId=${userId}&days=30`)
      if (res.ok) {
        const data = await res.json()
        setMoods(Array.isArray(data) ? data : data.moods || [])
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadMoods() }, [userId])

  const addMood = async () => {
    await fetch('/api/mood', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ...form, date: new Date(form.date) }),
    })
    setDialogOpen(false)
    setForm({ value: 7, label: 'happy', notes: '', date: new Date().toISOString().split('T')[0] })
    loadMoods()
  }

  const chartData = moods.map(m => ({
    date: new Date(m.date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' }),
    value: m.value,
  })).reverse()

  const labelCounts = moods.reduce((acc, m) => {
    if (m.label) acc[m.label] = (acc[m.label] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  const pieData = Object.entries(labelCounts).map(([name, value]) => ({ name, value }))

  const avgMood = moods.length > 0 ? (moods.reduce((s, m) => s + m.value, 0) / moods.length).toFixed(1) : '0'
  const highestMood = moods.length > 0 ? Math.max(...moods.map(m => m.value)) : 0
  const lowestMood = moods.length > 0 ? Math.min(...moods.map(m => m.value)) : 0
  const topMoodLabel = Object.entries(labelCounts).sort((a, b) => b[1] - a[1])[0]

  // ===== Mood Streaks =====
  const calculateStreak = (): number => {
    const sortedMoods = [...moods].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    if (sortedMoods.length === 0) return 0
    let streak = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (let i = 0; i < 60; i++) {
      const checkDate = new Date(today)
      checkDate.setDate(checkDate.getDate() - i)
      const dateStr = checkDate.toDateString()
      const dayMood = sortedMoods.find((m: any) => new Date(m.date).toDateString() === dateStr)
      if (dayMood && dayMood.value >= 6) {
        streak++
      } else {
        break
      }
    }
    return streak
  }

  const moodStreak = calculateStreak()

  // ===== Mood Insights =====
  // Most frequent mood this month
  const monthMoods = moods.filter(m => {
    const d = new Date(m.date)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const monthLabelCounts = monthMoods.reduce((acc, m) => {
    if (m.label) acc[m.label] = (acc[m.label] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  const mostFrequentMood = Object.entries(monthLabelCounts).sort((a, b) => b[1] - a[1])[0]

  // Average mood this week vs last week
  const now = new Date()
  const startOfThisWeek = new Date(now)
  startOfThisWeek.setDate(now.getDate() - now.getDay())
  startOfThisWeek.setHours(0, 0, 0, 0)
  const startOfLastWeek = new Date(startOfThisWeek)
  startOfLastWeek.setDate(startOfLastWeek.getDate() - 7)

  const thisWeekMoods = moods.filter(m => {
    const d = new Date(m.date)
    return d >= startOfThisWeek
  })
  const lastWeekMoods = moods.filter(m => {
    const d = new Date(m.date)
    return d >= startOfLastWeek && d < startOfThisWeek
  })

  const thisWeekAvg = thisWeekMoods.length > 0 ? thisWeekMoods.reduce((s, m) => s + m.value, 0) / thisWeekMoods.length : 0
  const lastWeekAvg = lastWeekMoods.length > 0 ? lastWeekMoods.reduce((s, m) => s + m.value, 0) / lastWeekMoods.length : 0
  const weekTrend = thisWeekAvg - lastWeekAvg

  // Best day of the week for mood
  const weekdayMoods: Record<number, { total: number; count: number }> = {}
  moods.forEach(m => {
    const day = new Date(m.date).getDay()
    if (!weekdayMoods[day]) weekdayMoods[day] = { total: 0, count: 0 }
    weekdayMoods[day].total += m.value
    weekdayMoods[day].count++
  })
  const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const weekdayNamesAr = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
  let bestDay = { day: 0, avg: 0 }
  Object.entries(weekdayMoods).forEach(([day, data]) => {
    const avg = data.total / data.count
    if (avg > bestDay.avg) bestDay = { day: Number(day), avg }
  })

  // Mood volatility (standard deviation)
  const calculateStdDev = (): number => {
    if (moods.length < 2) return 0
    const mean = moods.reduce((s, m) => s + m.value, 0) / moods.length
    const squaredDiffs = moods.map(m => Math.pow(m.value - mean, 2))
    return Math.sqrt(squaredDiffs.reduce((s, d) => s + d, 0) / moods.length)
  }
  const volatility = calculateStdDev()
  const volatilityLabel = volatility < 1 ? 'Stable' : volatility < 2 ? 'Moderate' : 'Variable'
  const volatilityColor = volatility < 1 ? 'text-emerald-600 dark:text-emerald-400' : volatility < 2 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'

  const getMoodEmoji = (value: number) => {
    if (value >= 8) return '😊'
    if (value >= 6) return '🙂'
    if (value >= 4) return '😐'
    if (value >= 2) return '😟'
    return '😢'
  }

  const getMoodColor = (value: number) => {
    if (value >= 8) return 'bg-emerald-500 text-white'
    if (value >= 6) return 'bg-teal-400 text-white'
    if (value >= 4) return 'bg-amber-400 text-white'
    if (value >= 2) return 'bg-orange-400 text-white'
    return 'bg-rose-500 text-white'
  }

  const getMoodColorHex = (value: number | null) => {
    if (!value) return 'transparent'
    if (value >= 8) return '#10b981'
    if (value >= 6) return '#2dd4bf'
    if (value >= 4) return '#fbbf24'
    if (value >= 2) return '#fb923c'
    return '#f43f5e'
  }

  // Generate mood calendar heatmap (last 5 weeks)
  const generateCalendarData = () => {
    const weeks = []
    const today = new Date()
    for (let w = 4; w >= 0; w--) {
      const week = []
      for (let d = 6; d >= 0; d--) {
        const date = new Date(today)
        date.setDate(date.getDate() - (w * 7 + d))
        const dateStr = date.toDateString()
        const mood = moods.find((m: any) => new Date(m.date).toDateString() === dateStr)
        week.push({
          date,
          value: mood ? mood.value : null,
          label: mood ? mood.label : null,
        })
      }
      weeks.push(week)
    }
    return weeks
  }

  if (loading) return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[1, 2].map(i => (
        <Card key={i} className="animate-pulse card-elevated">
          <CardContent className="p-6"><div className="h-40 bg-muted rounded shimmer" /></CardContent>
        </Card>
      ))}
    </div>
  )

  const calendarData = generateCalendarData()
  const isToday = (date: Date) => date.toDateString() === new Date().toDateString()

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600">
            <Heart className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-lg font-semibold">{t.mood}</h3>

          {/* Mood Streak */}
          {moodStreak > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                moodStreak >= 3
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white pulse-glow'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span className="stat-value">{moodStreak}</span>
              <span className="hidden sm:inline">{moodStreak === 1 ? 'day' : 'days'}</span>
            </motion.div>
          )}
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 me-2" />{t.addMood}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t.addMood}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="text-center">
                <span className="text-5xl">{getMoodEmoji(form.value)}</span>
                <p className="text-2xl font-bold mt-2 stat-value">{form.value}/10</p>
              </div>
              <Slider value={[form.value]} onValueChange={([v]) => setForm({...form, value: v})} min={1} max={10} step={1} />
              <div className="flex gap-2 flex-wrap justify-center">
                {Object.entries(moodEmojis).map(([key, emoji]) => (
                  <Button key={key} size="sm" variant={form.label === key ? 'default' : 'outline'} onClick={() => setForm({...form, label: key})} className={form.label === key ? 'bg-emerald-600' : ''}>
                    {emoji} {moodLabels[key]}
                  </Button>
                ))}
              </div>
              <Input placeholder={t.notes} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
              <Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
              <Button onClick={addMood} className="w-full bg-emerald-600 hover:bg-emerald-700">{t.save}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="card-elevated card-hover-lift border-0 bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/20 dark:to-pink-950/20">
          <CardContent className="p-5 text-center">
            <p className="text-3xl font-bold text-rose-600 dark:text-rose-400 stat-value">{avgMood}</p>
            <p className="text-xs text-muted-foreground mt-1">{t.moodScore}</p>
            <div className="h-0.5 w-8 bg-gradient-to-r from-rose-500 to-pink-600 rounded-full mx-auto mt-2" />
          </CardContent>
        </Card>
        <Card className="card-elevated card-hover-lift border-0 bg-emerald-50 dark:bg-emerald-950/20">
          <CardContent className="p-5 text-center">
            <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 stat-value">{highestMood}</p>
            <p className="text-xs text-muted-foreground mt-1">Best Day</p>
            <span className="text-lg">{getMoodEmoji(highestMood)}</span>
          </CardContent>
        </Card>
        <Card className="card-elevated card-hover-lift border-0 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="p-5 text-center">
            <p className="text-3xl font-bold text-amber-600 dark:text-amber-400 stat-value">{moods.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Entries</p>
            <span className="text-lg">📝</span>
          </CardContent>
        </Card>
        <Card className="card-elevated card-hover-lift border-0 bg-purple-50 dark:bg-purple-950/20">
          <CardContent className="p-5 text-center">
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 stat-value">
              {topMoodLabel ? moodEmojis[topMoodLabel[0]] : '—'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Top Mood</p>
            <p className="text-xs text-muted-foreground font-medium">{topMoodLabel ? moodLabels[topMoodLabel[0]] : 'N/A'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Mood Insights Card */}
      <Card className="glass-card card-elevated overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500" />
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            Mood Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Most Frequent Mood This Month */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
              <div className="text-3xl">{mostFrequentMood ? moodEmojis[mostFrequentMood[0]] : '—'}</div>
              <div>
                <p className="text-xs text-muted-foreground">Most Frequent</p>
                <p className="font-semibold text-sm">{mostFrequentMood ? moodLabels[mostFrequentMood[0]] : 'N/A'}</p>
                <p className="text-xs text-muted-foreground">{mostFrequentMood ? `${mostFrequentMood[1]} times this month` : ''}</p>
              </div>
            </div>

            {/* Average Mood: This Week vs Last Week */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                {weekTrend >= 0 ? (
                  <ArrowUpRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Week vs Week</p>
                <p className="font-semibold text-sm stat-value">{thisWeekAvg.toFixed(1)} vs {lastWeekAvg.toFixed(1)}</p>
                <p className={`text-xs font-medium ${weekTrend >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {weekTrend >= 0 ? '↑' : '↓'} {Math.abs(weekTrend).toFixed(1)}
                </p>
              </div>
            </div>

            {/* Best Day of the Week */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/40">
                <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Best Weekday</p>
                <p className="font-semibold text-sm">{language === 'ar' ? weekdayNamesAr[bestDay.day] : weekdayNames[bestDay.day]}</p>
                <p className="text-xs text-muted-foreground">avg {bestDay.avg.toFixed(1)}/10</p>
              </div>
            </div>

            {/* Mood Volatility */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/40">
                <BarChart3 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Volatility</p>
                <p className={`font-semibold text-sm stat-value ${volatilityColor}`}>{volatilityLabel}</p>
                <p className="text-xs text-muted-foreground">σ = {volatility.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mood Calendar Heatmap */}
      <Card className="glass card-elevated overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-500" />
            Mood Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1.5">
              {['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(day => (
                <div key={day} className="text-center text-xs text-muted-foreground font-medium py-1">{day}</div>
              ))}
            </div>
            <AnimatePresence>
              {calendarData.map((week, wi) => (
                <motion.div
                  key={wi}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: wi * 0.05 }}
                  className="grid grid-cols-7 gap-1.5"
                >
                  {week.map((day, di) => {
                    const today = isToday(day.date)
                    return (
                      <div
                        key={di}
                        className="relative group"
                        onMouseEnter={() => setHoveredDay(day)}
                        onMouseLeave={() => setHoveredDay(null)}
                      >
                        <motion.div
                          className={`aspect-square rounded-md flex items-center justify-center text-xs font-medium transition-all cursor-default ${
                            day.value ? getMoodColor(day.value) : 'bg-muted/30'
                          } ${today ? 'ring-2 ring-emerald-500 ring-offset-1 ring-offset-background' : ''}`}
                          animate={today ? { scale: [1, 1.05, 1] } : {}}
                          transition={today ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : {}}
                        >
                          {day.value ? day.value : ''}
                        </motion.div>
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                          <div className="bg-popover text-popover-foreground text-xs rounded-lg px-2.5 py-1.5 shadow-lg border whitespace-nowrap">
                            <p className="font-medium">{day.date.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                            {day.value ? (
                              <p className="text-muted-foreground">{day.value}/10 {moodEmojis[day.label || ''] || ''}</p>
                            ) : (
                              <p className="text-muted-foreground">No entry</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          {/* Legend */}
          <div className="flex items-center justify-center gap-2 mt-3">
            <span className="text-xs text-muted-foreground">Low</span>
            {[
              { color: 'bg-rose-500', label: '1-2' },
              { color: 'bg-orange-400', label: '3-4' },
              { color: 'bg-amber-400', label: '5-6' },
              { color: 'bg-teal-400', label: '7-8' },
              { color: 'bg-emerald-500', label: '9-10' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-1">
                <div className={`w-3 h-3 rounded-md ${item.color}`} />
              </div>
            ))}
            <span className="text-xs text-muted-foreground">High</span>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="card-elevated overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-rose-500" />
              {t.moodTrend}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="moodAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} width={25} />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#f43f5e" strokeWidth={2} fill="url(#moodAreaGrad)" dot={{ r: 3, fill: '#f43f5e' }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="card-elevated overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-500" />
              Mood Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" label={({ name }) => `${moodEmojis[name] || ''} ${moodLabels[name] || name}`} strokeWidth={2}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-center text-muted-foreground py-8">{t.noData}</p>}
          </CardContent>
        </Card>
      </div>

      {/* Recent Entries */}
      <Card className="card-elevated overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Meh className="w-4 h-4 text-teal-500" />
            Recent Moods
          </CardTitle>
        </CardHeader>
        <CardContent className="max-h-64 overflow-y-auto custom-scrollbar">
          <div className="space-y-2">
            {moods.slice(0, 15).map((m, i) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center justify-between text-sm p-2.5 rounded-lg hover:bg-muted/50 transition-colors card-hover-lift"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{getMoodEmoji(m.value)}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold stat-value">{m.value}/10</span>
                      {m.label && <Badge variant="outline" className="text-xs">{moodEmojis[m.label]} {moodLabels[m.label] || m.label}</Badge>}
                    </div>
                    {m.notes && <p className="text-xs text-muted-foreground truncate max-w-48 mt-0.5">{m.notes}</p>}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">{new Date(m.date).toLocaleDateString()}</span>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
