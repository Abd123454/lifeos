'use client'

import { useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Keyboard, X } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  language: 'en' | 'ar'
}

const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0

const panelNames = {
  en: [
    { key: '1', name: 'Dashboard' },
    { key: '2', name: 'Tasks' },
    { key: '3', name: 'Health' },
    { key: '4', name: 'Finance' },
    { key: '5', name: 'Journal' },
    { key: '6', name: 'Contacts' },
    { key: '7', name: 'Habits' },
    { key: '8', name: 'Mood' },
    { key: '9', name: 'Goals' },
    { key: '0', name: 'Analytics' },
  ],
  ar: [
    { key: '1', name: 'لوحة القيادة' },
    { key: '2', name: 'المهام' },
    { key: '3', name: 'الصحة' },
    { key: '4', name: 'المالية' },
    { key: '5', name: 'اليومية' },
    { key: '6', name: 'جهات الاتصال' },
    { key: '7', name: 'العادات' },
    { key: '8', name: 'المزاج' },
    { key: '9', name: 'الأهداف' },
    { key: '0', name: 'التحليلات' },
  ],
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 text-xs font-semibold rounded-md border border-border bg-muted text-muted-foreground shadow-sm">
      {children}
    </kbd>
  )
}

export default function KeyboardShortcutsOverlay({ open, onClose, language }: Props) {
  const isRtl = language === 'ar'
  const panels = panelNames[language]
  const modKey = isMac ? '⌘' : 'Ctrl'

  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    if (open) {
      window.addEventListener('keydown', handleEscape)
      return () => window.removeEventListener('keydown', handleEscape)
    }
  }, [open, handleEscape])

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="glass-card rounded-2xl w-full max-w-lg pointer-events-auto relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 end-4 p-1.5 rounded-lg hover:bg-muted/80 transition-colors text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Header */}
              <div className="flex items-center gap-3 p-6 pb-4">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600">
                  <Keyboard className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">
                    {language === 'ar' ? 'اختصارات لوحة المفاتيح' : 'Keyboard Shortcuts'}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {language === 'ar' ? 'استخدم هذه الاختصارات للتنقل السريع' : 'Use these shortcuts for quick navigation'}
                  </p>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 pb-6 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
                {/* Navigation Section */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    {language === 'ar' ? 'التنقل' : 'Navigation'}
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {panels.map((panel) => (
                      <div key={panel.key} className="flex items-center gap-2.5 py-1.5">
                        <div className="flex items-center gap-1">
                          <Kbd>Alt</Kbd>
                          <span className="text-muted-foreground text-xs">+</span>
                          <Kbd>{panel.key}</Kbd>
                        </div>
                        <span className="text-sm truncate">{panel.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-border/50" />

                {/* Quick Actions Section */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    {language === 'ar' ? 'إجراءات سريعة' : 'Quick Actions'}
                  </h3>
                  <div className="space-y-2.5">
                    {/* Command Palette */}
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-sm">
                        {language === 'ar' ? 'لوحة الأوامر' : 'Command Palette'}
                      </span>
                      <div className="flex items-center gap-1">
                        <Kbd>{modKey}</Kbd>
                        <span className="text-muted-foreground text-xs">+</span>
                        <Kbd>K</Kbd>
                      </div>
                    </div>

                    {/* Toggle Theme */}
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-sm">
                        {language === 'ar' ? 'تبديل المظهر' : 'Toggle Theme'}
                      </span>
                      <Kbd>T</Kbd>
                    </div>

                    {/* Toggle Language */}
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-sm">
                        {language === 'ar' ? 'تبديل اللغة' : 'Toggle Language'}
                      </span>
                      <Kbd>L</Kbd>
                    </div>

                    {/* Help */}
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-sm">
                        {language === 'ar' ? 'اختصارات لوحة المفاتيح' : 'Keyboard Shortcuts'}
                      </span>
                      <Kbd>?</Kbd>
                    </div>
                  </div>
                </div>

                {/* Footer hint */}
                <div className="pt-2 border-t border-border/50 text-center">
                  <p className="text-xs text-muted-foreground">
                    {language === 'ar'
                      ? 'اضغط Escape للإغلاق'
                      : 'Press Escape to close'}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
