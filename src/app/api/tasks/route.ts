import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const where: Record<string, unknown> = { userId }
    if (status) where.status = status
    if (priority) where.priority = priority

    const tasks = await db.task.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ tasks })
  } catch (error) {
    console.error('Tasks GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, userId, title, description, status, priority, category, dueDate } = body

    // If id is provided, update existing task
    if (id) {
      const updateData: Record<string, unknown> = {}
      if (status !== undefined) updateData.status = status
      if (title !== undefined) updateData.title = title
      if (description !== undefined) updateData.description = description || null
      if (priority !== undefined) updateData.priority = priority
      if (category !== undefined) updateData.category = category || null
      if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null

      const task = await db.task.update({
        where: { id },
        data: updateData,
      })

      return NextResponse.json({ task }, { status: 200 })
    }

    // Otherwise create new task
    if (!userId || !title) {
      return NextResponse.json({ error: 'userId and title are required' }, { status: 400 })
    }

    const task = await db.task.create({
      data: {
        userId,
        title,
        description: description || null,
        status: status || 'pending',
        priority: priority || 'medium',
        category: category || null,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    })

    return NextResponse.json({ task }, { status: 201 })
  } catch (error) {
    console.error('Tasks POST error:', error)
    return NextResponse.json({ error: 'Failed to save task' }, { status: 500 })
  }
}
