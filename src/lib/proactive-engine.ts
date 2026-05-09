/**
 * LifeOS Proactive Engine — Ambient Awareness (v5.2)
 *
 * This engine watches user actions and proactively generates
 * caring notifications when behavioral patterns suggest the user
 * needs support. It does NOT wait for the user to ask.
 *
 * Triggered after: mood logging, sleep logging, task creation.
 * All processing is local — no data leaves the server.
 */

import { db } from '@/lib/db'
import { loadProfileFromFile, type UserProfile } from '@/lib/user-model-engine'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type ProactiveTrigger = 'mood_logged' | 'sleep_logged' | 'task_created'

export interface ProactiveContext {
  userId: string
  trigger: ProactiveTrigger
  /** The mood value if trigger is mood_logged */
  moodValue?: number
  /** The mood label if available */
  moodLabel?: string
  /** Sleep duration in hours if trigger is sleep_logged */
  sleepDuration?: number
  /** Sleep quality (1-5) if trigger is sleep_logged */
  sleepQuality?: number
  /** Task title if trigger is task_created */
  taskTitle?: string
  /** Task priority if trigger is task_created */
  taskPriority?: string
}

export interface ProactiveResult {
  triggered: boolean
  reason?: string
  notificationId?: string
  notificationMessage?: string
}

/* ------------------------------------------------------------------ */
/*  Cooldown tracking (in-memory, per user per trigger type)           */
/* ------------------------------------------------------------------ */

const COOLDOWN_MS = 60 * 60 * 1000 // 1 hour between proactive notifications of same type
const cooldownMap = new Map<string, number>() // key: `${userId}:${trigger}`, value: timestamp

function isOnCooldown(userId: string, trigger: ProactiveTrigger): boolean {
  const key = `${userId}:${trigger}`
  const lastTriggered = cooldownMap.get(key)
  if (!lastTriggered) return false
  return Date.now() - lastTriggered < COOLDOWN_MS
}

function markTriggered(userId: string, trigger: ProactiveTrigger): void {
  cooldownMap.set(`${userId}:${trigger}`, Date.now())
}

/* ------------------------------------------------------------------ */
/*  Pattern Detection                                                  */
/* ------------------------------------------------------------------ */

interface DetectedPattern {
  shouldAct: boolean
  reason: string
  /** The data-driven context to pass to the agent */
  contextForAgent: string
  severity: 'info' | 'warning' | 'critical'
}

function analyzeMoodTrigger(ctx: ProactiveContext, profile: UserProfile | null): DetectedPattern {
  const moodVal = ctx.moodValue ?? 10
  const isBadMood = moodVal <= 3

  if (!isBadMood) {
    return { shouldAct: false, reason: 'Mood is fine', contextForAgent: '', severity: 'info' }
  }

  const parts: string[] = [
    `The user just logged a low mood: ${moodVal}/10${ctx.moodLabel ? ` (label: ${ctx.moodLabel})` : ''}.`,
  ]

  let severity: DetectedPattern['severity'] = 'warning'
  if (moodVal <= 1) severity = 'critical'

  // Check profile correlations
  if (profile && profile.dataDays >= 7) {
    for (const corr of profile.topCorrelations) {
      // Sleep → mood correlation
      if ((corr.metricA === 'sleepHours' || corr.metricB === 'sleepHours') &&
          (corr.metricA === 'avgMood' || corr.metricB === 'avgMood' ||
           corr.metricA === 'anxiousCount' || corr.metricB === 'anxiousCount')) {
        parts.push(
          `Discovered pattern: ${corr.description}. This suggests their low mood may be linked to sleep issues.`,
        )
      }
      // Anxiety → mood correlation
      if ((corr.metricA === 'anxiousCount' || corr.metricB === 'anxiousCount') &&
          (corr.metricA === 'avgMood' || corr.metricB === 'avgMood')) {
        parts.push(
          `Discovered pattern: ${corr.description}. Their anxiety appears to affect their mood.`,
        )
      }
    }

    // Global alerts
    if (profile.metrics.avgSleepHours < 6) {
      parts.push(`This user averages only ${profile.metrics.avgSleepHours} hours of sleep per night — they are sleep-deprived.`)
    }
    if (profile.metrics.anxiousDayRatio > 0.3) {
      parts.push(`This user experiences anxiety on ${Math.round(profile.metrics.anxiousDayRatio * 100)}% of days.`)
    }
  }

  return {
    shouldAct: true,
    reason: `Low mood detected: ${moodVal}/10`,
    contextForAgent: parts.join(' '),
    severity,
  }
}

function analyzeSleepTrigger(ctx: ProactiveContext, profile: UserProfile | null): DetectedPattern {
  const sleepHrs = ctx.sleepDuration ?? 10
  const sleepQual = ctx.sleepQuality ?? 5
  const isBadSleep = sleepHrs <= 5 || sleepQual <= 2

  if (!isBadSleep) {
    return { shouldAct: false, reason: 'Sleep is adequate', contextForAgent: '', severity: 'info' }
  }

  const parts: string[] = [
    `The user just logged poor sleep: ${sleepHrs} hours, quality ${sleepQual}/5.`,
  ]

  let severity: DetectedPattern['severity'] = 'warning'
  if (sleepHrs <= 3) severity = 'critical'

  if (profile && profile.dataDays >= 7) {
    for (const corr of profile.topCorrelations) {
      // Sleep → productivity correlation
      if ((corr.metricA === 'sleepHours' || corr.metricB === 'sleepHours') &&
          (corr.metricA === 'tasksCompleted' || corr.metricB === 'tasksCompleted' ||
           corr.metricA === 'habitCompletionRate' || corr.metricB === 'habitCompletionRate')) {
        parts.push(
          `Discovered pattern: ${corr.description}. Their poor sleep will likely impact their productivity tomorrow.`,
        )
      }
      // Sleep → mood correlation
      if ((corr.metricA === 'sleepHours' || corr.metricB === 'sleepHours') &&
          (corr.metricA === 'avgMood' || corr.metricB === 'avgMood')) {
        parts.push(
          `Discovered pattern: ${corr.description}. Their sleep directly affects their mood.`,
        )
      }
    }

    if (profile.metrics.avgSleepHours < 6) {
      parts.push(`This is part of a chronic pattern — they average only ${profile.metrics.avgSleepHours} hours per night.`)
    }
  }

  return {
    shouldAct: true,
    reason: `Poor sleep detected: ${sleepHrs}hrs, quality ${sleepQual}/5`,
    contextForAgent: parts.join(' '),
    severity,
  }
}

function analyzeTaskTrigger(ctx: ProactiveContext, profile: UserProfile | null): DetectedPattern {
  // Check if user is creating tasks while sleep-deprived or in a bad mood
  // This is a lighter trigger — only fires if profile shows vulnerability

  if (!profile || profile.dataDays < 7) {
    return { shouldAct: false, reason: 'Not enough profile data', contextForAgent: '', severity: 'info' }
  }

  const parts: string[] = []

  // Check if user has been having bad sleep recently
  // We'll check the last logged sleep
  // For now, use profile averages as a proxy
  if (profile.metrics.avgSleepHours < 6 && ctx.taskPriority === 'urgent') {
    parts.push(
      `The user just created an urgent task ("${ctx.taskTitle}") while their profile shows they average only ${profile.metrics.avgSleepHours} hours of sleep per night.`,
    )
    parts.push('This could lead to burnout. Consider suggesting they delegate or reschedule.')
  } else if (profile.metrics.anxiousDayRatio > 0.4 && ctx.taskPriority === 'high') {
    parts.push(
      `The user just created a high-priority task ("${ctx.taskTitle}") while experiencing anxiety on ${Math.round(profile.metrics.anxiousDayRatio * 100)}% of days.`,
    )
    parts.push('Adding pressure during anxious periods may not be ideal.')
  }

  if (parts.length === 0) {
    return { shouldAct: false, reason: 'No concerning pattern detected', contextForAgent: '', severity: 'info' }
  }

  return {
    shouldAct: true,
    reason: `Task created during vulnerable period`,
    contextForAgent: parts.join(' '),
    severity: 'warning',
  }
}

/* ------------------------------------------------------------------ */
/*  Main Function: analyzeAndAct                                       */
/* ------------------------------------------------------------------ */

/**
 * Analyzes a user action and proactively generates a caring
 * notification if a behavioral pattern is detected.
 *
 * This is fire-and-forget — it should NOT block the original
 * API response. Call it without awaiting.
 */
export async function analyzeAndAct(ctx: ProactiveContext): Promise<ProactiveResult> {
  try {
    const { userId, trigger } = ctx

    // 1. Check cooldown
    if (isOnCooldown(userId, trigger)) {
      return { triggered: false, reason: 'On cooldown (1hr between proactive notifications)' }
    }

    // 2. Load user profile
    const profile = loadProfileFromFile(userId)

    // 3. Don't act if profile is too young
    if (profile && profile.dataDays < 7) {
      return { triggered: false, reason: 'Not enough data yet (need 7 days)' }
    }

    // 4. Analyze based on trigger type
    let detection: DetectedPattern

    switch (trigger) {
      case 'mood_logged':
        detection = analyzeMoodTrigger(ctx, profile)
        break
      case 'sleep_logged':
        detection = analyzeSleepTrigger(ctx, profile)
        break
      case 'task_created':
        detection = analyzeTaskTrigger(ctx, profile)
        break
      default:
        return { triggered: false, reason: `Unknown trigger: ${trigger}` }
    }

    if (!detection.shouldAct) {
      return { triggered: false, reason: detection.reason }
    }

    // 5. Call NVIDIA NIM API with proactive system prompt
    const apiKey = process.env.NVIDIA_NIM_API_KEY
    if (!apiKey) {
      console.warn('Proactive engine: NVIDIA NIM API key not configured')
      return { triggered: false, reason: 'API key not configured' }
    }

    // Determine user's language from their settings
    let userLanguage = 'en'
    try {
      const langSetting = await db.settings.findUnique({
        where: { userId_key: { userId, key: 'language' } },
      })
      if (langSetting?.value === 'ar') userLanguage = 'ar'
    } catch { /* use default */ }

    const proactiveSystemPrompt = buildProactiveSystemPrompt(userLanguage, profile)

    const agentMessage = `${detection.contextForAgent}

Generate a single proactive notification for this user now.`

    const messages = [
      { role: 'system', content: proactiveSystemPrompt },
      { role: 'user', content: agentMessage },
    ]

    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'meta/llama-3.1-8b-instruct',
        messages,
        temperature: 0.6,
        max_tokens: 256,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Proactive engine: NVIDIA NIM API error:', response.status, errorText)
      return { triggered: false, reason: `API error: ${response.status}` }
    }

    const data = await response.json()
    const notificationMessage = data.choices?.[0]?.message?.content?.trim()

    if (!notificationMessage) {
      return { triggered: false, reason: 'Agent returned empty message' }
    }

    // 6. Store as notification in database
    const notification = await db.notification.create({
      data: {
        userId,
        type: 'PROACTIVE_INSIGHT',
        title: userLanguage === 'ar' ? 'رؤية استباقية' : 'Proactive Insight',
        message: notificationMessage,
        read: false,
      },
    })

    // 7. Mark cooldown
    markTriggered(userId, trigger)

    console.log(`[Proactive Engine] Created notification for ${userId}: ${notificationMessage.slice(0, 80)}...`)

    return {
      triggered: true,
      reason: detection.reason,
      notificationId: notification.id,
      notificationMessage,
    }
  } catch (error) {
    console.error('Proactive engine error:', error)
    return { triggered: false, reason: `Error: ${error instanceof Error ? error.message : String(error)}` }
  }
}

/* ------------------------------------------------------------------ */
/*  Proactive System Prompt Builder                                    */
/* ------------------------------------------------------------------ */

function buildProactiveSystemPrompt(language: string, profile: UserProfile | null): string {
  const isArabic = language === 'ar'

  if (isArabic) {
    return `أنت "الرقيب" في نظام LifeOS — نظام إدارة حياة شخصية.

مهمتك هي توليد إشعار استباقي واحد بلغة المستخدم (العربية) يعبر عن القلق والاهتمام بناءً على البيانات المقدمة.

قواعد صارمة:
1. لا تسأل أسئلة. فقط نبه المستخدم بلطف واعرض المساعدة.
2. الإشعار يجب أن يكون قصيرًا (جملتين إلى ثلاث جمل كحد أقصى).
3. استخدم لغة دافئة ومتعاطفة. قل "لاحظتُ" بدلاً من "بياناتك تُظهر".
4. اربط الملاحظة بنمط محدد من بيانات المستخدم (إن وُجد).
5. اعرض إجراءً واحدًا محددًا يمكن للمستخدم اتخاذه.
6. لا تستخدم علامات اقتباس أو تنسيق markdown. فقط نص عادي.
7. ابدأ الإشعار مباشرة بدون مقدمات مثل "الإشعار:" أو "تنبيه:".

${profile && profile.dataDays >= 7 ? `
ملف المستخدم:
- متوسط المزاج: ${profile.metrics.avgMood}/10
- متوسط النوم: ${profile.metrics.avgSleepHours} ساعات
- أيام القلق: ${Math.round(profile.metrics.anxiousDayRatio * 100)}% من الأيام
- إنجاز العادات: ${Math.round(profile.metrics.avgHabitCompletionRate * 100)}%
${profile.topCorrelations.length > 0 ? `- أنماط مكتشفة: ${profile.topCorrelations.map(c => c.descriptionAr).join(' | ')}` : ''}
` : ''}`
  }

  return `You are the "Watchman" in LifeOS — a personal life management system.

Your task is to generate a SINGLE proactive notification in the user's language (English) that expresses concern and care based on the provided data.

STRICT RULES:
1. Do NOT ask questions. Just gently alert the user and offer help.
2. The notification must be SHORT (2-3 sentences max).
3. Use warm, empathetic language. Say "I noticed" rather than "Your data shows."
4. Link the observation to a specific pattern from the user's data (if available).
5. Offer ONE specific action the user can take.
6. Do NOT use quotation marks or markdown formatting. Just plain text.
7. Start the notification directly without prefixes like "Notification:" or "Alert:".

${profile && profile.dataDays >= 7 ? `
User Profile:
- Average mood: ${profile.metrics.avgMood}/10
- Average sleep: ${profile.metrics.avgSleepHours} hours
- Anxious days: ${Math.round(profile.metrics.anxiousDayRatio * 100)}% of days
- Habit completion: ${Math.round(profile.metrics.avgHabitCompletionRate * 100)}%
${profile.topCorrelations.length > 0 ? `- Discovered patterns: ${profile.topCorrelations.map(c => c.description).join(' | ')}` : ''}
` : ''}`
}
