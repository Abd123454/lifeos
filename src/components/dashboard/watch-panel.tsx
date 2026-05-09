'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Play, Pause, RotateCcw, Clock, Timer, Flame, Zap, Music, Coffee, Brain, History } from 'lucide-react'
import { translations } from '@/lib/i18n'
import { motion, AnimatePresence } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface Props {
  userId: string
  language: 'en' | 'ar'
}

interface SessionLog {
  id: string
  type: 'focus' | 'break'
  duration: number // in minutes
  startedAt: Date
  completedAt: Date
}

const focusPresets = [
  { label: '15m', value: 15 },
  { label: '25m', value: 25 },
  { label: '45m', value: 45 },
  { label: '60m', value: 60 },
]

const breakPresets = [
  { label: '5m', value: 5 },
  { label: '10m', value: 10 },
  { label: '15m', value: 15 },
]

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
}

const staggerItem = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
}

export default function WatchPanel({ userId, language }: Props) {
  const t = translations[language]
  const isRTL = language === 'ar'

  const [mode, setMode] = useState<'focus' | 'break'>('focus')
  const [focusDuration, setFocusDuration] = useState(25)
  const [breakDuration, setBreakDuration] = useState(5)
  const [timeLeft, setTimeLeft] = useState(25 * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [sessions, setSessions] = useState(0)
  const [totalFocusTime, setTotalFocusTime] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [currentStreak, setCurrentStreak] = useState(0)
  const [sessionLog, setSessionLog] = useState<SessionLog[]>([])
  const [ambientMode, setAmbientMode] = useState(false)
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Generate mock weekly data for chart
  const weeklyData = (() => {
    const data = []
    const dayNames = isRTL
      ? ['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت']
      : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const isToday = i === 0
      const sessionsToday = isToday ? sessions : Math.floor(Math.random() * 5) + 1
      const focusMinutesToday = isToday ? Math.round(totalFocusTime / 60) : sessionsToday * (focusDuration === 25 ? 25 : 20 + Math.floor(Math.random() * 20))
      data.push({
        day: dayNames[d.getDay()],
        sessions: sessionsToday,
        minutes: focusMinutesToday,
      })
    }
    return data
  })()

  const focusTime = focusDuration * 60
  const breakTime = breakDuration * 60

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsRunning(false)
            const now = new Date()
            const durationMinutes = mode === 'focus' ? focusDuration : breakDuration
            // Log the completed session
            if (sessionStartTime) {
              setSessionLog(prevLog => [
                {
                  id: `session-${Date.now()}`,
                  type: mode,
                  duration: durationMinutes,
                  startedAt: sessionStartTime,
                  completedAt: now,
                },
                ...prevLog,
              ])
            }
            if (mode === 'focus') {
              setSessions(s => s + 1)
              setTotalFocusTime(t => t + focusTime)
              setCurrentStreak(cs => {
                const newStreak = cs + 1
                setBestStreak(bs => Math.max(bs, newStreak))
                return newStreak
              })
              setMode('break')
              setTimeLeft(breakTime)
            } else {
              setMode('focus')
              setTimeLeft(focusTime)
            }
            setSessionStartTime(null)
            return mode === 'focus' ? breakTime : focusTime
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isRunning, mode, focusDuration, breakDuration, focusTime, breakTime, sessionStartTime])

  const toggleTimer = () => {
    if (!isRunning && !sessionStartTime) {
      setSessionStartTime(new Date())
    }
    setIsRunning(!isRunning)
  }

  const resetTimer = () => {
    setIsRunning(false)
    setMode('focus')
    setTimeLeft(focusDuration * 60)
    setCurrentStreak(0)
    setSessionStartTime(null)
  }

  const handleModeChange = (newMode: 'focus' | 'break') => {
    setIsRunning(false)
    setMode(newMode)
    setTimeLeft(newMode === 'focus' ? focusDuration * 60 : breakDuration * 60)
    setSessionStartTime(null)
  }

  const handleFocusPreset = (minutes: number) => {
    setFocusDuration(minutes)
    if (mode === 'focus') {
      setTimeLeft(minutes * 60)
      setIsRunning(false)
      setSessionStartTime(null)
    }
  }

  const handleBreakPreset = (minutes: number) => {
    setBreakDuration(minutes)
    if (mode === 'break') {
      setTimeLeft(minutes * 60)
      setIsRunning(false)
      setSessionStartTime(null)
    }
  }

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const totalTime = mode === 'focus' ? focusTime : breakTime
  const progress = ((totalTime - timeLeft) / totalTime) * 100

  const circumference = 2 * Math.PI * 90
  const strokeDashoffset = circumference - (progress / 100) * circumference

  // Session count dots (traditional Pomodoro - 4 dots per cycle)
  const sessionDots = Array.from({ length: 4 }, (_, i) => i < (sessions % 4))

  const avgSessionLength = sessions > 0 ? Math.round(totalFocusTime / sessions / 60) : 0
  const todayFocusMinutes = Math.round(totalFocusTime / 60)

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString(isRTL ? 'ar-SA' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <motion.div
      className="space-y-5 max-w-lg mx-auto"
      variants={staggerContainer}
      initial="hidden"
      animate="show"
    >
      {/* Header */}
      <motion.div variants={staggerItem} className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600">
            <Timer className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-lg font-semibold">{t.pomodoroTimer}</h3>
        </div>
        <Button
          variant={ambientMode ? 'default' : 'outline'}
          size="sm"
          onClick={() => setAmbientMode(!ambientMode)}
          className={`gap-1.5 transition-all duration-300 ${
            ambientMode
              ? 'bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/20'
              : ''
          }`}
        >
          <Music className={`w-4 h-4 ${ambientMode ? 'animate-pulse' : ''}`} />
          🎵 Ambient
          {ambientMode && (
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          )}
        </Button>
      </motion.div>

      {/* Summary Stats */}
      <motion.div variants={staggerItem} className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-0 overflow-hidden bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20">
          <div className="h-1 bg-gradient-to-r from-emerald-400 to-teal-500" />
          <CardContent className="p-4">
            <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 w-fit mb-2">
              <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-xs text-muted-foreground">Today&apos;s Focus</p>
            <p className="text-xl font-bold">{todayFocusMinutes}<span className="text-sm font-normal text-muted-foreground">m</span></p>
          </CardContent>
        </Card>

        <Card className="border-0 overflow-hidden bg-amber-50 dark:bg-amber-950/20">
          <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
          <CardContent className="p-4">
            <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/50 w-fit mb-2">
              <Zap className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            </div>
            <p className="text-xs text-muted-foreground">Avg Session</p>
            <p className="text-xl font-bold">{avgSessionLength}<span className="text-sm font-normal text-muted-foreground">m</span></p>
          </CardContent>
        </Card>

        <Card className="border-0 overflow-hidden bg-rose-50 dark:bg-rose-950/20">
          <div className="h-1 bg-gradient-to-r from-rose-400 to-pink-500" />
          <CardContent className="p-4">
            <div className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-900/50 w-fit mb-2">
              <Flame className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            </div>
            <p className="text-xs text-muted-foreground">Best Streak</p>
            <p className="text-xl font-bold">{bestStreak}</p>
          </CardContent>
        </Card>

        <Card className="border-0 overflow-hidden bg-cyan-50 dark:bg-cyan-950/20">
          <div className="h-1 bg-gradient-to-r from-cyan-400 to-teal-500" />
          <CardContent className="p-4">
            <div className="p-1.5 rounded-lg bg-cyan-100 dark:bg-cyan-900/50 w-fit mb-2">
              <Brain className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            </div>
            <p className="text-xs text-muted-foreground">Sessions</p>
            <p className="text-xl font-bold">{sessions}</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Timer Card */}
      <motion.div variants={staggerItem}>
        <Card className="overflow-hidden">
          <div className={`h-1.5 ${mode === 'focus' ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gradient-to-r from-amber-400 to-orange-500'}`} />
          <CardContent className="p-6 flex flex-col items-center">
            {/* Mode Toggle */}
            <div className="flex gap-2 mb-4">
              <Button
                size="sm"
                variant={mode === 'focus' ? 'default' : 'outline'}
                onClick={() => handleModeChange('focus')}
                className={`transition-all duration-300 ${mode === 'focus' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/20' : ''}`}
              >
                <Brain className="w-4 h-4 me-1.5" />
                {t.focus}
              </Button>
              <Button
                size="sm"
                variant={mode === 'break' ? 'default' : 'outline'}
                onClick={() => handleModeChange('break')}
                className={`transition-all duration-300 ${mode === 'break' ? 'bg-amber-600 hover:bg-amber-700 shadow-md shadow-amber-500/20' : ''}`}
              >
                <Coffee className="w-4 h-4 me-1.5" />
                {t.break}
              </Button>
            </div>

            {/* Duration Presets */}
            <div className="flex flex-wrap justify-center gap-2 mb-5">
              <AnimatePresence mode="wait">
                {mode === 'focus' ? (
                  <motion.div
                    key="focus-presets"
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="flex gap-2"
                  >
                    {focusPresets.map(preset => (
                      <button
                        key={preset.value}
                        onClick={() => handleFocusPreset(preset.value)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                          focusDuration === preset.value
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/30 scale-105'
                            : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/50'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </motion.div>
                ) : (
                  <motion.div
                    key="break-presets"
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="flex gap-2"
                  >
                    {breakPresets.map(preset => (
                      <button
                        key={preset.value}
                        onClick={() => handleBreakPreset(preset.value)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                          breakDuration === preset.value
                            ? 'bg-amber-600 text-white shadow-md shadow-amber-500/30 scale-105'
                            : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/50 border border-amber-200 dark:border-amber-800/50'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Circular Timer */}
            <div className="relative w-56 h-56 mb-4">
              {/* Gradient background behind timer */}
              <div className={`absolute inset-2 rounded-full transition-all duration-700 ${
                mode === 'focus'
                  ? 'bg-gradient-to-br from-emerald-50 via-teal-50/50 to-transparent dark:from-emerald-950/30 dark:via-teal-950/20 dark:to-transparent'
                  : 'bg-gradient-to-br from-amber-50 via-orange-50/50 to-transparent dark:from-amber-950/30 dark:via-orange-950/20 dark:to-transparent'
              }`} />

              {/* Ambient glow effect */}
              {ambientMode && isRunning && (
                <div className={`absolute inset-0 rounded-full animate-pulse ${
                  mode === 'focus'
                    ? 'bg-emerald-400/10 dark:bg-emerald-500/10'
                    : 'bg-amber-400/10 dark:bg-amber-500/10'
                }`} />
              )}

              <svg className="w-56 h-56 -rotate-90 relative" viewBox="0 0 200 200">
                <circle cx="100" cy="100" r="90" fill="none" stroke="currentColor" className="text-muted/20" strokeWidth="6" />
                {/* Background ring with subtle gradient */}
                <circle
                  cx="100" cy="100" r="90" fill="none"
                  stroke={mode === 'focus' ? '#d1fae5' : '#fef3c7'}
                  strokeWidth="6"
                  className="dark:opacity-20"
                  strokeDasharray={circumference}
                  strokeDashoffset="0"
                />
                {/* Progress ring */}
                <circle
                  cx="100" cy="100" r="90" fill="none"
                  stroke={mode === 'focus' ? '#10b981' : '#f59e0b'}
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-1000"
                  style={isRunning ? {
                    filter: `drop-shadow(0 0 8px ${mode === 'focus' ? 'rgba(16, 185, 129, 0.5)' : 'rgba(245, 158, 11, 0.5)'})`,
                  } : {}}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-mono font-bold tabular-nums">
                  {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                </span>
                <span className={`text-sm font-medium mt-0.5 ${mode === 'focus' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  {mode === 'focus' ? t.focus : t.break}
                </span>
                {todayFocusMinutes > 0 && (
                  <span className="text-xs text-muted-foreground mt-1">
                    {todayFocusMinutes}m {isRTL ? 'إجمالي' : 'total'}
                  </span>
                )}
              </div>
            </div>

            {/* Session Count Dots */}
            <div className="flex gap-2 mb-5">
              {sessionDots.map((filled, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    filled
                      ? mode === 'focus'
                        ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50'
                        : 'bg-amber-500 shadow-sm shadow-amber-500/50'
                      : 'bg-muted-foreground/20 border border-muted-foreground/30'
                  }`}
                />
              ))}
              {sessions > 0 && (
                <span className="text-xs text-muted-foreground ms-2 self-center">
                  {sessions} {isRTL ? 'جلسة' : 'sessions'}
                </span>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4">
              <Button
                size="icon"
                variant="outline"
                onClick={resetTimer}
                className="hover:rotate-[-180deg] transition-transform duration-500"
              >
                <RotateCcw className="w-5 h-5" />
              </Button>
              <motion.div whileTap={{ scale: 0.9 }}>
                <Button
                  size="lg"
                  className={`w-16 h-16 rounded-full transition-all duration-300 ${
                    isRunning
                      ? 'bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-500/30'
                      : 'bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/30'
                  }`}
                  onClick={toggleTimer}
                >
                  {isRunning ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ms-0.5" />}
                </Button>
              </motion.div>
              <div className="w-10" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Focus Session History Chart */}
      <motion.div variants={staggerItem}>
        <Card className="overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-emerald-400 to-teal-500" />
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/50">
                <History className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h4 className="text-sm font-semibold">{isRTL ? 'سجل التركيز الأسبوعي' : 'Weekly Focus History'}</h4>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 11 }}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    className="text-muted-foreground"
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: 'none',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      fontSize: '12px',
                    }}
                    formatter={(value: number, name: string) => [
                      name === 'minutes' ? `${value}m` : value,
                      name === 'minutes' ? (isRTL ? 'دقائق' : 'Minutes') : (isRTL ? 'جلسات' : 'Sessions'),
                    ]}
                  />
                  <Bar
                    dataKey="minutes"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                    fillOpacity={0.8}
                  />
                  <Bar
                    dataKey="sessions"
                    fill="#34d399"
                    radius={[4, 4, 0, 0]}
                    fillOpacity={0.4}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                {isRTL ? 'دقائق' : 'Minutes'}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400 opacity-50" />
                {isRTL ? 'جلسات' : 'Sessions'}
              </span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Session Log */}
      <motion.div variants={staggerItem}>
        <Card className="overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-teal-400 to-cyan-500" />
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-teal-100 dark:bg-teal-900/50">
                <History className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              </div>
              <h4 className="text-sm font-semibold">{isRTL ? 'سجل الجلسات' : 'Session Log'}</h4>
              {sessionLog.length > 0 && (
                <Badge variant="outline" className="text-[10px] ms-auto">
                  {sessionLog.length}
                </Badge>
              )}
            </div>

            {sessionLog.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Timer className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">{isRTL ? 'لا توجد جلسات بعد' : 'No sessions yet'}</p>
                <p className="text-xs mt-1">{isRTL ? 'ابدأ أول جلسة تركيز!' : 'Start your first focus session!'}</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                <AnimatePresence>
                  {sessionLog.slice(0, 10).map((session, i) => (
                    <motion.div
                      key={session.id}
                      initial={{ opacity: 0, x: isRTL ? 10 : -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className={`flex items-center gap-3 p-2.5 rounded-lg transition-all duration-200 hover:shadow-sm ${
                        session.type === 'focus'
                          ? 'bg-emerald-50/50 dark:bg-emerald-950/20'
                          : 'bg-amber-50/50 dark:bg-amber-950/20'
                      }`}
                    >
                      {/* Timeline dot */}
                      <div className="relative flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          session.type === 'focus'
                            ? 'bg-emerald-100 dark:bg-emerald-900/50'
                            : 'bg-amber-100 dark:bg-amber-900/50'
                        }`}>
                          {session.type === 'focus' ? (
                            <Brain className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Coffee className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                          )}
                        </div>
                        {i < sessionLog.length - 1 && (
                          <div className="w-px h-3 bg-muted-foreground/10 mt-1" />
                        )}
                      </div>

                      {/* Session info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-semibold ${
                            session.type === 'focus'
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-amber-700 dark:text-amber-400'
                          }`}>
                            {session.type === 'focus' ? (isRTL ? 'تركيز' : 'Focus') : (isRTL ? 'استراحة' : 'Break')}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 ${
                              session.type === 'focus'
                                ? 'border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400'
                                : 'border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400'
                            }`}
                          >
                            {session.duration}m
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatTime(session.startedAt)} → {formatTime(session.completedAt)}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
