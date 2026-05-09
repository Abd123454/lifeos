import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayEnd = new Date(today)
    todayEnd.setHours(23, 59, 59, 999)

    // Pending tasks count
    const pendingTasks = await db.task.count({
      where: { userId, status: { in: ['pending', 'in_progress'] } },
    })

    const overdueTasks = await db.task.count({
      where: {
        userId,
        status: { in: ['pending', 'in_progress'] },
        dueDate: { lt: today },
      },
    })

    // Today's habits
    const habits = await db.habit.findMany({
      where: { userId },
      include: {
        habitLogs: {
          where: { date: { gte: today, lte: todayEnd } },
        },
      },
    })

    const habitsCompleted = habits.filter(h => h.habitLogs.some(l => l.value >= 1)).length
    const habitsTotal = habits.length

    // Recent mood average (last 7 days)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const recentMoods = await db.mood.findMany({
      where: { userId, date: { gte: weekAgo } },
    })
    const avgMood = recentMoods.length > 0
      ? parseFloat((recentMoods.reduce((s, m) => s + m.value, 0) / recentMoods.length).toFixed(1))
      : null

    // Upcoming goals
    const activeGoals = await db.goal.findMany({
      where: { userId, status: 'active' },
      orderBy: { targetDate: 'asc' },
      take: 5,
    })

    // Latest expenses total (last 7 days)
    const latestExpenses = await db.expense.findMany({
      where: {
        userId,
        type: 'expense',
        date: { gte: weekAgo },
      },
    })
    const latestExpensesTotal = parseFloat(
      latestExpenses.reduce((s, e) => s + e.amount, 0).toFixed(2)
    )

    // Recent sleep average
    const recentSleeps = await db.sleep.findMany({
      where: { userId, date: { gte: weekAgo } },
    })
    const avgSleepQuality = recentSleeps.length > 0
      ? parseFloat((recentSleeps.reduce((s, sl) => s + sl.quality, 0) / recentSleeps.length).toFixed(1))
      : null

    return NextResponse.json({
      date: today.toISOString().split('T')[0],
      tasks: {
        pending: pendingTasks,
        overdue: overdueTasks,
      },
      habits: {
        completed: habitsCompleted,
        total: habitsTotal,
      },
      mood: {
        average: avgMood,
        trend: recentMoods.length >= 3
          ? (recentMoods[recentMoods.length - 1].value > recentMoods[0].value ? 'improving' : 'declining')
          : 'stable',
      },
      sleep: {
        averageQuality: avgSleepQuality,
      },
      goals: activeGoals.map(g => ({
        id: g.id,
        title: g.title,
        progress: g.progress,
        targetDate: g.targetDate,
      })),
      expenses: {
        last7Days: latestExpensesTotal,
      },
    })
  } catch (error) {
    console.error('Briefing GET error:', error)
    return NextResponse.json({ error: 'Failed to generate briefing' }, { status: 500 })
  }
}
