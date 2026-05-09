'use client'

import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Plus, Brain, Search, User, MapPin, Calendar, BookOpen, Lightbulb, Hash,
  Bot, Sparkles, Database, LayoutGrid, Loader2, X
} from 'lucide-react'
import { translations } from '@/lib/i18n'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  userId: string
  language: 'en' | 'ar'
}

const memoryTypes = ['person', 'event', 'place', 'skill', 'preference', 'fact'] as const

const typeConfig: Record<string, {
  icon: any
  gradient: string
  bg: string
  badge: string
  border: string
  ringColor: string
  label: string
}> = {
  person: {
    icon: User,
    gradient: 'from-blue-400 to-blue-600',
    bg: 'bg-blue-100 dark:bg-blue-900/50',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800/50',
    ringColor: '#3b82f6',
    label: 'Person',
  },
  event: {
    icon: Calendar,
    gradient: 'from-amber-400 to-amber-600',
    bg: 'bg-amber-100 dark:bg-amber-900/50',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800/50',
    ringColor: '#f59e0b',
    label: 'Event',
  },
  place: {
    icon: MapPin,
    gradient: 'from-emerald-400 to-emerald-600',
    bg: 'bg-emerald-100 dark:bg-emerald-900/50',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800/50',
    ringColor: '#10b981',
    label: 'Place',
  },
  skill: {
    icon: BookOpen,
    gradient: 'from-purple-400 to-purple-600',
    bg: 'bg-purple-100 dark:bg-purple-900/50',
    badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-800/50',
    ringColor: '#8b5cf6',
    label: 'Skill',
  },
  preference: {
    icon: Lightbulb,
    gradient: 'from-pink-400 to-pink-600',
    bg: 'bg-pink-100 dark:bg-pink-900/50',
    badge: 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300',
    border: 'border-pink-200 dark:border-pink-800/50',
    ringColor: '#ec4899',
    label: 'Preference',
  },
  fact: {
    icon: Hash,
    gradient: 'from-teal-400 to-teal-600',
    bg: 'bg-teal-100 dark:bg-teal-900/50',
    badge: 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300',
    border: 'border-teal-200 dark:border-teal-800/50',
    ringColor: '#14b8a6',
    label: 'Fact',
  },
}

const sourceConfig: Record<string, { icon: any; badge: string; label: string }> = {
  manual: {
    icon: Lightbulb,
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
    label: 'Manual',
  },
  auto: {
    icon: Bot,
    badge: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300',
    label: 'Auto',
  },
}

export default function MemoryPanel({ userId, language }: Props) {
  const t = translations[language]
  const [memories, setMemories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ type: 'fact', key: '', value: '', source: 'manual' })
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [isSearchMode, setIsSearchMode] = useState(false)

  const loadMemories = async () => {
    if (!userId) return
    try {
      const res = await fetch(`/api/memory/nodes?userId=${userId}`)
      if (res.ok) {
        const data = await res.json()
        setMemories(Array.isArray(data) ? data : data.nodes || [])
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadMemories() }, [userId])

  const addMemory = async () => {
    if (!form.key || !form.value) return
    await fetch('/api/memory/nodes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ...form }),
    })
    setDialogOpen(false)
    setForm({ type: 'fact', key: '', value: '', source: 'manual' })
    loadMemories()
  }

  const handleSearch = async () => {
    if (!search) return
    setSearching(true)
    setIsSearchMode(true)
    try {
      const res = await fetch('/api/memory/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, query: search }),
      })
      if (res.ok) {
        const data = await res.json()
        setSearchResults(Array.isArray(data) ? data : data.results || [])
      }
    } catch (e) { console.error(e) }
    setSearching(false)
  }

  const clearSearch = () => {
    setSearchResults([])
    setSearch('')
    setIsSearchMode(false)
  }

  // Compute stats
  const filtered = typeFilter === 'all' ? memories : memories.filter(m => m.type === typeFilter)
  const displayMemories = isSearchMode ? searchResults : filtered

  const { totalMemories, mostCommonType, typesCovered, manualCount, autoCount } = useMemo(() => {
    const total = memories.length
    const typeCounts: Record<string, number> = {}
    let manualC = 0
    let autoC = 0
    const typeSet = new Set<string>()

    memories.forEach(m => {
      typeCounts[m.type] = (typeCounts[m.type] || 0) + 1
      typeSet.add(m.type)
      if (m.source === 'auto') autoC++
      else manualC++
    })

    const mostCommon = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]
    return {
      totalMemories: total,
      mostCommonType: mostCommon ? mostCommon[0] : null,
      typesCovered: typeSet.size,
      manualCount: manualC,
      autoCount: autoC,
    }
  }, [memories])

  const typeCoveragePercent = Math.round((typesCovered / 6) * 100)

  if (loading) return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">{[1,2,3].map(i => <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-20 bg-muted rounded" /></CardContent></Card>)}</div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{[1,2,3].map(i => <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-24 bg-muted rounded" /></CardContent></Card>)}</div>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-lg font-semibold">{t.memory}</h3>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 me-2" />{t.addMemory}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>{t.addMemory}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              {/* Type Selection as Visual Cards */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Memory Type</Label>
                <div className="grid grid-cols-3 gap-2">
                  {memoryTypes.map(type => {
                    const config = typeConfig[type]
                    const Icon = config.icon
                    const isSelected = form.type === type
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setForm({ ...form, type })}
                        className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-200 ${
                          isSelected
                            ? `${config.border} ${config.bg} shadow-sm`
                            : 'border-muted hover:border-muted-foreground/30 bg-background'
                        }`}
                      >
                        {isSelected && (
                          <div className={`absolute top-1 end-1 w-2 h-2 rounded-full bg-gradient-to-r ${config.gradient}`} />
                        )}
                        <div className={`p-1.5 rounded-lg ${config.bg}`}>
                          <Icon className={`w-4 h-4 ${isSelected ? 'text-current' : 'text-muted-foreground'}`} />
                        </div>
                        <span className="text-xs font-medium capitalize">{config.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Key Field */}
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Key</Label>
                <Input
                  placeholder="e.g., birthday, favorite color, meeting location..."
                  value={form.key}
                  onChange={e => setForm({ ...form, key: e.target.value })}
                />
              </div>

              {/* Value Field */}
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Value</Label>
                <Textarea
                  placeholder="Enter the memory details..."
                  rows={3}
                  value={form.value}
                  onChange={e => setForm({ ...form, value: e.target.value })}
                />
              </div>

              {/* Source Selection */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Source</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(['manual', 'auto'] as const).map(src => {
                    const srcConfig = sourceConfig[src]
                    const SrcIcon = srcConfig.icon
                    const isSelected = form.source === src
                    return (
                      <button
                        key={src}
                        type="button"
                        onClick={() => setForm({ ...form, source: src })}
                        className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all duration-200 ${
                          isSelected
                            ? 'border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/20 shadow-sm'
                            : 'border-muted hover:border-muted-foreground/30 bg-background'
                        }`}
                      >
                        <div className={`p-1.5 rounded-lg ${srcConfig.badge}`}>
                          <SrcIcon className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-medium">{srcConfig.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <Button onClick={addMemory} className="w-full bg-emerald-600 hover:bg-emerald-700">
                <Sparkles className="w-4 h-4 me-2" />{t.save}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        {/* Total Memories */}
        <Card className="border-0 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20">
          <CardContent className="p-5">
            <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 w-fit mb-3">
              <Database className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-xs text-muted-foreground">Total Memories</p>
            <p className="text-2xl font-bold">{totalMemories}</p>
          </CardContent>
        </Card>

        {/* Most Common Type */}
        <Card className="border-0 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
          <CardContent className="p-5">
            <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-900/50 w-fit mb-3">
              {mostCommonType ? (
                (() => {
                  const ConfigIcon = typeConfig[mostCommonType]?.icon || Brain
                  return <ConfigIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                })()
              ) : (
                <Brain className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">Most Common Type</p>
            <p className="text-2xl font-bold capitalize">{mostCommonType || '—'}</p>
          </CardContent>
        </Card>

        {/* Manual vs Auto */}
        <Card className="border-0 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
          <CardContent className="p-5">
            <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/50 w-fit mb-3">
              <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <p className="text-xs text-muted-foreground">Manual / Auto</p>
            <p className="text-2xl font-bold">
              {manualCount} <span className="text-base font-normal text-muted-foreground">/</span> {autoCount}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Type Coverage Ring + Search Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* SVG Ring Indicator - Type Coverage */}
        <Card className="border-0 bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-950/20 dark:to-cyan-950/20">
          <CardContent className="p-5 flex flex-col items-center">
            <div className="relative w-24 h-24 mb-2">
              <svg className="w-24 h-24 -rotate-90" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  className="text-muted/30"
                  strokeWidth="3"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#14b8a6"
                  strokeWidth="3"
                  strokeDasharray={`${typeCoveragePercent}, 100`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-bold">{typesCovered}</span>
                <span className="text-[10px] text-muted-foreground">of 6</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground font-medium">Type Coverage</p>
            <div className="flex gap-1 mt-2 flex-wrap justify-center">
              {memoryTypes.map(type => {
                const config = typeConfig[type]
                const hasType = memories.some(m => m.type === type)
                return (
                  <div
                    key={type}
                    className={`w-3 h-3 rounded-full ${hasType ? '' : 'opacity-25'}`}
                    style={{ backgroundColor: config.ringColor }}
                    title={`${config.label}: ${hasType ? 'Yes' : 'No'}`}
                  />
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Search Section */}
        <Card className="md:col-span-2">
          <CardContent className="p-4">
            <div className="flex gap-2 mb-3">
              <div className="relative flex-1">
                <motion.div
                  animate={searching ? { rotate: 360 } : { rotate: 0 }}
                  transition={searching ? { duration: 1, repeat: Infinity, ease: 'linear' } : {}}
                >
                  <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                </motion.div>
                <Input
                  placeholder="Search memories..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="ps-9"
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                />
                {search && !searching && (
                  <button
                    onClick={clearSearch}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <Button
                onClick={handleSearch}
                variant={isSearchMode ? 'default' : 'outline'}
                disabled={searching}
                className={isSearchMode ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
              >
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : t.search}
              </Button>
            </div>

            {/* Search/Browse mode indicator */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isSearchMode ? (
                  <>
                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 border-0">
                      <Search className="w-3 h-3 me-1" />
                      Search Mode
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
                    </span>
                  </>
                ) : (
                  <>
                    <Badge variant="outline" className="text-xs">
                      <LayoutGrid className="w-3 h-3 me-1" />
                      Browse
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {filtered.length} memor{filtered.length !== 1 ? 'ies' : 'y'}
                    </span>
                  </>
                )}
              </div>
              {isSearchMode && (
                <Button variant="ghost" size="sm" onClick={clearSearch} className="h-7 text-xs">
                  Clear Search
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Type Filter */}
      <div className="flex gap-2 flex-wrap">
        <Button
          size="sm"
          variant={typeFilter === 'all' ? 'default' : 'outline'}
          onClick={() => setTypeFilter('all')}
          className={typeFilter === 'all' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
        >
          <LayoutGrid className="w-3.5 h-3.5 me-1.5" />
          All
        </Button>
        {memoryTypes.map(type => {
          const config = typeConfig[type]
          const Icon = config.icon
          const count = memories.filter(m => m.type === type).length
          const isActive = typeFilter === type
          return (
            <Button
              key={type}
              size="sm"
              variant={isActive ? 'default' : 'outline'}
              onClick={() => setTypeFilter(type)}
              className={isActive ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
            >
              <Icon className="w-3.5 h-3.5 me-1.5" />
              {config.label}
              {count > 0 && (
                <span className={`ms-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-white/20' : 'bg-muted'
                }`}>
                  {count}
                </span>
              )}
            </Button>
          )
        })}
      </div>

      {/* Memory Cards */}
      {displayMemories.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="p-3 rounded-xl bg-muted w-fit mx-auto mb-3">
              <Brain className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">{isSearchMode ? 'No results found' : t.noData}</p>
            {isSearchMode && (
              <Button variant="outline" size="sm" onClick={clearSearch} className="mt-3">
                Clear Search
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {displayMemories.map((memory, i) => {
              const config = typeConfig[memory.type] || typeConfig.fact
              const Icon = config.icon
              const srcConfig = sourceConfig[memory.source || 'manual'] || sourceConfig.manual
              const SrcIcon = srcConfig.icon

              return (
                <motion.div
                  key={memory.id || i}
                  initial={{ opacity: 0, y: 12, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.04, duration: 0.25 }}
                >
                  <Card className="hover:shadow-lg transition-all duration-300 overflow-hidden group">
                    {/* Gradient Top Border */}
                    <div className={`h-1 bg-gradient-to-r ${config.gradient}`} />

                    <CardContent className="p-5">
                      {/* Header: Icon + Type + Source */}
                      <div className="flex items-start gap-3 mb-3">
                        <div className={`p-2.5 rounded-xl ${config.bg} shrink-0`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={`${config.badge} border-0 text-xs`}>
                              {config.label}
                            </Badge>
                            {memory.source && (
                              <Badge className={`${srcConfig.badge} border-0 text-xs flex items-center gap-1`}>
                                <SrcIcon className="w-3 h-3" />
                                {srcConfig.label}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Key */}
                      <h4 className="font-semibold text-sm mb-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {memory.key}
                      </h4>

                      {/* Value */}
                      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                        {memory.value}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
