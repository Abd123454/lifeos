import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const days = parseInt(searchParams.get('days') || '7', 10)

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const since = new Date()
    since.setDate(since.getDate() - days)
    since.setHours(0, 0, 0, 0)

    const habits = await db.habit.findMany({
      where: { userId },
      include: {
        habitLogs: {
          where: { date: { gte: since } },
          orderBy: { date: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ habits })
  } catch (error) {
    console.error('Habits GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch habits' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, habitId, date, name, description, icon, color, frequency, target, notes, value } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    // If habitId and date are provided, log a habit entry
    if (habitId && date) {
      // Check if a log already exists for this date
      const existingLog = await db.habitLog.findFirst({
        where: {
          habitId,
          userId,
          date: new Date(date),
        },
      })

      if (existingLog) {
        // Update existing log
        const updatedLog = await db.habitLog.update({
          where: { id: existingLog.id },
          data: {
            value: value !== undefined ? parseInt(value, 10) : existingLog.value,
            notes: notes || existingLog.notes,
          },
        })
        return NextResponse.json({ log: updatedLog })
      }

      // Create new log
      const log = await db.habitLog.create({
        data: {
          habitId,
          userId,
          date: new Date(date),
          value: value !== undefined ? parseInt(value, 10) : 1,
          notes: notes || null,
        },
      })
      return NextResponse.json({ log }, { status: 201 })
    }

    // Otherwise, create a new habit
    if (!name) {
      return NextResponse.json({ error: 'name is required to create a habit' }, { status: 400 })
    }

    const habit = await db.habit.create({
      data: {
        userId,
        name,
        description: description || null,
        icon: icon || '🎯',
        color: color || '#10b981',
        frequency: frequency || 'daily',
        target: target ? parseInt(target, 10) : 1,
      },
    })

    return NextResponse.json({ habit }, { status: 201 })
  } catch (error) {
    console.error('Habits POST error:', error)
    return NextResponse.json({ error: 'Failed to process habit request' }, { status: 500 })
  }
}
