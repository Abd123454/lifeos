'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Globe, Sun, Moon, Monitor, Download, Upload, Palette, Shield, Clock, Bell, Keyboard, FileJson, CheckCircle2, AlertCircle } from 'lucide-react'
import { translations } from '@/lib/i18n'
import { useTheme } from 'next-themes'
import { useAppStore } from '@/lib/store'
import { toast } from '@/hooks/use-toast'

interface Props {
  userId: string
  language: 'en' | 'ar'
}

export default function SettingsPanel({ userId, language }: Props) {
  const t = translations[language]
  const { setLanguage } = useAppStore()
  const { theme, setTheme } = useTheme()
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<any>(null)

  const handleImport = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0]
      if (!file) return
      setImporting(true)
      setImportResult(null)
      try {
        const text = await file.text()
        const data = JSON.parse(text)
        const res = await fetch('/api/settings/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, data }),
        })
        const result = await res.json()
        if (res.ok) {
          setImportResult({ success: true, ...result })
          toast({ title: language === 'ar' ? 'تم الاستيراد بنجاح' : 'Import successful' })
        } else {
          setImportResult({ success: false, error: result.error || 'Import failed' })
          toast({ title: language === 'ar' ? 'فشل الاستيراد' : 'Import failed', variant: 'destructive' })
        }
      } catch (err: any) {
        setImportResult({ success: false, error: err.message || 'Invalid file' })
        toast({ title: language === 'ar' ? 'ملف غير صالح' : 'Invalid file', variant: 'destructive' })
      }
      setImporting(false)
    }
    input.click()
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await fetch(`/api/settings/export?userId=${userId}`)
      if (res.ok) {
        const data = await res.json()
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `lifeos-export-${new Date().toISOString().split('T')[0]}.json`
        a.click()
        URL.revokeObjectURL(url)
        toast({ title: 'Export successful' })
      }
    } catch {
      toast({ title: 'Export failed', variant: 'destructive' })
    }
    setExporting(false)
  }

  const themeOptions = [
    { value: 'light', icon: Sun, label: t.light, emoji: '☀️', color: 'from-amber-400 to-orange-500' },
    { value: 'dark', icon: Moon, label: t.dark, emoji: '🌙', color: 'from-indigo-500 to-purple-600' },
    { value: 'system', icon: Monitor, label: t.system, emoji: '💻', color: 'from-gray-400 to-gray-600' },
  ]

  const languageOptions = [
    { value: 'en' as const, label: 'English', flag: '🇺🇸', direction: 'LTR' },
    { value: 'ar' as const, label: 'العربية', flag: '🇸🇦', direction: 'RTL' },
  ]

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-xl bg-gradient-to-br from-gray-500 to-gray-700">
          <Palette className="w-4 h-4 text-white" />
        </div>
        <h3 className="text-lg font-semibold">{t.settings}</h3>
      </div>

      {/* Profile Card */}
      <Card className="overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 relative">
          <div className="absolute -bottom-8 start-6">
            <div className="w-16 h-16 rounded-2xl bg-card border-4 border-card flex items-center justify-center shadow-lg">
              <span className="text-2xl font-bold bg-gradient-to-br from-emerald-600 to-teal-600 bg-clip-text text-transparent">LO</span>
            </div>
          </div>
        </div>
        <CardContent className="p-6 pt-12">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">{t.name}</p>
              <p className="font-semibold">LifeOS Operator</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">{t.email}</p>
              <p className="font-semibold">operator@lifeos.com</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs flex items-center gap-1"><Clock className="w-3 h-3" /> Timezone</p>
              <p className="font-semibold">Asia/Hebron</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs flex items-center gap-1"><Shield className="w-3 h-3" /> Role</p>
              <p className="font-semibold">Operator</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Language */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-500" />
            {t.language}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {languageOptions.map(lang => (
              <button
                key={lang.value}
                onClick={() => setLanguage(lang.value)}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 ${
                  language === lang.value
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 shadow-sm'
                    : 'border-border hover:border-emerald-300 dark:hover:border-emerald-700'
                }`}
              >
                <span className="text-2xl">{lang.flag}</span>
                <div className="text-start">
                  <p className="font-semibold text-sm">{lang.label}</p>
                  <p className="text-xs text-muted-foreground">{lang.direction}</p>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Theme */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Palette className="w-4 h-4 text-purple-500" />
            {t.theme}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {themeOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${
                  theme === opt.value
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 shadow-sm'
                    : 'border-border hover:border-emerald-300 dark:hover:border-emerald-700'
                }`}
              >
                <span className="text-2xl">{opt.emoji}</span>
                <p className="text-xs font-medium">{opt.label}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-500" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span>Daily Briefing</span>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Enabled</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span>Task Reminders</span>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Enabled</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span>Budget Alerts</span>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Enabled</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileJson className="w-4 h-4 text-teal-500" />
            {language === 'ar' ? 'إدارة البيانات' : 'Data Management'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Export */}
            <div className="p-4 rounded-xl border border-border/50 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-950/30">
                  <Download className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                </div>
                <div>
                  <p className="font-medium text-sm">{t.export}</p>
                  <p className="text-xs text-muted-foreground">JSON file</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-3">Download all your data as a JSON file.</p>
              <Button onClick={handleExport} disabled={exporting} size="sm" className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700">
                <Download className="w-3.5 h-3.5 me-1.5" />
                {exporting ? t.loading : t.export}
              </Button>
            </div>

            {/* Import */}
            <div className="p-4 rounded-xl border border-border/50 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30">
                  <Upload className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="font-medium text-sm">{language === 'ar' ? 'استيراد البيانات' : 'Import Data'}</p>
                  <p className="text-xs text-muted-foreground">JSON file</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-3">Restore data from a JSON export file.</p>
              <Button onClick={handleImport} disabled={importing} size="sm" className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700">
                <Upload className="w-3.5 h-3.5 me-1.5" />
                {importing ? t.loading : (language === 'ar' ? 'استيراد' : 'Import')}
              </Button>
            </div>
          </div>

          {/* Import Result */}
          {importResult && (
            <div className={`p-3 rounded-lg text-sm ${importResult.success ? 'bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800'}`}>
              <div className="flex items-center gap-2 mb-1">
                {importResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
                <span className="font-medium">{importResult.success ? (language === 'ar' ? 'تم الاستيراد' : 'Import Complete') : (language === 'ar' ? 'فشل الاستيراد' : 'Import Failed')}</span>
              </div>
              {importResult.success && importResult.imported && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {Object.entries(importResult.imported).filter(([_, v]) => (v as number) > 0).map(([key, val]) => (
                    <span key={key} className="inline-flex items-center gap-1 text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                      {key}: {val as number}
                    </span>
                  ))}
                </div>
              )}
              {!importResult.success && <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{importResult.error}</p>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Keyboard Shortcuts */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-emerald-500" />
            {language === 'ar' ? 'اختصارات لوحة المفاتيح' : 'Keyboard Shortcuts'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { keys: 'Ctrl + K', desc: language === 'ar' ? 'بحث شامل' : 'Global Search', descAr: 'بحث شامل' },
              { keys: 'Alt + 1-9', desc: language === 'ar' ? 'التنقل بين اللوحات' : 'Navigate Panels', descAr: 'التنقل بين اللوحات' },
              { keys: 'Alt + 0', desc: language === 'ar' ? 'لوحة التحليلات' : 'Analytics Panel', descAr: 'لوحة التحليلات' },
            ].map(shortcut => (
              <div key={shortcut.keys} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50">
                <span className="text-sm">{shortcut.desc}</span>
                <kbd className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-muted-foreground bg-background rounded border border-border shadow-sm">
                  {shortcut.keys}
                </kbd>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
