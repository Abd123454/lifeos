import { NextRequest, NextResponse } from 'next/server'
import { buildUserProfile, loadProfileFromFile } from '@/lib/user-model-engine'

/**
 * GET /api/user-model?userId=xxx
 *   Returns the cached user profile (or null if never built)
 *
 * POST /api/user-model
 *   { userId: string }
 *   Runs the full analysis pipeline and returns a fresh profile
 */
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId')
  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  }

  const profile = await loadProfileFromFile(userId)
  return NextResponse.json({ profile })
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const profile = await buildUserProfile(userId)
    return NextResponse.json({ profile })
  } catch (error) {
    console.error('User model POST error:', error)
    return NextResponse.json({ error: 'Failed to build user profile' }, { status: 500 })
  }
}
