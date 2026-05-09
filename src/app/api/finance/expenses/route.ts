import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const type = searchParams.get('type')
    const category = searchParams.get('category')
    const days = parseInt(searchParams.get('days') || '30', 10)

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const since = new Date()
    since.setDate(since.getDate() - days)
    since.setHours(0, 0, 0, 0)

    const where: Record<string, unknown> = {
      userId,
      date: { gte: since },
    }
    if (type) where.type = type
    if (category) where.category = category

    const expenses = await db.expense.findMany({
      where,
      orderBy: { date: 'desc' },
    })

    return NextResponse.json({ expenses })
  } catch (error) {
    console.error('Expenses GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, amount, category, description, date, type } = body

    if (!userId || !amount || !category || !date) {
      return NextResponse.json(
        { error: 'userId, amount, category, and date are required' },
        { status: 400 }
      )
    }

    const expense = await db.expense.create({
      data: {
        userId,
        amount: parseFloat(amount),
        category,
        description: description || null,
        date: new Date(date),
        type: type || 'expense',
      },
    })

    return NextResponse.json({ expense }, { status: 201 })
  } catch (error) {
    console.error('Expenses POST error:', error)
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 })
  }
}
