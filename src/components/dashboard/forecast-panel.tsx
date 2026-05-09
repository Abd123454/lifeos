'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Minus, CheckSquare, Heart, DollarSign, Target, AlertTriangle, Activity, Zap, Shield } from 'lucide-react'
import { translations } from '@/lib/i18n'
import { motion } from 'framer-motion'

interface Props {
  userId: string
  language: 'en' | 'ar'
}

export default function ForecastPanel({ userId, language }: Props) {
  const t = translations[language]
  const [forecast, setForecast] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    fetch(`/api/forecast?userId=${userId}`)
      .then(r => r.ok ? r.json() : {})
      .then(data => {
        const mapped = {
          taskCompletion: data.tasks || data.taskCompletion || null,
          moodTrend: data.moodTrend || null,
          budgetForecast: data.budgetForecast || null,
          risks: data.risks || null,
        }
        setForecast(mapped)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [userId])

  if (loading) return <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{[1,2,3,4].map(i => <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-32 bg-muted rounded" /></CardContent></Card>)}</div>

  const forecastCards = [
    {
      title: 'Task Completion',
      icon: CheckSquare,
      data: forecast?.taskCompletion,
      gradient: 'from-emerald-500 to-teal-600',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/50',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/20',
      border: 'border-emerald-200 dark:border-emerald-800/50',
    },
    {
      title: t.moodTrend,
      icon: Heart,
      data: forecast?.moodTrend,
      gradient: 'from-rose-500 to-pink-600',
      iconBg: 'bg-rose-100 dark:bg-rose-900/50',
      iconColor: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-50 dark:bg-rose-950/20',
      border: 'border-rose-200 dark:border-rose-800/50',
    },
    {
      title: 'Budget Projection',
      icon: DollarSign,
      data: forecast?.budgetForecast,
      gradient: 'from-amber-500 to-orange-600',
      iconBg: 'bg-amber-100 dark:bg-amber-900/50',
      iconColor: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/20',
      border: 'border-amber-200 dark:border-amber-800/50',
    },
    {
      title: 'Risk Indicators',
      icon: Shield,
      data: forecast?.risks,
      gradient: 'from-red-500 to-rose-600',
      iconBg: 'bg-red-100 dark:bg-red-900/50',
      iconColor: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50 dark:bg-red-950/20',
      border: 'border-red-200 dark:border-red-800/50',
    },
  ]

  const getTrendIcon = (trend: string) => {
    if (trend === 'up' || trend === 'improving') return <TrendingUp className="w-5 h-5 text-emerald-500" />
    if (trend === 'down' || trend === 'declining') return <TrendingDown className="w-5 h-5 text-red-500" />
    return <Minus className="w-5 h-5 text-amber-500" />
  }

  const getTrendLabel = (trend: string) => {
    if (trend === 'up' || trend === 'improving') return { text: 'Improving', color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30' }
    if (trend === 'down' || trend === 'declining') return { text: 'Declining', color: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30' }
    return { text: 'Stable', color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30' }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600">
          <Activity className="w-4 h-4 text-white" />
        </div>
        <h3 className="text-lg font-semibold">{t.forecast}</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {forecastCards.map((card, i) => (
          <motion.div key={card.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card className={`hover:shadow-lg transition-all duration-300 overflow-hidden ${card.border}`}>
              <div className={`h-1.5 bg-gradient-to-r ${card.gradient}`} />
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2.5 rounded-xl ${card.iconBg}`}>
                    <card.icon className={`w-5 h-5 ${card.iconColor}`} />
                  </div>
                  <h4 className="font-semibold">{card.title}</h4>
                </div>
                {card.data ? (
                  <div className="space-y-3">
                    {card.data.trend && (
                      <div className="flex items-center gap-2">
                        {getTrendIcon(card.data.trend)}
                        <Badge className={`${getTrendLabel(card.data.trend).color} border-0`}>
                          {getTrendLabel(card.data.trend).text}
                        </Badge>
                      </div>
                    )}
                    {card.data.completionRate !== undefined && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Completion: </span>
                        <span className="font-bold">{card.data.completionRate}%</span>
                      </div>
                    )}
                    {card.data.estimatedDaysToComplete !== undefined && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Estimated completion: </span>
                        <span className="font-bold">{card.data.estimatedDaysToComplete} days</span>
                      </div>
                    )}
                    {card.data.percentage !== undefined && (
                      <div>
                        <div className="flex justify-between text-sm mb-1.5">
                          <span className="text-muted-foreground">Predicted</span>
                          <span className="font-bold">{card.data.percentage}%</span>
                        </div>
                        <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full rounded-full bg-gradient-to-r ${card.gradient} transition-all duration-500`} style={{ width: `${Math.min(100, card.data.percentage)}%` }} />
                        </div>
                      </div>
                    )}
                    {card.data.risks && Array.isArray(card.data.risks) && card.data.risks.length > 0 && (
                      <div className="space-y-1.5 mt-2">
                        {card.data.risks.map((risk: string, ri: number) => (
                          <div key={ri} className="flex items-start gap-2 text-sm p-2 rounded-lg bg-red-50 dark:bg-red-950/20">
                            <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                            <span>{risk}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {card.data.insight && (
                      <div className="p-2.5 rounded-lg bg-muted/50 text-sm text-muted-foreground italic mt-2">
                        💡 {card.data.insight}
                      </div>
                    )}
                    {card.data.prediction && (
                      <p className="text-sm text-muted-foreground">{card.data.prediction}</p>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-6 text-muted-foreground">
                    <Zap className="w-8 h-8 mb-2 opacity-30" />
                    <p className="text-sm">{t.noData}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
