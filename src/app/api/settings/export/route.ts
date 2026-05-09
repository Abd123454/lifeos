import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    // Fetch all user data from all tables
    const [user, tasks, sleeps, expenses, habits, habitLogs, moods, goals, contacts, journals, memoryNodes, notifications, settings, briefings, chatMessages] = await Promise.all([
      db.user.findUnique({ where: { id: userId }, select: { id: true, email: true, name: true, language: true, theme: true, timezone: true, createdAt: true } }),
      db.task.findMany({ where: { userId } }),
      db.sleep.findMany({ where: { userId } }),
      db.expense.findMany({ where: { userId } }),
      db.habit.findMany({ where: { userId } }),
      db.habitLog.findMany({ where: { userId } }),
      db.mood.findMany({ where: { userId } }),
      db.goal.findMany({ where: { userId } }),
      db.contact.findMany({ where: { userId } }),
      db.journal.findMany({ where: { userId } }),
      db.memoryNode.findMany({ where: { userId } }),
      db.notification.findMany({ where: { userId } }),
      db.settings.findMany({ where: { userId } }),
      db.briefing.findMany({ where: { userId } }),
      db.chatMessage.findMany({ where: { userId } }),
    ])

    const exportData = {
      exportedAt: new Date().toISOString(),
      user,
      tasks,
      sleeps,
      expenses,
      habits,
      habitLogs,
      moods,
      goals,
      contacts,
      journals,
      memoryNodes,
      notifications,
      settings,
      briefings,
      chatMessages,
    }

    return NextResponse.json(exportData)
  } catch (error) {
    console.error('Export GET error:', error)
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 })
  }
}
