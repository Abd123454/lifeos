'use client'

import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Plus, ArrowUpRight, ArrowDownRight, DollarSign, TrendingUp, Wallet, PiggyBank, Activity, Lightbulb, Target, Calendar, PlusCircle, ArrowRight } from 'lucide-react'
import { translations } from '@/lib/i18n'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, LineChart, Line } from 'recharts'
import { motion } from 'framer-motion'

interface Props {
  userId: string
  language: 'en' | 'ar'
}

const COLORS = ['#10b981', '#14b8a6', '#06b6d4', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#f97316']

const categoryIcons: Record<string, string> = {
  food: '🍔', transport: '🚗', entertainment: '🎮', utilities: '💡', shopping: '🛍️',
  health: '🏥', education: '📚', rent: '🏠', salary: '💰', freelance: '💻', investment: '📈',
}

const categoryBgColors: Record<string, { bg: string; darkBg: string }> = {
  food: { bg: 'bg-orange-100', darkBg: 'dark:bg-orange-900/40' },
  transport: { bg: 'bg-cyan-100', darkBg: 'dark:bg-cyan-900/40' },
  entertainment: { bg: 'bg-pink-100', darkBg: 'dark:bg-pink-900/40' },
  utilities: { bg: 'bg-amber-100', darkBg: 'dark:bg-amber-900/40' },
  shopping: { bg: 'bg-rose-100', darkBg: 'dark:bg-rose-900/40' },
  health: { bg: 'bg-emerald-100', darkBg: 'dark:bg-emerald-900/40' },
  education: { bg: 'bg-teal-100', darkBg: 'dark:bg-teal-900/40' },
  rent: { bg: 'bg-yellow-100', darkBg: 'dark:bg-yellow-900/40' },
  salary: { bg: 'bg-emerald-100', darkBg: 'dark:bg-emerald-900/40' },
  freelance: { bg: 'bg-violet-100', darkBg: 'dark:bg-violet-900/40' },
  investment: { bg: 'bg-teal-100', darkBg: 'dark:bg-teal-900/40' },
}

interface SavingsGoal {
  id: string
  name: string
  target: number
  current: number
  color: string
  icon: string
}

const defaultGoals: SavingsGoal[] = [
  { id: '1', name: 'Emergency Fund', target: 10000, current: 4500, color: '#10b981', icon: '🛡️' },
  { id: '2', name: 'Vacation', target: 3000, current: 1800, color: '#14b8a6', icon: '✈️' },
  { id: '3', name: 'Investment', target: 20000, current: 8500, color: '#f59e0b', icon: '📈' },
]

export default function FinancePanel({ userId, language }: Props) {
  const t = translations[language]
  const [expenses, setExpenses] = useState<any[]>([])
  const [budget, setBudget] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ amount: '', category: 'food', description: '', date: '', type: 'expense' })
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>(defaultGoals)
  const [addGoalOpen, setAddGoalOpen] = useState(false)
  const [goalForm, setGoalForm] = useState({ name: '', target: '', current: '' })

  const loadData = async () => {
    if (!userId) return
    try {
      const [expRes, budgetRes] = await Promise.allSettled([
        fetch(`/api/finance/expenses?userId=${userId}&days=60`),
        fetch(`/api/finance/budget?userId=${userId}`),
      ])
      if (expRes.status === 'fulfilled' && expRes.value.ok) {
        const expData = await expRes.value.json()
        setExpenses(Array.isArray(expData) ? expData : expData.expenses || [])
      }
      if (budgetRes.status === 'fulfilled' && budgetRes.value.ok) setBudget(await budgetRes.value.json())
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadData() }, [userId])

  const addExpense = async () => {
    await fetch('/api/finance/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ...form, amount: parseFloat(form.amount), date: form.date || new Date().toISOString() }),
    })
    setDialogOpen(false)
    setForm({ amount: '', category: 'food', description: '', date: '', type: 'expense' })
    loadData()
  }

  const addSavingsGoal = () => {
    const newGoal: SavingsGoal = {
      id: Date.now().toString(),
      name: goalForm.name || 'New Goal',
      target: parseFloat(goalForm.target) || 1000,
      current: parseFloat(goalForm.current) || 0,
      color: COLORS[savingsGoals.length % COLORS.length],
      icon: '🎯',
    }
    setSavingsGoals(prev => [...prev, newGoal])
    setGoalForm({ name: '', target: '', current: '' })
    setAddGoalOpen(false)
  }

  const pieData = budget.expensesByCategory
    ? Object.entries(budget.expensesByCategory).map(([name, value]) => ({ name, value: value as number }))
    : []

  const barData = expenses
    .filter(e => e.type === 'expense')
    .reduce((acc, e) => {
      const cat = e.category
      if (!acc[cat]) acc[cat] = 0
      acc[cat] += e.amount
      return acc
    }, {} as Record<string, number>)
  const barDataArray = Object.entries(barData).map(([name, total]) => ({ name, total }))

  const budgetPercent = budget.monthlyBudget > 0 ? Math.min(100, Math.round(((budget.totalExpenses || 0) / budget.monthlyBudget) * 100)) : 0
  const savingsRate = budget.totalIncome > 0 ? Math.round(((budget.remaining || 0) / budget.totalIncome) * 100) : 0
  const totalTransactions = expenses.length
  const avgTransaction = expenses.length > 0 ? expenses.reduce((s, e) => s + e.amount, 0) / expenses.length : 0
  const isBudgetLow = budgetPercent >= 75

  // Monthly Budget Progress calculations
  const now = new Date()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const dayOfMonth = now.getDate()
  const daysRemaining = daysInMonth - dayOfMonth
  const totalSpent = expenses.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0)
  const avgDailySpend = dayOfMonth > 0 ? totalSpent / dayOfMonth : 0
  const projectedTotal = totalSpent + (avgDailySpend * daysRemaining)

  // Cumulative spending data for line chart
  const cumulativeData = useMemo(() => {
    const dailySpend: Record<number, number> = {}
    expenses
      .filter(e => e.type === 'expense')
      .forEach(e => {
        const date = new Date(e.date)
        if (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) {
          const day = date.getDate()
          dailySpend[day] = (dailySpend[day] || 0) + e.amount
        }
      })

    let cumulative = 0
    const data = []
    for (let d = 1; d <= Math.min(dayOfMonth, daysInMonth); d++) {
      cumulative += dailySpend[d] || 0
      data.push({
        day: d,
        spent: Math.round(cumulative),
        budget: Math.round((budget.monthlyBudget || 5000) / daysInMonth * d),
      })
    }
    return data
  }, [expenses, budget.monthlyBudget, now.getMonth(), now.getFullYear()])

  // This Month vs Last Month comparison
  const currentMonthExpenses = expenses
    .filter(e => {
      const date = new Date(e.date)
      return e.type === 'expense' && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
    })
    .reduce((s, e) => s + e.amount, 0)

  const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1
  const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
  const lastMonthExpenses = expenses
    .filter(e => {
      const date = new Date(e.date)
      return e.type === 'expense' && date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear
    })
    .reduce((s, e) => s + e.amount, 0)

  const monthChange = lastMonthExpenses > 0
    ? Math.round(((currentMonthExpenses - lastMonthExpenses) / lastMonthExpenses) * 100)
    : 0

  // Top 3 category comparison (current month)
  const currentMonthCategoryData = useMemo(() => {
    const cats: Record<string, number> = {}
    expenses
      .filter(e => {
        const date = new Date(e.date)
        return e.type === 'expense' && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
      })
      .forEach(e => {
        cats[e.category] = (cats[e.category] || 0) + e.amount
      })

    const lastCats: Record<string, number> = {}
    expenses
      .filter(e => {
        const date = new Date(e.date)
        return e.type === 'expense' && date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear
      })
      .forEach(e => {
        lastCats[e.category] = (lastCats[e.category] || 0) + e.amount
      })

    return Object.entries(cats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, current]) => ({
        name,
        current: Math.round(current),
        last: Math.round(lastCats[name] || 0),
      }))
  }, [expenses, now.getMonth(), now.getFullYear()])

  // Spending Insights
  const insights = useMemo(() => {
    const result: string[] = []
    const totalExpensesAmt = expenses.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0)

    // Biggest expense category
    if (Object.keys(barData).length > 0) {
      const topCat = Object.entries(barData).sort((a, b) => b[1] - a[1])[0]
      const pct = totalExpensesAmt > 0 ? Math.round((topCat[1] / totalExpensesAmt) * 100) : 0
      result.push(`${categoryIcons[topCat[0]] || '📦'} ${topCat[0].charAt(0).toUpperCase() + topCat[0].slice(1)} is your biggest expense at ${pct}% of total`)
    }

    // Food spending
    const foodSpending = barData['food'] || 0
    const avgCategorySpend = totalExpensesAmt > 0 && Object.keys(barData).length > 0
      ? totalExpensesAmt / Object.keys(barData).length : 0
    if (foodSpending > avgCategorySpend * 1.15) {
      result.push(`🍔 Your food spending is ${Math.round(((foodSpending / avgCategorySpend) - 1) * 100)}% above average this month`)
    } else if (foodSpending > 0) {
      result.push(`🍔 Your food spending is within normal range this month`)
    }

    // Savings comparison
    if (lastMonthExpenses > 0 && currentMonthExpenses > 0) {
      const diff = lastMonthExpenses - currentMonthExpenses
      if (diff > 0) {
        result.push(`💰 You saved $${Math.round(diff)} more than last month`)
      } else if (diff < 0) {
        result.push(`⚠️ You spent $${Math.round(Math.abs(diff))} more than last month`)
      }
    }

    // Transaction frequency
    if (totalTransactions > 0) {
      const dailyAvg = (totalTransactions / 30).toFixed(1)
      result.push(`📊 Average ${dailyAvg} transactions per day this month`)
    }

    return result.slice(0, 4)
  }, [expenses, barData, currentMonthExpenses, lastMonthExpenses, totalTransactions])

  if (loading) return <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{[1,2].map(i => <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-40 bg-muted rounded" /></CardContent></Card>)}</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600">
            <Wallet className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-lg font-semibold">{t.finance}</h3>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 me-2" />{t.addExpense}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t.addExpense}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Select value={form.type} onValueChange={v => setForm({...form, type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">🔻 Expense</SelectItem>
                  <SelectItem value="income">🔺 Income</SelectItem>
                </SelectContent>
              </Select>
              <Input type="number" step="0.01" placeholder={t.amount} value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} />
              <Select value={form.category} onValueChange={v => setForm({...form, category: v})}>
                <SelectTrigger><SelectValue placeholder={t.category} /></SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryIcons).map(([c, icon]) => (
                    <SelectItem key={c} value={c}>{icon} {c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input placeholder={t.description} value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
              <Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
              <Button onClick={addExpense} className="w-full bg-emerald-600 hover:bg-emerald-700">{t.save}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Stats with card-elevated + card-hover-lift + stat-value + trend arrows */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-950/20 dark:to-cyan-950/20 card-elevated card-hover-lift">
          <CardContent className="p-5 text-center">
            <div className="relative w-16 h-16 mx-auto mb-2">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" className="text-muted/30" strokeWidth="3" />
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#14b8a6" strokeWidth="3" strokeDasharray={`${100 - budgetPercent}, 100`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold stat-value">{100 - budgetPercent}%</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Budget Left</p>
            <div className="flex items-center justify-center gap-1 mt-1">
              {budgetPercent < 50 ? (
                <ArrowUpRight className="w-3 h-3 text-emerald-500" />
              ) : (
                <ArrowDownRight className="w-3 h-3 text-amber-500" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-emerald-50 dark:bg-emerald-950/20 card-elevated card-hover-lift">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 w-fit">
                <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-xs text-muted-foreground">Income</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 stat-value">${budget.totalIncome?.toFixed(0) || '0'}</p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-rose-50 dark:bg-rose-950/20 card-elevated card-hover-lift">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-900/50 w-fit">
                <ArrowDownRight className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              </div>
              <ArrowDownRight className="w-4 h-4 text-rose-500" />
            </div>
            <p className="text-xs text-muted-foreground">Expenses</p>
            <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 stat-value">${budget.totalExpenses?.toFixed(0) || '0'}</p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-amber-50 dark:bg-amber-950/20 card-elevated card-hover-lift">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/50 w-fit">
                <PiggyBank className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              {savingsRate >= 20 ? (
                <ArrowUpRight className="w-4 h-4 text-emerald-500" />
              ) : (
                <ArrowDownRight className="w-4 h-4 text-amber-500" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">Savings Rate</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 stat-value">{savingsRate}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Budget Overview with glass-card */}
      <Card className="glass-card border-teal-200 dark:border-teal-800/50 overflow-hidden card-elevated">
        <div className="h-1 bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-500" />
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-teal-500" />
            {t.budgetOverview}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-1"><ArrowUpRight className="w-3 h-3 text-emerald-500" /> Income: <span className="font-semibold text-emerald-600 stat-value">${budget.totalIncome?.toFixed(2) || '0'}</span></span>
              <span className="flex items-center gap-1"><ArrowDownRight className="w-3 h-3 text-rose-500" /> Expenses: <span className="font-semibold text-rose-600 stat-value">${budget.totalExpenses?.toFixed(2) || '0'}</span></span>
            </div>
            <Progress value={budgetPercent} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{budgetPercent}% of ${budget.monthlyBudget || 5000}</span>
              <span className={`${budget.remaining >= 0 ? 'text-emerald-600' : 'text-rose-600'} ${isBudgetLow ? 'relative' : ''}`}>
                {isBudgetLow && (
                  <span className="shimmer absolute inset-0 rounded" />
                )}
                <span className={isBudgetLow ? 'relative z-10' : ''}>
                  Remaining: ${(budget.remaining || 0).toFixed(2)}
                </span>
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Budget Progress with Daily Spend Rate */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="border-teal-200 dark:border-teal-800/50 overflow-hidden card-elevated">
          <div className="h-1 bg-gradient-to-r from-teal-500 to-emerald-500" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4 text-teal-500" />
              Monthly Budget Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/20 text-center card-hover-lift">
                <p className="text-xs text-muted-foreground">Days Remaining</p>
                <p className="text-xl font-bold text-teal-600 dark:text-teal-400 stat-value">{daysRemaining}</p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-center card-hover-lift">
                <p className="text-xs text-muted-foreground">Avg Daily Spend</p>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 stat-value">${avgDailySpend.toFixed(0)}</p>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 text-center card-hover-lift">
                <p className="text-xs text-muted-foreground">Projected Total</p>
                <p className={`text-xl font-bold stat-value ${projectedTotal > (budget.monthlyBudget || 5000) ? 'text-rose-600' : 'text-amber-600'}`}>${projectedTotal.toFixed(0)}</p>
              </div>
            </div>
            {cumulativeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={cumulativeData}>
                  <defs>
                    <linearGradient id="cumulativeSpend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#14b8a6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} width={40} />
                  <Tooltip />
                  <Area type="monotone" dataKey="budget" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="5 5" fill="none" name="Budget Pace" />
                  <Area type="monotone" dataKey="spent" stroke="#14b8a6" strokeWidth={2} fill="url(#cumulativeSpend)" name="Spent" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-6">{t.noData}</p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Charts with gradient bar fills + rounded tops */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="card-elevated card-hover-lift">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-500" />
              {t.expenseBreakdown}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" strokeWidth={2} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-center text-muted-foreground py-8">{t.noData}</p>}
          </CardContent>
        </Card>
        <Card className="card-elevated card-hover-lift">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-amber-500" />
              Category Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5 max-h-52 overflow-y-auto custom-scrollbar">
              {pieData.map((item, i) => {
                const catBg = categoryBgColors[item.name]
                return (
                  <motion.div
                    key={item.name}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors card-hover-lift"
                    whileHover={{ scale: 1.01, originX: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${catBg?.bg || 'bg-muted'} ${catBg?.darkBg || 'dark:bg-muted/50'}`} style={!catBg ? { backgroundColor: `${COLORS[i % COLORS.length]}20`, color: COLORS[i % COLORS.length] } : undefined}>
                      {categoryIcons[item.name] || '📦'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium capitalize">{item.name}</p>
                      <div className="h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{
                            background: `linear-gradient(90deg, ${COLORS[i % COLORS.length]}, ${COLORS[i % COLORS.length]}cc)`,
                          }}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, (item.value / (budget.totalExpenses || 1)) * 100)}%` }}
                          transition={{ duration: 0.6, delay: i * 0.05 }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-bold stat-value">${item.value.toFixed(0)}</span>
                  </motion.div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Savings Goals with gradient glow effect on progress bars */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="border-emerald-200 dark:border-emerald-800/50 overflow-hidden card-elevated">
          <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-500" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <PiggyBank className="w-4 h-4 text-emerald-500" />
                Savings Goals
              </CardTitle>
              <Dialog open={addGoalOpen} onOpenChange={setAddGoalOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-emerald-600 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30">
                    <PlusCircle className="w-3.5 h-3.5 me-1" />
                    Add Goal
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Savings Goal</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <Label>Goal Name</Label>
                      <Input placeholder="e.g. New Car" value={goalForm.name} onChange={e => setGoalForm({...goalForm, name: e.target.value})} />
                    </div>
                    <div>
                      <Label>Target Amount ($)</Label>
                      <Input type="number" placeholder="10000" value={goalForm.target} onChange={e => setGoalForm({...goalForm, target: e.target.value})} />
                    </div>
                    <div>
                      <Label>Current Amount ($)</Label>
                      <Input type="number" placeholder="0" value={goalForm.current} onChange={e => setGoalForm({...goalForm, current: e.target.value})} />
                    </div>
                    <Button onClick={addSavingsGoal} className="w-full bg-emerald-600 hover:bg-emerald-700">
                      <Target className="w-4 h-4 me-2" />
                      Create Goal
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {savingsGoals.map((goal, i) => {
                const progress = goal.target > 0 ? Math.min(100, Math.round((goal.current / goal.target) * 100)) : 0
                return (
                  <motion.div
                    key={goal.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    className="card-hover-lift rounded-xl p-3 -m-1"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{goal.icon}</span>
                        <span className="text-sm font-semibold">{goal.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground stat-value">
                        ${goal.current.toLocaleString()} / ${goal.target.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden relative">
                        {/* Gradient glow behind the progress bar */}
                        <div
                          className="absolute inset-y-0 left-0 rounded-full blur-sm opacity-50"
                          style={{
                            width: `${progress}%`,
                            background: `linear-gradient(90deg, ${goal.color}88, ${goal.color})`,
                            transition: 'width 0.8s ease',
                          }}
                        />
                        <motion.div
                          className="h-full rounded-full relative z-10"
                          style={{
                            background: `linear-gradient(90deg, ${goal.color}cc, ${goal.color})`,
                          }}
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 0.8, delay: 0.3 + i * 0.1 }}
                        />
                      </div>
                      <Badge
                        className="text-xs border-0"
                        style={{ backgroundColor: `${goal.color}20`, color: goal.color }}
                      >
                        {progress}%
                      </Badge>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* AI Insights & Expense Trend Comparison with gradient bar fills */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Spending Insights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-amber-200 dark:border-amber-800/50 overflow-hidden h-full card-elevated">
            <div className="h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500" />
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/50">
                  <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                AI Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {insights.map((insight, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.1 }}
                    className="flex items-start gap-3 p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/30 card-hover-lift"
                  >
                    <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400">{i + 1}</span>
                    </div>
                    <p className="text-sm text-foreground/80 leading-relaxed">{insight}</p>
                  </motion.div>
                ))}
                {insights.length === 0 && (
                  <p className="text-center text-muted-foreground py-6">{t.noData}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* This Month vs Last Month with gradient bars */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Card className="border-teal-200 dark:border-teal-800/50 overflow-hidden h-full card-elevated">
            <div className="h-1 bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-500" />
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-teal-500" />
                This Month vs Last Month
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Total comparison */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/20 text-center card-hover-lift">
                  <p className="text-xs text-muted-foreground mb-1">This Month</p>
                  <p className="text-xl font-bold text-teal-600 dark:text-teal-400 stat-value">${currentMonthExpenses.toFixed(0)}</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/50 text-center card-hover-lift">
                  <p className="text-xs text-muted-foreground mb-1">Last Month</p>
                  <p className="text-xl font-bold text-muted-foreground stat-value">${lastMonthExpenses.toFixed(0)}</p>
                </div>
              </div>

              {/* Percentage change */}
              <div className="flex items-center justify-center gap-2 mb-4">
                <span className={`flex items-center gap-1 text-sm font-semibold px-3 py-1 rounded-full ${
                  monthChange <= 0
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400'
                    : 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-400'
                }`}>
                  {monthChange <= 0 ? <ArrowDownRight className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                  {Math.abs(monthChange)}% {monthChange <= 0 ? 'less' : 'more'} spending
                </span>
              </div>

              {/* Mini bar chart for top 3 categories with gradient fills */}
              {currentMonthCategoryData.length > 0 ? (
                <div>
                  <p className="text-xs text-muted-foreground mb-2 font-medium">Top Categories Comparison</p>
                  <ResponsiveContainer width="100%" height={120}>
                    <BarChart data={currentMonthCategoryData} barCategoryGap="20%">
                      <defs>
                        <linearGradient id="currentBarGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.9} />
                          <stop offset="100%" stopColor="#10b981" stopOpacity={0.7} />
                        </linearGradient>
                        <linearGradient id="lastBarGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.6} />
                          <stop offset="100%" stopColor="#94a3b8" stopOpacity={0.3} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} width={35} />
                      <Tooltip />
                      <Bar dataKey="last" fill="url(#lastBarGrad)" radius={[4, 4, 0, 0]} name="Last Month" />
                      <Bar dataKey="current" fill="url(#currentBarGrad)" radius={[4, 4, 0, 0]} name="This Month" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">{t.noData}</p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Transaction List with card-hover-lift + vibrant category icon backgrounds */}
      <Card className="card-elevated">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Wallet className="w-4 h-4 text-teal-500" />
            Recent Transactions
          </CardTitle>
        </CardHeader>
        <CardContent className="max-h-72 overflow-y-auto custom-scrollbar">
          <div className="space-y-1">
            {expenses.slice(0, 20).map(e => {
              const catBg = categoryBgColors[e.category]
              return (
                <motion.div
                  key={e.id}
                  className="flex items-center justify-between text-sm p-2.5 rounded-lg hover:bg-muted/50 transition-colors card-hover-lift"
                  whileHover={{ scale: 1.01, originX: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${catBg?.bg || ''} ${catBg?.darkBg || ''} ${!catBg ? (e.type === 'income' ? 'bg-emerald-100 dark:bg-emerald-900/50' : 'bg-rose-100 dark:bg-rose-900/50') : ''}`}>
                      {e.type === 'income' ? (
                        <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <span>{categoryIcons[e.category] || '📦'}</span>
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{e.description || e.category}</p>
                      <p className="text-xs text-muted-foreground">{categoryIcons[e.category] || '📦'} {e.category} · {new Date(e.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <span className={`font-bold stat-value ${e.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {e.type === 'income' ? '+' : '-'}${e.amount.toFixed(2)}
                  </span>
                </motion.div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
