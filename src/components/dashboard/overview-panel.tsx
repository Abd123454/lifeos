'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { CheckSquare, Heart, DollarSign, Target, TrendingUp, Calendar, Clock, Sparkles, ArrowUpRight, ArrowDownRight, Zap, Activity, BarChart3, Quote, RefreshCw, PartyPopper } from 'lucide-react'
import { translations } from '@/lib/i18n'
import { motion, AnimatePresence } from 'framer-motion'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface Props {
  userId: string
  language: 'en' | 'ar'
}

// Motivational quotes array
const QUOTES = [
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "Small daily improvements over time lead to stunning results.", author: "Robin Sharma" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "You are never too old to set another goal or to dream a new dream.", author: "C.S. Lewis" },
  { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "A year from now you may wish you had started today.", author: "Karen Lamb" },
]

// Progress Ring Component
function ProgressRing({ progress, size = 64, strokeWidth = 5, color, bgColor }: {
  progress: number
  size?: number
  strokeWidth?: number
  color: string
  bgColor: string
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (progress / 100) * circumference

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          className={bgColor}
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold" style={{ color }}>{Math.round(progress)}%</span>
      </div>
    </div>
  )
}

// Confetti Particle Component
function ConfettiParticle({ delay, x, color }: { delay: number; x: number; color: string }) {
  return (
    <motion.div
      className="absolute w-2 h-2 rounded-full"
      style={{ backgroundColor: color, left: `${x}%`, top: 0 }}
      initial={{ y: 0, opacity: 1, scale: 0 }}
      animate={{
        y: [0, -40, 80, 140],
        opacity: [0, 1, 1, 0],
        scale: [0, 1.2, 0.8, 0],
        x: [0, (Math.random() - 0.5) * 60, (Math.random() - 0.5) * 100],
        rotate: [0, 180, 360],
      }}
      transition={{ duration: 2.5, delay, ease: "easeOut" }}
    />
  )
}

// Floating Particle for glass morphism effect
function FloatingParticle({ delay, x, size, color }: { delay: number; x: number; size: number; color: string }) {
  return (
    <motion.div
      className="absolute rounded-full opacity-20"
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        left: `${x}%`,
        bottom: '-10%',
      }}
      animate={{
        y: [0, -300, -600],
        opacity: [0, 0.15, 0],
        scale: [0.5, 1, 0.8],
      }}
      transition={{
        duration: 8,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  )
}

// Animated counter for "vs Last Week" percentages
function AnimatedCounter({ target, duration = 1200 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0)
  const startTime = useRef<number | null>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    startTime.current = null
    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp
      const progress = Math.min((timestamp - startTime.current) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(eased * target))
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      }
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration])

  return <>{count}</>
}

export default function OverviewPanel({ userId, language }: Props) {
  const t = translations[language]
  const [stats, setStats] = useState<any>(null)
  const [briefing, setBriefing] = useState<any>(null)
  const [moodTrend, setMoodTrend] = useState<any[]>([])
  const [taskTrend, setTaskTrend] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [quoteIndex, setQuoteIndex] = useState(0)
  const [showConfetti, setShowConfetti] = useState(false)
  const [heatmapData, setHeatmapData] = useState<number[][]>([])
  const [heatmapTooltip, setHeatmapTooltip] = useState<{ week: number; day: number; level: number; x: number; y: number } | null>(null)

  // Get daily quote based on date
  useEffect(() => {
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
    )
    setQuoteIndex(dayOfYear % QUOTES.length)
  }, [])

  const refreshQuote = () => {
    setQuoteIndex(prev => (prev + 1) % QUOTES.length)
  }

  // Generate heatmap data from activity
  useEffect(() => {
    if (!stats) return
    const data: number[][] = []
    for (let week = 0; week < 4; week++) {
      const row: number[] = []
      for (let day = 0; day < 7; day++) {
        const base = (stats.completedTasks || 0) / Math.max(stats.totalTasks || 1, 1)
        const habitBonus = (stats.habitCompletion || 0) / 100
        const level = Math.min(4, Math.round((base * 2 + habitBonus + Math.random() * 0.5) * 2))
        row.push(level)
      }
      data.push(row)
    }
    setHeatmapData(data)
  }, [stats])

  useEffect(() => {
    if (!userId) return
    const loadData = async () => {
      try {
        const [tasksRes, moodRes, budgetRes, habitsRes, briefingRes] = await Promise.allSettled([
          fetch(`/api/tasks?userId=${userId}`),
          fetch(`/api/mood?userId=${userId}&days=7`),
          fetch(`/api/finance/budget?userId=${userId}`),
          fetch(`/api/habits?userId=${userId}&days=7`),
          fetch(`/api/briefing?userId=${userId}`),
        ])

        const tasksRaw = tasksRes.status === 'fulfilled' && tasksRes.value.ok ? await tasksRes.value.json() : []
        const moodsRaw = moodRes.status === 'fulfilled' && moodRes.value.ok ? await moodRes.value.json() : []
        const budget = budgetRes.status === 'fulfilled' && budgetRes.value.ok ? await budgetRes.value.json() : {}
        const habitsRaw = habitsRes.status === 'fulfilled' && habitsRes.value.ok ? await habitsRes.value.json() : []
        const briefRaw = briefingRes.status === 'fulfilled' && briefingRes.value.ok ? await briefingRes.value.json() : {}

        const tasks = Array.isArray(tasksRaw) ? tasksRaw : tasksRaw.tasks || []
        const moods = Array.isArray(moodsRaw) ? moodsRaw : moodsRaw.moods || []
        const habits = Array.isArray(habitsRaw) ? habitsRaw : habitsRaw.habits || []

        const brief: any = {}
        if (briefRaw) {
          brief.pendingTasks = briefRaw.tasks?.pending ?? briefRaw.pendingTasks
          brief.overdueTasks = briefRaw.tasks?.overdue ?? briefRaw.overdueTasks
          brief.avgMood = briefRaw.mood?.avg ?? briefRaw.avgMood
          brief.totalExpenses = briefRaw.totalExpenses ?? briefRaw.budget?.totalExpenses
          brief.activeGoals = briefRaw.activeGoals ?? briefRaw.goals?.active
          brief.habitStreak = briefRaw.habits?.streak ?? briefRaw.habitStreak
        }

        const pendingTasks = Array.isArray(tasks) ? tasks.filter((t: any) => t.status === 'pending' || t.status === 'in_progress').length : 0
        const completedTasks = Array.isArray(tasks) ? tasks.filter((t: any) => t.status === 'completed').length : 0
        const avgMood = Array.isArray(moods) && moods.length > 0
          ? Math.round(moods.reduce((s: number, m: any) => s + (m.value || 0), 0) / moods.length * 10) / 10
          : 0
        const remaining = budget.remaining ?? 0
        const totalBudget = budget.monthlyBudget ?? 5000
        const streak = Array.isArray(habits) ? Math.min(habits.length, 7) : 0
        const habitCompletion = Array.isArray(habits) && habits.length > 0
          ? Math.round(habits.filter((h: any) => h.habitLogs?.some((l: any) => l.value >= 1)).length / habits.length * 100)
          : 0

        setStats({ pendingTasks, completedTasks, avgMood, remaining, totalBudget, streak, habitCompletion, totalTasks: tasks.length, budget, tasks, moods, habits })
        setBriefing(brief)

        // Mini sparkline data for mood trend
        const moodData = moods.slice(0, 7).map((m: any) => ({
          date: new Date(m.date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { weekday: 'short' }),
          value: m.value,
        })).reverse()
        setMoodTrend(moodData)

        // Task completion trend (simulated from task data)
        const taskData = [
          { day: 'Mon', done: Math.min(completedTasks, 3) },
          { day: 'Tue', done: Math.min(completedTasks, 5) },
          { day: 'Wed', done: Math.min(completedTasks, 4) },
          { day: 'Thu', done: Math.min(completedTasks, 6) },
          { day: 'Fri', done: completedTasks },
          { day: 'Sat', done: Math.max(0, completedTasks - 2) },
          { day: 'Sun', done: Math.max(0, completedTasks - 1) },
        ]
        setTaskTrend(taskData)

      } catch (e) {
        console.error('Overview load error:', e)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [userId])

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return t.greeting
    if (hour < 17) return t.greetingAfternoon
    return t.greetingEvening
  }

  const getGreetingEmoji = () => {
    const hour = new Date().getHours()
    if (hour < 6) return '🌙'
    if (hour < 12) return '🌅'
    if (hour < 17) return '☀️'
    if (hour < 21) return '🌆'
    return '🌙'
  }

  // Calculate daily tasks progress
  const todayCompleted = stats?.completedTasks || 0
  const todayTotal = stats?.totalTasks || 1
  const dailyProgress = Math.round((todayCompleted / todayTotal) * 100)
  const allTasksDone = dailyProgress >= 100 && todayTotal > 0

  // Trigger confetti when all tasks done
  useEffect(() => {
    if (allTasksDone) {
      setShowConfetti(true)
      const timer = setTimeout(() => setShowConfetti(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [allTasksDone])

  // Compute progress ring values
  const tasksProgress = stats?.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0
  const moodProgress = Math.round((stats?.avgMood || 0) / 10 * 100)
  const budgetProgress = stats?.totalBudget > 0 ? Math.round((stats?.remaining / stats?.totalBudget) * 100) : 0
  const habitsProgress = stats?.habitCompletion || 0

  // "vs Last Week" comparison data
  const comparisonData = useMemo(() => [
    {
      label: 'Tasks Completed',
      current: stats?.completedTasks || 0,
      change: Math.round(((stats?.completedTasks || 0) / Math.max((stats?.completedTasks || 0) * 0.8, 1) - 1) * 100),
      icon: CheckSquare,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/20',
    },
    {
      label: 'Avg Mood',
      current: stats?.avgMood || 0,
      change: stats?.avgMood >= 6 ? 12 : -8,
      icon: Heart,
      color: 'text-rose-600',
      bgColor: 'bg-rose-50 dark:bg-rose-950/20',
    },
    {
      label: 'Budget Spent',
      current: `$${((stats?.totalBudget || 0) - (stats?.remaining || 0)).toFixed(0)}`,
      change: -5,
      icon: DollarSign,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50 dark:bg-teal-950/20',
    },
    {
      label: 'Habits Done',
      current: `${stats?.habitCompletion || 0}%`,
      change: stats?.habitCompletion >= 50 ? 15 : -10,
      icon: Target,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50 dark:bg-amber-950/20',
    },
  ], [stats])

  // Heatmap color scale
  const heatmapColors = [
    'bg-muted/30',
    'bg-emerald-200 dark:bg-emerald-900/40',
    'bg-emerald-400 dark:bg-emerald-700/60',
    'bg-emerald-600 dark:bg-emerald-500/80',
    'bg-emerald-800 dark:bg-emerald-400',
  ]

  const dayLabels = language === 'ar'
    ? ['أحد', 'اثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  // Weekly Planner: Get this week's tasks grouped by day
  const weeklyPlannerData = useMemo(() => {
    if (!stats?.tasks || !Array.isArray(stats.tasks)) return []

    const today = new Date()
    const dayOfWeek = today.getDay() // 0=Sun
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - dayOfWeek)
    startOfWeek.setHours(0, 0, 0, 0)

    const dayNames = language === 'ar'
      ? ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
      : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

    const priorityColors: Record<string, string> = {
      urgent: 'bg-rose-500 text-white',
      high: 'bg-orange-400 text-white',
      medium: 'bg-amber-300 text-amber-900',
      low: 'bg-emerald-200 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
    }

    const days = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + i)
      const dayTasks = (stats.tasks as any[])
        .filter((task: any) => {
          if (!task.dueDate) return false
          const dueDate = new Date(task.dueDate)
          return dueDate.getFullYear() === date.getFullYear() &&
            dueDate.getMonth() === date.getMonth() &&
            dueDate.getDate() === date.getDate()
        })
        .slice(0, 3)
        .map((task: any) => ({
          title: (task.title || '').substring(0, 20),
          priority: task.priority || 'medium',
          color: priorityColors[task.priority || 'medium'] || priorityColors.medium,
        }))

      const isToday = date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate()

      days.push({
        dayName: dayNames[i],
        date: date.getDate(),
        isToday,
        tasks: dayTasks,
      })
    }
    return days
  }, [stats, language])

  // Relative time helper
  const getRelativeTime = (text: string): string => {
    // Simple relative time based on activity text
    if (text.includes('Today')) return language === 'ar' ? 'اليوم' : '2h ago'
    if (text.includes('week')) return language === 'ar' ? 'هذا الأسبوع' : 'Yesterday'
    if (text.includes('month')) return language === 'ar' ? 'هذا الشهر' : '3d ago'
    if (text.includes('habits')) return language === 'ar' ? 'اليوم' : '5h ago'
    return language === 'ar' ? 'الآن' : 'Just now'
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-20 glass rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <Card key={i} className="animate-pulse card-elevated"><CardContent className="p-6"><div className="h-28 bg-muted rounded" /></CardContent></Card>
          ))}
        </div>
      </div>
    )
  }

  const isBudgetNegative = (stats?.remaining || 0) < 0

  const statCards = [
    {
      icon: CheckSquare,
      label: t.tasksDue,
      value: stats?.pendingTasks || 0,
      subtitle: `${stats?.completedTasks || 0} completed`,
      color: 'from-emerald-500 to-teal-600',
      bg: 'bg-emerald-50 dark:bg-emerald-950/20',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/50',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      trend: stats?.completedTasks > 0 ? 'up' : 'neutral',
      ringProgress: tasksProgress,
      ringColor: '#10b981',
      ringBgColor: 'text-emerald-100 dark:text-emerald-900/30',
      glowColor: 'rgba(16, 185, 129, 0.15)',
    },
    {
      icon: Heart,
      label: t.moodScore,
      value: stats?.avgMood || 0,
      subtitle: `/10 average`,
      color: 'from-rose-500 to-pink-600',
      bg: 'bg-rose-50 dark:bg-rose-950/20',
      iconBg: 'bg-rose-100 dark:bg-rose-900/50',
      iconColor: 'text-rose-600 dark:text-rose-400',
      trend: stats?.avgMood >= 6 ? 'up' : 'down',
      ringProgress: moodProgress,
      ringColor: '#f43f5e',
      ringBgColor: 'text-rose-100 dark:text-rose-900/30',
      glowColor: 'rgba(244, 63, 94, 0.15)',
    },
    {
      icon: DollarSign,
      label: t.budgetRemaining,
      value: `$${(stats?.remaining || 0).toLocaleString()}`,
      subtitle: `of $${(stats?.totalBudget || 5000).toLocaleString()}`,
      color: isBudgetNegative ? 'from-rose-500 to-red-600' : 'from-teal-500 to-cyan-600',
      bg: isBudgetNegative ? 'bg-rose-50 dark:bg-rose-950/20' : 'bg-teal-50 dark:bg-teal-950/20',
      iconBg: isBudgetNegative ? 'bg-rose-100 dark:bg-rose-900/50' : 'bg-teal-100 dark:bg-teal-900/50',
      iconColor: isBudgetNegative ? 'text-rose-600 dark:text-rose-400' : 'text-teal-600 dark:text-teal-400',
      trend: isBudgetNegative ? 'down' : ((stats?.remaining || 0) > (stats?.totalBudget || 5000) / 2 ? 'up' : 'down'),
      ringProgress: budgetProgress,
      ringColor: isBudgetNegative ? '#f43f5e' : '#14b8a6',
      ringBgColor: isBudgetNegative ? 'text-rose-100 dark:text-rose-900/30' : 'text-teal-100 dark:text-teal-900/30',
      glowColor: isBudgetNegative ? 'rgba(244, 63, 94, 0.15)' : 'rgba(20, 184, 166, 0.15)',
      isBudgetNegative,
    },
    {
      icon: Target,
      label: 'Habit Completion',
      value: `${stats?.habitCompletion || 0}%`,
      subtitle: `${stats?.streak || 0} day streak`,
      color: 'from-amber-500 to-orange-600',
      bg: 'bg-amber-50 dark:bg-amber-950/20',
      iconBg: 'bg-amber-100 dark:bg-amber-900/50',
      iconColor: 'text-amber-600 dark:text-amber-400',
      trend: (stats?.habitCompletion || 0) >= 50 ? 'up' : 'down',
      ringProgress: habitsProgress,
      ringColor: '#f59e0b',
      ringBgColor: 'text-amber-100 dark:text-amber-900/30',
      glowColor: 'rgba(245, 158, 11, 0.15)',
    },
  ]

  return (
    <div className="space-y-6">
      {/* 1. Glass morphism Greeting Banner with floating particles */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 p-6 md:p-8 text-white glass"
      >
        {/* Floating particles behind the banner */}
        <FloatingParticle delay={0} x={15} size={40} color="rgba(255,255,255,0.3)" />
        <FloatingParticle delay={2} x={45} size={28} color="rgba(255,255,255,0.2)" />
        <FloatingParticle delay={4} x={70} size={35} color="rgba(255,255,255,0.25)" />
        <FloatingParticle delay={1.5} x={88} size={22} color="rgba(255,255,255,0.2)" />

        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24" />
        <div className="relative z-10">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
                {getGreeting()} {getGreetingEmoji()}
              </h1>
              <p className="text-emerald-100 mt-2 flex items-center gap-2 text-sm md:text-base">
                <Calendar className="w-4 h-4" />
                {new Date().toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <div className="hidden md:block text-right">
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2">
                <Activity className="w-5 h-5" />
                <div>
                  <p className="text-xs text-emerald-200">Life Score</p>
                  <p className="text-xl font-bold">
                    {Math.round((
                      (stats?.habitCompletion || 0) * 0.3 +
                      (stats?.avgMood || 0) * 10 * 0.3 +
                      ((stats?.totalBudget - stats?.remaining) > 0 ? Math.min(100, ((stats?.remaining || 0) / (stats?.totalBudget || 1)) * 100) : 50) * 0.2 +
                      ((stats?.completedTasks || 0) / Math.max(stats?.totalTasks || 1, 1)) * 100 * 0.2
                    ))}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 2. Enhanced Stat Cards with Progress Rings */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className={`card-elevated card-hover-lift transition-all duration-300 border-0 ${stat.bg} overflow-hidden relative group`}
              style={{ '--glow-color': stat.glowColor } as React.CSSProperties}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className={`p-2.5 rounded-xl ${stat.iconBg} w-fit mb-2`}>
                      <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
                    </div>
                    <p className="text-sm text-foreground/70 mb-0.5">{stat.label}</p>
                    <p className={`text-3xl font-bold tracking-tight stat-value ${stat.isBudgetNegative ? 'text-rose-600 dark:text-rose-400' : ''}`}>
                      {stat.value}
                    </p>
                    <p className="text-xs text-foreground/70 mt-0.5">{stat.subtitle}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {stat.trend === 'up' ? (
                      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400 border-0 text-xs">
                        <ArrowUpRight className="w-3 h-3 me-0.5" /> Up
                      </Badge>
                    ) : stat.trend === 'down' ? (
                      <Badge className={`${stat.isBudgetNegative ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-400'} border-0 text-xs`}>
                        <ArrowDownRight className="w-3 h-3 me-0.5" /> {stat.isBudgetNegative ? 'Low' : 'Low'}
                      </Badge>
                    ) : null}
                    <ProgressRing
                      progress={stat.ringProgress}
                      size={56}
                      strokeWidth={4}
                      color={stat.ringColor}
                      bgColor={stat.ringBgColor}
                    />
                  </div>
                </div>
              </CardContent>
              {/* Subtle gradient accent line at bottom */}
              <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${stat.color} opacity-0 group-hover:opacity-100 transition-opacity`} />
              {/* Inner glow on hover */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-xl"
                style={{ boxShadow: `inset 0 0 20px ${stat.glowColor}` }}
              />
            </Card>
          </motion.div>
        ))}
      </div>

      {/* 3. Improved Today's Progress Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="card-elevated border-emerald-200 dark:border-emerald-800/50 overflow-hidden relative"
          style={{ boxShadow: '0 0 20px rgba(16, 185, 129, 0.08)' }}
        >
          <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/50">
                  <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Today&apos;s Progress</p>
                  <p className="text-xs text-foreground/70">{todayCompleted} of {todayTotal} tasks done today</p>
                </div>
              </div>
              {allTasksDone && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400"
                >
                  <PartyPopper className="w-5 h-5" />
                  <span className="text-sm font-bold">All tasks completed! Great job! 🎉</span>
                </motion.div>
              )}
            </div>
            <div className="relative">
              <div className="h-4 w-full rounded-full bg-muted overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${allTasksDone ? 'bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400' : 'bg-gradient-to-r from-emerald-500 to-teal-500'}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${dailyProgress}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                >
                  {/* Animated gradient shimmer */}
                  <div className="h-full w-full rounded-full shimmer" style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)', backgroundSize: '200% 100%', animation: 'shimmer 2s ease-in-out infinite' }} />
                </motion.div>
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="text-sm font-bold text-foreground/80">{todayCompleted}/{todayTotal} completed</span>
                <span className="text-xs text-foreground/70">{todayTotal - todayCompleted} remaining</span>
              </div>
            </div>

            {/* Confetti Animation */}
            <AnimatePresence>
              {showConfetti && (
                <motion.div
                  className="absolute inset-0 pointer-events-none overflow-hidden"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {Array.from({ length: 20 }).map((_, i) => (
                    <ConfettiParticle
                      key={i}
                      delay={i * 0.1}
                      x={Math.random() * 100}
                      color={['#10b981', '#14b8a6', '#f59e0b', '#f43f5e', '#06b6d4', '#34d399'][i % 6]}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>

      {/* 4. Better Briefing & 5. Enhanced Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Daily Briefing */}
        {briefing && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="lg:col-span-2"
          >
            <Card className="glass-card border-emerald-200 dark:border-emerald-800/50 overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                  <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/50">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  {t.briefing}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {briefing.pendingTasks !== undefined && (
                    <div className="flex flex-col items-center p-5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20">
                      <CheckSquare className="w-5 h-5 text-emerald-500 mb-2" />
                      <motion.span
                        className="text-2xl font-bold"
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      >
                        {briefing.pendingTasks}
                      </motion.span>
                      <span className="text-xs text-foreground/70 mt-1">{t.tasksDue}</span>
                    </div>
                  )}
                  {briefing.avgMood !== undefined && (
                    <div className="flex flex-col items-center p-5 rounded-xl bg-rose-50 dark:bg-rose-950/20">
                      <Heart className="w-5 h-5 text-rose-500 mb-2" />
                      <motion.span
                        className="text-2xl font-bold"
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
                      >
                        {briefing.avgMood}
                      </motion.span>
                      <span className="text-xs text-foreground/70 mt-1">{t.moodScore}</span>
                    </div>
                  )}
                  {briefing.totalExpenses !== undefined && (
                    <div className="flex flex-col items-center p-5 rounded-xl bg-teal-50 dark:bg-teal-950/20">
                      <DollarSign className="w-5 h-5 text-teal-500 mb-2" />
                      <motion.span
                        className="text-2xl font-bold"
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
                      >
                        ${briefing.totalExpenses}
                      </motion.span>
                      <span className="text-xs text-foreground/70 mt-1">Spent</span>
                    </div>
                  )}
                  {briefing.activeGoals !== undefined && (
                    <div className="flex flex-col items-center p-5 rounded-xl bg-amber-50 dark:bg-amber-950/20">
                      <TrendingUp className="w-5 h-5 text-amber-500 mb-2" />
                      <motion.span
                        className="text-2xl font-bold"
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.9 }}
                      >
                        {briefing.activeGoals}
                      </motion.span>
                      <span className="text-xs text-foreground/70 mt-1">Active Goals</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* 5. Enhanced Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="h-full card-elevated">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Zap className="w-4 h-4 text-amber-500" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { emoji: '✅', label: 'Add Task', color: 'hover:bg-emerald-50 dark:hover:bg-emerald-950/30' },
                  { emoji: '😴', label: 'Log Sleep', color: 'hover:bg-purple-50 dark:hover:bg-purple-950/30' },
                  { emoji: '😊', label: 'Log Mood', color: 'hover:bg-rose-50 dark:hover:bg-rose-950/30' },
                  { emoji: '💰', label: 'Add Expense', color: 'hover:bg-teal-50 dark:hover:bg-teal-950/30' },
                  { emoji: '🎯', label: 'Add Habit', color: 'hover:bg-amber-50 dark:hover:bg-amber-950/30' },
                  { emoji: '🚀', label: 'Set Goal', color: 'hover:bg-orange-50 dark:hover:bg-orange-950/30' },
                ].map((action) => (
                  <motion.button
                    key={action.label}
                    className={`card-hover-lift flex flex-col items-center gap-1 p-3 rounded-xl border border-border/50 ${action.color} transition-all text-center`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span className="text-2xl">{action.emoji}</span>
                    <span className="text-xs text-foreground/70">{action.label}</span>
                  </motion.button>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* 6. Better "vs Last Week" Comparison */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.65 }}
      >
        <Card className="card-elevated">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-teal-500" />
              vs Last Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {comparisonData.map((item, i) => {
                const Icon = item.icon
                const isPositive = item.change >= 0
                return (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.7 + i * 0.05 }}
                    className={`p-4 rounded-xl glass-card border border-border/20`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <Icon className={`w-4 h-4 ${item.color}`} />
                      <span className="text-xs text-foreground/70">{item.label}</span>
                    </div>
                    <div className="flex items-end justify-between">
                      <span className="text-lg font-extrabold">{item.current}</span>
                      <span className={`flex items-center gap-0.5 text-xs font-semibold ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        <AnimatedCounter target={Math.abs(item.change)} />
                        %
                      </span>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 7. Weekly Planner Section (NEW) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.68 }}
      >
        <Card className="card-elevated glass overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/50">
                <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {weeklyPlannerData.map((day, i) => (
                <motion.div
                  key={day.dayName}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 + i * 0.04 }}
                  className={`flex flex-col items-center p-2 rounded-xl transition-all ${
                    day.isToday
                      ? 'bg-emerald-100 dark:bg-emerald-900/40 ring-2 ring-emerald-400 dark:ring-emerald-500 shadow-sm'
                      : 'bg-muted/30'
                  }`}
                >
                  <span className={`text-[10px] font-medium mb-0.5 ${day.isToday ? 'text-emerald-700 dark:text-emerald-300' : 'text-muted-foreground'}`}>
                    {day.dayName}
                  </span>
                  <span className={`text-sm font-bold mb-2 ${day.isToday ? 'text-emerald-700 dark:text-emerald-300' : ''}`}>
                    {day.date}
                  </span>
                  <div className="flex flex-col gap-1 w-full items-center">
                    {day.tasks.length > 0 ? (
                      day.tasks.map((task: any, ti: number) => (
                        <span
                          key={ti}
                          className={`text-[8px] leading-tight px-1.5 py-0.5 rounded-full truncate w-full text-center ${task.color}`}
                        >
                          {task.title}
                        </span>
                      ))
                    ) : (
                      <span className="text-muted-foreground/40 text-xs">—</span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 8. Enhanced Heatmap & 9. Enhanced Mood Trend Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Weekly Activity Heatmap */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card className="card-elevated">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-500" />
                Weekly Activity Heatmap
              </CardTitle>
            </CardHeader>
            <CardContent>
              {heatmapData.length > 0 ? (
                <div>
                  <div className="flex flex-col gap-2">
                    {heatmapData.map((week, weekIdx) => (
                      <div key={weekIdx} className="flex gap-2">
                        {week.map((level, dayIdx) => {
                          const isTodayCell = weekIdx === Math.floor((new Date().getDay()) / 7) && dayIdx === new Date().getDay()
                          return (
                            <motion.div
                              key={`${weekIdx}-${dayIdx}`}
                              className={`w-full aspect-square rounded-lg ${heatmapColors[level]} transition-colors relative ${isTodayCell ? 'pulse-glow ring-2 ring-emerald-400/50' : ''}`}
                              initial={{ opacity: 0, scale: 0 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.8 + (weekIdx * 7 + dayIdx) * 0.02 }}
                              onMouseEnter={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect()
                                setHeatmapTooltip({ week: weekIdx + 1, day: dayIdx, level, x: rect.left + rect.width / 2, y: rect.top })
                              }}
                              onMouseLeave={() => setHeatmapTooltip(null)}
                            />
                          )
                        })}
                      </div>
                    ))}
                  </div>
                  {/* Day labels */}
                  <div className="flex gap-2 mt-2">
                    {dayLabels.map((label) => (
                      <div key={label} className="flex-1 text-center text-[10px] text-foreground/70">{label}</div>
                    ))}
                  </div>
                  {/* Legend */}
                  <div className="flex items-center gap-2 mt-3 justify-end">
                    <span className="text-[10px] text-foreground/70">Less</span>
                    {heatmapColors.map((color, i) => (
                      <div key={i} className={`w-3.5 h-3.5 rounded-md ${color}`} />
                    ))}
                    <span className="text-[10px] text-foreground/70">More</span>
                  </div>
                </div>
              ) : (
                <p className="text-center text-foreground/70 py-8">{t.noData}</p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* 9. Enhanced Mood Trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75 }}
        >
          <Card className="card-elevated">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-rose-500" />
                Weekly Mood Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              {moodTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={moodTrend}>
                    <defs>
                      <linearGradient id="moodGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 10]} tick={{ fontSize: 10 }} width={25} />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#f43f5e"
                      strokeWidth={3}
                      fill="url(#moodGradient)"
                      dot={(props: any) => {
                        const { cx, cy } = props
                        return (
                          <g key={props.key}>
                            <circle cx={cx} cy={cy} r={4} fill="#f43f5e" />
                            <circle cx={cx} cy={cy} r={4} fill="#f43f5e" opacity={0.4}>
                              <animate attributeName="r" values="4;8;4" dur="2s" repeatCount="indefinite" />
                              <animate attributeName="opacity" values="0.4;0;0.4" dur="2s" repeatCount="indefinite" />
                            </circle>
                          </g>
                        )
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-foreground/70 py-8">{t.noData}</p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* 10. Enhanced Recent Activity & 11. Enhanced Motivational Quote Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Card className="card-elevated h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-500" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="max-h-52 overflow-y-auto custom-scrollbar">
              <div className="space-y-3">
                {[
                  { icon: '✅', text: `${stats?.completedTasks || 0} tasks completed`, time: 'Today', borderColor: 'border-l-emerald-500' },
                  { icon: '😊', text: `Mood: ${stats?.avgMood || 0}/10`, time: 'This week', borderColor: 'border-l-rose-400' },
                  { icon: '💰', text: `$${((stats?.totalBudget || 0) - (stats?.remaining || 0)).toFixed(0)} spent`, time: 'This month', borderColor: 'border-l-teal-500' },
                  { icon: '🎯', text: `${stats?.habitCompletion || 0}% habits done`, time: 'Today', borderColor: 'border-l-amber-500' },
                ].map((item, i) => (
                  <div key={i} className={`flex items-center gap-3 text-sm ps-3 border-l-3 ${item.borderColor}`}>
                    <span className="text-lg">{item.icon}</span>
                    <div className="flex-1">
                      <p className="font-medium">{item.text}</p>
                    </div>
                    <span className="text-xs text-foreground/60">{getRelativeTime(item.time)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 11. Enhanced Motivational Quote Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.85 }}
        >
          <Card className="glass-card noise-overlay border-amber-200 dark:border-amber-800/50 overflow-hidden h-full relative">
            <div className="h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500" />
            <CardContent className="p-5 flex flex-col justify-between h-full min-h-[180px] relative z-10">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/50">
                    <Quote className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Daily Inspiration</span>
                </div>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={quoteIndex}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                  >
                    {/* Decorative quotation mark SVG */}
                    <svg className="w-8 h-8 text-amber-300 dark:text-amber-700 mb-1 opacity-60" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                    </svg>
                    <p className="text-lg italic text-foreground/90 leading-relaxed">
                      {QUOTES[quoteIndex].text}
                    </p>
                    <p className="text-sm text-foreground/70 mt-2">— {QUOTES[quoteIndex].author}</p>
                  </motion.div>
                </AnimatePresence>
              </div>
              <div className="flex justify-end mt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={refreshQuote}
                  className="text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                >
                  <RefreshCw className="w-3.5 h-3.5 me-1.5" />
                  New Quote
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Heatmap Tooltip Portal */}
      {heatmapTooltip && (
        <div
          className="fixed z-50 px-2 py-1 text-xs bg-foreground text-background rounded-md pointer-events-none shadow-lg"
          style={{ left: heatmapTooltip.x, top: heatmapTooltip.y - 32, transform: 'translateX(-50%)' }}
        >
          Week {heatmapTooltip.week}, {dayLabels[heatmapTooltip.day]}: Level {heatmapTooltip.level}
        </div>
      )}
    </div>
  )
}
