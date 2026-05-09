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

    const notifications: { type: string; title: string; message: string }[] = []

    // 1. Check for overdue tasks
    const overdueTasks = await db.task.findMany({
      where: {
        userId,
        status: { in: ['pending', 'in_progress'] },
        dueDate: { lt: today },
      },
    })
    for (const task of overdueTasks) {
      notifications.push({
        type: 'alert',
        title: 'Overdue Task',
        message: `"${task.title}" was due on ${task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : 'no date'}`,
      })
    }

    // 2. Check budget warnings
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

    if (percentUsed > 80) {
      notifications.push({
        type: 'alert',
        title: 'Budget Warning',
        message: `You've used ${percentUsed.toFixed(0)}% of your monthly budget ($${totalSpent.toFixed(0)}/$${monthlyBudget})`,
      })
    }

    // 3. Check mood patterns
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const recentMoods = await db.mood.findMany({
      where: { userId, date: { gte: weekAgo } },
      orderBy: { date: 'desc' },
    })

    if (recentMoods.length >= 3) {
      const avgMood = recentMoods.reduce((s, m) => s + m.value, 0) / recentMoods.length
      if (avgMood < 4) {
        notifications.push({
          type: 'insight',
          title: 'Mood Pattern Detected',
          message: 'Your mood has been consistently low this week. Consider scheduling activities that boost your mood.',
        })
      }

      // Check for declining trend
      const first3 = recentMoods.slice(-3)
      const last3 = recentMoods.slice(0, 3)
      const avgFirst = first3.reduce((s, m) => s + m.value, 0) / first3.length
      const avgLast = last3.reduce((s, m) => s + m.value, 0) / last3.length
      if (avgLast - avgFirst < -1) {
        notifications.push({
          type: 'insight',
          title: 'Declining Mood Trend',
          message: 'Your mood has been declining over the past week. This might be a good time to reflect and practice self-care.',
        })
      }
    }

    // 4. Check for upcoming task deadlines (next 2 days)
    const twoDaysFromNow = new Date()
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2)
    const upcomingTasks = await db.task.findMany({
      where: {
        userId,
        status: { in: ['pending', 'in_progress'] },
        dueDate: { gte: today, lte: twoDaysFromNow },
      },
    })
    for (const task of upcomingTasks) {
      notifications.push({
        type: 'reminder',
        title: 'Upcoming Deadline',
        message: `"${task.title}" is due ${task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : 'soon'}`,
      })
    }

    // 5. Save notifications to database
    const createdNotifications = []
    for (const n of notifications) {
      try {
        const notification = await db.notification.create({
          data: {
            userId,
            type: n.type,
            title: n.title,
            message: n.message,
          },
        })
        createdNotifications.push(notification)
      } catch {
        // Skip if notification creation fails
      }
    }

    return NextResponse.json({
      analyzed: true,
      notificationsCreated: createdNotifications.length,
      notifications: createdNotifications,
    })
  } catch (error) {
    console.error('Cron analyze GET error:', error)
    return NextResponse.json({ error: 'Failed to run analysis' }, { status: 500 })
  }
}
