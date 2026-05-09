import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Fields to strip from each imported item so Prisma generates new ones
const STRIP_FIELDS = ['id', 'createdAt', 'updatedAt'] as const

function stripMetaFields(item: Record<string, unknown>): Record<string, unknown> {
  const cleaned = { ...item }
  for (const field of STRIP_FIELDS) {
    delete cleaned[field]
  }
  return cleaned
}

interface ImportData {
  user?: Record<string, unknown>
  tasks?: Record<string, unknown>[]
  sleeps?: Record<string, unknown>[]
  expenses?: Record<string, unknown>[]
  habits?: Record<string, unknown>[]
  habitLogs?: Record<string, unknown>[]
  moods?: Record<string, unknown>[]
  goals?: Record<string, unknown>[]
  contacts?: Record<string, unknown>[]
  journals?: Record<string, unknown>[]
  memoryNodes?: Record<string, unknown>[]
  notifications?: Record<string, unknown>[]
  settings?: Record<string, unknown>[]
  briefings?: Record<string, unknown>[]
  chatMessages?: Record<string, unknown>[]
}

interface ImportResult {
  [key: string]: number | string[]
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, data } = body as { userId?: string; data?: ImportData }

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    if (!data) {
      return NextResponse.json({ error: 'data is required' }, { status: 400 })
    }

    // Verify the user exists (foreign key constraint requires it)
    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 400 })
    }

    const imported: ImportResult = {}
    const errors: string[] = []

    // Helper to import a collection
    async function importCollection(
      modelName: string,
      items: Record<string, unknown>[] | undefined,
      createFn: (cleaned: Record<string, unknown>[]) => Promise<number>
    ) {
      if (!items || !Array.isArray(items) || items.length === 0) {
        imported[modelName] = 0
        return
      }

      try {
        const cleanedItems = items.map((item) => {
          const cleaned = stripMetaFields(item)
          cleaned.userId = userId
          return cleaned
        })
        const count = await createFn(cleanedItems)
        imported[modelName] = count
      } catch (error) {
        console.error(`Import error for ${modelName}:`, error)
        imported[modelName] = 0
        errors.push(
          `${modelName}: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }

    // Tasks
    await importCollection('tasks', data.tasks, async (items) => {
      const result = await db.task.createMany({ data: items as any[] })
      return result.count
    })

    // Sleeps
    await importCollection('sleeps', data.sleeps, async (items) => {
      const result = await db.sleep.createMany({ data: items as any[] })
      return result.count
    })

    // Expenses
    await importCollection('expenses', data.expenses, async (items) => {
      const result = await db.expense.createMany({ data: items as any[] })
      return result.count
    })

    // Habits
    await importCollection('habits', data.habits, async (items) => {
      const result = await db.habit.createMany({ data: items as any[] })
      return result.count
    })

    // HabitLogs - SKIP because habitIds change on import
    imported['habitLogs'] = 0
    errors.push('habitLogs: Skipped because habit IDs change on import')

    // Moods
    await importCollection('moods', data.moods, async (items) => {
      const result = await db.mood.createMany({ data: items as any[] })
      return result.count
    })

    // Goals
    await importCollection('goals', data.goals, async (items) => {
      const result = await db.goal.createMany({ data: items as any[] })
      return result.count
    })

    // Contacts
    await importCollection('contacts', data.contacts, async (items) => {
      const result = await db.contact.createMany({ data: items as any[] })
      return result.count
    })

    // Journals
    await importCollection('journals', data.journals, async (items) => {
      const result = await db.journal.createMany({ data: items as any[] })
      return result.count
    })

    // MemoryNodes
    await importCollection('memoryNodes', data.memoryNodes, async (items) => {
      const result = await db.memoryNode.createMany({ data: items as any[] })
      return result.count
    })

    // Notifications
    await importCollection('notifications', data.notifications, async (items) => {
      const result = await db.notification.createMany({ data: items as any[] })
      return result.count
    })

    // Settings - has @@unique([userId, key]), insert one-by-one to handle duplicates gracefully
    await importCollection('settings', data.settings, async (items) => {
      let count = 0
      for (const item of items) {
        try {
          await db.settings.create({ data: item as any })
          count++
        } catch {
          // Skip duplicates (unique constraint on userId+key)
        }
      }
      return count
    })

    // Briefings
    await importCollection('briefings', data.briefings, async (items) => {
      const result = await db.briefing.createMany({ data: items as any[] })
      return result.count
    })

    // ChatMessages
    await importCollection('chatMessages', data.chatMessages, async (items) => {
      const result = await db.chatMessage.createMany({ data: items as any[] })
      return result.count
    })

    return NextResponse.json({
      success: true,
      imported,
      ...(errors.length > 0 ? { errors } : {}),
    })
  } catch (error) {
    console.error('Import POST error:', error)
    return NextResponse.json(
      {
        error: 'Failed to import data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
