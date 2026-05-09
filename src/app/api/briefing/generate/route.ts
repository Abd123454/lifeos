import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayEnd = new Date(today)
    todayEnd.setHours(23, 59, 59, 999)

    // Gather all relevant data
    const pendingTasks = await db.task.findMany({
      where: { userId, status: { in: ['pending', 'in_progress'] } },
      orderBy: { priority: 'desc' },
      take: 10,
    })

    const overdueTasks = await db.task.findMany({
      where: {
        userId,
        status: { in: ['pending', 'in_progress'] },
        dueDate: { lt: today },
      },
    })

    const habits = await db.habit.findMany({
      where: { userId },
      include: {
        habitLogs: {
          where: { date: { gte: today, lte: todayEnd } },
        },
      },
    })

    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const recentMoods = await db.mood.findMany({
      where: { userId, date: { gte: weekAgo } },
      orderBy: { date: 'desc' },
    })

    const activeGoals = await db.goal.findMany({
      where: { userId, status: 'active' },
      orderBy: { targetDate: 'asc' },
      take: 5,
    })

    const recentExpenses = await db.expense.findMany({
      where: { userId, type: 'expense', date: { gte: weekAgo } },
    })

    const recentSleeps = await db.sleep.findMany({
      where: { userId, date: { gte: weekAgo } },
    })

    // Build comprehensive briefing content
    const avgMood = recentMoods.length > 0
      ? (recentMoods.reduce((s, m) => s + m.value, 0) / recentMoods.length).toFixed(1)
      : 'N/A'

    const avgSleep = recentSleeps.length > 0
      ? (recentSleeps.reduce((s, sl) => s + sl.quality, 0) / recentSleeps.length).toFixed(1)
      : 'N/A'

    const totalSpent = recentExpenses.reduce((s, e) => s + e.amount, 0).toFixed(2)

    const habitsCompleted = habits.filter(h => h.habitLogs.some(l => l.value >= 1)).length

    const content = `📋 Daily Briefing - ${today.toISOString().split('T')[0]}

🎯 Tasks: ${pendingTasks.length} pending (${overdueTasks.length} overdue)
✅ Habits: ${habitsCompleted}/${habits.length} completed today
😊 Mood: Average ${avgMood}/10 this week
😴 Sleep: Average quality ${avgSleep}/5 this week
💰 Expenses: $${totalSpent} spent this week
🎯 Active Goals: ${activeGoals.length}

${overdueTasks.length > 0 ? `⚠️ Overdue Tasks:\n${overdueTasks.map(t => `  - ${t.title} (due: ${t.dueDate ? new Date(t.dueDate).toISOString().split('T')[0] : 'no date'})`).join('\n')}` : ''}

${activeGoals.length > 0 ? `🎯 Top Goals:\n${activeGoals.map(g => `  - ${g.title} (${g.progress}% complete)`).join('\n')}` : ''}`

    // Save briefing to database
    const briefing = await db.briefing.create({
      data: {
        userId,
        content,
        date: today,
        type: 'daily',
      },
    })

    return NextResponse.json({
      briefing: {
        id: briefing.id,
        content: briefing.content,
        date: briefing.date,
      },
      data: {
        pendingTasks: pendingTasks.length,
        overdueTasks: overdueTasks.length,
        habitsCompleted,
        habitsTotal: habits.length,
        avgMood,
        avgSleep,
        totalSpent,
        activeGoals: activeGoals.map(g => ({
          id: g.id,
          title: g.title,
          progress: g.progress,
        })),
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Briefing generate POST error:', error)
    return NextResponse.json({ error: 'Failed to generate briefing' }, { status: 500 })
  }
}
