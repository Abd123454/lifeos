import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const type = searchParams.get('type')

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const where: Record<string, unknown> = { userId }
    if (type) where.type = type

    const nodes = await db.memoryNode.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ nodes })
  } catch (error) {
    console.error('Memory nodes GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch memory nodes' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, type, key, value, source } = body

    if (!userId || !type || !key || !value) {
      return NextResponse.json(
        { error: 'userId, type, key, and value are required' },
        { status: 400 }
      )
    }

    const node = await db.memoryNode.create({
      data: {
        userId,
        type,
        key,
        value,
        source: source || 'manual',
      },
    })

    return NextResponse.json({ node }, { status: 201 })
  } catch (error) {
    console.error('Memory nodes POST error:', error)
    return NextResponse.json({ error: 'Failed to create memory node' }, { status: 500 })
  }
}
