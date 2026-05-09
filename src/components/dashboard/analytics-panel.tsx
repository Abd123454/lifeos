'use client'

import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { translations } from '@/lib/i18n'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend
} from 'recharts'
import {
  TrendingUp, CheckSquare, Heart, DollarSign, Target, Activity, Zap,
  Award, BarChart3, Trophy, Flame, Star, Sparkles, Clock
} from 'lucide-react'
import { motion } from 'framer-motion'

interface Props {
  userId: string
  language: 'en' | 'ar'
}

const COLORS = ['#10b981', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4']

const CATEGORY_COLORS: Record<string, string> = {
  work: '#10b981',
  personal: '#14b8a6',
  health: '#f43f5e',
  finance: '#f59e0b',
  learning: '#8b5cf6',
  social: '#ec4899',
  creative: '#06b6d4',
  general: '#64748b',
}

export default function AnalyticsPanel({ userId, language }: Props) {
  const t = translations[language]
  const [data, setData] = useState<any>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    const loadAll = async () => {
      try {
        const [tasksRes, moodsRes, expensesRes, habitsRes, goalsRes] = await Promise.allSettled([
          fetch(`/api/tasks?userId=${userId}`),
          fetch(`/api/mood?userId=${userId}&days=30`),
          fetch(`/api/finance/expenses?userId=${userId}&days=30`),
          fetch(`/api/habits?userId=${userId}&days=14`),
          fetch(`/api/goals?userId=${userId}`),
        ])

        const tasksRaw = tasksRes.status === 'fulfilled' && tasksRes.value.ok ? await tasksRes.value.json() : []
        const moodsRaw = moodsRes.status === 'fulfilled' && moodsRes.value.ok ? await moodsRes.value.json() : []
        const expensesRaw = expensesRes.status === 'fulfilled' && expensesRes.value.ok ? await expensesRes.value.json() : []
        const habitsRaw = habitsRes.status === 'fulfilled' && habitsRes.value.ok ? await habitsRes.value.json() : []
        const goalsRaw = goalsRes.status === 'fulfilled' && goalsRes.value.ok ? await goalsRes.value.json() : []

        const tasks = Array.isArray(tasksRaw) ? tasksRaw : tasksRaw.tasks || []
        const moods = Array.isArray(moodsRaw) ? moodsRaw : moodsRaw.moods || []
        const expenses = Array.isArray(expensesRaw) ? expensesRaw : expensesRaw.expenses || []
        const habits = Array.isArray(habitsRaw) ? habitsRaw : habitsRaw.habits || []
        const goals = Array.isArray(goalsRaw) ? goalsRaw : goalsRaw.goals || []

        setData({ tasks, moods, expenses, habits, goals })
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    loadAll()
  }, [userId])

  // === Computed data (must be before any conditional returns for hooks rules) ===

  // === Weekly Trends (past 7 days) ===
  const weeklyTrendsData = useMemo(() => {
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { weekday: 'short', day: 'numeric' })

      const dayTasks = (data.tasks || []).filter((t: any) => {
        if (t.status !== 'completed') return false
        const taskDate = new Date(t.updatedAt || t.createdAt)
        return taskDate.toDateString() === d.toDateString()
      }).length

      const dayHabits = (data.habits || []).reduce((count: number, h: any) => {
        const hasLog = (h.habitLogs || []).some((l: any) => {
          const logDate = new Date(l.date)
          return logDate.toDateString() === d.toDateString() && l.value > 0
        })
        return count + (hasLog ? 1 : 0)
      }, 0)

      const dayMoods = (data.moods || []).filter((m: any) => {
        const moodDate = new Date(m.date)
        return moodDate.toDateString() === d.toDateString()
      })
      const dayMoodAvg = dayMoods.length > 0
        ? Math.round((dayMoods.reduce((s: number, m: any) => s + m.value, 0) / dayMoods.length) * 10) / 10
        : 0

      days.push({
        date: dateStr,
        tasks: dayTasks,
        habits: dayHabits,
        mood: dayMoodAvg,
      })
    }
    return days
  }, [data, language])

  // === Category Distribution ===
  const categoryData = useMemo(() => {
    const cats: Record<string, number> = {}
    ;(data.tasks || []).forEach((task: any) => {
      const cat = task.category || 'general'
      cats[cat] = (cats[cat] || 0) + 1
    })
    return Object.entries(cats).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      color: CATEGORY_COLORS[name] || CATEGORY_COLORS.general,
    }))
  }, [data])

  // === Streaks & Records ===
  const streaks = useMemo(() => {
    // Longest task completion streak
    const completedTasks = (data.tasks || [])
      .filter((t: any) => t.status === 'completed' && (t.updatedAt || t.createdAt))
      .sort((a: any, b: any) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())

    let longestTaskStreak = 0
    let currentStreak = 0
    let lastDate: Date | null = null
    // Count consecutive days with completed tasks
    const completedDays = new Set<string>()
    completedTasks.forEach((t: any) => {
      const d = new Date(t.updatedAt || t.createdAt).toDateString()
      completedDays.add(d)
    })
    const sortedDays = Array.from(completedDays).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
    for (const dayStr of sortedDays) {
      const d = new Date(dayStr)
      if (lastDate) {
        const diff = (lastDate.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
        if (diff <= 1.5) {
          currentStreak++
        } else {
          longestTaskStreak = Math.max(longestTaskStreak, currentStreak)
          currentStreak = 1
        }
      } else {
        currentStreak = 1
      }
      lastDate = d
    }
    longestTaskStreak = Math.max(longestTaskStreak, currentStreak, completedDays.size > 0 ? 1 : 0)

    // Best mood week
    let bestMoodWeek = 0
    if ((data.moods || []).length > 0) {
      const weekMoods: Record<string, number[]> = {}
      ;(data.moods || []).forEach((m: any) => {
        const d = new Date(m.date)
        const weekStart = new Date(d)
        weekStart.setDate(d.getDate() - d.getDay())
        const key = weekStart.toDateString()
        if (!weekMoods[key]) weekMoods[key] = []
        weekMoods[key].push(m.value)
      })
      Object.values(weekMoods).forEach((moods) => {
        const avg = moods.reduce((s, v) => s + v, 0) / moods.length
        bestMoodWeek = Math.max(bestMoodWeek, Math.round(avg * 10) / 10)
      })
    }

    // Highest habit completion day
    let highestHabitDay = 0
    const habitDays: Record<string, number> = {}
    ;(data.habits || []).forEach((h: any) => {
      ;(h.habitLogs || []).forEach((l: any) => {
        if (l.value > 0) {
          const d = new Date(l.date).toDateString()
          habitDays[d] = (habitDays[d] || 0) + 1
        }
      })
    })
    highestHabitDay = Math.max(0, ...Object.values(habitDays))

    return { longestTaskStreak, bestMoodWeek, highestHabitDay }
  }, [data])

  if (loading) return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[1, 2, 3, 4].map(i => (
        <Card key={i} className="animate-pulse card-elevated">
          <CardContent className="p-6"><div className="h-40 bg-muted rounded" /></CardContent>
        </Card>
      ))}
    </div>
  )

  const taskStatusCounts = (data.tasks || []).reduce((acc: any, t: any) => { acc[t.status] = (acc[t.status] || 0) + 1; return acc }, {} as Record<string, number>)
  const taskChartData = Object.entries(taskStatusCounts).map(([name, value]) => ({ name, value }))

  const moodChartData = (data.moods || []).slice(0, 30).map((m: any) => ({
    date: new Date(m.date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' }),
    value: m.value,
  })).reverse()

  const expenseByCat = (data.expenses || []).filter((e: any) => e.type === 'expense').reduce((acc: any, e: any) => { acc[e.category] = (acc[e.category] || 0) + e.amount; return acc }, {} as Record<string, number>)
  const expenseChartData = Object.entries(expenseByCat).map(([name, total]) => ({ name, total: total as number }))

  const avgMood = (data.moods || []).length > 0 ? ((data.moods || []).reduce((s: number, m: any) => s + m.value, 0) / (data.moods || []).length).toFixed(1) : '0'
  const taskCompletion = (data.tasks || []).length > 0 ? Math.round(((taskStatusCounts.completed || 0) / (data.tasks || []).length) * 100) : 0
  const activeGoals = (data.goals || []).filter((g: any) => g.status === 'active').length
  const totalExpenses = (data.expenses || []).filter((e: any) => e.type === 'expense').reduce((s: number, e: any) => s + e.amount, 0).toFixed(2)
  const habitCompletionRate = (data.habits || []).length > 0
    ? Math.round((data.habits || []).filter((h: any) => (h.habitLogs || []).some((l: any) => l.value > 0)).length / (data.habits || []).length * 100)
    : 0

  // === Productivity Score (0-100) ===
  const budgetAdherence = totalExpenses !== '0' ? Math.max(0, Math.min(100, 100 - (parseFloat(totalExpenses) / 50))) : 50
  const productivityScore = Math.round(
    taskCompletion * 0.30 +
    habitCompletionRate * 0.25 +
    (parseFloat(avgMood) / 10 * 100) * 0.25 +
    budgetAdherence * 0.20
  )

  const scoreColor = productivityScore >= 70
    ? { ring: '#10b981', text: 'text-emerald-600 dark:text-emerald-400', bg: 'from-emerald-500 to-teal-600', label: language === 'ar' ? 'ممتاز' : 'Excellent' }
    : productivityScore >= 40
    ? { ring: '#f59e0b', text: 'text-amber-600 dark:text-amber-400', bg: 'from-amber-500 to-orange-600', label: language === 'ar' ? 'جيد' : 'Good' }
    : { ring: '#ef4444', text: 'text-rose-600 dark:text-rose-400', bg: 'from-rose-500 to-pink-600', label: language === 'ar' ? 'يحتاج تحسين' : 'Needs Work' }

  // === Radar chart data for life balance ===
  const radarData = [
    { subject: language === 'ar' ? 'المهام' : 'Tasks', value: Math.min(100, taskCompletion + 20), fullMark: 100 },
    { subject: language === 'ar' ? 'المزاج' : 'Mood', value: Math.min(100, parseFloat(avgMood) * 10), fullMark: 100 },
    { subject: language === 'ar' ? 'العادات' : 'Habits', value: habitCompletionRate, fullMark: 100 },
    { subject: language === 'ar' ? 'الأهداف' : 'Goals', value: activeGoals > 0 ? Math.min(100, (data.goals || []).reduce((s: number, g: any) => s + g.progress, 0) / (data.goals || []).length) : 0, fullMark: 100 },
    { subject: language === 'ar' ? 'المالية' : 'Finance', value: Math.min(100, budgetAdherence), fullMark: 100 },
  ]

  const statCards = [
    { icon: CheckSquare, label: language === 'ar' ? 'إتمام المهام' : 'Task Completion', value: `${taskCompletion}%`, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/20', iconBg: 'bg-emerald-100 dark:bg-emerald-900/50', gradient: 'from-emerald-500 to-teal-600' },
    { icon: Heart, label: t.moodScore, value: avgMood, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/20', iconBg: 'bg-rose-100 dark:bg-rose-900/50', gradient: 'from-rose-500 to-pink-600' },
    { icon: DollarSign, label: language === 'ar' ? 'إجمالي المصروفات' : 'Total Expenses', value: `$${totalExpenses}`, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/20', iconBg: 'bg-amber-100 dark:bg-amber-900/50', gradient: 'from-amber-500 to-orange-600' },
    { icon: Target, label: language === 'ar' ? 'أهداف نشطة' : 'Active Goals', value: activeGoals, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-950/20', iconBg: 'bg-purple-100 dark:bg-purple-900/50', gradient: 'from-purple-500 to-violet-600' },
  ]

  // Productivity Score Ring SVG
  const radius = 70
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (productivityScore / 100) * circumference

  const stagger = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.08, duration: 0.4, ease: 'easeOut' },
    }),
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600">
          <BarChart3 className="w-4 h-4 text-white" />
        </div>
        <h3 className="text-lg font-semibold">{t.analytics}</h3>
      </div>

      {/* ===== Productivity Score ===== */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="card-elevated card-hover-lift overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              {/* Animated circular progress ring */}
              <div className="relative shrink-0">
                <svg width="180" height="180" viewBox="0 0 180 180" className="-rotate-90">
                  <defs>
                    <linearGradient id={`scoreGradient-${scoreColor.ring.replace('#', '')}`} x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor={scoreColor.ring} stopOpacity={1} />
                      <stop offset="100%" stopColor={scoreColor.ring} stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                  {/* Background ring */}
                  <circle
                    cx="90"
                    cy="90"
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="10"
                    className="text-muted/30"
                  />
                  {/* Progress ring */}
                  <motion.circle
                    cx="90"
                    cy="90"
                    r={radius}
                    fill="none"
                    stroke={scoreColor.ring}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
                  />
                </svg>
                {/* Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <motion.span
                    className={`text-4xl font-bold stat-value ${scoreColor.text}`}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.8, duration: 0.4 }}
                  >
                    {productivityScore}
                  </motion.span>
                  <span className="text-xs text-muted-foreground mt-0.5">
                    {language === 'ar' ? 'من 100' : 'out of 100'}
                  </span>
                </div>
              </div>

              {/* Score details */}
              <div className="flex-1 space-y-3 text-center md:text-start">
                <div>
                  <h3 className="text-lg font-bold">
                    {language === 'ar' ? 'نتيجة الإنتاجية' : 'Your Productivity Score'}
                  </h3>
                  <Badge className={`bg-gradient-to-r ${scoreColor.bg} text-white border-0 mt-1`}>
                    {scoreColor.label}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: language === 'ar' ? 'إتمام المهام' : 'Task Completion', value: `${taskCompletion}%`, weight: '30%' },
                    { label: language === 'ar' ? 'إتمام العادات' : 'Habit Completion', value: `${habitCompletionRate}%`, weight: '25%' },
                    { label: language === 'ar' ? 'متوسط المزاج' : 'Mood Average', value: `${avgMood}/10`, weight: '25%' },
                    { label: language === 'ar' ? 'التزام الميزانية' : 'Budget Adherence', value: `${Math.round(budgetAdherence)}%`, weight: '20%' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-2 p-2 rounded-lg bg-muted/40">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground truncate">{item.label}</p>
                        <p className="text-sm font-semibold stat-value">{item.value}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">({item.weight})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ===== Summary Stats ===== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            custom={i}
            variants={stagger}
            initial="hidden"
            animate="visible"
          >
            <Card className={`card-elevated card-hover-lift border-0 ${stat.bg} overflow-hidden`}>
              <CardContent className="p-5">
                <div className={`p-2 rounded-xl ${stat.iconBg} w-fit mb-3`}>
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className={`text-2xl font-bold mt-0.5 stat-value`}>{stat.value}</p>
                <div className={`h-0.5 w-8 bg-gradient-to-r ${stat.gradient} rounded-full mt-2`} />
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* ===== Weekly Trends ===== */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="card-elevated card-hover-lift">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              {language === 'ar' ? 'الاتجاهات الأسبوعية' : 'Weekly Trends'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {weeklyTrendsData.some(d => d.tasks > 0 || d.habits > 0 || d.mood > 0) ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={weeklyTrendsData}>
                  <defs>
                    <linearGradient id="taskGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="habitGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="moodGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} width={25} />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(255,255,255,0.95)',
                      border: '1px solid rgba(0,0,0,0.1)',
                      borderRadius: '12px',
                      backdropFilter: 'blur(8px)',
                    }}
                  />
                  <Area type="monotone" dataKey="tasks" name={language === 'ar' ? 'مهام مكتملة' : 'Tasks Completed'} stroke="#10b981" strokeWidth={2} fill="url(#taskGradient)" dot={{ r: 3, fill: '#10b981' }} />
                  <Area type="monotone" dataKey="habits" name={language === 'ar' ? 'عادات مكتملة' : 'Habits Completed'} stroke="#f59e0b" strokeWidth={2} fill="url(#habitGradient)" dot={{ r: 3, fill: '#f59e0b' }} />
                  <Area type="monotone" dataKey="mood" name={language === 'ar' ? 'متوسط المزاج' : 'Mood Avg'} stroke="#f43f5e" strokeWidth={2} fill="url(#moodGradient)" dot={{ r: 3, fill: '#f43f5e' }} />
                  <Legend />
                </AreaChart>
              </ResponsiveContainer>
            ) : <p className="text-center text-muted-foreground py-8">{t.noData}</p>}
          </CardContent>
        </Card>
      </motion.div>

      {/* ===== Charts Grid ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Task Status Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="card-elevated card-hover-lift">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-500" />
                {language === 'ar' ? 'توزيع حالة المهام' : 'Task Status Distribution'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {taskChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={taskChartData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} strokeWidth={2}>
                      {taskChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-muted-foreground py-8">{t.noData}</p>}
            </CardContent>
          </Card>
        </motion.div>

        {/* Mood Trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="card-elevated card-hover-lift">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-500" />
                {t.moodTrend}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {moodChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={moodChartData}>
                    <defs>
                      <linearGradient id="moodArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} width={25} />
                    <Tooltip />
                    <Area type="monotone" dataKey="value" stroke="#f43f5e" strokeWidth={2} fill="url(#moodArea)" dot={{ r: 2, fill: '#f43f5e' }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-muted-foreground py-8">{t.noData}</p>}
            </CardContent>
          </Card>
        </motion.div>

        {/* Category Distribution Donut */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="card-elevated card-hover-lift">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                {language === 'ar' ? 'توزيع الفئات' : 'Category Distribution'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {categoryData.length > 0 ? (
                <div className="flex flex-col items-center">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        dataKey="value"
                        strokeWidth={2}
                      >
                        {categoryData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap justify-center gap-2 mt-2">
                    {categoryData.map((cat) => {
                      const total = categoryData.reduce((s, c) => s + c.value, 0)
                      const pct = total > 0 ? Math.round((cat.value / total) * 100) : 0
                      return (
                        <div key={cat.name} className="flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: cat.color }}
                          />
                          <span className="text-xs text-muted-foreground">
                            {cat.name} <span className="font-semibold">{pct}%</span>
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : <p className="text-center text-muted-foreground py-8">{t.noData}</p>}
            </CardContent>
          </Card>
        </motion.div>

        {/* Expense by Category */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card className="card-elevated card-hover-lift">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-teal-500" />
                {language === 'ar' ? 'المصروفات حسب الفئة' : 'Expense by Category'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {expenseChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={expenseChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} width={35} />
                    <Tooltip />
                    <Bar dataKey="total" fill="#14b8a6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-muted-foreground py-8">{t.noData}</p>}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ===== Life Balance Radar (Enhanced) ===== */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <Card className="glass-card card-elevated card-hover-lift">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-500" />
              {language === 'ar' ? 'توازن الحياة' : 'Life Balance'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <defs>
                  <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.15} />
                  </linearGradient>
                </defs>
                <PolarGrid className="opacity-30" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fontWeight: 500 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                <Radar
                  name={language === 'ar' ? 'النتيجة' : 'Score'}
                  dataKey="value"
                  stroke="#10b981"
                  fill="url(#radarGradient)"
                  strokeWidth={2.5}
                />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>

      {/* ===== Streaks & Records ===== */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
      >
        <Card className="card-elevated">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              {language === 'ar' ? 'السلاسل والأرقام القياسية' : 'Streaks & Records'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Longest Task Streak */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.0 }}
                className="card-elevated card-hover-lift rounded-xl border border-border/50 p-4 bg-gradient-to-br from-emerald-50/50 to-teal-50/50 dark:from-emerald-950/20 dark:to-teal-950/20"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
                    <Flame className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {language === 'ar' ? 'أطول سلسلة مهام' : 'Longest Task Streak'}
                    </p>
                    <p className="text-2xl font-bold stat-value text-emerald-600 dark:text-emerald-400">
                      {streaks.longestTaskStreak}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {language === 'ar' ? 'أيام متتالية من إتمام المهام' : 'consecutive days completing tasks'}
                </p>
              </motion.div>

              {/* Best Mood Week */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.1 }}
                className="card-elevated card-hover-lift rounded-xl border border-border/50 p-4 bg-gradient-to-br from-rose-50/50 to-pink-50/50 dark:from-rose-950/20 dark:to-pink-950/20"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 shadow-lg shadow-rose-500/20">
                    <Star className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {language === 'ar' ? 'أفضل أسبوع مزاج' : 'Best Mood Week'}
                    </p>
                    <p className="text-2xl font-bold stat-value text-rose-600 dark:text-rose-400">
                      {streaks.bestMoodWeek > 0 ? streaks.bestMoodWeek : '—'}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {language === 'ar' ? 'متوسط المزاج الأسبوعي الأعلى' : 'highest weekly mood average'}
                </p>
              </motion.div>

              {/* Highest Habit Completion Day */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.2 }}
                className="card-elevated card-hover-lift rounded-xl border border-border/50 p-4 bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/20">
                    <Trophy className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {language === 'ar' ? 'أعلى يوم عادات' : 'Best Habit Day'}
                    </p>
                    <p className="text-2xl font-bold stat-value text-amber-600 dark:text-amber-400">
                      {streaks.highestHabitDay > 0 ? streaks.highestHabitDay : '—'}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {language === 'ar' ? 'عادات مكتملة في يوم واحد' : 'habits completed in a single day'}
                </p>
              </motion.div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ===== Goal Progress ===== */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0 }}
      >
        <Card className="card-elevated card-hover-lift">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="w-4 h-4 text-amber-500" />
              {t.goalProgress}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(data.goals || []).length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(data.goals || []).map((g: any) => (
                  <div key={g.id} className="p-3 rounded-xl border border-border/50 hover:bg-muted/30 transition-colors card-elevated">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium">{g.title}</span>
                      <span className={`font-bold stat-value ${g.progress >= 80 ? 'text-emerald-600 dark:text-emerald-400' : g.progress >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {g.progress}%
                      </span>
                    </div>
                    <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          g.progress >= 80 ? 'bg-gradient-to-r from-emerald-500 to-teal-500' :
                          g.progress >= 50 ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
                          'bg-gradient-to-r from-rose-500 to-pink-500'
                        }`}
                        style={{ width: `${g.progress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <Badge variant="outline" className="text-[10px]">{g.category || 'general'}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {g.status === 'completed' ? '✅ Completed' : g.status === 'active' ? '🔥 Active' : g.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-center text-muted-foreground py-8">{t.noData}</p>}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
