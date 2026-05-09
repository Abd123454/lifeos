import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const now = new Date()
    const last30 = new Date()
    last30.setDate(last30.getDate() - 30)

    // Task completion forecast
    const totalTasks = await db.task.count({ where: { userId } })
    const completedTasks = await db.task.count({ where: { userId, status: 'completed' } })
    const pendingTasks = await db.task.count({ where: { userId, status: 'pending' } })
    const inProgressTasks = await db.task.count({ where: { userId, status: 'in_progress' } })

    // Recent completion rate (last 30 days)
    const recentlyCompleted = await db.task.count({
      where: {
        userId,
        status: 'completed',
        completedAt: { gte: last30 },
      },
    })
    const completionRate = totalTasks > 0 ? recentlyCompleted / totalTasks : 0
    const estimatedDaysToComplete = completionRate > 0
      ? Math.ceil(pendingTasks / (recentlyCompleted / 30))
      : null

    // Mood trend forecast
    const moods = await db.mood.findMany({
      where: { userId, date: { gte: last30 } },
      orderBy: { date: 'asc' },
    })

    let moodTrend: 'improving' | 'stable' | 'declining' = 'stable'
    let moodForecast = 0
    if (moods.length >= 5) {
      const firstHalf = moods.slice(0, Math.floor(moods.length / 2))
      const secondHalf = moods.slice(Math.floor(moods.length / 2))
      const avgFirst = firstHalf.reduce((s, m) => s + m.value, 0) / firstHalf.length
      const avgSecond = secondHalf.reduce((s, m) => s + m.value, 0) / secondHalf.length
      const diff = avgSecond - avgFirst

      if (diff > 0.3) moodTrend = 'improving'
      else if (diff < -0.3) moodTrend = 'declining'

      // Simple linear extrapolation
      const avgMood = moods.reduce((s, m) => s + m.value, 0) / moods.length
      moodForecast = parseFloat((avgMood + diff * 0.5).toFixed(1))
      moodForecast = Math.max(1, Math.min(10, moodForecast))
    }

    // Budget forecast
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const expenses = await db.expense.findMany({
      where: {
        userId,
        date: { gte: currentMonthStart },
        type: 'expense',
      },
    })

    const totalSpent = expenses.reduce((s, e) => s + e.amount, 0)
    const dayOfMonth = now.getDate()
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const dailyAvg = dayOfMonth > 0 ? totalSpent / dayOfMonth : 0
    const projectedTotal = parseFloat((dailyAvg * daysInMonth).toFixed(2))

    const budgetSetting = await db.settings.findUnique({
      where: { userId_key: { userId, key: 'monthly_budget' } },
    })
    const monthlyBudget = budgetSetting ? parseFloat(budgetSetting.value) : 5000

    const budgetStatus = projectedTotal > monthlyBudget ? 'over_budget' : 'on_track'
    const budgetRemaining = parseFloat((monthlyBudget - totalSpent).toFixed(2))
    const dailyBudgetRemaining = daysInMonth - dayOfMonth > 0
      ? parseFloat((budgetRemaining / (daysInMonth - dayOfMonth)).toFixed(2))
      : 0

    return NextResponse.json({
      tasks: {
        total: totalTasks,
        completed: completedTasks,
        pending: pendingTasks,
        inProgress: inProgressTasks,
        completionRate: parseFloat(completionRate.toFixed(2)),
        estimatedDaysToComplete,
      },
      mood: {
        trend: moodTrend,
        forecast: moodForecast,
        dataPoints: moods.length,
      },
      budget: {
        monthlyBudget,
        totalSpent: parseFloat(totalSpent.toFixed(2)),
        projectedTotal,
        budgetStatus,
        budgetRemaining,
        dailyBudgetRemaining,
      },
    })
  } catch (error) {
    console.error('Forecast GET error:', error)
    return NextResponse.json({ error: 'Failed to generate forecast' }, { status: 500 })
  }
}
