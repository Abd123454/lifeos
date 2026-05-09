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

    const journals = await db.journal.findMany({
      where: { userId, date: { gte: since } },
      orderBy: { date: 'desc' },
    })

    return NextResponse.json({ journals })
  } catch (error) {
    console.error('Journal GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch journal entries' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, title, content, mood, tags, date } = body

    if (!userId || !content || !date) {
      return NextResponse.json(
        { error: 'userId, content, and date are required' },
        { status: 400 }
      )
    }

    const journal = await db.journal.create({
      data: {
        userId,
        title: title || null,
        content,
        mood: mood || null,
        tags: tags || null,
        date: new Date(date),
      },
    })

    return NextResponse.json({ journal }, { status: 201 })
  } catch (error) {
    console.error('Journal POST error:', error)
    return NextResponse.json({ error: 'Failed to create journal entry' }, { status: 500 })
  }
}
