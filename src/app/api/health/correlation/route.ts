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
      where: { userId, date: { gte: since } },
    })

    const moods = await db.mood.findMany({
      where: { userId, date: { gte: since } },
    })

    // Calculate averages
    const avgSleepQuality = sleeps.length > 0
      ? sleeps.reduce((sum, s) => sum + s.quality, 0) / sleeps.length
      : 0

    const avgSleepDuration = sleeps.length > 0
      ? sleeps.reduce((sum, s) => sum + s.duration, 0) / sleeps.length
      : 0

    const avgMood = moods.length > 0
      ? moods.reduce((sum, m) => sum + m.value, 0) / moods.length
      : 0

    // Calculate basic correlation between sleep quality and mood
    // Match by date
    const sleepByDate = new Map(sleeps.map(s => [s.date.toISOString().split('T')[0], s]))
    const moodByDate = new Map(moods.map(m => [m.date.toISOString().split('T')[0], m]))

    const paired: { sleepQuality: number; moodValue: number }[] = []
    for (const [dateKey, sleep] of sleepByDate) {
      const mood = moodByDate.get(dateKey)
      if (mood) {
        paired.push({ sleepQuality: sleep.quality, moodValue: mood.value })
      }
    }

    let correlation = 0
    let insight = 'Not enough overlapping data to determine correlation.'

    if (paired.length >= 3) {
      // Pearson correlation
      const n = paired.length
      const sumSq = paired.reduce((s, p) => s + p.sleepQuality, 0)
      const sumMood = paired.reduce((s, p) => s + p.moodValue, 0)
      const sumSqMood = paired.reduce((s, p) => s + p.sleepQuality * p.moodValue, 0)
      const sumSq2 = paired.reduce((s, p) => s + p.sleepQuality ** 2, 0)
      const sumMood2 = paired.reduce((s, p) => s + p.moodValue ** 2, 0)

      const numerator = n * sumSqMood - sumSq * sumMood
      const denominator = Math.sqrt((n * sumSq2 - sumSq ** 2) * (n * sumMood2 - sumMood ** 2))

      correlation = denominator === 0 ? 0 : numerator / denominator

      if (correlation > 0.5) {
        insight = 'Strong positive correlation: Better sleep quality is associated with better mood.'
      } else if (correlation > 0.2) {
        insight = 'Moderate positive correlation: Sleep quality somewhat influences your mood.'
      } else if (correlation > -0.2) {
        insight = 'Weak correlation: Sleep quality and mood appear independent in your data.'
      } else if (correlation > -0.5) {
        insight = 'Moderate negative correlation: Unusual pattern — higher sleep quality coincides with lower mood.'
      } else {
        insight = 'Strong negative correlation: Unusual pattern — consider other factors affecting your mood.'
      }
    }

    return NextResponse.json({
      avgSleepQuality: parseFloat(avgSleepQuality.toFixed(2)),
      avgSleepDuration: parseFloat(avgSleepDuration.toFixed(2)),
      avgMood: parseFloat(avgMood.toFixed(2)),
      correlation: parseFloat(correlation.toFixed(3)),
      insight,
      dataPoints: paired.length,
    })
  } catch (error) {
    console.error('Correlation GET error:', error)
    return NextResponse.json({ error: 'Failed to compute correlation' }, { status: 500 })
  }
}
