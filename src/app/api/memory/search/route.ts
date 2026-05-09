import { NextRequest, NextResponse } from 'next/server'
import { searchMemory, type SearchFilters } from '@/lib/semantic-memory'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, query, filters } = body

    if (!userId || !query) {
      return NextResponse.json(
        { error: 'userId and query are required' },
        { status: 400 }
      )
    }

    // Use the new semantic memory search with optional manual filters
    const searchFilters: SearchFilters | undefined = filters ? {
      sleepThreshold: filters.sleepThreshold,
      anxietyBoost: filters.anxietyBoost,
      energyBoost: filters.energyBoost,
    } : undefined

    const result = await searchMemory(userId, query, searchFilters)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Memory search POST error:', error)
    return NextResponse.json({ error: 'Failed to search memory nodes' }, { status: 500 })
  }
}
