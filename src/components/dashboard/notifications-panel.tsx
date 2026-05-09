'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Bell, AlertTriangle, Lightbulb, Info, CheckCheck,
  Trash2, Volume2, VolumeX, Clock, Eye
} from 'lucide-react'
import { translations } from '@/lib/i18n'
import { motion } from 'framer-motion'

interface Props {
  userId: string
  language: 'en' | 'ar'
}

const typeConfig: Record<string, {
  icon: any
  gradient: string
  iconBg: string
  iconColor: string
  border: string
  dotColor: string
  badgeBg: string
  badgeText: string
}> = {
  alert: {
    icon: AlertTriangle,
    gradient: 'from-red-500 to-rose-600',
    iconBg: 'bg-gradient-to-br from-red-100 to-rose-100 dark:from-red-950/40 dark:to-rose-950/40',
    iconColor: 'text-red-600 dark:text-red-400',
    border: 'border-red-200 dark:border-red-800/50',
    dotColor: 'bg-red-500',
    badgeBg: 'bg-red-100 dark:bg-red-900/50',
    badgeText: 'text-red-700 dark:text-red-300',
  },
  reminder: {
    icon: Bell,
    gradient: 'from-amber-500 to-orange-600',
    iconBg: 'bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-950/40 dark:to-orange-950/40',
    iconColor: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-800/50',
    dotColor: 'bg-amber-500',
    badgeBg: 'bg-amber-100 dark:bg-amber-900/50',
    badgeText: 'text-amber-700 dark:text-amber-300',
  },
  insight: {
    icon: Lightbulb,
    gradient: 'from-emerald-500 to-teal-600',
    iconBg: 'bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-950/40 dark:to-teal-950/40',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-800/50',
    dotColor: 'bg-emerald-500',
    badgeBg: 'bg-emerald-100 dark:bg-emerald-900/50',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
  },
  system: {
    icon: Info,
    gradient: 'from-cyan-500 to-teal-600',
    iconBg: 'bg-gradient-to-br from-cyan-100 to-teal-100 dark:from-cyan-950/40 dark:to-teal-950/40',
    iconColor: 'text-cyan-600 dark:text-cyan-400',
    border: 'border-cyan-200 dark:border-cyan-800/50',
    dotColor: 'bg-cyan-500',
    badgeBg: 'bg-cyan-100 dark:bg-cyan-900/50',
    badgeText: 'text-cyan-700 dark:text-cyan-300',
  },
}

const defaultTypeConfig = {
  icon: Bell,
  gradient: 'from-gray-400 to-gray-500',
  iconBg: 'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-950/40 dark:to-gray-900/40',
  iconColor: 'text-gray-600 dark:text-gray-400',
  border: 'border-gray-200 dark:border-gray-800/50',
  dotColor: 'bg-gray-500',
  badgeBg: 'bg-gray-100 dark:bg-gray-900/50',
  badgeText: 'text-gray-700 dark:text-gray-300',
}

const filterConfig: Record<string, { icon: any; iconBg: string; iconColor: string }> = {
  all: { icon: Bell, iconBg: 'bg-emerald-100 dark:bg-emerald-900/50', iconColor: 'text-emerald-600 dark:text-emerald-400' },
  alert: { icon: AlertTriangle, iconBg: 'bg-red-100 dark:bg-red-900/50', iconColor: 'text-red-600 dark:text-red-400' },
  reminder: { icon: Bell, iconBg: 'bg-amber-100 dark:bg-amber-900/50', iconColor: 'text-amber-600 dark:text-amber-400' },
  insight: { icon: Lightbulb, iconBg: 'bg-emerald-100 dark:bg-emerald-900/50', iconColor: 'text-emerald-600 dark:text-emerald-400' },
  system: { icon: Info, iconBg: 'bg-cyan-100 dark:bg-cyan-900/50', iconColor: 'text-cyan-600 dark:text-cyan-400' },
}

function timeAgo(dateStr: string, lang: 'en' | 'ar'): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (lang === 'ar') {
    if (minutes < 1) return 'الآن'
    if (minutes < 60) return `منذ ${minutes} دقيقة`
    if (hours < 24) return `منذ ${hours} ساعة`
    if (days === 1) return 'أمس'
    if (days < 7) return `منذ ${days} أيام`
    return `منذ ${Math.floor(days / 7)} أسبوع`
  }

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return `${Math.floor(days / 7)}w ago`
}

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
}

export default function NotificationsPanel({ userId, language }: Props) {
  const t = translations[language]
  const [alerts, setAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [soundEnabled, setSoundEnabled] = useState(true)

  const loadAlerts = async () => {
    if (!userId) return
    try {
      const res = await fetch(`/api/agent/alerts?userId=${userId}`)
      if (res.ok) {
        const data = await res.json()
        // Merge DB notifications and generated alerts
        const dbNotifs = (data.notifications || []).map((n: any) => ({
          ...n,
          type: n.type || 'system',
          source: 'db' as const,
        }))
        const genAlerts = (data.alerts || []).map((a: any) => ({
          ...a,
          type: mapAlertType(a.type),
          source: 'generated' as const,
        }))
        const combined = [...genAlerts, ...dbNotifs]
        // Sort by createdAt descending
        combined.sort((a: any, b: any) =>
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        )
        setAlerts(combined)
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  // Map API alert types to our display types
  const mapAlertType = (apiType: string): string => {
    if (apiType.includes('overdue') || apiType.includes('critical') || apiType.includes('budget_critical')) return 'alert'
    if (apiType.includes('budget_warning') || apiType.includes('habits_pending')) return 'reminder'
    if (apiType.includes('mood')) return 'insight'
    return 'system'
  }

  useEffect(() => { loadAlerts() }, [userId])

  const markAllRead = () => {
    setAlerts(prev => prev.map(a => ({ ...a, read: true })))
  }

  const markAsRead = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, read: true } : a))
  }

  const deleteAllRead = () => {
    setAlerts(prev => prev.filter(a => !a.read))
  }

  const filtered = filter === 'all' ? alerts : alerts.filter(a => a.type === filter)
  const unreadCount = alerts.filter(a => !a.read).length
  const readCount = alerts.filter(a => a.read).length
  const totalCount = alerts.length
  const insightsCount = alerts.filter(a => a.type === 'insight').length
  const readRatio = totalCount > 0 ? Math.round((readCount / totalCount) * 100) : 0
  const unreadRatio = 100 - readRatio

  // Group notifications by time
  const todayNotifs = filtered.filter(a => a.createdAt && isToday(a.createdAt))
  const earlierNotifs = filtered.filter(a => a.createdAt && !isToday(a.createdAt))
  const noDateNotifs = filtered.filter(a => !a.createdAt)

  if (loading) return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <Card key={i} className="animate-pulse">
          <CardContent className="p-6"><div className="h-16 bg-muted rounded" /></CardContent>
        </Card>
      ))}
    </div>
  )

  const renderFilterButton = (type: string, label: string) => {
    const config = filterConfig[type] || filterConfig.all
    const FilterIcon = config.icon
    const isActive = filter === type
    return (
      <Button
        key={type}
        size="sm"
        variant={isActive ? 'default' : 'outline'}
        onClick={() => setFilter(type)}
        className={`gap-1.5 ${isActive ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'hover:bg-muted'}`}
      >
        <div className={`p-0.5 rounded ${isActive ? 'bg-white/20' : config.iconBg}`}>
          <FilterIcon className={`w-3 h-3 ${isActive ? 'text-white' : config.iconColor}`} />
        </div>
        {label}
      </Button>
    )
  }

  const renderNotificationCard = (alert: any, i: number) => {
    const config = typeConfig[alert.type] || defaultTypeConfig
    const Icon = config.icon
    const isUnread = !alert.read

    return (
      <motion.div
        key={alert.id || `notif-${i}`}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.04, duration: 0.3 }}
      >
        <Card className={`hover:shadow-lg transition-all duration-300 overflow-hidden ${config.border} ${isUnread ? 'bg-emerald-50/30 dark:bg-emerald-950/10' : ''}`}>
          {/* Gradient top border */}
          <div className={`h-1 bg-gradient-to-r ${config.gradient}`} />
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              {/* Icon badge */}
              <div className={`p-2.5 rounded-xl shrink-0 ${config.iconBg}`}>
                <Icon className={`w-5 h-5 ${config.iconColor}`} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h4 className="font-semibold text-sm truncate">{alert.title}</h4>
                  {/* Unread dot */}
                  {isUnread && (
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${config.dotColor} ring-2 ring-white dark:ring-gray-900`} />
                  )}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{alert.message}</p>

                {/* Footer row */}
                <div className="flex items-center gap-2 mt-2">
                  {alert.createdAt && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {timeAgo(alert.createdAt, language)}
                    </span>
                  )}
                  <Badge className={`${config.badgeBg} ${config.badgeText} border-0 text-xs`}>
                    {alert.type}
                  </Badge>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-1 shrink-0">
                {isUnread && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
                    onClick={() => markAsRead(alert.id)}
                    title={language === 'ar' ? 'تحديد كمقروء' : 'Mark as read'}
                  >
                    <Eye className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  const renderGroup = (title: string, notifs: any[], startIndex: number) => {
    if (notifs.length === 0) return null
    return (
      <div>
        <div className="flex items-center gap-3 mb-3">
          <h4 className="text-sm font-semibold text-muted-foreground whitespace-nowrap">{title}</h4>
          <div className="flex-1 h-px bg-border" />
          <Badge variant="outline" className="text-xs">{notifs.length}</Badge>
        </div>
        <div className="space-y-2">
          {notifs.map((alert, i) => renderNotificationCard(alert, startIndex + i))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600">
            <Bell className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-lg font-semibold">{t.notifications}</h3>
        </div>
        <div className="flex items-center gap-2">
          {/* Sound toggle */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="gap-1.5"
          >
            {soundEnabled ? (
              <Volume2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-muted-foreground" />
            )}
            {soundEnabled
              ? (language === 'ar' ? 'صوت' : 'Sound')
              : (language === 'ar' ? 'صامت' : 'Muted')
            }
          </Button>
          {unreadCount > 0 && (
            <Button size="sm" variant="outline" onClick={markAllRead} className="gap-1.5">
              <CheckCheck className="w-3.5 h-3.5" />
              {t.markAllRead}
            </Button>
          )}
          {readCount > 0 && (
            <Button size="sm" variant="outline" onClick={deleteAllRead} className="gap-1.5 text-rose-600 hover:text-rose-700 dark:text-rose-400">
              <Trash2 className="w-3.5 h-3.5" />
              {language === 'ar' ? 'حذف المقروء' : 'Delete Read'}
            </Button>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        {/* Total Notifications */}
        <Card className="border-0 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/50">
                <Bell className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-xs text-muted-foreground">
                {language === 'ar' ? 'الإجمالي' : 'Total'}
              </span>
            </div>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{totalCount}</p>
          </CardContent>
        </Card>

        {/* Unread */}
        <Card className="border-0 bg-gradient-to-br from-rose-50 to-red-50 dark:from-rose-950/20 dark:to-red-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-900/50">
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              </div>
              <span className="text-xs text-muted-foreground">{t.unread}</span>
            </div>
            <p className="text-2xl font-bold text-rose-700 dark:text-rose-300">{unreadCount}</p>
          </CardContent>
        </Card>

        {/* Insights */}
        <Card className="border-0 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/50">
                <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <span className="text-xs text-muted-foreground">
                {language === 'ar' ? 'رؤى' : 'Insights'}
              </span>
            </div>
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{insightsCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Read/Unread Ring Indicator */}
      <Card className="border-0 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20">
        <CardContent className="p-5">
          <div className="flex items-center gap-6">
            <div className="relative w-20 h-20 shrink-0">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  className="text-muted/20"
                  strokeWidth="3"
                />
                {/* Read portion (emerald) */}
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="3"
                  strokeDasharray={`${readRatio}, 100`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-sm font-bold">{readRatio}%</span>
                <span className="text-[9px] text-muted-foreground">{t.read}</span>
              </div>
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-sm">{t.read}</span>
                </div>
                <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{readCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500" />
                  <span className="text-sm">{t.unread}</span>
                </div>
                <span className="text-sm font-semibold text-rose-600 dark:text-rose-400">{unreadCount}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                  style={{ width: `${readRatio}%` }}
                />
                <div
                  className="h-full bg-gradient-to-r from-rose-400 to-rose-500 transition-all duration-500"
                  style={{ width: `${unreadRatio}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {renderFilterButton('all', language === 'ar' ? 'الكل' : 'All')}
        {renderFilterButton('alert', t.alert)}
        {renderFilterButton('reminder', t.reminder)}
        {renderFilterButton('insight', t.insight)}
        {renderFilterButton('system', t.systemNotif)}
      </div>

      {/* Notification List */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Bell className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>{t.noData}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {renderGroup(
            language === 'ar' ? 'اليوم' : 'Today',
            todayNotifs,
            0
          )}
          {renderGroup(
            language === 'ar' ? 'سابقاً' : 'Earlier',
            earlierNotifs,
            todayNotifs.length
          )}
          {renderGroup(
            language === 'ar' ? 'أخرى' : 'Other',
            noDateNotifs,
            todayNotifs.length + earlierNotifs.length
          )}
        </div>
      )}
    </div>
  )
}
