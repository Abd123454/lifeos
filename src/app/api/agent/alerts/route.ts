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

    // Get unread notifications
    const notifications = await db.notification.findMany({
      where: { userId, read: false },
      orderBy: { createdAt: 'desc' },
    })

    // Generate smart alerts
    const alerts: { id: string; type: string; title: string; message: string; severity: 'info' | 'warning' | 'critical'; createdAt: string; read: boolean }[] = []

    // Overdue tasks alert
    const overdueTasks = await db.task.findMany({
      where: {
        userId,
        status: { in: ['pending', 'in_progress'] },
        dueDate: { lt: today },
      },
    })
    if (overdueTasks.length > 0) {
      alerts.push({
        id: 'alert-overdue-tasks',
        type: 'overdue_tasks',
        title: 'Overdue Tasks',
        message: `You have ${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''}`,
        severity: overdueTasks.length > 3 ? 'critical' : 'warning',
        createdAt: new Date().toISOString(),
        read: false,
      })
    }

    // Budget warning
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const monthExpenses = await db.expense.findMany({
      where: {
        userId,
        type: 'expense',
        date: { gte: currentMonthStart },
      },
    })
    const totalSpent = monthExpenses.reduce((s, e) => s + e.amount, 0)

    const budgetSetting = await db.settings.findUnique({
      where: { userId_key: { userId, key: 'monthly_budget' } },
    })
    const monthlyBudget = budgetSetting ? parseFloat(budgetSetting.value) : 5000

    const percentUsed = monthlyBudget > 0 ? (totalSpent / monthlyBudget) * 100 : 0
    if (percentUsed > 90) {
      alerts.push({
        id: 'alert-budget-critical',
        type: 'budget_critical',
        title: 'Budget Critical',
        message: `You've used ${percentUsed.toFixed(0)}% of your monthly budget ($${totalSpent.toFixed(0)}/$${monthlyBudget})`,
        severity: 'critical',
        createdAt: new Date().toISOString(),
        read: false,
      })
    } else if (percentUsed > 75) {
      alerts.push({
        id: 'alert-budget-warning',
        type: 'budget_warning',
        title: 'Budget Warning',
        message: `You've used ${percentUsed.toFixed(0)}% of your monthly budget`,
        severity: 'warning',
        createdAt: new Date().toISOString(),
        read: false,
      })
    }

    // Mood pattern alert
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const recentMoods = await db.mood.findMany({
      where: { userId, date: { gte: weekAgo } },
      orderBy: { date: 'asc' },
    })
    if (recentMoods.length >= 3) {
      const avgRecent = recentMoods.slice(-3).reduce((s, m) => s + m.value, 0) / 3
      if (avgRecent < 4) {
        alerts.push({
          id: 'alert-mood-low',
          type: 'mood_low',
          title: 'Mood Alert',
          message: 'Your mood has been low recently. Consider self-care activities.',
          severity: 'warning',
          createdAt: new Date().toISOString(),
          read: false,
        })
      }
    }

    // Habit streak check
    const habits = await db.habit.findMany({
      where: { userId, frequency: 'daily' },
      include: {
        habitLogs: {
          where: { date: { gte: weekAgo } },
          orderBy: { date: 'desc' },
        },
      },
    })

    const todayLogs = habits.filter(h =>
      h.habitLogs.some(l => {
        const logDate = new Date(l.date)
        return logDate.toDateString() === today.toDateString() && l.value >= 1
      })
    )
    const incompleteHabits = habits.filter(h =>
      !h.habitLogs.some(l => {
        const logDate = new Date(l.date)
        return logDate.toDateString() === today.toDateString() && l.value >= 1
      })
    )

    if (incompleteHabits.length > 0 && todayLogs.length > 0) {
      alerts.push({
        id: 'alert-habits-pending',
        type: 'habits_pending',
        title: 'Habits Reminder',
        message: `${incompleteHabits.length} daily habit${incompleteHabits.length > 1 ? 's' : ''} still to complete today`,
        severity: 'info',
        createdAt: new Date().toISOString(),
        read: false,
      })
    }

    return NextResponse.json({
      notifications,
      alerts,
      summary: {
        unreadCount: notifications.length,
        alertCount: alerts.length,
        criticalCount: alerts.filter(a => a.severity === 'critical').length,
      },
    })
  } catch (error) {
    console.error('Agent alerts GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 })
  }
}
