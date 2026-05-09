'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { translations } from '@/lib/i18n'
import {
  LayoutDashboard, CheckSquare, Heart, DollarSign, BookOpen, Users,
  Target, Smile, Flag, BarChart3, Bell, Brain, TrendingUp, Clock,
  MessageCircle, Settings, Menu, X, Sun, Moon, Globe, LogOut,
  ChevronRight, Sparkles, Search, ChevronLeft, ChevronDown, User,
  PanelLeftClose, PanelLeftOpen, BrainCircuit
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from 'next-themes'
import dynamic from 'next/dynamic'
import CommandPalette from '@/components/command-palette'
import KeyboardShortcutsOverlay from '@/components/keyboard-shortcuts-overlay'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'

// Lazy load all panels
const OverviewPanel = dynamic(() => import('@/components/dashboard/overview-panel'), { ssr: false, loading: () => <PanelSkeleton /> })
const TasksPanel = dynamic(() => import('@/components/dashboard/tasks-panel'), { ssr: false, loading: () => <PanelSkeleton /> })
const HealthPanel = dynamic(() => import('@/components/dashboard/health-panel'), { ssr: false, loading: () => <PanelSkeleton /> })
const FinancePanel = dynamic(() => import('@/components/dashboard/finance-panel'), { ssr: false, loading: () => <PanelSkeleton /> })
const JournalPanel = dynamic(() => import('@/components/dashboard/journal-panel'), { ssr: false, loading: () => <PanelSkeleton /> })
const ContactsPanel = dynamic(() => import('@/components/dashboard/contacts-panel'), { ssr: false, loading: () => <PanelSkeleton /> })
const HabitsPanel = dynamic(() => import('@/components/dashboard/habits-panel'), { ssr: false, loading: () => <PanelSkeleton /> })
const MoodPanel = dynamic(() => import('@/components/dashboard/mood-panel'), { ssr: false, loading: () => <PanelSkeleton /> })
const GoalsPanel = dynamic(() => import('@/components/dashboard/goals-panel'), { ssr: false, loading: () => <PanelSkeleton /> })
const SettingsPanel = dynamic(() => import('@/components/dashboard/settings-panel'), { ssr: false, loading: () => <PanelSkeleton /> })
const AnalyticsPanel = dynamic(() => import('@/components/dashboard/analytics-panel'), { ssr: false, loading: () => <PanelSkeleton /> })
const NotificationsPanel = dynamic(() => import('@/components/dashboard/notifications-panel'), { ssr: false, loading: () => <PanelSkeleton /> })
const MemoryPanel = dynamic(() => import('@/components/dashboard/memory-panel'), { ssr: false, loading: () => <PanelSkeleton /> })
const ForecastPanel = dynamic(() => import('@/components/dashboard/forecast-panel'), { ssr: false, loading: () => <PanelSkeleton /> })
const WatchPanel = dynamic(() => import('@/components/dashboard/watch-panel'), { ssr: false, loading: () => <PanelSkeleton /> })
const ChatPanel = dynamic(() => import('@/components/dashboard/chat-panel'), { ssr: false, loading: () => <PanelSkeleton /> })
const DigitalTwinPanel = dynamic(() => import('@/components/dashboard/digital-twin-panel'), { ssr: false, loading: () => <PanelSkeleton /> })

function PanelSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-6 w-24" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2].map(i => (
          <Skeleton key={i} className="h-48 w-full rounded-xl" />
        ))}
      </div>
    </div>
  )
}

const sidebarItems = [
  { id: 'dashboard', icon: LayoutDashboard, labelKey: 'dashboard' as const },
  { id: 'tasks', icon: CheckSquare, labelKey: 'tasks' as const },
  { id: 'health', icon: Heart, labelKey: 'health' as const },
  { id: 'finance', icon: DollarSign, labelKey: 'finance' as const },
  { id: 'journal', icon: BookOpen, labelKey: 'journal' as const },
  { id: 'contacts', icon: Users, labelKey: 'contacts' as const },
  { id: 'habits', icon: Target, labelKey: 'habits' as const },
  { id: 'mood', icon: Smile, labelKey: 'mood' as const },
  { id: 'goals', icon: Flag, labelKey: 'goals' as const },
  { id: 'analytics', icon: BarChart3, labelKey: 'analytics' as const },
  { id: 'notifications', icon: Bell, labelKey: 'notifications' as const },
  { id: 'memory', icon: Brain, labelKey: 'memory' as const },
  { id: 'forecast', icon: TrendingUp, labelKey: 'forecast' as const },
  { id: 'watch', icon: Clock, labelKey: 'watch' as const },
  { id: 'chat', icon: MessageCircle, labelKey: 'chat' as const },
  { id: 'digitalTwin', icon: BrainCircuit, labelKey: 'digitalTwin' as const },
  { id: 'settings', icon: Settings, labelKey: 'settings' as const },
]

const panelMap: Record<string, React.ComponentType<any>> = {
  dashboard: OverviewPanel,
  tasks: TasksPanel,
  health: HealthPanel,
  finance: FinancePanel,
  journal: JournalPanel,
  contacts: ContactsPanel,
  habits: HabitsPanel,
  mood: MoodPanel,
  goals: GoalsPanel,
  settings: SettingsPanel,
  analytics: AnalyticsPanel,
  notifications: NotificationsPanel,
  memory: MemoryPanel,
  forecast: ForecastPanel,
  watch: WatchPanel,
  chat: ChatPanel,
  digitalTwin: DigitalTwinPanel,
}

function formatDate(date: Date, language: 'en' | 'ar'): string {
  return date.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export default function Home() {
  const { activeTab, language, sidebarOpen, sidebarCollapsed, user, setActiveTab, toggleSidebar, toggleSidebarCollapsed, setLanguage, setUser } = useAppStore()
  const { theme, setTheme } = useTheme()
  const t = translations[language]
  const isRtl = language === 'ar'
  const [loginEmail, setLoginEmail] = useState('operator@lifeos.com')
  const [loginPassword, setLoginPassword] = useState('lifeos2025')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [currentDate] = useState(() => formatDate(new Date(), language))

  useEffect(() => {
    const init = async () => {
      try {
        const seedRes = await fetch('/api/seed')
        if (seedRes.ok) {
          const data = await seedRes.json()
          setUser({ id: data.userId, email: 'operator@lifeos.com', name: 'LifeOS Operator' })
        }
      } catch {
        setUser({ id: 'demo', email: 'operator@lifeos.com', name: 'LifeOS Operator' })
      }
    }
    init()
  }, [setUser])

  useEffect(() => {
    if (user?.id) {
      fetch(`/api/agent/alerts?userId=${user.id}`)
        .then(r => r.json())
        .then(data => {
          const alerts = data.alerts || []
          setUnreadCount(alerts.filter((a: any) => !a.read).length)
        })
        .catch(() => {})
    }
  }, [user])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginLoading(true)
    setLoginError('')
    try {
      const res = await fetch('/api/seed')
      if (res.ok) {
        const data = await res.json()
        setUser({ id: data.userId || 'demo', email: loginEmail, name: 'LifeOS Operator' })
      }
    } catch {
      setLoginError('Login failed')
    }
    setLoginLoading(false)
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(prev => !prev)
        return
      }
      if (e.altKey && !e.metaKey && !e.ctrlKey) {
        const keyMap: Record<string, string> = {
          '1': 'dashboard', '2': 'tasks', '3': 'health', '4': 'finance',
          '5': 'journal', '6': 'contacts', '7': 'habits', '8': 'mood',
          '9': 'goals', '0': 'analytics',
        }
        const tab = keyMap[e.key]
        if (tab) {
          e.preventDefault()
          setActiveTab(tab)
          return
        }
      }
      // Shortcuts that should not trigger when typing
      if (!isTyping && !e.altKey && !e.metaKey && !e.ctrlKey) {
        if (e.key === '?' || (e.shiftKey && e.key === '/')) {
          e.preventDefault()
          setShortcutsOpen(prev => !prev)
          return
        }
        if (e.key === 't' || e.key === 'T') {
          e.preventDefault()
          setTheme(theme === 'dark' ? 'light' : 'dark')
          return
        }
        if (e.key === 'l' || e.key === 'L') {
          e.preventDefault()
          setLanguage(language === 'en' ? 'ar' : 'en')
          return
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setActiveTab, theme, setTheme, language, setLanguage])

  const ActivePanel = panelMap[activeTab] || OverviewPanel

  const currentPanelLabel = t[activeTab as keyof typeof t] || activeTab

  const sidebarWidth = sidebarCollapsed ? 'w-16' : 'w-64'

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="min-h-screen flex flex-col bg-background">
      {/* Login Overlay */}
      {!user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-gray-900 dark:to-gray-800">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md mx-4"
          >
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 mb-4">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                LifeOS
              </h1>
              <p className="text-muted-foreground mt-2">{t.appDescription}</p>
            </div>
            <div className="bg-card rounded-2xl shadow-xl border p-8">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{t.email}</label>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border bg-background focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                    placeholder="operator@lifeos.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t.password}</label>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border bg-background focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                  />
                </div>
                {loginError && <p className="text-destructive text-sm">{loginError}</p>}
                <Button type="submit" className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700" disabled={loginLoading}>
                  {loginLoading ? t.loading : t.login}
                </Button>
              </form>
              <div className="mt-4 text-center text-xs text-muted-foreground">
                Demo: operator@lifeos.com / lifeos2025
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Main Layout */}
      {user && (
        <div className="flex flex-1 min-h-screen">
          {/* Mobile sidebar overlay with backdrop blur */}
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden"
                onClick={toggleSidebar}
              />
            )}
          </AnimatePresence>

          {/* Sidebar */}
          <aside
            className={`
              ${sidebarOpen ? 'translate-x-0' : (isRtl ? 'translate-x-full' : '-translate-x-full')}
              md:translate-x-0
              ${sidebarCollapsed ? 'md:w-16' : 'md:w-64'}
              w-64
              transition-all duration-300 ease-in-out
              border-e bg-card flex flex-col shrink-0
              fixed md:relative z-40 h-full
            `}
          >
            {/* Sidebar Header */}
            <div className="flex items-center gap-3 p-4 border-b h-14">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              {(!sidebarCollapsed || sidebarOpen) && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="font-bold text-lg bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent truncate"
                >
                  LifeOS
                </motion.span>
              )}
              <Button variant="ghost" size="icon" className={`${isRtl ? 'ms-auto' : 'me-auto md:hidden'}`} onClick={toggleSidebar}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-2 custom-scrollbar">
              <TooltipProvider delayDuration={0}>
                {sidebarItems.map((item) => {
                  const Icon = item.icon
                  const isActive = activeTab === item.id
                  const label = t[item.labelKey]

                  // Collapsed sidebar item (desktop only)
                  if (sidebarCollapsed && !sidebarOpen) {
                    return (
                      <Tooltip key={item.id}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => setActiveTab(item.id)}
                            className={`
                              w-full flex items-center justify-center py-2.5 transition-all duration-200 hover:bg-accent relative
                              ${isActive
                                ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
                                : 'text-muted-foreground'
                              }
                            `}
                          >
                            {/* Active left border indicator */}
                            {isActive && (
                              <motion.div
                                layoutId="sidebar-indicator"
                                className={`absolute top-1 bottom-1 w-1 rounded-full bg-emerald-500 ${isRtl ? 'end-0' : 'start-0'}`}
                              />
                            )}
                            <Icon className="w-4 h-4 shrink-0" />
                            {/* Notification badge when collapsed */}
                            {item.id === 'notifications' && unreadCount > 0 && (
                              <span className="absolute top-1 end-1 bg-destructive text-destructive-foreground text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                                {unreadCount > 9 ? '9+' : unreadCount}
                              </span>
                            )}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side={isRtl ? 'left' : 'right'} className="font-medium">
                          {label}
                        </TooltipContent>
                      </Tooltip>
                    )
                  }

                  // Expanded sidebar item
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id)
                        if (window.innerWidth < 768) toggleSidebar()
                      }}
                      className={`
                        w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all duration-200 hover:bg-accent relative
                        ${isActive
                          ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 font-medium'
                          : 'text-muted-foreground'
                        }
                      `}
                    >
                      {/* Active left border indicator */}
                      {isActive && (
                        <motion.div
                          layoutId="sidebar-indicator-expanded"
                          className={`absolute top-1 bottom-1 w-1 rounded-full bg-emerald-500 ${isRtl ? 'end-0' : 'start-0'}`}
                        />
                      )}
                      <Icon className="w-4 h-4 shrink-0" />
                      <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="truncate">
                        {label}
                      </motion.span>
                      {item.id === 'notifications' && unreadCount > 0 && (
                        <span className={`${isRtl ? 'ms-auto' : 'me-auto'} bg-destructive text-destructive-foreground text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center`}>
                          {unreadCount}
                        </span>
                      )}
                    </button>
                  )
                })}
              </TooltipProvider>
            </nav>

            {/* Sidebar Footer */}
            {(!sidebarCollapsed || sidebarOpen) && (
              <div className="p-4 border-t">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-bold">
                    {user.name?.charAt(0) || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Collapse/Expand Toggle (desktop only) */}
            <div className="hidden md:flex border-t p-2 justify-center">
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={toggleSidebarCollapsed}
                    >
                      {sidebarCollapsed ? (
                        <PanelLeftOpen className="w-4 h-4" />
                      ) : (
                        <PanelLeftClose className="w-4 h-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side={isRtl ? 'left' : 'right'}>
                    {sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 flex flex-col min-w-0">
            {/* Top Bar */}
            <header className="h-14 border-b bg-card/80 backdrop-blur-sm flex items-center px-4 gap-2 sticky top-0 z-20">
              {/* Mobile menu toggle */}
              <Button variant="ghost" size="icon" className="md:hidden shrink-0" onClick={toggleSidebar}>
                <Menu className="w-5 h-5" />
              </Button>

              {/* Breadcrumb */}
              <nav className="flex items-center gap-1 text-sm min-w-0">
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 truncate">LifeOS</span>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground truncate">{currentPanelLabel}</span>
              </nav>

              <div className="flex-1" />

              {/* Search trigger - looks like a proper search input */}
              <button
                onClick={() => setCommandPaletteOpen(true)}
                className="hidden md:flex items-center gap-2 h-8 px-3 rounded-md border border-border bg-background hover:bg-accent transition-colors text-muted-foreground min-w-[200px]"
              >
                <Search className="w-3.5 h-3.5 shrink-0" />
                <span className="text-xs flex-1 text-start">
                  {language === 'ar' ? 'بحث...' : 'Search...'}
                </span>
                <kbd className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground bg-muted rounded border border-border">
                  ⌘K
                </kbd>
              </button>

              {/* Current date */}
              <span className="hidden lg:block text-xs text-muted-foreground whitespace-nowrap">
                {currentDate}
              </span>

              {/* Notification bell with badge */}
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="relative shrink-0"
                      onClick={() => setActiveTab('notifications')}
                    >
                      <Bell className="w-4 h-4" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -end-0.5 bg-destructive text-destructive-foreground text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {language === 'ar' ? 'الإشعارات' : 'Notifications'} {unreadCount > 0 ? `(${unreadCount})` : ''}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Language toggle */}
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
                    >
                      <Globe className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {language === 'ar' ? 'التبديل إلى الإنجليزية' : 'Switch to Arabic'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Theme toggle */}
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    >
                      {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {theme === 'dark'
                      ? (language === 'ar' ? 'الوضع الفاتح' : 'Light mode')
                      : (language === 'ar' ? 'الوضع الداكن' : 'Dark mode')
                    }
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* User avatar dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="shrink-0 h-8 w-8 rounded-full p-0">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-teal-500 text-white text-xs font-bold">
                        {user.name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={isRtl ? 'start' : 'end'} className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setActiveTab('settings')}>
                    <Settings className="me-2 h-4 w-4" />
                    {t.settings}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab('notifications')}>
                    <Bell className="me-2 h-4 w-4" />
                    {t.notifications}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setUser(null)} className="text-destructive focus:text-destructive">
                    <LogOut className="me-2 h-4 w-4" />
                    {t.logout}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </header>

            {/* Panel Content with slide + fade transitions */}
            <div className="flex-1 overflow-auto">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: isRtl ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: isRtl ? 20 : -20 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className="p-4 md:p-6"
                >
                  <ActivePanel userId={user?.id} language={language} />
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer */}
            <footer className="border-t py-3 px-4 text-center text-xs text-muted-foreground bg-card mt-auto">
              ❤️ LifeOS v2.0 © {new Date().getFullYear()} — {t.appDescription}
            </footer>
          </main>
        </div>
      )}

      {/* Command Palette */}
      {user && (
        <CommandPalette
          userId={user.id}
          language={language}
          open={commandPaletteOpen}
          onOpenChange={setCommandPaletteOpen}
          onNavigate={(tab) => {
            setActiveTab(tab)
            setCommandPaletteOpen(false)
          }}
        />
      )}

      {/* Keyboard Shortcuts Overlay */}
      <KeyboardShortcutsOverlay
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
        language={language}
      />
    </div>
  )
}
