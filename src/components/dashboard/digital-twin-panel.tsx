'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  BrainCircuit, RefreshCw, TrendingUp, TrendingDown, Minus,
  Moon, Smile, CheckSquare, Target, DollarSign, AlertTriangle,
  Zap, Activity, Eye, Sparkles, BarChart3
} from 'lucide-react'
import { translations } from '@/lib/i18n'
import { motion, AnimatePresence } from 'framer-motion'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Correlation {
  metricA: string
  metricB: string
  coefficient: number
  direction: 'positive' | 'negative'
  strength: 'strong' | 'moderate' | 'weak'
  description: string
  descriptionAr: string
}

interface ForecastDay {
  day: string
  predictedProductivity: number
  confidence: number
  reasoning: string
  reasoningAr: string
}

interface UserProfile {
  userId: string
  generatedAt: string
  dataDays: number
  topCorrelations: Correlation[]
  forecast: ForecastDay[]
  personalitySummary: string
  personalitySummaryAr: string
  metrics: {
    avgMood: number
    avgSleepHours: number
    avgSleepQuality: number
    avgTaskCompletionRate: number
    avgHabitCompletionRate: number
    avgDailyExpense: number
    anxiousDayRatio: number
    energeticDayRatio: number
  }
}

interface Props {
  userId: string
  language: 'en' | 'ar'
}

/* ------------------------------------------------------------------ */
/*  Metric label config                                                */
/* ------------------------------------------------------------------ */

const METRIC_CONFIG: Record<string, { icon: typeof Moon; en: string; ar: string; color: string; bg: string }> = {
  avgMood:             { icon: Smile,        en: 'Mood',            ar: 'المزاج',             color: 'text-rose-500',       bg: 'bg-rose-100 dark:bg-rose-900/50' },
  sleepHours:          { icon: Moon,         en: 'Sleep',           ar: 'النوم',              color: 'text-violet-500',     bg: 'bg-violet-100 dark:bg-violet-900/50' },
  sleepQuality:        { icon: Moon,         en: 'Sleep Quality',   ar: 'جودة النوم',         color: 'text-indigo-500',     bg: 'bg-indigo-100 dark:bg-indigo-900/50' },
  tasksCompleted:      { icon: CheckSquare,  en: 'Tasks Done',      ar: 'المهام المنجزة',      color: 'text-emerald-500',    bg: 'bg-emerald-100 dark:bg-emerald-900/50' },
  habitCompletionRate: { icon: Target,       en: 'Habits',          ar: 'العادات',             color: 'text-amber-500',      bg: 'bg-amber-100 dark:bg-amber-900/50' },
  totalExpenses:       { icon: DollarSign,   en: 'Spending',        ar: 'الإنفاق',             color: 'text-teal-500',       bg: 'bg-teal-100 dark:bg-teal-900/50' },
  anxiousCount:        { icon: AlertTriangle,en: 'Anxiety',         ar: 'القلق',              color: 'text-red-500',        bg: 'bg-red-100 dark:bg-red-900/50' },
  energeticCount:      { icon: Zap,          en: 'Energy',          ar: 'الطاقة',             color: 'text-cyan-500',       bg: 'bg-cyan-100 dark:bg-cyan-900/50' },
}

const STRENGTH_BADGE: Record<string, { en: string; ar: string; color: string }> = {
  strong:   { en: 'Strong',   ar: 'قوي',      color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' },
  moderate: { en: 'Moderate', ar: 'متوسط',    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  weak:     { en: 'Weak',     ar: 'ضعيف',     color: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400' },
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function DigitalTwinPanel({ userId, language }: Props) {
  const t = translations[language]
  const isRtl = language === 'ar'
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)

  const loadProfile = useCallback(async () => {
    if (!userId) return
    try {
      const res = await fetch(`/api/user-model?userId=${userId}`)
      if (res.ok) {
        const data = await res.json()
        setProfile(data.profile)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const runAnalysis = async () => {
    if (!userId || analyzing) return
    setAnalyzing(true)
    try {
      const res = await fetch('/api/user-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      if (res.ok) {
        const data = await res.json()
        setProfile(data.profile)
      }
    } catch {
      // ignore
    } finally {
      setAnalyzing(false)
    }
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-32 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const dataDays = profile?.dataDays || 0
  const hasEnoughData = dataDays >= 7
  const isAr = language === 'ar'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600">
            <BrainCircuit className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">
              {isAr ? 'التوأم الرقمي' : 'Digital Twin'}
            </h3>
            <p className="text-xs text-muted-foreground">
              {isAr
                ? `${dataDays} يوم من البيانات`
                : `${dataDays} days of data`}
            </p>
          </div>
        </div>

        <Button
          onClick={runAnalysis}
          disabled={analyzing}
          className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white"
          size="sm"
        >
          <RefreshCw className={`w-4 h-4 ${isRtl ? 'ms-2' : 'me-2'} ${analyzing ? 'animate-spin' : ''}`} />
          {analyzing
            ? (isAr ? 'جاري التحليل...' : 'Analyzing...')
            : (isAr ? 'إعادة التحليل' : 'Re-analyze')}
        </Button>
      </div>

      {/* Not enough data state */}
      {!hasEnoughData && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="card-elevated border-dashed border-2 border-muted-foreground/20">
            <CardContent className="p-8 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 flex items-center justify-center mb-4">
                <BrainCircuit className="w-8 h-8 text-violet-500 dark:text-violet-400" />
              </div>
              <h4 className="font-semibold text-lg mb-2">
                {isAr ? 'ما زلت أتعرف عليك' : "I'm still getting to know you"}
              </h4>
              <p className="text-muted-foreground max-w-md">
                {isAr
                  ? 'أحتاج إلى 7 أيام على الأقل من البيانات لأبدأ في التعرف على أنماطك. استمر في تسجيل مزاجك ونومك ومهامك يوميًا.'
                  : 'I need at least 7 days of data to start recognizing your patterns. Keep logging your mood, sleep, and tasks daily.'}
              </p>
              <div className="flex items-center gap-2 mt-4">
                <Activity className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {isAr
                    ? `${Math.max(0, 7 - dataDays)} أيام متبقية`
                    : `${Math.max(0, 7 - dataDays)} days to go`}
                </span>
              </div>
              {/* Progress bar */}
              <div className="w-full max-w-xs mt-3">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-600"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (dataDays / 7) * 100)}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Has enough data */}
      {hasEnoughData && profile && (
        <AnimatePresence mode="wait">
          <motion.div
            key={profile.generatedAt}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* "What I Know About You" Card */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="card-elevated overflow-hidden">
                <div className="h-1.5 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500" />
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 rounded-xl bg-violet-100 dark:bg-violet-900/50">
                      <Eye className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold">
                        {isAr ? 'ماذا أعرف عنك' : 'What I Know About You'}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {isAr ? 'أنماط مكتشفة من بياناتك' : 'Patterns discovered from your data'}
                      </p>
                    </div>
                    <Badge className={`${isRtl ? 'ms-auto' : 'me-auto'} bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 border-0`}>
                      {dataDays} {isAr ? 'يوم' : 'days'}
                    </Badge>
                  </div>

                  <div className="p-4 rounded-xl bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20 border border-violet-100 dark:border-violet-900/30">
                    <p className="text-sm leading-relaxed">
                      {isAr ? profile.personalitySummaryAr : profile.personalitySummary}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Top 3 Correlations */}
            {profile.topCorrelations.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <Card className="card-elevated overflow-hidden">
                  <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/50">
                        <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <h4 className="font-semibold">
                          {isAr ? 'أقوى الأنماط المكتشفة' : 'Strongest Discovered Patterns'}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {isAr ? 'ارتباطات بين سلوكياتك' : 'Correlations between your behaviors'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {profile.topCorrelations.map((corr, i) => {
                        const configA = METRIC_CONFIG[corr.metricA]
                        const configB = METRIC_CONFIG[corr.metricB]
                        const strength = STRENGTH_BADGE[corr.strength]
                        const IconA = configA?.icon || Activity
                        const IconB = configB?.icon || Activity

                        return (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: isRtl ? 20 : -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 + i * 0.1 }}
                            className="group p-4 rounded-xl border bg-card hover:shadow-md transition-all duration-300"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-xs font-bold">
                                {i + 1}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <div className={`p-1 rounded-lg ${configA?.bg || 'bg-muted'}`}>
                                  <IconA className={`w-3.5 h-3.5 ${configA?.color || 'text-muted-foreground'}`} />
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {corr.direction === 'negative' ? '↔️' : '↗️'}
                                </span>
                                <div className={`p-1 rounded-lg ${configB?.bg || 'bg-muted'}`}>
                                  <IconB className={`w-3.5 h-3.5 ${configB?.color || 'text-muted-foreground'}`} />
                                </div>
                              </div>
                              <Badge className={`text-[10px] border-0 ${strength.color}`}>
                                {isAr ? strength.ar : strength.en}
                              </Badge>
                              <Badge
                                className={`text-[10px] border-0 ${
                                  corr.direction === 'positive'
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                    : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                                }`}
                              >
                                {Math.round(Math.abs(corr.coefficient) * 100)}%
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {isAr ? corr.descriptionAr : corr.description}
                            </p>
                          </motion.div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Productivity Forecast */}
            {profile.forecast.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <Card className="card-elevated overflow-hidden">
                  <div className="h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500" />
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/50">
                        <BarChart3 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <h4 className="font-semibold">
                          {isAr ? 'توقعات الإنتاجية للأسبوع القادم' : 'Next Week Productivity Forecast'}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {isAr ? 'بناءً على أنماطك التاريخية' : 'Based on your historical patterns'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-7 gap-1.5">
                      {profile.forecast.map((day, i) => {
                        const productivity = day.predictedProductivity
                        const dayColor = productivity >= 70
                          ? 'from-emerald-400 to-emerald-600'
                          : productivity >= 40
                            ? 'from-amber-400 to-amber-600'
                            : 'from-rose-400 to-rose-600'

                        return (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.4 + i * 0.05 }}
                            className="flex flex-col items-center gap-1"
                          >
                            <span className="text-[10px] text-muted-foreground font-medium truncate w-full text-center">
                              {isAr
                                ? ['أحد', 'اثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'][i] || day.day.slice(0, 3)
                                : day.day.slice(0, 3)}
                            </span>
                            <div
                              className={`w-full aspect-square rounded-xl bg-gradient-to-br ${dayColor} flex items-center justify-center text-white font-bold text-xs shadow-sm`}
                              title={isAr ? day.reasoningAr : day.reasoning}
                            >
                              {productivity}
                            </div>
                            <span className="text-[9px] text-muted-foreground">
                              {Math.round(day.confidence * 100)}%
                            </span>
                          </motion.div>
                        )
                      })}
                    </div>

                    <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-gradient-to-br from-emerald-400 to-emerald-600" />
                        {isAr ? 'عالي' : 'High'}
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-gradient-to-br from-amber-400 to-amber-600" />
                        {isAr ? 'متوسط' : 'Medium'}
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-gradient-to-br from-rose-400 to-rose-600" />
                        {isAr ? 'منخفض' : 'Low'}
                      </div>
                      <span className={`${isRtl ? 'ms-auto' : 'me-auto'}`}>
                        {isAr ? 'ثقة: ' : 'Confidence: '}
                        {Math.round(profile.forecast.reduce((s, d) => s + d.confidence, 0) / profile.forecast.length * 100)}%
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Metrics Overview */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <Card className="card-elevated overflow-hidden">
                <div className="h-1.5 bg-gradient-to-r from-teal-500 via-cyan-500 to-emerald-500" />
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 rounded-xl bg-teal-100 dark:bg-teal-900/50">
                      <Activity className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold">
                        {isAr ? 'مقاييسك المتوسطة' : 'Your Average Metrics'}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {isAr ? 'آخر 30 يومًا' : 'Last 30 days'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: isAr ? 'المزاج' : 'Mood', value: `${profile.metrics.avgMood}/10`, icon: Smile, gradient: 'from-rose-400 to-rose-600', bg: 'bg-rose-50 dark:bg-rose-950/20' },
                      { label: isAr ? 'النوم' : 'Sleep', value: `${profile.metrics.avgSleepHours}h`, icon: Moon, gradient: 'from-violet-400 to-violet-600', bg: 'bg-violet-50 dark:bg-violet-950/20' },
                      { label: isAr ? 'المهام/يوم' : 'Tasks/day', value: `${profile.metrics.avgTaskCompletionRate}`, icon: CheckSquare, gradient: 'from-emerald-400 to-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/20' },
                      { label: isAr ? 'العادات' : 'Habits', value: `${Math.round(profile.metrics.avgHabitCompletionRate * 100)}%`, icon: Target, gradient: 'from-amber-400 to-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/20' },
                    ].map((metric, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5 + i * 0.05 }}
                        className={`p-3 rounded-xl ${metric.bg} text-center`}
                      >
                        <metric.icon className="w-4 h-4 mx-auto mb-1 opacity-60" />
                        <div className="stat-value text-lg font-bold bg-gradient-to-r ${metric.gradient} bg-clip-text text-transparent">
                          {metric.value}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{metric.label}</p>
                      </motion.div>
                    ))}
                  </div>

                  {/* Extra row for anxiety & energy ratios */}
                  {(profile.metrics.anxiousDayRatio > 0 || profile.metrics.energeticDayRatio > 0) && (
                    <div className="flex items-center gap-3 mt-3">
                      {profile.metrics.anxiousDayRatio > 0 && (
                        <div className="flex items-center gap-1.5 text-xs">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                          <span className="text-muted-foreground">
                            {isAr ? 'قلق:' : 'Anxiety:'}
                          </span>
                          <span className="font-medium text-red-600 dark:text-red-400">
                            {Math.round(profile.metrics.anxiousDayRatio * 100)}%
                          </span>
                          <span className="text-muted-foreground">
                            {isAr ? 'من الأيام' : 'of days'}
                          </span>
                        </div>
                      )}
                      {profile.metrics.energeticDayRatio > 0 && (
                        <div className="flex items-center gap-1.5 text-xs">
                          <Zap className="w-3.5 h-3.5 text-cyan-500" />
                          <span className="text-muted-foreground">
                            {isAr ? 'طاقة:' : 'Energy:'}
                          </span>
                          <span className="font-medium text-cyan-600 dark:text-cyan-400">
                            {Math.round(profile.metrics.energeticDayRatio * 100)}%
                          </span>
                          <span className="text-muted-foreground">
                            {isAr ? 'من الأيام' : 'of days'}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Last analysis timestamp */}
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground py-2">
              <Activity className="w-3 h-3" />
              <span>
                {isAr
                  ? `آخر تحليل: ${new Date(profile.generatedAt).toLocaleString('ar-SA')}`
                  : `Last analyzed: ${new Date(profile.generatedAt).toLocaleString()}`}
              </span>
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  )
}
