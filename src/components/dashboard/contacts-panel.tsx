'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, Mail, Phone, Building, User, Users, Clock, Tag, MessageSquare, Briefcase, UserPlus } from 'lucide-react'
import { translations } from '@/lib/i18n'
import { motion } from 'framer-motion'

interface Props {
  userId: string
  language: 'en' | 'ar'
}

const tagConfig: Record<string, { gradient: string; bg: string; badge: string; avatar: string }> = {
  work: {
    gradient: 'from-teal-500 to-emerald-600',
    bg: 'bg-teal-50 dark:bg-teal-950/20',
    badge: 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300',
    avatar: 'from-teal-400 to-emerald-500',
  },
  friend: {
    gradient: 'from-amber-500 to-orange-600',
    bg: 'bg-amber-50 dark:bg-amber-950/20',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
    avatar: 'from-amber-400 to-orange-500',
  },
  health: {
    gradient: 'from-rose-500 to-pink-600',
    bg: 'bg-rose-50 dark:bg-rose-950/20',
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300',
    avatar: 'from-rose-400 to-pink-500',
  },
  finance: {
    gradient: 'from-amber-500 to-yellow-600',
    bg: 'bg-amber-50 dark:bg-amber-950/20',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
    avatar: 'from-amber-400 to-yellow-500',
  },
  hobby: {
    gradient: 'from-purple-500 to-pink-600',
    bg: 'bg-purple-50 dark:bg-purple-950/20',
    badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
    avatar: 'from-purple-400 to-pink-500',
  },
  professional: {
    gradient: 'from-emerald-500 to-teal-600',
    bg: 'bg-emerald-50 dark:bg-emerald-950/20',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
    avatar: 'from-emerald-400 to-teal-500',
  },
  mentor: {
    gradient: 'from-rose-500 to-amber-600',
    bg: 'bg-rose-50 dark:bg-rose-950/20',
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300',
    avatar: 'from-rose-400 to-amber-500',
  },
  family: {
    gradient: 'from-emerald-500 to-teal-600',
    bg: 'bg-emerald-50 dark:bg-emerald-950/20',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
    avatar: 'from-emerald-400 to-teal-500',
  },
}

const defaultTagConfig = {
  gradient: 'from-gray-400 to-gray-500',
  bg: 'bg-gray-50 dark:bg-gray-950/20',
  badge: 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300',
  avatar: 'from-gray-400 to-gray-500',
}

const allCategories = ['work', 'friend', 'health', 'finance', 'hobby', 'professional', 'mentor', 'family']

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.charAt(0).toUpperCase()
}

function getFirstTagConfig(tags: string | null): typeof defaultTagConfig {
  if (!tags) return defaultTagConfig
  const firstTag = tags.split(',')[0]?.trim().toLowerCase()
  if (firstTag && tagConfig[firstTag]) return tagConfig[firstTag]
  return defaultTagConfig
}

function getRelativeTime(date: string | Date): string {
  const now = Date.now()
  const then = new Date(date).getTime()
  const diffMs = now - then
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  const diffWeeks = Math.floor(diffDays / 7)
  const diffMonths = Math.floor(diffDays / 30)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffWeeks < 4) return `${diffWeeks}w ago`
  return `${diffMonths}mo ago`
}

function isContactComplete(contact: any): boolean {
  return !!(contact.name && contact.email && contact.phone && contact.company && contact.role)
}

export default function ContactsPanel({ userId, language }: Props) {
  const t = translations[language]
  const [contacts, setContacts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', role: '', tags: '', notes: '' })

  const loadContacts = async () => {
    if (!userId) return
    try {
      const res = await fetch(`/api/contacts?userId=${userId}`)
      if (res.ok) {
        const data = await res.json()
        setContacts(Array.isArray(data) ? data : data.contacts || [])
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadContacts() }, [userId])

  const addContact = async () => {
    if (!form.name) return
    await fetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ...form }),
    })
    setDialogOpen(false)
    setForm({ name: '', email: '', phone: '', company: '', role: '', tags: '', notes: '' })
    loadContacts()
  }

  // Compute stats
  const totalContacts = contacts.length
  const completeContacts = contacts.filter(isContactComplete).length
  const completionRate = totalContacts > 0 ? Math.round((completeContacts / totalContacts) * 100) : 0

  // Category breakdown
  const categoryCounts: Record<string, number> = {}
  contacts.forEach(c => {
    if (c.tags) {
      c.tags.split(',').forEach((tag: string) => {
        const t = tag.trim().toLowerCase()
        if (t) categoryCounts[t] = (categoryCounts[t] || 0) + 1
      })
    }
  })
  const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]

  // Recently added (last 7 days)
  const sevenDaysAgo = Date.now() - 7 * 86400000
  const recentlyAdded = contacts.filter(c => new Date(c.createdAt).getTime() > sevenDaysAgo).length

  // Unique categories present in contacts for filter
  const presentCategories = Array.from(new Set(
    contacts.flatMap(c => c.tags ? c.tags.split(',').map((t: string) => t.trim().toLowerCase()).filter(Boolean) : [])
  ))

  // Filtered contacts
  const filtered = contacts.filter(c => {
    const matchesSearch = !search || 
      c.name.toLowerCase().includes(search.toLowerCase()) || 
      c.email?.toLowerCase().includes(search.toLowerCase()) || 
      c.company?.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || 
      (c.tags && c.tags.split(',').map((t: string) => t.trim().toLowerCase()).includes(categoryFilter))
    return matchesSearch && matchesCategory
  })

  if (loading) return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3].map(i => (
        <Card key={i} className="animate-pulse">
          <CardContent className="p-6"><div className="h-32 bg-muted rounded" /></CardContent>
        </Card>
      ))}
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        {/* Total Contacts */}
        <Card className="border-0 bg-emerald-50 dark:bg-emerald-950/20">
          <CardContent className="p-5">
            <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 w-fit mb-3">
              <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-2xl font-bold">{totalContacts}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{language === 'ar' ? 'إجمالي جهات الاتصال' : 'Total Contacts'}</p>
          </CardContent>
        </Card>

        {/* Top Category */}
        <Card className="border-0 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="p-5">
            <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/50 w-fit mb-3">
              <Tag className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <p className="text-2xl font-bold capitalize">{topCategory ? topCategory[0] : '—'}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{language === 'ar' ? 'الفئة الأكثر' : 'Top Category'}</p>
          </CardContent>
        </Card>

        {/* Recently Added */}
        <Card className="border-0 bg-teal-50 dark:bg-teal-950/20">
          <CardContent className="p-5">
            <div className="p-2.5 rounded-xl bg-teal-100 dark:bg-teal-900/50 w-fit mb-3">
              <Clock className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            </div>
            <p className="text-2xl font-bold">{recentlyAdded}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{language === 'ar' ? 'أُضيف مؤخراً' : 'Recently Added'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search & Add Row */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder={t.search} value={search} onChange={e => setSearch(e.target.value)} className="ps-9" />
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 me-2" />{t.addContact}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/50">
                  <UserPlus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                {t.addContact}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                  {t.name} *
                </label>
                <Input placeholder={t.name} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                    {t.email}
                  </label>
                  <Input placeholder={t.email} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                    {t.phone}
                  </label>
                  <Input placeholder={t.phone} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                </div>
              </div>

              {/* Company & Role */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-muted-foreground" />
                    Company
                  </label>
                  <Input placeholder="Company" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
                    Role
                  </label>
                  <Input placeholder="Role" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} />
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                  Tags
                </label>
                <Input placeholder="work, friend, family..." value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} />
                <p className="text-xs text-muted-foreground">
                  {language === 'ar' ? 'أدخل العلامات مفصولة بفواصل' : 'Enter tags separated by commas'}
                </p>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
                  {t.notes}
                </label>
                <Input placeholder={t.notes} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>

              <Button onClick={addContact} className="w-full bg-emerald-600 hover:bg-emerald-700">
                {t.save}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Category Filter Chips */}
      <div className="flex gap-2 flex-wrap">
        <Button
          size="sm"
          variant={categoryFilter === 'all' ? 'default' : 'outline'}
          onClick={() => setCategoryFilter('all')}
          className={categoryFilter === 'all' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
        >
          <Users className="w-3.5 h-3.5 me-1.5" />
          {language === 'ar' ? 'الكل' : 'All'}
        </Button>
        {presentCategories.map(cat => {
          const config = tagConfig[cat]
          const isActive = categoryFilter === cat
          return (
            <Button
              key={cat}
              size="sm"
              variant={isActive ? 'default' : 'outline'}
              onClick={() => setCategoryFilter(isActive ? 'all' : cat)}
              className={isActive ? (config ? `bg-gradient-to-r ${config.gradient} text-white border-0` : 'bg-emerald-600') : ''}
            >
              {cat}
              <Badge className={`ms-1.5 text-[10px] px-1.5 py-0 h-4 ${config?.badge || 'bg-gray-100 text-gray-700'}`}>
                {categoryCounts[cat] || 0}
              </Badge>
            </Button>
          )
        })}
      </div>

      {/* Completion Ring + Info */}
      <Card className="border-0 overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-500" />
        <CardContent className="p-5">
          <div className="flex items-center gap-6">
            <div className="relative w-20 h-20 shrink-0">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
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
                  stroke="#10b981"
                  strokeWidth="3"
                  strokeDasharray={`${completionRate}, 100`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-base font-bold">{completionRate}%</span>
              </div>
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-sm">
                {language === 'ar' ? 'اكتمال البيانات' : 'Profile Completion'}
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                {completeContacts} {language === 'ar' ? 'من' : 'of'} {totalContacts} {language === 'ar' ? 'جهة اتصال بملف كامل' : 'contacts have complete profiles'}
              </p>
              <div className="flex gap-3 mt-2">
                <span className="text-xs flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  {language === 'ar' ? 'مكتمل' : 'Complete'} ({completeContacts})
                </span>
                <span className="text-xs flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-muted" />
                  {language === 'ar' ? 'جزئي' : 'Partial'} ({totalContacts - completeContacts})
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Cards */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">{t.noData}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((contact, i) => {
            const config = getFirstTagConfig(contact.tags)
            const initials = getInitials(contact.name)

            return (
              <motion.div
                key={contact.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Card className="hover:shadow-lg transition-all duration-300 overflow-hidden group">
                  {/* Gradient Top Border */}
                  <div className={`h-1 bg-gradient-to-r ${config.gradient}`} />

                  <CardContent className="p-5">
                    {/* Header: Avatar + Name/Role */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${config.avatar} flex items-center justify-center text-white font-bold text-lg shrink-0`}>
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold truncate">{contact.name}</h4>
                        {contact.role && (
                          <p className="text-xs text-muted-foreground truncate">{contact.role}</p>
                        )}
                      </div>
                    </div>

                    {/* Contact Details with Icon Badges */}
                    <div className="space-y-2">
                      {contact.email && (
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 shrink-0">
                            <Mail className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <span className="text-sm text-muted-foreground truncate">{contact.email}</span>
                        </div>
                      )}
                      {contact.phone && (
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-lg bg-teal-100 dark:bg-teal-900/50 shrink-0">
                            <Phone className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                          </div>
                          <span className="text-sm text-muted-foreground">{contact.phone}</span>
                        </div>
                      )}
                      {contact.company && (
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/50 shrink-0">
                            <Building className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          </div>
                          <span className="text-sm text-muted-foreground truncate">{contact.company}</span>
                        </div>
                      )}
                    </div>

                    {/* Tags */}
                    {contact.tags && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {contact.tags.split(',').map((tag: string, idx: number) => {
                          const t = tag.trim().toLowerCase()
                          const tagCfg = tagConfig[t]
                          return (
                            <Badge
                              key={idx}
                              className={`text-[10px] border-0 ${tagCfg?.badge || 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300'}`}
                            >
                              {tag.trim()}
                            </Badge>
                          )
                        })}
                      </div>
                    )}

                    {/* Footer: Last Contact / Notes Preview */}
                    <div className="mt-3 pt-3 border-t border-border/50">
                      {contact.notes ? (
                        <p className="text-xs text-muted-foreground line-clamp-1 flex items-center gap-1.5">
                          <MessageSquare className="w-3 h-3 shrink-0" />
                          <span className="truncate">{contact.notes}</span>
                        </p>
                      ) : contact.lastContact ? (
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Clock className="w-3 h-3 shrink-0" />
                          {language === 'ar' ? 'آخر تواصل' : 'Last contact'}: {getRelativeTime(contact.lastContact)}
                        </p>
                      ) : contact.createdAt ? (
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Clock className="w-3 h-3 shrink-0" />
                          {language === 'ar' ? 'أُضيف' : 'Added'}: {getRelativeTime(contact.createdAt)}
                        </p>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
