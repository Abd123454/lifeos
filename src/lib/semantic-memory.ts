/**
 * LifeOS Semantic Memory — Contextual Recall Engine (v5.1)
 *
 * Enhances memory search with "contextual recall": before searching,
 * loads the user's personality profile and uses discovered correlation
 * patterns as implicit filters to re-weight results.
 *
 * ALL processing is local — no data leaves the server.
 */

import { db } from '@/lib/db'
import { loadProfileFromFile, type UserProfile, type Correlation } from '@/lib/user-model-engine'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface SearchFilters {
  /** If > 0, boost memories related to sleep when sleep is implicated */
  sleepThreshold?: number   // 0–1
  /** If > 0, boost memories related to anxiety/stress patterns */
  anxietyBoost?: number     // 0–1
  /** If > 0, boost memories related to energy/productivity */
  energyBoost?: number      // 0–1
  /** If true, the search was auto-enhanced by the profile */
  profileEnhanced?: boolean
}

export interface MemorySearchResult {
  id: string
  userId: string
  type: string
  key: string
  value: string
  metadata?: string | null
  confidence: number
  source?: string | null
  createdAt: Date
  /** Relevance score (0–1) after contextual weighting */
  relevance: number
  /** Why this result was boosted (if applicable) */
  boostReason?: string
}

export interface MemorySearchResponse {
  results: MemorySearchResult[]
  query: string
  filters: SearchFilters
  profileEnhanced: boolean
  totalNodes: number
}

/* ------------------------------------------------------------------ */
/*  Query Intent Detection                                             */
/* ------------------------------------------------------------------ */

interface QueryIntent {
  mentionsFatigue: boolean
  mentionsAnxiety: boolean
  mentionsEnergy: boolean
  mentionsSleep: boolean
  mentionsMood: boolean
  mentionsProductivity: boolean
  mentionsPain: boolean
  mentionsOverwhelm: boolean
}

function detectQueryIntent(query: string): QueryIntent {
  const q = query.toLowerCase()

  // Support both English and Arabic keywords
  const fatigueKeywords = [
    'tired', 'fatigue', 'exhausted', 'drained', 'weary', 'sleepy',
    'متعب', 'إرهاق', 'ارهاق', 'تعب', 'مجهد', 'مرهق', 'منهك',
  ]
  const anxietyKeywords = [
    'anxious', 'anxiety', 'worried', 'stress', 'stressed', 'panic', 'nervous',
    'قلق', 'قلقان', 'متوتر', 'توتر', 'خائف', 'عصبي',
  ]
  const energyKeywords = [
    'energy', 'energetic', 'motivated', 'productive', 'focused',
    'طاقة', 'نشيط', 'حماس', 'إنتاجي', 'انتاجي',
  ]
  const sleepKeywords = [
    'sleep', 'insomnia', 'rest', 'nap', 'awake', 'night',
    'نوم', 'أرق', 'ارق', 'نعاس', 'ليل', 'نائم',
  ]
  const moodKeywords = [
    'mood', 'sad', 'depressed', 'happy', 'feeling', 'emotion', 'down',
    'مزاج', 'حزين', 'اكتئاب', 'سعيد', 'شعور', 'مشاعر',
  ]
  const productivityKeywords = [
    'productivity', 'work', 'task', 'focus', 'distract', 'procrastinat',
    'إنتاجية', 'انتاجية', 'عمل', 'مهام', 'تركيز', 'تشتت', 'تسويف',
  ]
  const painKeywords = [
    'pain', 'hurt', 'ache', 'headache', 'migraine',
    'ألم', 'الم', 'صداع', 'وجع',
  ]
  const overwhelmKeywords = [
    'overwhelm', 'too much', 'burnout', 'burn out', 'can\'t handle', 'drowning',
    'إرهاق', 'ضغط', 'محاصر', 'لا أستطيع', 'كثير',
  ]

  const matches = (keywords: string[]) => keywords.some(k => q.includes(k))

  return {
    mentionsFatigue: matches(fatigueKeywords),
    mentionsAnxiety: matches(anxietyKeywords),
    mentionsEnergy: matches(energyKeywords),
    mentionsSleep: matches(sleepKeywords),
    mentionsMood: matches(moodKeywords),
    mentionsProductivity: matches(productivityKeywords),
    mentionsPain: matches(painKeywords),
    mentionsOverwhelm: matches(overwhelmKeywords),
  }
}

/* ------------------------------------------------------------------ */
/*  Profile → Filter Mapping                                          */
/* ------------------------------------------------------------------ */

/**
 * Load the user profile and derive contextual search filters
 * based on the detected query intent + discovered personality patterns.
 */
function deriveFiltersFromProfile(
  profile: UserProfile | null,
  intent: QueryIntent,
): SearchFilters {
  const filters: SearchFilters = {
    sleepThreshold: 0,
    anxietyBoost: 0,
    energyBoost: 0,
    profileEnhanced: false,
  }

  if (!profile || profile.dataDays < 7) return filters

  // Check each correlation for relevance to the query
  for (const corr of profile.topCorrelations) {
    const { metricA, metricB, direction, strength } = corr
    const isStrong = strength === 'strong'
    const isModerate = strength === 'moderate'
    const boost = isStrong ? 0.5 : isModerate ? 0.3 : 0.1

    // Sleep-related correlations
    if (metricA === 'sleepHours' || metricB === 'sleepHours' ||
        metricA === 'sleepQuality' || metricB === 'sleepQuality') {
      // If user is asking about fatigue, tiredness, or mood — sleep is likely relevant
      if (intent.mentionsFatigue || intent.mentionsSleep || intent.mentionsMood || intent.mentionsEnergy) {
        filters.sleepThreshold = Math.min(filters.sleepThreshold + boost + 0.2, 1)
        filters.profileEnhanced = true
      }
      // If sleep correlates negatively with productivity, boost sleep for productivity queries
      if (intent.mentionsProductivity && direction === 'negative') {
        filters.sleepThreshold = Math.min(filters.sleepThreshold + boost + 0.15, 1)
        filters.profileEnhanced = true
      }
    }

    // Anxiety-related correlations
    if (metricA === 'anxiousCount' || metricB === 'anxiousCount') {
      if (intent.mentionsAnxiety || intent.mentionsOverwhelm || intent.mentionsMood) {
        filters.anxietyBoost = Math.min(filters.anxietyBoost + boost + 0.2, 1)
        filters.profileEnhanced = true
      }
      // If anxiety correlates negatively with energy, boost anxiety for energy queries
      if (intent.mentionsEnergy && direction === 'negative') {
        filters.anxietyBoost = Math.min(filters.anxietyBoost + boost + 0.15, 1)
        filters.profileEnhanced = true
      }
    }

    // Energy-related correlations
    if (metricA === 'energeticCount' || metricB === 'energeticCount') {
      if (intent.mentionsEnergy || intent.mentionsProductivity) {
        filters.energyBoost = Math.min(filters.energyBoost + boost + 0.2, 1)
        filters.profileEnhanced = true
      }
    }
  }

  // Global profile-level boosts (even without specific correlations)
  if (profile.metrics.avgSleepHours < 6 && (intent.mentionsFatigue || intent.mentionsMood)) {
    filters.sleepThreshold = Math.min(filters.sleepThreshold + 0.3, 1)
    filters.profileEnhanced = true
  }
  if (profile.metrics.anxiousDayRatio > 0.3 && (intent.mentionsAnxiety || intent.mentionsOverwhelm)) {
    filters.anxietyBoost = Math.min(filters.anxietyBoost + 0.3, 1)
    filters.profileEnhanced = true
  }

  return filters
}

/* ------------------------------------------------------------------ */
/*  Relevance Scoring                                                 */
/* ------------------------------------------------------------------ */

/**
 * Score a memory node's relevance to the query + contextual filters.
 */
function scoreRelevance(
  node: {
    key: string
    value: string
    type: string
    confidence: number
    metadata?: string | null
  },
  query: string,
  filters: SearchFilters,
  intent: QueryIntent,
): { score: number; boostReason?: string } {
  let score = 0
  let boostReason: string | undefined
  const q = query.toLowerCase()
  const keyLower = node.key.toLowerCase()
  const valueLower = node.value.toLowerCase()
  const combined = `${keyLower} ${valueLower}`

  // 1. Base text relevance (keyword match)
  const queryTerms = q.split(/\s+/).filter(t => t.length > 2)
  let matchedTerms = 0
  for (const term of queryTerms) {
    if (combined.includes(term)) matchedTerms++
  }
  score += queryTerms.length > 0 ? (matchedTerms / queryTerms.length) * 0.4 : 0

  // 2. Confidence bonus
  score += node.confidence * 0.1

  // 3. Type relevance
  if (node.type === 'preference' || node.type === 'fact') {
    score += 0.05
  }

  // 4. Contextual filter boosts — the core of "contextual recall"
  const sleepKeywords = ['sleep', 'نوم', 'insomnia', 'أرق', 'nap', 'rest', 'tired', 'fatigue', 'تعب', 'إرهاق', 'bedtime', 'wake']
  const anxietyKeywords = ['anxiety', 'قلق', 'stress', 'توتر', 'worried', 'panic', 'nervous', 'خائف']
  const energyKeywords = ['energy', 'طاقة', 'productive', 'إنتاج', 'focus', 'تركيز', 'motivat', 'حماس']

  const hasSleepContent = sleepKeywords.some(k => combined.includes(k))
  const hasAnxietyContent = anxietyKeywords.some(k => combined.includes(k))
  const hasEnergyContent = energyKeywords.some(k => combined.includes(k))

  // Apply sleep threshold boost
  if (filters.sleepThreshold > 0 && hasSleepContent) {
    const boost = filters.sleepThreshold * 0.35
    score += boost
    boostReason = `Sleep pattern boost (${Math.round(filters.sleepThreshold * 100)}%)`
  }

  // Apply anxiety boost
  if (filters.anxietyBoost > 0 && hasAnxietyContent) {
    const boost = filters.anxietyBoost * 0.35
    score += boost
    if (boostReason) {
      boostReason += ` + Anxiety pattern boost (${Math.round(filters.anxietyBoost * 100)}%)`
    } else {
      boostReason = `Anxiety pattern boost (${Math.round(filters.anxietyBoost * 100)}%)`
    }
  }

  // Apply energy boost
  if (filters.energyBoost > 0 && hasEnergyContent) {
    const boost = filters.energyBoost * 0.3
    score += boost
    if (boostReason) {
      boostReason += ` + Energy pattern boost (${Math.round(filters.energyBoost * 100)}%)`
    } else {
      boostReason = `Energy pattern boost (${Math.round(filters.energyBoost * 100)}%)`
    }
  }

  // 5. Cross-intent boost: if intent mentions fatigue AND the memory is about
  //    a bad sleep night or low productivity, give extra weight
  if (intent.mentionsFatigue && hasSleepContent && node.confidence >= 0.7) {
    score += 0.15
    if (!boostReason) boostReason = 'Fatigue-sleep cross-boost'
  }

  if (intent.mentionsAnxiety && hasAnxietyContent && node.confidence >= 0.7) {
    score += 0.15
    if (!boostReason) boostReason = 'Anxiety-empathy cross-boost'
  }

  return { score: Math.min(score, 1), boostReason }
}

/* ------------------------------------------------------------------ */
/*  Main Function: searchMemory                                        */
/* ------------------------------------------------------------------ */

/**
 * Contextual memory search that uses user-profile.json correlation
 * patterns as implicit filters.
 *
 * @param userId   The user ID to search memories for
 * @param query    The search query (e.g. "لماذا أنا متعب؟")
 * @param filters  Optional manual filters to override/supplement auto-derived ones
 * @returns        Weighted, sorted search results
 */
export async function searchMemory(
  userId: string,
  query: string,
  filters?: SearchFilters,
): Promise<MemorySearchResponse> {
  // 1. Detect query intent
  const intent = detectQueryIntent(query)

  // 2. Load user profile
  const profile = loadProfileFromFile(userId)

  // 3. Derive contextual filters from profile + intent
  const autoFilters = deriveFiltersFromProfile(profile, intent)

  // 4. Merge: manual filters override auto-derived ones
  const mergedFilters: SearchFilters = {
    sleepThreshold: filters?.sleepThreshold ?? autoFilters.sleepThreshold,
    anxietyBoost: filters?.anxietyBoost ?? autoFilters.anxietyBoost,
    energyBoost: filters?.energyBoost ?? autoFilters.energyBoost,
    profileEnhanced: autoFilters.profileEnhanced || (filters?.sleepThreshold !== undefined || filters?.anxietyBoost !== undefined),
  }

  // 5. Fetch ALL memory nodes for this user (we score them locally)
  const allNodes = await db.memoryNode.findMany({
    where: { userId },
    orderBy: { confidence: 'desc' },
  })

  // 6. Score each node
  const scored: MemorySearchResult[] = allNodes.map(node => {
    const { score, boostReason } = scoreRelevance(node, query, mergedFilters, intent)
    return {
      id: node.id,
      userId: node.userId,
      type: node.type,
      key: node.key,
      value: node.value,
      metadata: node.metadata,
      confidence: node.confidence,
      source: node.source,
      createdAt: node.createdAt,
      relevance: score,
      boostReason,
    }
  })

  // 7. Sort by relevance (highest first), then confidence
  scored.sort((a, b) => {
    if (b.relevance !== a.relevance) return b.relevance - a.relevance
    return b.confidence - a.confidence
  })

  // 8. Filter out zero-relevance results if we have enough
  const relevantResults = scored.filter(r => r.relevance > 0)
  const finalResults = relevantResults.length > 0 ? relevantResults : scored.slice(0, 10)

  return {
    results: finalResults.slice(0, 20),
    query,
    filters: mergedFilters,
    profileEnhanced: mergedFilters.profileEnhanced,
    totalNodes: allNodes.length,
  }
}

/**
 * Build a contextual context string from the top search results,
 * suitable for injecting into the agent's system prompt.
 */
export function buildMemoryContext(searchResponse: MemorySearchResponse): string {
  if (searchResponse.results.length === 0) return ''

  const lines: string[] = [
    'RELEVANT MEMORIES (from semantic fabric):',
    `Search query: "${searchResponse.query}"`,
    `Profile-enhanced: ${searchResponse.profileEnhanced ? 'Yes' : 'No'}`,
    '',
  ]

  const topResults = searchResponse.results.slice(0, 5)
  for (let i = 0; i < topResults.length; i++) {
    const r = topResults[i]
    lines.push(`  ${i + 1}. [${r.type}] ${r.key}: ${r.value} (relevance: ${Math.round(r.relevance * 100)}%)`)
    if (r.boostReason) {
      lines.push(`     ↳ Boosted by: ${r.boostReason}`)
    }
  }

  return lines.join('\n')
}
