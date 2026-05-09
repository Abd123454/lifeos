import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const days = parseInt(searchParams.get('days') || '30', 10)

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const since = new Date()
    since.setDate(since.getDate() - days)
    since.setHours(0, 0, 0, 0)

    const moods = await db.mood.findMany({
      where: { userId, date: { gte: since } },
      orderBy: { date: 'desc' },
    })

    return NextResponse.json({ moods })
  } catch (error) {
    console.error('Mood GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch moods' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, value, label, notes, date } = body

    if (!userId || value === undefined || !date) {
      return NextResponse.json(
        { error: 'userId, value, and date are required' },
        { status: 400 }
      )
    }

    const mood = await db.mood.create({
      data: {
        userId,
        value: parseInt(value, 10),
        label: label || null,
        notes: notes || null,
        date: new Date(date),
      },
    })

    return NextResponse.json({ mood }, { status: 201 })
  } catch (error) {
    console.error('Mood POST error:', error)
    return NextResponse.json({ error: 'Failed to create mood entry' }, { status: 500 })
  }
}
