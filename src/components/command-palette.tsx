'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { translations } from '@/lib/i18n'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, CheckSquare, Heart, DollarSign, BookOpen, Users,
  Target, Smile, Flag, BarChart3, Bell, Brain, TrendingUp, Clock,
  MessageCircle, Settings, Search, ArrowUp, ArrowDown,
  Hash, Sparkles
} from 'lucide-react'

interface Props {
  userId: string
  language: 'en' | 'ar'
  open: boolean
  onOpenChange: (open: boolean) => void
  onNavigate: (tab: string) => void
}

interface SearchResult {
  id: string
  title: string
  subtitle: string
  type: string
  tab: string
}

interface SearchGroup {
  type: string
  label: string
  icon: React.ReactNode
  results: SearchResult[]
}

const panelNavItems = [
  { id: 'dashboard', icon: LayoutDashboard, shortcut: 'Alt+1', labelKey: 'dashboard' as const, color: 'from-emerald-500 to-teal-500' },
  { id: 'tasks', icon: CheckSquare, shortcut: 'Alt+2', labelKey: 'tasks' as const, color: 'from-teal-500 to-cyan-500' },
  { id: 'health', icon: Heart, shortcut: 'Alt+3', labelKey: 'health' as const, color: 'from-rose-500 to-pink-500' },
  { id: 'finance', icon: DollarSign, shortcut: 'Alt+4', labelKey: 'finance' as const, color: 'from-amber-500 to-orange-500' },
  { id: 'journal', icon: BookOpen, shortcut: 'Alt+5', labelKey: 'journal' as const, color: 'from-violet-500 to-purple-500' },
  { id: 'contacts', icon: Users, shortcut: 'Alt+6', labelKey: 'contacts' as const, color: 'from-sky-500 to-blue-500' },
  { id: 'habits', icon: Target, shortcut: 'Alt+7', labelKey: 'habits' as const, color: 'from-emerald-500 to-green-500' },
  { id: 'mood', icon: Smile, shortcut: 'Alt+8', labelKey: 'mood' as const, color: 'from-yellow-500 to-amber-500' },
  { id: 'goals', icon: Flag, shortcut: 'Alt+9', labelKey: 'goals' as const, color: 'from-red-500 to-rose-500' },
  { id: 'analytics', icon: BarChart3, shortcut: 'Alt+0', labelKey: 'analytics' as const, color: 'from-teal-500 to-emerald-500' },
  { id: 'notifications', icon: Bell, shortcut: '', labelKey: 'notifications' as const, color: 'from-orange-500 to-amber-500' },
  { id: 'memory', icon: Brain, shortcut: '', labelKey: 'memory' as const, color: 'from-purple-500 to-violet-500' },
  { id: 'forecast', icon: TrendingUp, shortcut: '', labelKey: 'forecast' as const, color: 'from-cyan-500 to-teal-500' },
  { id: 'watch', icon: Clock, shortcut: '', labelKey: 'watch' as const, color: 'from-indigo-500 to-purple-500' },
  { id: 'chat', icon: MessageCircle, shortcut: '', labelKey: 'chat' as const, color: 'from-emerald-500 to-teal-500' },
  { id: 'settings', icon: Settings, shortcut: '', labelKey: 'settings' as const, color: 'from-gray-500 to-slate-500' },
]

const categoryConfig: Record<string, { icon: React.ReactNode; label: string; labelAr: string; color: string }> = {
  tasks: { icon: <CheckSquare className="w-4 h-4" />, label: 'Tasks', labelAr: 'المهام', color: 'text-teal-500' },
  contacts: { icon: <Users className="w-4 h-4" />, label: 'Contacts', labelAr: 'جهات الاتصال', color: 'text-sky-500' },
  journals: { icon: <BookOpen className="w-4 h-4" />, label: 'Journals', labelAr: 'اليومية', color: 'text-violet-500' },
  habits: { icon: <Target className="w-4 h-4" />, label: 'Habits', labelAr: 'العادات', color: 'text-emerald-500' },
  goals: { icon: <Flag className="w-4 h-4" />, label: 'Goals', labelAr: 'الأهداف', color: 'text-red-500' },
  memories: { icon: <Brain className="w-4 h-4" />, label: 'Memories', labelAr: 'الذاكرة', color: 'text-purple-500' },
  moods: { icon: <Smile className="w-4 h-4" />, label: 'Moods', labelAr: 'المزاج', color: 'text-amber-500' },
}

export default function CommandPalette({ userId, language, open, onOpenChange, onNavigate }: Props) {
  const t = translations[language]
  const isRtl = language === 'ar'
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchGroup[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [allFlatResults, setAllFlatResults] = useState<SearchResult[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
      setQuery('')
      setResults([])
      setAllFlatResults([])
      setSelectedIndex(0)
    }
  }, [open])

  // Search logic
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || !userId) {
      setResults([])
      setAllFlatResults([])
      return
    }

    setIsSearching(true)
    const q = searchQuery.toLowerCase().trim()

    try {
      const [tasksRes, contactsRes, journalRes, habitsRes, goalsRes, memoryRes] = await Promise.allSettled([
        fetch(`/api/tasks?userId=${userId}`),
        fetch(`/api/contacts?userId=${userId}`),
        fetch(`/api/journal?userId=${userId}&days=90`),
        fetch(`/api/habits?userId=${userId}`),
        fetch(`/api/goals?userId=${userId}`),
        fetch(`/api/memory/nodes?userId=${userId}`),
      ])

      const safeParse = (res: PromiseSettledResult<Response>) => {
        if (res.status !== 'fulfilled' || !res.value.ok) return null
        return res.value.json()
      }

      const [tasksData, contactsData, journalData, habitsData, goalsData, memoryData] = await Promise.all([
        safeParse(tasksRes),
        safeParse(contactsRes),
        safeParse(journalRes),
        safeParse(habitsRes),
        safeParse(goalsRes),
        safeParse(memoryRes),
      ])

      const groups: SearchGroup[] = []

      // Tasks
      const tasks = Array.isArray(tasksData?.tasks) ? tasksData.tasks : []
      const filteredTasks = tasks
        .filter((task: any) =>
          (task.title || '').toLowerCase().includes(q) ||
          (task.description || '').toLowerCase().includes(q) ||
          (task.category || '').toLowerCase().includes(q)
        )
        .slice(0, 3)
        .map((task: any) => ({
          id: task.id,
          title: task.title || 'Untitled Task',
          subtitle: [task.status, task.priority, task.category].filter(Boolean).join(' · '),
          type: 'tasks',
          tab: 'tasks',
        }))
      if (filteredTasks.length > 0) {
        groups.push({
          type: 'tasks',
          label: language === 'ar' ? 'المهام' : 'Tasks',
          icon: categoryConfig.tasks.icon,
          results: filteredTasks,
        })
      }

      // Contacts
      const contacts = Array.isArray(contactsData?.contacts) ? contactsData.contacts : []
      const filteredContacts = contacts
        .filter((c: any) =>
          (c.name || '').toLowerCase().includes(q) ||
          (c.email || '').toLowerCase().includes(q) ||
          (c.company || '').toLowerCase().includes(q) ||
          (c.role || '').toLowerCase().includes(q)
        )
        .slice(0, 3)
        .map((c: any) => ({
          id: c.id,
          title: c.name || 'Unknown Contact',
          subtitle: [c.email, c.company].filter(Boolean).join(' · '),
          type: 'contacts',
          tab: 'contacts',
        }))
      if (filteredContacts.length > 0) {
        groups.push({
          type: 'contacts',
          label: language === 'ar' ? 'جهات الاتصال' : 'Contacts',
          icon: categoryConfig.contacts.icon,
          results: filteredContacts,
        })
      }

      // Journals
      const journals = Array.isArray(journalData?.journals) ? journalData.journals : []
      const filteredJournals = journals
        .filter((j: any) =>
          (j.title || '').toLowerCase().includes(q) ||
          (j.content || '').toLowerCase().includes(q) ||
          (j.mood || '').toLowerCase().includes(q)
        )
        .slice(0, 3)
        .map((j: any) => ({
          id: j.id,
          title: j.title || j.content?.substring(0, 50) || 'Untitled Entry',
          subtitle: [j.mood, j.date ? new Date(j.date).toLocaleDateString() : null].filter(Boolean).join(' · '),
          type: 'journals',
          tab: 'journal',
        }))
      if (filteredJournals.length > 0) {
        groups.push({
          type: 'journals',
          label: language === 'ar' ? 'اليومية' : 'Journals',
          icon: categoryConfig.journals.icon,
          results: filteredJournals,
        })
      }

      // Habits
      const habits = Array.isArray(habitsData?.habits) ? habitsData.habits : []
      const filteredHabits = habits
        .filter((h: any) =>
          (h.name || '').toLowerCase().includes(q) ||
          (h.category || '').toLowerCase().includes(q)
        )
        .slice(0, 3)
        .map((h: any) => ({
          id: h.id,
          title: h.name || 'Unnamed Habit',
          subtitle: [h.category, h.streak ? `${h.streak} streak` : null].filter(Boolean).join(' · '),
          type: 'habits',
          tab: 'habits',
        }))
      if (filteredHabits.length > 0) {
        groups.push({
          type: 'habits',
          label: language === 'ar' ? 'العادات' : 'Habits',
          icon: categoryConfig.habits.icon,
          results: filteredHabits,
        })
      }

      // Goals
      const goals = Array.isArray(goalsData?.goals) ? goalsData.goals : []
      const filteredGoals = goals
        .filter((g: any) =>
          (g.title || '').toLowerCase().includes(q) ||
          (g.description || '').toLowerCase().includes(q) ||
          (g.category || '').toLowerCase().includes(q)
        )
        .slice(0, 3)
        .map((g: any) => ({
          id: g.id,
          title: g.title || 'Untitled Goal',
          subtitle: [g.category, g.progress !== undefined ? `${g.progress}%` : null, g.status].filter(Boolean).join(' · '),
          type: 'goals',
          tab: 'goals',
        }))
      if (filteredGoals.length > 0) {
        groups.push({
          type: 'goals',
          label: language === 'ar' ? 'الأهداف' : 'Goals',
          icon: categoryConfig.goals.icon,
          results: filteredGoals,
        })
      }

      // Memory nodes
      const memories = Array.isArray(memoryData?.nodes) ? memoryData.nodes : []
      const filteredMemories = memories
        .filter((m: any) =>
          (m.key || '').toLowerCase().includes(q) ||
          (m.value || '').toLowerCase().includes(q) ||
          (m.type || '').toLowerCase().includes(q)
        )
        .slice(0, 3)
        .map((m: any) => ({
          id: m.id,
          title: m.key || 'Memory Node',
          subtitle: [m.type, m.value?.substring(0, 40)].filter(Boolean).join(' · '),
          type: 'memories',
          tab: 'memory',
        }))
      if (filteredMemories.length > 0) {
        groups.push({
          type: 'memories',
          label: language === 'ar' ? 'الذاكرة' : 'Memories',
          icon: categoryConfig.memories.icon,
          results: filteredMemories,
        })
      }

      setResults(groups)

      // Build flat list for keyboard navigation
      const flat: SearchResult[] = []
      groups.forEach(group => {
        group.results.forEach(r => flat.push(r))
      })
      setAllFlatResults(flat)
    } catch (err) {
      console.error('Search error:', err)
      setResults([])
      setAllFlatResults([])
    } finally {
      setIsSearching(false)
    }
  }, [userId, language])

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (!query.trim()) {
      setResults([])
      setAllFlatResults([])
      setSelectedIndex(0)
      return
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(query)
    }, 250)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [query, performSearch])

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const totalItems = query.trim()
      ? allFlatResults.length
      : panelNavItems.length

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, totalItems - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (query.trim() && allFlatResults[selectedIndex]) {
        onNavigate(allFlatResults[selectedIndex].tab)
        onOpenChange(false)
      } else if (!query.trim() && panelNavItems[selectedIndex]) {
        onNavigate(panelNavItems[selectedIndex].id)
        onOpenChange(false)
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onOpenChange(false)
    }
  }, [query, allFlatResults, selectedIndex, onNavigate, onOpenChange])

  // Scroll selected item into view
  useEffect(() => {
    if (resultsRef.current) {
      const selectedEl = resultsRef.current.querySelector(`[data-index="${selectedIndex}"]`)
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [selectedIndex])

  const handleSelect = (tab: string) => {
    onNavigate(tab)
    onOpenChange(false)
  }

  const isModKey = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-lg p-0 gap-0 overflow-hidden bg-background border-border"
        showCloseButton={false}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {/* Search Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <div className="shrink-0">
            {isSearching ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <Sparkles className="w-5 h-5 text-emerald-500" />
              </motion.div>
            ) : (
              <Search className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelectedIndex(0)
            }}
            onKeyDown={handleKeyDown}
            placeholder={language === 'ar' ? 'بحث في كل شيء...' : 'Search across everything...'}
            className="border-0 shadow-none focus-visible:ring-0 focus-visible:border-0 bg-transparent text-base placeholder:text-muted-foreground/60 px-0 h-8"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-muted-foreground bg-muted rounded border border-border shrink-0">
            {isModKey ? '⌘' : 'Ctrl'}K
          </kbd>
        </div>

        {/* Results Area */}
        <div
          ref={resultsRef}
          className="max-h-80 overflow-y-auto custom-scrollbar"
        >
          <AnimatePresence mode="wait">
            {query.trim() ? (
              // Search Results Mode
              <motion.div
                key="search-results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {results.length === 0 && !isSearching && (
                  <div className="flex flex-col items-center justify-center py-12 px-4">
                    <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                      <Search className="w-6 h-6 text-muted-foreground/60" />
                    </div>
                    <p className="text-sm text-muted-foreground font-medium">
                      {language === 'ar' ? 'لم يتم العثور على نتائج' : 'No results found'}
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      {language === 'ar' ? 'جرب كلمات مختلفة' : 'Try different keywords'}
                    </p>
                  </div>
                )}

                {results.length > 0 && (
                  <div className="py-2">
                    {results.map((group, groupIndex) => {
                      const prevCount = results.slice(0, groupIndex).reduce((acc, g) => acc + g.results.length, 0)
                      const config = categoryConfig[group.type]

                      return (
                        <div key={group.type}>
                          {/* Category Header */}
                          <div className={`flex items-center gap-2 px-4 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider ${isRtl ? 'flex-row-reverse' : ''}`}>
                            <span className={config?.color || 'text-muted-foreground'}>
                              {group.icon}
                            </span>
                            <span>{group.label}</span>
                          </div>

                          {/* Category Results */}
                          {group.results.map((result, i) => {
                            const flatIndex = prevCount + i
                            const isSelected = flatIndex === selectedIndex

                            return (
                              <motion.button
                                key={result.id}
                                data-index={flatIndex}
                                initial={{ opacity: 0, x: isRtl ? 10 : -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.15, delay: i * 0.04 }}
                                onClick={() => handleSelect(result.tab)}
                                onMouseEnter={() => setSelectedIndex(flatIndex)}
                                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors duration-100 ${
                                  isSelected
                                    ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
                                    : 'text-foreground hover:bg-accent/50'
                                } ${isRtl ? 'flex-row-reverse text-right' : ''}`}
                              >
                                <span className={`shrink-0 ${config?.color || 'text-muted-foreground'}`}>
                                  {config?.icon || <Hash className="w-4 h-4" />}
                                </span>
                                <div className={`flex-1 min-w-0 ${isRtl ? 'text-right' : ''}`}>
                                  <p className="font-medium truncate text-sm">{result.title}</p>
                                  <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                                </div>
                                <span className={`shrink-0 text-[10px] text-muted-foreground/60 font-medium px-1.5 py-0.5 rounded bg-muted/50 ${isRtl ? 'ms-auto' : 'me-auto'}`}>
                                  {t[result.type as keyof typeof t] || result.type}
                                </span>
                              </motion.button>
                            )
                          })}

                          {groupIndex < results.length - 1 && (
                            <div className="my-1 border-t border-border/50" />
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {isSearching && results.length === 0 && (
                  <div className="flex items-center justify-center py-12">
                    <motion.div
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.2, repeat: Infinity }}
                      className="text-sm text-muted-foreground"
                    >
                      {t.loading}
                    </motion.div>
                  </div>
                )}
              </motion.div>
            ) : (
              // Panel Navigation Mode (no search query)
              <motion.div
                key="panel-nav"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="py-2"
              >
                <div className={`flex items-center gap-2 px-4 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{language === 'ar' ? 'التنقل السريع' : 'Quick Navigation'}</span>
                </div>

                <div className="mt-1">
                  {panelNavItems.map((item, i) => {
                    const Icon = item.icon
                    const isSelected = i === selectedIndex

                    return (
                      <motion.button
                        key={item.id}
                        data-index={i}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.12, delay: i * 0.02 }}
                        onClick={() => handleSelect(item.id)}
                        onMouseEnter={() => setSelectedIndex(i)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors duration-100 ${
                          isSelected
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
                            : 'text-foreground hover:bg-accent/50'
                        } ${isRtl ? 'flex-row-reverse text-right' : ''}`}
                      >
                        <span className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br ${item.color} text-white`}>
                          <Icon className="w-4 h-4" />
                        </span>
                        <span className="flex-1 font-medium truncate">
                          {t[item.labelKey]}
                        </span>
                        {item.shortcut && (
                          <kbd className="shrink-0 inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground bg-muted rounded border border-border">
                            {item.shortcut}
                          </kbd>
                        )}
                      </motion.button>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className={`flex items-center gap-4 px-4 py-2.5 border-t border-border bg-muted/20 text-[11px] text-muted-foreground ${isRtl ? 'flex-row-reverse' : ''}`}>
          <span className="flex items-center gap-1">
            <kbd className="inline-flex items-center justify-center w-5 h-5 rounded bg-muted border border-border text-[10px]">
              <ArrowUp className="w-2.5 h-2.5" />
            </kbd>
            <kbd className="inline-flex items-center justify-center w-5 h-5 rounded bg-muted border border-border text-[10px]">
              <ArrowDown className="w-2.5 h-2.5" />
            </kbd>
            <span className="ms-1">{language === 'ar' ? 'تنقل' : 'navigate'}</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="inline-flex items-center justify-center h-5 px-1.5 rounded bg-muted border border-border text-[10px]">
              ↵
            </kbd>
            <span className="ms-1">{language === 'ar' ? 'اختيار' : 'select'}</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="inline-flex items-center justify-center h-5 px-1.5 rounded bg-muted border border-border text-[10px]">
              esc
            </kbd>
            <span className="ms-1">{language === 'ar' ? 'إغلاق' : 'close'}</span>
          </span>
          <span className={`flex items-center gap-1 ${isRtl ? 'me-auto' : 'ms-auto'}`}>
            <kbd className="inline-flex items-center h-5 px-1.5 rounded bg-muted border border-border text-[10px]">
              {isModKey ? '⌘' : 'Ctrl'}K
            </kbd>
            <span className="ms-1">{language === 'ar' ? 'تبديل' : 'toggle'}</span>
          </span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
