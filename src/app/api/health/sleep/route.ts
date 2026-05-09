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

    const sleeps = await db.sleep.findMany({
      where: {
        userId,
        date: { gte: since },
      },
      orderBy: { date: 'desc' },
    })

    return NextResponse.json({ sleeps })
  } catch (error) {
    console.error('Sleep GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch sleep records' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, date, bedtime, wakeTime, duration, quality, notes } = body

    if (!userId || !date || !bedtime || !wakeTime || !duration) {
      return NextResponse.json(
        { error: 'userId, date, bedtime, wakeTime, and duration are required' },
        { status: 400 }
      )
    }

    const sleep = await db.sleep.create({
      data: {
        userId,
        date: new Date(date),
        bedtime,
        wakeTime,
        duration: parseFloat(duration),
        quality: quality ? parseInt(quality, 10) : 3,
        notes: notes || null,
      },
    })

    return NextResponse.json({ sleep }, { status: 201 })
  } catch (error) {
    console.error('Sleep POST error:', error)
    return NextResponse.json({ error: 'Failed to create sleep record' }, { status: 500 })
  }
}
