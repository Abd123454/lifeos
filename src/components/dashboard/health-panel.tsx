'use client'

import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Plus, Moon, Sun, BedDouble, AlarmClock, TrendingUp, Brain, Activity, Star, Zap, ArrowUpRight, ArrowDownRight, Calendar, Lightbulb, Trophy, Clock, Sparkles } from 'lucide-react'
import { translations } from '@/lib/i18n'
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend } from 'recharts'
import { motion } from 'framer-motion'

interface Props {
  userId: string
  language: 'en' | 'ar'
}

type TimeRange = 7 | 14 | 30

export default function HealthPanel({ userId, language }: Props) {
  const t = translations[language]
  const [sleeps, setSleeps] = useState<any[]>([])
  const [correlation, setCorrelation] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [timeRange, setTimeRange] = useState<TimeRange>(7)
  const [form, setForm] = useState({ date: '', bedtime: '22:00', wakeTime: '06:00', duration: '8', quality: '3', notes: '' })

  const loadData = async () => {
    if (!userId) return
    try {
      const [sleepRes, corrRes] = await Promise.allSettled([
        fetch(`/api/health/sleep?userId=${userId}&days=${timeRange}`),
        fetch(`/api/health/correlation?userId=${userId}&days=30`),
      ])
      if (sleepRes.status === 'fulfilled' && sleepRes.value.ok) {
        const sleepData = await sleepRes.value.json()
        setSleeps(Array.isArray(sleepData) ? sleepData : sleepData.sleeps || [])
      }
      if (corrRes.status === 'fulfilled' && corrRes.value.ok) setCorrelation(await corrRes.value.json())
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadData() }, [userId, timeRange])

  const addSleep = async () => {
    await fetch('/api/health/sleep', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ...form, duration: parseFloat(form.duration), quality: parseInt(form.quality) }),
    })
    setDialogOpen(false)
    loadData()
  }

  const chartData = sleeps.map(s => ({
    date: new Date(s.date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' }),
    quality: s.quality,
    duration: s.duration,
  })).reverse()

  const avgQuality = sleeps.length > 0 ? (sleeps.reduce((s, sl) => s + sl.quality, 0) / sleeps.length).toFixed(1) : '0'
  const avgDuration = sleeps.length > 0 ? (sleeps.reduce((s, sl) => s + sl.duration, 0) / sleeps.length).toFixed(1) : '0'
  const bestSleep = sleeps.length > 0 ? Math.max(...sleeps.map(s => s.quality)) : 0
  const sleepScore = sleeps.length > 0 ? Math.round((parseFloat(avgQuality) / 5) * 100) : 0

  // Comparison: This Week vs Last Week
  const { thisWeek, lastWeek } = useMemo(() => {
    const now = new Date()
    const startOfThisWeek = new Date(now)
    startOfThisWeek.setDate(now.getDate() - now.getDay())
    startOfThisWeek.setHours(0, 0, 0, 0)

    const startOfLastWeek = new Date(startOfThisWeek)
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7)

    const thisWeekSleeps = sleeps.filter(s => new Date(s.date) >= startOfThisWeek)
    const lastWeekSleeps = sleeps.filter(s => {
      const d = new Date(s.date)
      return d >= startOfLastWeek && d < startOfThisWeek
    })

    const avg = (arr: any[]) => arr.length > 0 ? arr.reduce((s, sl) => s + sl.duration, 0) / arr.length : 0

    return {
      thisWeek: { avgDuration: avg(thisWeekSleeps), count: thisWeekSleeps.length },
      lastWeek: { avgDuration: avg(lastWeekSleeps), count: lastWeekSleeps.length },
    }
  }, [sleeps])

  const durationChange = lastWeek.avgDuration > 0
    ? Math.round(((thisWeek.avgDuration - lastWeek.avgDuration) / lastWeek.avgDuration) * 100)
    : 0
  const isImprovement = durationChange > 0

  // Best sleep day of the week
  const bestSleepDay = useMemo(() => {
    if (sleeps.length === 0) return null
    const best = sleeps.reduce((best, s) => s.quality > best.quality ? s : best, sleeps[0])
    return {
      date: new Date(best.date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
      quality: best.quality,
      duration: best.duration,
    }
  }, [sleeps, language])

  // Average bedtime and wake time
  const { avgBedtime, avgWakeTime } = useMemo(() => {
    if (sleeps.length === 0) return { avgBedtime: null, avgWakeTime: null }

    const timeToMinutes = (time: string) => {
      const [h, m] = time.split(':').map(Number)
      return h * 60 + m
    }
    const minutesToTime = (mins: number) => {
      const h = Math.floor(mins / 60) % 24
      const m = Math.round(mins % 60)
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    }

    const bedtimes = sleeps.map(s => timeToMinutes(s.bedtime))
    const waketimes = sleeps.map(s => timeToMinutes(s.wakeTime))

    const avgBed = bedtimes.reduce((s, t) => s + t, 0) / bedtimes.length
    const avgWake = waketimes.reduce((s, t) => s + t, 0) / waketimes.length

    return {
      avgBedtime: minutesToTime(Math.round(avgBed)),
      avgWakeTime: minutesToTime(Math.round(avgWake)),
    }
  }, [sleeps])

  // Sleep tip based on data
  const sleepTip = useMemo(() => {
    if (sleeps.length === 0) return 'Start logging your sleep to get personalized insights.'
    const avg = parseFloat(avgDuration)
    const avgQ = parseFloat(avgQuality)
    if (avg < 6) return 'You\'re getting less than 6 hours of sleep on average. Try going to bed 30 minutes earlier this week.'
    if (avgQ < 3) return 'Your sleep quality is below average. Consider reducing screen time before bed and keeping a consistent schedule.'
    if (avg < 7) return 'You\'re close to the recommended 7-9 hours. A consistent bedtime could help you reach optimal sleep.'
    if (avgQ >= 4) return 'Great sleep habits! Keep maintaining your consistent schedule for continued quality rest.'
    return 'Try to maintain a consistent wake time, even on weekends, to regulate your circadian rhythm.'
  }, [sleeps, avgDuration, avgQuality])

  const getSleepScoreLabel = (score: number) => {
    if (score >= 80) return { label: 'Excellent', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/20' }
    if (score >= 60) return { label: 'Good', color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-50 dark:bg-teal-950/20' }
    if (score >= 40) return { label: 'Fair', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/20' }
    return { label: 'Needs Work', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/20' }
  }

  if (loading) return <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{[1,2].map(i => <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-40 bg-muted rounded" /></CardContent></Card>)}</div>

  const scoreInfo = getSleepScoreLabel(sleepScore)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-lg font-semibold">{t.health}</h3>
          {/* Time Range Selector */}
          <div className="flex items-center gap-1 ms-2">
            {([7, 14, 30] as TimeRange[]).map(days => (
              <Button
                key={days}
                variant={timeRange === days ? 'default' : 'outline'}
                size="sm"
                className={`h-7 px-3 text-xs ${
                  timeRange === days
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                }`}
                onClick={() => setTimeRange(days)}
              >
                {days}D
              </Button>
            ))}
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 me-2" />Log Sleep</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Log Sleep</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium flex items-center gap-1 mb-1"><BedDouble className="w-3 h-3" /> Bedtime</label>
                  <Input type="time" value={form.bedtime} onChange={e => setForm({...form, bedtime: e.target.value})} />
                </div>
                <div>
                  <label className="text-sm font-medium flex items-center gap-1 mb-1"><AlarmClock className="w-3 h-3" /> Wake Time</label>
                  <Input type="time" value={form.wakeTime} onChange={e => setForm({...form, wakeTime: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Duration (hrs)</label>
                  <Input type="number" step="0.1" value={form.duration} onChange={e => setForm({...form, duration: e.target.value})} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Quality (1-5)</label>
                  <Input type="number" min="1" max="5" value={form.quality} onChange={e => setForm({...form, quality: e.target.value})} />
                </div>
              </div>
              <Button onClick={addSleep} className="w-full bg-emerald-600 hover:bg-emerald-700">{t.save}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Sleep Score + Stats Row with decorative gradient orb */}
      <div className="relative">
        {/* Decorative gradient orb behind stats */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br from-emerald-400/20 to-teal-400/20 dark:from-emerald-500/10 dark:to-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-gradient-to-tr from-cyan-400/15 to-emerald-400/15 dark:from-cyan-500/8 dark:to-emerald-500/8 rounded-full blur-3xl pointer-events-none" />

        <div className="relative grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Sleep Score Card with glass + breathing animation */}
          <Card className="glass border-0 col-span-2 md:col-span-1 card-elevated">
            <CardContent className="p-5 flex flex-col items-center justify-center">
              <motion.div
                className="relative w-20 h-20 mb-2"
                animate={{
                  scale: [1, 1.03, 1],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" className="text-muted/30" strokeWidth="3" />
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="url(#scoreGradient)" strokeWidth="3" strokeDasharray={`${sleepScore}, 100`} strokeLinecap="round" />
                  <defs>
                    <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#14b8a6" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold stat-value">{sleepScore}</span>
                </div>
              </motion.div>
              <p className={`text-sm font-medium ${scoreInfo.color}`}>{scoreInfo.label}</p>
              <p className="text-xs text-muted-foreground">Sleep Score</p>
            </CardContent>
          </Card>

          {/* Stat Cards with card-elevated + card-hover-lift + stat-value + larger values */}
          {[
            { icon: Moon, label: t.sleepQuality, value: `${avgQuality}/5`, sub: 'Average quality', bg: 'bg-purple-50 dark:bg-purple-950/20', iconBg: 'bg-purple-100 dark:bg-purple-900/50', iconColor: 'text-purple-600 dark:text-purple-400', trend: parseFloat(avgQuality) >= 3 ? 'up' : 'down' },
            { icon: AlarmClock, label: t.sleepDuration, value: `${avgDuration}h`, sub: 'Average duration', bg: 'bg-cyan-50 dark:bg-cyan-950/20', iconBg: 'bg-cyan-100 dark:bg-cyan-900/50', iconColor: 'text-cyan-600 dark:text-cyan-400', trend: parseFloat(avgDuration) >= 7 ? 'up' : 'down' },
            { icon: Star, label: 'Best Night', value: `${bestSleep}/5`, sub: 'Peak quality', bg: 'bg-amber-50 dark:bg-amber-950/20', iconBg: 'bg-amber-100 dark:bg-amber-900/50', iconColor: 'text-amber-600 dark:text-amber-400', trend: 'up' },
          ].map(stat => (
            <Card key={stat.label} className={`border-0 ${stat.bg} card-elevated card-hover-lift`}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2 rounded-xl ${stat.iconBg} w-fit`}>
                    <stat.icon className={`w-4 h-4 ${stat.iconColor}`} />
                  </div>
                  {stat.trend === 'up' ? (
                    <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-rose-500" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="text-3xl font-bold mt-0.5 stat-value">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Sleep Comparison: This Week vs Last Week */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-0 overflow-hidden card-elevated">
          <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-500" />
              This Week vs Last Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {/* This Week */}
              <div className={`p-4 rounded-xl card-hover-lift ${isImprovement ? 'bg-emerald-50 dark:bg-emerald-950/20' : 'bg-rose-50 dark:bg-rose-950/20'}`}>
                <p className="text-xs text-muted-foreground mb-1">This Week</p>
                <p className={`text-2xl font-bold stat-value ${isImprovement ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {thisWeek.avgDuration > 0 ? thisWeek.avgDuration.toFixed(1) : '—'}h
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{thisWeek.count} nights</p>
              </div>
              {/* Last Week */}
              <div className="p-4 rounded-xl bg-muted/50 card-hover-lift">
                <p className="text-xs text-muted-foreground mb-1">Last Week</p>
                <p className="text-2xl font-bold text-muted-foreground stat-value">
                  {lastWeek.avgDuration > 0 ? lastWeek.avgDuration.toFixed(1) : '—'}h
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{lastWeek.count} nights</p>
              </div>
            </div>
            {/* Change Indicator */}
            {durationChange !== 0 && lastWeek.avgDuration > 0 && (
              <div className={`mt-3 flex items-center gap-2 text-sm font-medium ${
                isImprovement ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}>
                {isImprovement ? (
                  <ArrowUpRight className="w-4 h-4" />
                ) : (
                  <ArrowDownRight className="w-4 h-4" />
                )}
                <span>{isImprovement ? '↑' : '↓'} {Math.abs(durationChange)}% {isImprovement ? 'improvement' : 'decline'}</span>
              </div>
            )}
            {lastWeek.avgDuration === 0 && thisWeek.avgDuration > 0 && (
              <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <span>No last week data to compare</span>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Dual-Axis Chart: Duration Bars + Quality Line */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="card-elevated">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              {t.sleepDuration} & {t.sleepQuality}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={chartData}>
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.7} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis
                  yAxisId="duration"
                  orientation="left"
                  tick={{ fontSize: 11 }}
                  width={30}
                  label={{ value: 'hrs', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#14b8a6' } }}
                />
                <YAxis
                  yAxisId="quality"
                  orientation="right"
                  domain={[0, 5]}
                  tick={{ fontSize: 11 }}
                  width={30}
                  label={{ value: 'Q', angle: 90, position: 'insideRight', style: { fontSize: 10, fill: '#10b981' } }}
                />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                  formatter={(value: number, name: string) => {
                    if (name === 'duration') return [`${value}h`, 'Duration']
                    if (name === 'quality') return [`${value}/5`, 'Quality']
                    return [value, name]
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={30}
                  formatter={(value: string) => value === 'duration' ? 'Duration (hrs)' : 'Quality (1-5)'}
                />
                <Bar yAxisId="duration" dataKey="duration" fill="url(#barGrad)" radius={[4, 4, 0, 0]} barSize={20} name="duration" />
                <Line yAxisId="quality" type="monotone" dataKey="quality" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} name="quality" />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>

      {/* Area Charts with more vibrant gradients */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="card-elevated card-hover-lift">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              {t.sleepQuality} Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="qualityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.6} />
                    <stop offset="50%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} width={25} />
                <Tooltip />
                <Area type="monotone" dataKey="quality" stroke="#10b981" strokeWidth={2.5} fill="url(#qualityGrad)" dot={{ r: 3, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="card-elevated card-hover-lift">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-teal-500" />
              {t.sleepDuration}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="durationGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.6} />
                    <stop offset="50%" stopColor="#14b8a6" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={25} />
                <Tooltip />
                <Area type="monotone" dataKey="duration" stroke="#14b8a6" strokeWidth={2.5} fill="url(#durationGrad)" dot={{ r: 3, fill: '#14b8a6', strokeWidth: 2, stroke: '#fff' }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Correlation Insight */}
      {correlation && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-emerald-200 dark:border-emerald-800/50 overflow-hidden card-elevated">
            <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Brain className="w-4 h-4 text-emerald-500" />
                {t.correlation}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex flex-col items-center p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 card-hover-lift">
                  <span className="text-xs text-muted-foreground">Sleep Quality</span>
                  <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 stat-value">{correlation.avgSleepQuality?.toFixed(1) || 'N/A'}</span>
                </div>
                <div className="flex flex-col items-center p-3 rounded-xl bg-rose-50 dark:bg-rose-950/20 card-hover-lift">
                  <span className="text-xs text-muted-foreground">Avg Mood</span>
                  <span className="text-lg font-bold text-rose-600 dark:text-rose-400 stat-value">{correlation.avgMood?.toFixed(1) || 'N/A'}</span>
                </div>
                <div className="flex flex-col items-center p-3 rounded-xl bg-teal-50 dark:bg-teal-950/20 card-hover-lift">
                  <span className="text-xs text-muted-foreground">Correlation</span>
                  <span className="text-lg font-bold text-teal-600 dark:text-teal-400 stat-value">{correlation.correlation?.toFixed(2) || 'N/A'}</span>
                </div>
                <div className="flex flex-col items-center p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 card-hover-lift">
                  <span className="text-xs text-muted-foreground">Data Points</span>
                  <span className="text-lg font-bold text-amber-600 dark:text-amber-400 stat-value">{correlation.dataPoints || 0}</span>
                </div>
              </div>
              {correlation.insight && (
                <div className="mt-3 p-3 rounded-xl bg-muted/50 text-sm">
                  💡 {correlation.insight}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Sleep Insights Card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card className="border-0 overflow-hidden card-elevated">
          <div className="h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              Sleep Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Best Sleep Day */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 card-hover-lift">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/50">
                    <Trophy className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">Best Sleep Day</span>
                </div>
                {bestSleepDay ? (
                  <>
                    <p className="font-semibold text-sm">{bestSleepDay.date}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Quality: <span className="stat-value">{bestSleepDay.quality}/5</span> • <span className="stat-value">{bestSleepDay.duration}h</span></p>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">No data yet</p>
                )}
              </div>

              {/* Average Schedule */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-950/20 dark:to-cyan-950/20 card-hover-lift">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-teal-100 dark:bg-teal-900/50">
                    <Clock className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">Average Schedule</span>
                </div>
                {avgBedtime && avgWakeTime ? (
                  <>
                    <p className="font-semibold text-sm">
                      <BedDouble className="w-3.5 h-3.5 inline me-1" />{avgBedtime}
                      <span className="mx-2 text-muted-foreground">→</span>
                      <AlarmClock className="w-3.5 h-3.5 inline me-1" />{avgWakeTime}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">Avg bedtime → wake time</p>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">No data yet</p>
                )}
              </div>

              {/* Sleep Tip */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 card-hover-lift">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/50">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">Recommendation</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{sleepTip}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Sleep Log with hover animations */}
      <Card className="card-elevated">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BedDouble className="w-4 h-4 text-purple-500" />
            Sleep Log
          </CardTitle>
        </CardHeader>
        <CardContent className="max-h-72 overflow-y-auto custom-scrollbar">
          <div className="space-y-2">
            {sleeps.slice(0, 14).map(s => {
              const qualityColor = s.quality >= 4 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' :
                s.quality >= 3 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' :
                'bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300'
              return (
                <motion.div
                  key={s.id}
                  className="flex items-center justify-between text-sm p-2.5 rounded-lg hover:bg-muted/50 transition-colors cursor-default"
                  whileHover={{ scale: 1.01, originX: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-center min-w-[40px]">
                      <p className="text-xs text-muted-foreground">{new Date(s.date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { weekday: 'short' })}</p>
                      <p className="font-medium stat-value">{new Date(s.date).getDate()}</p>
                    </div>
                    <div>
                      <p className="font-medium">{s.bedtime} → {s.wakeTime}</p>
                      <p className="text-xs text-muted-foreground"><span className="stat-value">{s.duration}h</span> sleep</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={qualityColor}>Q: {s.quality}</Badge>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
