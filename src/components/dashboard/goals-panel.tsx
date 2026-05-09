'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Plus, Flag, Calendar, Trophy, Clock, TrendingUp, CheckCircle2, Circle, PartyPopper } from 'lucide-react'
import { translations } from '@/lib/i18n'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  userId: string
  language: 'en' | 'ar'
}

const categoryConfig: Record<string, { gradient: string; bg: string; icon: string; border: string; badge: string; ringColor: string }> = {
  health: { gradient: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-50 dark:bg-emerald-950/20', icon: '💪', border: 'border-emerald-200 dark:border-emerald-800/50', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300', ringColor: '#10b981' },
  finance: { gradient: 'from-amber-500 to-orange-600', bg: 'bg-amber-50 dark:bg-amber-950/20', icon: '💰', border: 'border-amber-200 dark:border-amber-800/50', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300', ringColor: '#f59e0b' },
  career: { gradient: 'from-teal-500 to-cyan-600', bg: 'bg-teal-50 dark:bg-teal-950/20', icon: '🚀', border: 'border-teal-200 dark:border-teal-800/50', badge: 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300', ringColor: '#14b8a6' },
  personal: { gradient: 'from-purple-500 to-pink-600', bg: 'bg-purple-50 dark:bg-purple-950/20', icon: '🌟', border: 'border-purple-200 dark:border-purple-800/50', badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300', ringColor: '#8b5cf6' },
  education: { gradient: 'from-cyan-500 to-teal-600', bg: 'bg-cyan-50 dark:bg-cyan-950/20', icon: '📚', border: 'border-cyan-200 dark:border-cyan-800/50', badge: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300', ringColor: '#06b6d4' },
}
const defaultCategory = { gradient: 'from-gray-400 to-gray-500', bg: 'bg-gray-50 dark:bg-gray-950/20', icon: '🎯', border: 'border-gray-200 dark:border-gray-800/50', badge: 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300', ringColor: '#6b7280' }

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
      transition={{ duration: 2.5, delay, ease: 'easeOut' }}
    />
  )
}

const confettiColors = ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6']

export default function GoalsPanel({ userId, language }: Props) {
  const t = translations[language]
  const [goals, setGoals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [celebratingGoalId, setCelebratingGoalId] = useState<string | null>(null)
  const [form, setForm] = useState({ title: '', description: '', category: 'personal', targetDate: '', status: 'active' })

  const loadGoals = async () => {
    if (!userId) return
    try {
      const res = await fetch(`/api/goals?userId=${userId}`)
      if (res.ok) {
        const data = await res.json()
        setGoals(Array.isArray(data) ? data : data.goals || [])
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadGoals() }, [userId])

  const addGoal = async () => {
    if (!form.title) return
    await fetch('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ...form, targetDate: form.targetDate ? new Date(form.targetDate) : null }),
    })
    setDialogOpen(false)
    setForm({ title: '', description: '', category: 'personal', targetDate: '', status: 'active' })
    loadGoals()
  }

  const updateProgress = useCallback(async (goal: any, newProgress: number) => {
    const wasNotComplete = goal.progress < 100
    await fetch('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ...goal, progress: newProgress, targetDate: goal.targetDate }),
    })

    // Trigger celebration if goal reaches 100%
    if (wasNotComplete && newProgress >= 100) {
      setCelebratingGoalId(goal.id)
      setTimeout(() => setCelebratingGoalId(null), 5000)
    }

    loadGoals()
  }, [userId])

  const activeGoals = goals.filter(g => g.status === 'active')
  const completedGoals = goals.filter(g => g.status === 'completed')
  const avgProgress = goals.length > 0 ? Math.round(goals.reduce((s, g) => s + g.progress, 0) / goals.length) : 0
  const nearCompletion = activeGoals.filter(g => g.progress >= 70).length

  // ===== Goal Categories Summary =====
  const categorySummary = goals.reduce((acc, goal) => {
    const cat = goal.category || 'other'
    if (!acc[cat]) acc[cat] = { count: 0, totalProgress: 0 }
    acc[cat].count++
    acc[cat].totalProgress += goal.progress
    return acc
  }, {} as Record<string, { count: number; totalProgress: number }>)

  // ===== Deadline calculations =====
  const getDeadlineInfo = (targetDate: string | null) => {
    if (!targetDate) return null
    const daysLeft = Math.ceil((new Date(targetDate).getTime() - Date.now()) / 86400000)
    let colorClass = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
    let urgencyGlow = ''
    if (daysLeft < 7) {
      colorClass = 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300'
      urgencyGlow = 'shadow-[0_0_12px_rgba(239,68,68,0.3)]'
    } else if (daysLeft <= 30) {
      colorClass = 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
      urgencyGlow = 'shadow-[0_0_8px_rgba(245,158,11,0.2)]'
    }
    return { daysLeft, colorClass, urgencyGlow }
  }

  if (loading) return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[1, 2].map(i => (
        <Card key={i} className="animate-pulse card-elevated">
          <CardContent className="p-6"><div className="h-32 bg-muted rounded shimmer" /></CardContent>
        </Card>
      ))}
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600">
            <Flag className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-lg font-semibold">{t.goals}</h3>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 me-2" />{t.addGoal}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t.addGoal}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder={t.title} value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
              <Input placeholder={t.description} value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
              <Select value={form.category} onValueChange={v => setForm({...form, category: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.icon} {key}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input type="date" value={form.targetDate} onChange={e => setForm({...form, targetDate: e.target.value})} />
              <Button onClick={addGoal} className="w-full bg-emerald-600 hover:bg-emerald-700">{t.save}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Goal Categories Summary */}
      {Object.keys(categorySummary).length > 0 && (
        <Card className="card-elevated overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-purple-500 via-amber-500 to-emerald-500" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600">
                <TrendingUp className="w-3.5 h-3.5 text-white" />
              </div>
              Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {Object.entries(categorySummary).map(([cat, data]) => {
                const config = categoryConfig[cat] || defaultCategory
                const avgProg = Math.round(data.totalProgress / data.count)
                return (
                  <motion.div
                    key={cat}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center p-3 rounded-xl bg-muted/30 gap-2"
                  >
                    <span className="text-2xl">{config.icon}</span>
                    <p className="text-xs font-semibold capitalize">{cat}</p>
                    <p className="text-xs text-muted-foreground">{data.count} goal{data.count !== 1 ? 's' : ''}</p>
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full bg-gradient-to-r ${config.gradient}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${avgProg}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                      />
                    </div>
                    <p className="text-xs font-medium stat-value">{avgProg}% avg</p>
                  </motion.div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-card card-elevated border-0">
          <CardContent className="p-5 text-center">
            <div className="relative w-16 h-16 mx-auto mb-2">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" className="text-muted/30" strokeWidth="3" />
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#8b5cf6" strokeWidth="3" strokeDasharray={`${avgProgress}, 100`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold stat-value">{avgProgress}%</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Avg Progress</p>
          </CardContent>
        </Card>

        <Card className="card-elevated card-hover-lift border-0 bg-emerald-50 dark:bg-emerald-950/20">
          <CardContent className="p-5">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 w-fit mb-3">
              <Trophy className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-xs text-muted-foreground">Completed</p>
            <p className="text-xl font-bold stat-value">{completedGoals.length}</p>
          </CardContent>
        </Card>

        <Card className="card-elevated card-hover-lift border-0 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="p-5">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/50 w-fit mb-3">
              <TrendingUp className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <p className="text-xs text-muted-foreground">Near Completion</p>
            <p className="text-xl font-bold stat-value">{nearCompletion}</p>
          </CardContent>
        </Card>

        <Card className="card-elevated card-hover-lift border-0 bg-cyan-50 dark:bg-cyan-950/20">
          <CardContent className="p-5">
            <div className="p-2 rounded-xl bg-cyan-100 dark:bg-cyan-900/50 w-fit mb-3">
              <Clock className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            </div>
            <p className="text-xs text-muted-foreground">Active</p>
            <p className="text-xl font-bold stat-value">{activeGoals.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Goals Grid */}
      {goals.length === 0 ? (
        <Card className="card-elevated relative overflow-hidden">
          <div className="noise-overlay" />
          <CardContent className="p-12 text-center relative z-10">
            <div className="p-4 rounded-2xl bg-muted/30 w-fit mx-auto mb-4">
              <Flag className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground font-medium">{t.noData}</p>
            <p className="text-sm text-muted-foreground mt-1">Create your first goal to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence>
            {goals.map((goal, i) => {
              const deadlineInfo = getDeadlineInfo(goal.targetDate)
              const config = categoryConfig[goal.category] || defaultCategory
              const isCompleted = goal.status === 'completed' || goal.progress >= 100
              const isCelebrating = celebratingGoalId === goal.id

              return (
                <motion.div
                  key={goal.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className={`card-elevated card-hover-lift hover:shadow-lg transition-all duration-300 overflow-hidden relative ${config.border} ${isCompleted ? 'opacity-75' : ''} ${deadlineInfo && !isCompleted ? deadlineInfo.urgencyGlow : ''}`}>
                    {/* Celebration confetti */}
                    {isCelebrating && (
                      <div className="absolute inset-0 overflow-hidden pointer-events-none z-20">
                        {Array.from({ length: 20 }).map((_, idx) => (
                          <ConfettiParticle
                            key={idx}
                            delay={idx * 0.1}
                            x={Math.random() * 100}
                            color={confettiColors[idx % confettiColors.length]}
                          />
                        ))}
                      </div>
                    )}

                    <div className={`h-1.5 bg-gradient-to-r ${config.gradient}`} />
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3 mb-4">
                        <div className={`p-2.5 rounded-xl ${config.bg} text-xl`}>{config.icon}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold truncate text-base">{goal.title}</h4>
                            {isCompleted ? (
                              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
                                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                              </motion.div>
                            ) : (
                              <Circle className="w-5 h-5 text-muted-foreground shrink-0" />
                            )}
                          </div>
                          {goal.description && <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{goal.description}</p>}
                          {/* Celebration badge */}
                          {isCelebrating && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: 'spring', delay: 0.3 }}
                              className="flex items-center gap-1 mt-1"
                            >
                              <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 text-xs">
                                <PartyPopper className="w-3 h-3 me-1" /> Congratulations!
                              </Badge>
                              <Trophy className="w-4 h-4 text-amber-500" />
                            </motion.div>
                          )}
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-2 mb-3">
                        <div className="flex justify-between items-center">
                          <Badge className={`${config.badge} border-0 text-xs`}>{goal.category}</Badge>
                          {/* Deadline Countdown Badge */}
                          <div className="flex items-center gap-2">
                            {deadlineInfo && !isCompleted && (
                              <Badge className={`${deadlineInfo.colorClass} border-0 text-xs font-medium`}>
                                <Calendar className="w-3 h-3 me-1" />
                                {deadlineInfo.daysLeft > 0 ? `${deadlineInfo.daysLeft}d left` : deadlineInfo.daysLeft === 0 ? 'Due today' : `${Math.abs(deadlineInfo.daysLeft)}d overdue`}
                              </Badge>
                            )}
                            <span className={`text-sm font-bold stat-value ${
                              goal.progress >= 80 ? 'text-emerald-600 dark:text-emerald-400' :
                              goal.progress >= 50 ? 'text-amber-600 dark:text-amber-400' :
                              'text-rose-600 dark:text-rose-400'
                            }`}>{goal.progress}%</span>
                          </div>
                        </div>
                        <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full bg-gradient-to-r ${config.gradient}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${goal.progress}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                          />
                        </div>
                      </div>

                      {/* Milestone Timeline */}
                      <div className="mb-3">
                        <div className="relative flex items-center justify-between px-1">
                          {/* Background line (full width) */}
                          <div className="absolute inset-x-1 top-1/2 h-0.5 -translate-y-1/2 bg-muted rounded-full" />
                          {/* Gradient filled line */}
                          <motion.div
                            className="absolute start-1 top-1/2 h-0.5 -translate-y-1/2 rounded-full"
                            style={{
                              background: `linear-gradient(to right, ${config.ringColor}, ${config.ringColor}88)`,
                            }}
                            initial={{ width: 0 }}
                            animate={{ width: `calc(${Math.min(goal.progress, 100)}% - 8px)` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                          />
                          {/* Milestone circles */}
                          {[0, 25, 50, 75, 100].map((milestone, mi) => {
                            const isReached = goal.progress >= milestone
                            const isCurrentMilestone = goal.progress < milestone && (mi === 0 || goal.progress >= [0, 25, 50, 75][mi - 1])
                            return (
                              <div key={milestone} className="relative z-10">
                                {isReached ? (
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: mi * 0.1, type: 'spring' }}
                                    className="w-4 h-4 rounded-full bg-emerald-500 border-2 border-emerald-600 flex items-center justify-center"
                                  >
                                    <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                                  </motion.div>
                                ) : isCurrentMilestone ? (
                                  <motion.div
                                    className="w-4 h-4 rounded-full border-2 border-amber-400 bg-amber-50 dark:bg-amber-950/50"
                                    animate={{ scale: [1, 1.2, 1] }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                  />
                                ) : (
                                  <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30 bg-background" />
                                )}
                              </div>
                            )
                          })}
                        </div>
                        <div className="flex justify-between px-0 mt-1">
                          {[0, 25, 50, 75, 100].map(milestone => (
                            <span key={milestone} className="text-[9px] text-muted-foreground stat-value">{milestone}%</span>
                          ))}
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between">
                        {deadlineInfo && isCompleted && (
                          <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Done!
                          </span>
                        )}
                        {!isCompleted && (
                          <div className="flex gap-1.5 ms-auto">
                            <Button size="sm" variant="outline" className="h-7 text-xs px-2.5" onClick={() => updateProgress(goal, Math.min(100, goal.progress + 10))}>+10%</Button>
                            <Button size="sm" className="h-7 text-xs px-2.5 bg-emerald-600 hover:bg-emerald-700" onClick={() => updateProgress(goal, 100)}>✓ Done</Button>
                          </div>
                        )}
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
  )
}
