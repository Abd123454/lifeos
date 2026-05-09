/**
 * LifeOS User Model Engine — Personal User Model (v1.0)
 *
 * Collects last 30 days of behavioural data, finds the top-3
 * strongest correlations, and persists a "user profile" JSON
 * that can be injected into the AI agent's system prompt.
 *
 * ALL processing is local — no data leaves the server.
 */

import { db } from '@/lib/db'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface DayRecord {
  date: string // YYYY-MM-DD
  avgMood: number | null // 1-10
  sleepHours: number | null
  sleepQuality: number | null // 1-5
  tasksCompleted: number
  tasksCreated: number
  habitCompletionRate: number // 0-1
  totalExpenses: number
  anxiousCount: number // mood label = "anxious"
  energeticCount: number // mood label = "energetic"
}

export interface Correlation {
  metricA: string
  metricB: string
  coefficient: number // -1 to 1
  direction: 'positive' | 'negative'
  strength: 'strong' | 'moderate' | 'weak'
  description: string // human-readable
  descriptionAr: string // Arabic
}

export interface ProductivityForecast {
  day: string
  predictedProductivity: number // 0-100
  confidence: number // 0-1
  reasoning: string
  reasoningAr: string
}

export interface UserProfile {
  userId: string
  generatedAt: string
  dataDays: number
  topCorrelations: Correlation[]
  forecast: ProductivityForecast[]
  personalitySummary: string
  personalitySummaryAr: string
  metrics: {
    avgMood: number
    avgSleepHours: number
    avgSleepQuality: number
    avgTaskCompletionRate: number
    avgHabitCompletionRate: number
    avgDailyExpense: number
    anxiousDayRatio: number
    energeticDayRatio: number
  }
}

/* ------------------------------------------------------------------ */
/*  Metric labels (for descriptions)                                   */
/* ------------------------------------------------------------------ */

const METRIC_LABELS: Record<string, { en: string; ar: string; unit: string }> = {
  avgMood:             { en: 'mood score',            ar: 'مؤشر المزاج',          unit: '/10' },
  sleepHours:          { en: 'sleep duration',        ar: 'مدة النوم',            unit: ' hrs' },
  sleepQuality:        { en: 'sleep quality',         ar: 'جودة النوم',           unit: '/5' },
  tasksCompleted:      { en: 'tasks completed',       ar: 'المهام المكتملة',       unit: '' },
  habitCompletionRate: { en: 'habit completion',      ar: 'إنجاز العادات',         unit: '%' },
  totalExpenses:       { en: 'daily spending',        ar: 'الإنفاق اليومي',        unit: '$' },
  anxiousCount:        { en: 'anxiety level',         ar: 'مستوى القلق',           unit: '' },
  energeticCount:      { en: 'energy level',          ar: 'مستوى الطاقة',          unit: '' },
}

/* ------------------------------------------------------------------ */
/*  Data Collection                                                    */
/* ------------------------------------------------------------------ */

export async function collectDayRecords(userId: string, days: number = 30): Promise<DayRecord[]> {
  const since = new Date()
  since.setDate(since.getDate() - days)

  // Fetch raw data in parallel
  const [moods, sleeps, tasks, habitLogs, habits, expenses] = await Promise.all([
    db.mood.findMany({ where: { userId, date: { gte: since } }, orderBy: { date: 'asc' } }),
    db.sleep.findMany({ where: { userId, date: { gte: since } }, orderBy: { date: 'asc' } }),
    db.task.findMany({ where: { userId, createdAt: { gte: since } } }),
    db.habitLog.findMany({ where: { userId, date: { gte: since } } }),
    db.habit.findMany({ where: { userId } }),
    db.expense.findMany({ where: { userId, date: { gte: since }, type: 'expense' } }),
  ])

  // Build a map keyed by YYYY-MM-DD
  const dayMap = new Map<string, DayRecord>()

  // Initialize all days
  for (let i = 0; i < days; i++) {
    const d = new Date(since)
    d.setDate(d.getDate() + i)
    const key = d.toISOString().slice(0, 10)
    dayMap.set(key, {
      date: key,
      avgMood: null,
      sleepHours: null,
      sleepQuality: null,
      tasksCompleted: 0,
      tasksCreated: 0,
      habitCompletionRate: 0,
      totalExpenses: 0,
      anxiousCount: 0,
      energeticCount: 0,
    })
  }

  // Aggregate moods per day
  const moodsByDay = new Map<string, { values: number[]; labels: string[] }>()
  for (const m of moods) {
    const key = m.date.toISOString().slice(0, 10)
    if (!moodsByDay.has(key)) moodsByDay.set(key, { values: [], labels: [] })
    const bucket = moodsByDay.get(key)!
    bucket.values.push(m.value)
    if (m.label) bucket.labels.push(m.label)
  }
  for (const [key, bucket] of moodsByDay) {
    const rec = dayMap.get(key)
    if (!rec) continue
    rec.avgMood = bucket.values.reduce((a, b) => a + b, 0) / bucket.values.length
    rec.anxiousCount = bucket.labels.filter(l => l === 'anxious' || l === 'sad').length
    rec.energeticCount = bucket.labels.filter(l => l === 'energetic' || l === 'happy').length
  }

  // Aggregate sleep per day
  const sleepByDay = new Map<string, { durations: number[]; qualities: number[] }>()
  for (const s of sleeps) {
    const key = s.date.toISOString().slice(0, 10)
    if (!sleepByDay.has(key)) sleepByDay.set(key, { durations: [], qualities: [] })
    const bucket = sleepByDay.get(key)!
    bucket.durations.push(s.duration)
    bucket.qualities.push(s.quality)
  }
  for (const [key, bucket] of sleepByDay) {
    const rec = dayMap.get(key)
    if (!rec) continue
    rec.sleepHours = bucket.durations.reduce((a, b) => a + b, 0) / bucket.durations.length
    rec.sleepQuality = bucket.qualities.reduce((a, b) => a + b, 0) / bucket.qualities.length
  }

  // Tasks completed & created per day
  for (const t of tasks) {
    const createdKey = t.createdAt.toISOString().slice(0, 10)
    const rec = dayMap.get(createdKey)
    if (rec) rec.tasksCreated++

    if (t.completedAt) {
      const completedKey = t.completedAt.toISOString().slice(0, 10)
      const rec2 = dayMap.get(completedKey)
      if (rec2) rec2.tasksCompleted++
    }
  }

  // Habit completion rate per day
  const totalHabits = Math.max(habits.length, 1)
  const logsByDay = new Map<string, number>()
  for (const hl of habitLogs) {
    const key = hl.date.toISOString().slice(0, 10)
    logsByDay.set(key, (logsByDay.get(key) || 0) + 1)
  }
  for (const [key, count] of logsByDay) {
    const rec = dayMap.get(key)
    if (rec) rec.habitCompletionRate = Math.min(count / totalHabits, 1)
  }

  // Expenses per day
  for (const e of expenses) {
    const key = e.date.toISOString().slice(0, 10)
    const rec = dayMap.get(key)
    if (rec) rec.totalExpenses += e.amount
  }

  return Array.from(dayMap.values())
}

/* ------------------------------------------------------------------ */
/*  Correlation Analysis (Pearson r)                                   */
/* ------------------------------------------------------------------ */

function pearsonR(xs: (number | null)[], ys: (number | null)[]): number {
  // Filter out days where either value is null
  const pairs: [number, number][] = []
  for (let i = 0; i < xs.length; i++) {
    if (xs[i] !== null && ys[i] !== null && !isNaN(xs[i]!) && !isNaN(ys[i]!)) {
      pairs.push([xs[i]!, ys[i]!])
    }
  }
  if (pairs.length < 5) return 0 // Not enough data

  const n = pairs.length
  const sumX = pairs.reduce((s, p) => s + p[0], 0)
  const sumY = pairs.reduce((s, p) => s + p[1], 0)
  const sumXY = pairs.reduce((s, p) => s + p[0] * p[1], 0)
  const sumX2 = pairs.reduce((s, p) => s + p[0] * p[0], 0)
  const sumY2 = pairs.reduce((s, p) => s + p[1] * p[1], 0)

  const numerator = n * sumXY - sumX * sumY
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))

  if (denominator === 0) return 0
  return numerator / denominator
}

function buildCorrelationDescription(
  metricA: string,
  metricB: string,
  r: number,
  records: DayRecord[],
): { en: string; ar: string } {
  const labelA = METRIC_LABELS[metricA]
  const labelB = METRIC_LABELS[metricB]
  const absR = Math.abs(r)
  const pct = Math.round(absR * 100)
  const isNeg = r < 0

  // Try to quantify the effect
  const validDays = records.filter(d => {
    const a = getMetricValue(d, metricA)
    const b = getMetricValue(d, metricB)
    return a !== null && b !== null
  })

  let effectSize = ''
  let effectSizeAr = ''

  if (validDays.length >= 5) {
    // Split into high/low for metricA and compare metricB
    const sorted = [...validDays].sort((a, b) => {
      const va = getMetricValue(a, metricA)!
      const vb = getMetricValue(b, metricA)!
      return va - vb
    })
    const mid = Math.floor(sorted.length / 2)
    const lowGroup = sorted.slice(0, mid)
    const highGroup = sorted.slice(mid)

    const avgBLow = lowGroup.reduce((s, d) => s + getMetricValue(d, metricB)!, 0) / lowGroup.length
    const avgBHigh = highGroup.reduce((s, d) => s + getMetricValue(d, metricB)!, 0) / highGroup.length

    if (avgBLow !== 0) {
      const change = Math.round(Math.abs((avgBHigh - avgBLow) / avgBLow) * 100)
      if (change > 0 && change < 500) {
        const highLabel = isNeg ? 'low' : 'high'
        const lowLabelH = isNeg ? 'high' : 'low'
        effectSize = ` When your ${labelA.en} is ${highLabel}, your ${labelB.en} is ${change}% ${isNeg ? 'lower' : 'higher'} than when it's ${lowLabelH}.`
        effectSizeAr = ` عندما يكون ${labelA.ar} ${isNeg ? 'منخفضًا' : 'مرتفعًا'}، يكون ${labelB.ar} ${change}% ${isNeg ? 'أقل' : 'أعلى'} مقارنةً بأنه ${isNeg ? 'مرتفع' : 'منخفض'}.`
      }
    }
  }

  const dirWord = isNeg ? 'decreases' : 'increases'
  const dirWordAr = isNeg ? 'ينخفض' : 'يرتفع'
  const strengthWord = absR >= 0.7 ? 'strongly' : absR >= 0.4 ? 'moderately' : 'slightly'
  const strengthWordAr = absR >= 0.7 ? 'بشكل قوي' : absR >= 0.4 ? 'بشكل متوسط' : 'بشكل طفيف'

  const en = `Your ${labelA.en} ${strengthWord} ${dirWord} with your ${labelB.en} (${pct}% correlation).${effectSize}`
  const ar = `${labelA.ar} ${strengthWordAr} ${dirWordAr} مع ${labelB.ar} (ارتباط ${pct}%).${effectSizeAr}`

  return { en, ar }
}

function getMetricValue(record: DayRecord, metric: string): number | null {
  switch (metric) {
    case 'avgMood': return record.avgMood
    case 'sleepHours': return record.sleepHours
    case 'sleepQuality': return record.sleepQuality
    case 'tasksCompleted': return record.tasksCompleted
    case 'habitCompletionRate': return record.habitCompletionRate
    case 'totalExpenses': return record.totalExpenses
    case 'anxiousCount': return record.anxiousCount
    case 'energeticCount': return record.energeticCount
    default: return null
  }
}

function findTopCorrelations(records: DayRecord[], topN: number = 3): Correlation[] {
  const metrics = ['avgMood', 'sleepHours', 'sleepQuality', 'tasksCompleted', 'habitCompletionRate', 'totalExpenses', 'anxiousCount', 'energeticCount']

  const correlations: Correlation[] = []

  for (let i = 0; i < metrics.length; i++) {
    for (let j = i + 1; j < metrics.length; j++) {
      const a = metrics[i]
      const b = metrics[j]

      const valuesA = records.map(r => getMetricValue(r, a))
      const valuesB = records.map(r => getMetricValue(r, b))

      // Need at least 5 days with both values
      const validPairs = valuesA.filter((v, idx) => v !== null && valuesB[idx] !== null).length
      if (validPairs < 5) continue

      const r = pearsonR(valuesA, valuesB)
      const absR = Math.abs(r)

      // Only keep meaningful correlations (|r| >= 0.3)
      if (absR < 0.3) continue

      const desc = buildCorrelationDescription(a, b, r, records)

      correlations.push({
        metricA: a,
        metricB: b,
        coefficient: Math.round(r * 1000) / 1000,
        direction: r >= 0 ? 'positive' : 'negative',
        strength: absR >= 0.7 ? 'strong' : absR >= 0.4 ? 'moderate' : 'weak',
        description: desc.en,
        descriptionAr: desc.ar,
      })
    }
  }

  // Sort by absolute coefficient descending, take top N
  correlations.sort((a, b) => Math.abs(b.coefficient) - Math.abs(a.coefficient))
  return correlations.slice(0, topN)
}

/* ------------------------------------------------------------------ */
/*  Productivity Forecast (simple heuristic model)                     */
/* ------------------------------------------------------------------ */

function generateForecast(records: DayRecord[], correlations: Correlation[]): ProductivityForecast[] {
  const recentDays = records.slice(-14) // last 14 days for pattern

  // Day-of-week productivity pattern
  const dayOfWeekProductivity: Record<number, { total: number; count: number }> = {}
  for (const day of recentDays) {
    const dow = new Date(day.date).getDay()
    if (!dayOfWeekProductivity[dow]) dayOfWeekProductivity[dow] = { total: 0, count: 0 }
    // Productivity = weighted combination of task completion and habit completion
    const productivity = day.tasksCompleted * 20 + day.habitCompletionRate * 60 + (day.avgMood || 5) * 2
    dayOfWeekProductivity[dow].total += Math.min(productivity, 100)
    dayOfWeekProductivity[dow].count++
  }

  // Overall trend (last 7 vs previous 7)
  const last7 = recentDays.slice(-7)
  const prev7 = recentDays.slice(0, 7)

  const avgProductivityLast7 = last7.length > 0
    ? last7.reduce((s, d) => s + Math.min(d.tasksCompleted * 20 + d.habitCompletionRate * 60 + (d.avgMood || 5) * 2, 100), 0) / last7.length
    : 50
  const avgProductivityPrev7 = prev7.length > 0
    ? prev7.reduce((s, d) => s + Math.min(d.tasksCompleted * 20 + d.habitCompletionRate * 60 + (d.avgMood || 5) * 2, 100), 0) / prev7.length
    : 50

  const trendDirection = avgProductivityLast7 > avgProductivityPrev7 ? 'up' : avgProductivityLast7 < avgProductivityPrev7 ? 'down' : 'stable'

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const dayNamesAr = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

  const forecast: ProductivityForecast[] = []
  const today = new Date()

  for (let i = 1; i <= 7; i++) {
    const futureDate = new Date(today)
    futureDate.setDate(futureDate.getDate() + i)
    const dow = futureDate.getDay()

    const pattern = dayOfWeekProductivity[dow]
    let predicted = pattern ? pattern.total / pattern.count : avgProductivityLast7

    // Apply trend
    if (trendDirection === 'up') predicted = Math.min(predicted * 1.05, 100)
    else if (trendDirection === 'down') predicted = Math.max(predicted * 0.95, 0)

    // Check if any correlation suggests adjustment
    let correlationNote = ''
    let correlationNoteAr = ''
    for (const corr of correlations) {
      if (corr.metricA === 'sleepHours' || corr.metricB === 'sleepHours') {
        if (corr.direction === 'positive') {
          correlationNote = ' Good sleep is key to your productivity.'
          correlationNoteAr = ' النوم الجيد مفتاح إنتاجيتك.'
        }
      }
      if (corr.metricA === 'anxiousCount' || corr.metricB === 'anxiousCount') {
        if (corr.direction === 'negative') {
          correlationNote += ' Anxiety may reduce your output.'
          correlationNoteAr += ' القلق قد يقلل من إنجازك.'
        }
      }
    }

    const confidence = Math.min(0.9, (recentDays.filter(d => {
      const v = getMetricValue(d, 'tasksCompleted')
      return v !== null
    }).length) / 14)

    forecast.push({
      day: dayNames[dow],
      predictedProductivity: Math.round(Math.max(0, Math.min(100, predicted))),
      confidence: Math.round(confidence * 100) / 100,
      reasoning: `Based on your ${dayNames[dow]} pattern and recent ${trendDirection} trend.${correlationNote}`,
      reasoningAr: `بناءً على نمط يوم ${dayNamesAr[dow]} والاتجاه ${trendDirection === 'up' ? 'الصاعد' : trendDirection === 'down' ? 'التنازلي' : 'المستقر'} مؤخرًا.${correlationNoteAr}`,
    })
  }

  return forecast
}

/* ------------------------------------------------------------------ */
/*  Personality Summary Generation                                     */
/* ------------------------------------------------------------------ */

function generatePersonalitySummary(
  correlations: Correlation[],
  metrics: UserProfile['metrics'],
  dataDays: number,
): { en: string; ar: string } {
  if (dataDays < 7) {
    return {
      en: "I'm still getting to know you. I need at least 7 days of data to start recognizing your patterns.",
      ar: 'ما زلت أتعرف عليك. أحتاج إلى 7 أيام على الأقل من البيانات لأبدأ في التعرف على أنماطك.',
    }
  }

  const parts: string[] = []
  const partsAr: string[] = []

  // Sleep-personality
  if (metrics.avgSleepHours < 6) {
    parts.push(`You're a short sleeper, averaging only ${metrics.avgSleepHours.toFixed(1)} hours per night.`)
    partsAr.push(`أنت تنام قليلاً، بمتوسط ${metrics.avgSleepHours.toFixed(1)} ساعات فقط في الليلة.`)
  } else if (metrics.avgSleepHours >= 7.5) {
    parts.push(`You prioritize rest, averaging ${metrics.avgSleepHours.toFixed(1)} hours of sleep per night.`)
    partsAr.push(`أنت تهتم بالراحة، بمتوسط ${metrics.avgSleepHours.toFixed(1)} ساعات نوم في الليلة.`)
  } else {
    parts.push(`You sleep about ${metrics.avgSleepHours.toFixed(1)} hours per night — adequate but with room for improvement.`)
    partsAr.push(`تنام حوالي ${metrics.avgSleepHours.toFixed(1)} ساعات في الليلة — كافٍ لكن يمكن التحسين.`)
  }

  // Mood-personality
  if (metrics.avgMood >= 7) {
    parts.push('Your overall mood is positive and stable.')
    partsAr.push('مزاجك العام إيجابي ومستقر.')
  } else if (metrics.avgMood >= 5) {
    parts.push('Your mood is moderate, with some fluctuations.')
    partsAr.push('مزاجك متوسط، مع بعض التقلبات.')
  } else {
    parts.push('Your mood tends to be on the lower side — self-care could help.')
    partsAr.push('مزاجك يميل للانخفاض — العناية بالنفس قد تساعد.')
  }

  // Anxiety indicator
  if (metrics.anxiousDayRatio > 0.3) {
    parts.push(`Anxiety appears on ${Math.round(metrics.anxiousDayRatio * 100)}% of your days.`)
    partsAr.push(`يظهر القلق في ${Math.round(metrics.anxiousDayRatio * 100)}% من أيامك.`)
  }

  // Top correlations as personality insights
  if (correlations.length > 0) {
    const topCorr = correlations[0]
    parts.push(topCorr.description)
    partsAr.push(topCorr.descriptionAr)
  }
  if (correlations.length > 1) {
    parts.push(correlations[1].description)
    partsAr.push(correlations[1].descriptionAr)
  }

  return {
    en: parts.join(' '),
    ar: partsAr.join(' '),
  }
}

/* ------------------------------------------------------------------ */
/*  Main Pipeline: buildUserProfile                                    */
/* ------------------------------------------------------------------ */

export async function buildUserProfile(userId: string): Promise<UserProfile> {
  // 1. Collect data
  const records = await collectDayRecords(userId, 30)

  // Count days with at least one data point
  const daysWithData = records.filter(r =>
    r.avgMood !== null || r.sleepHours !== null || r.tasksCompleted > 0 || r.habitCompletionRate > 0
  ).length

  // 2. Calculate aggregate metrics
  const daysWithMood = records.filter(r => r.avgMood !== null)
  const daysWithSleep = records.filter(r => r.sleepHours !== null)
  const daysWithExpenses = records.filter(r => r.totalExpenses > 0)

  const metrics: UserProfile['metrics'] = {
    avgMood: daysWithMood.length > 0
      ? Math.round(daysWithMood.reduce((s, d) => s + d.avgMood!, 0) / daysWithMood.length * 10) / 10
      : 0,
    avgSleepHours: daysWithSleep.length > 0
      ? Math.round(daysWithSleep.reduce((s, d) => s + d.sleepHours!, 0) / daysWithSleep.length * 10) / 10
      : 0,
    avgSleepQuality: daysWithSleep.length > 0
      ? Math.round(daysWithSleep.reduce((s, d) => s + d.sleepQuality!, 0) / daysWithSleep.length * 10) / 10
      : 0,
    avgTaskCompletionRate: records.length > 0
      ? Math.round(records.reduce((s, d) => s + d.tasksCompleted, 0) / records.length * 10) / 10
      : 0,
    avgHabitCompletionRate: records.length > 0
      ? Math.round(records.reduce((s, d) => s + d.habitCompletionRate, 0) / records.length * 100) / 100
      : 0,
    avgDailyExpense: daysWithExpenses.length > 0
      ? Math.round(daysWithExpenses.reduce((s, d) => s + d.totalExpenses, 0) / daysWithExpenses.length * 100) / 100
      : 0,
    anxiousDayRatio: daysWithMood.length > 0
      ? Math.round(daysWithMood.filter(d => d.anxiousCount > 0).length / daysWithMood.length * 100) / 100
      : 0,
    energeticDayRatio: daysWithMood.length > 0
      ? Math.round(daysWithMood.filter(d => d.energeticCount > 0).length / daysWithMood.length * 100) / 100
      : 0,
  }

  // 3. Find correlations (only if we have enough data)
  const topCorrelations = daysWithData >= 7
    ? findTopCorrelations(records, 3)
    : []

  // 4. Generate forecast
  const forecast = daysWithData >= 7
    ? generateForecast(records, topCorrelations)
    : []

  // 5. Generate personality summary
  const personalitySummary = generatePersonalitySummary(topCorrelations, metrics, daysWithData)

  // 6. Assemble profile
  const profile: UserProfile = {
    userId,
    generatedAt: new Date().toISOString(),
    dataDays: daysWithData,
    topCorrelations,
    forecast,
    personalitySummary: personalitySummary.en,
    personalitySummaryAr: personalitySummary.ar,
    metrics,
  }

  // 7. Persist to local JSON file
  saveProfileToFile(profile)

  return profile
}

/* ------------------------------------------------------------------ */
/*  File I/O                                                           */
/* ------------------------------------------------------------------ */

function getProfilePath(userId: string): string {
  return join(process.cwd(), 'data', `user-profile-${userId}.json`)
}

export function saveProfileToFile(profile: UserProfile): void {
  const dir = join(process.cwd(), 'data')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(getProfilePath(profile.userId), JSON.stringify(profile, null, 2), 'utf-8')
}

export function loadProfileFromFile(userId: string): UserProfile | null {
  try {
    const path = getProfilePath(userId)
    if (!existsSync(path)) return null
    const raw = readFileSync(path, 'utf-8')
    return JSON.parse(raw) as UserProfile
  } catch {
    return null
  }
}

/**
 * Build a system-prompt section from the user profile.
 * Returns an empty string if no profile is available.
 */
export function buildInsightsPrompt(userId: string): string {
  const profile = loadProfileFromFile(userId)
  if (!profile || profile.dataDays < 7) return ''

  const lines: string[] = [
    'USER PERSONALITY INSIGHTS:',
    `Data period: ${profile.dataDays} days`,
    '',
    `Summary: ${profile.personalitySummary}`,
    '',
    'Discovered Patterns:',
  ]

  for (let i = 0; i < profile.topCorrelations.length; i++) {
    const c = profile.topCorrelations[i]
    lines.push(`  ${i + 1}. ${c.description}`)
    if (c.strength === 'strong') {
      lines.push(`     ⚠️ ALERT: This is a strong pattern. Always reference it when relevant.`)
    }
  }

  if (profile.metrics.avgSleepHours < 6) {
    lines.push('')
    lines.push('⚠️ ALERT: This user is highly sensitive to sleep deprivation. If they mention being tired, immediately link to their sleep statistics and suggest rescheduling tasks.')
  }

  if (profile.metrics.anxiousDayRatio > 0.3) {
    lines.push('')
    lines.push('⚠️ ALERT: This user experiences anxiety frequently. Be extra supportive and avoid overwhelming suggestions. Prioritize calming, actionable advice.')
  }

  lines.push('')
  lines.push('Average Metrics:')
  lines.push(`  Mood: ${profile.metrics.avgMood}/10 | Sleep: ${profile.metrics.avgSleepHours}hrs | Tasks/day: ${profile.metrics.avgTaskCompletionRate} | Habit completion: ${Math.round(profile.metrics.avgHabitCompletionRate * 100)}%`)

  return lines.join('\n')
}
