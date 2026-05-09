import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, query } = body

    if (!userId || !query) {
      return NextResponse.json(
        { error: 'userId and query are required' },
        { status: 400 }
      )
    }

    // Simple text search on key and value fields
    const nodes = await db.memoryNode.findMany({
      where: {
        userId,
        OR: [
          { key: { contains: query } },
          { value: { contains: query } },
        ],
      },
      orderBy: { confidence: 'desc' },
    })

    return NextResponse.json({ nodes, query })
  } catch (error) {
    console.error('Memory search POST error:', error)
    return NextResponse.json({ error: 'Failed to search memory nodes' }, { status: 500 })
  }
}
