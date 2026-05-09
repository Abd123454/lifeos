import { create } from 'zustand'

interface AppState {
  activeTab: string
  language: 'en' | 'ar'
  sidebarOpen: boolean
  sidebarCollapsed: boolean
  user: any | null
  isLoading: boolean
  setActiveTab: (tab: string) => void
  setLanguage: (lang: 'en' | 'ar') => void
  toggleSidebar: () => void
  toggleSidebarCollapsed: () => void
  setUser: (user: any | null) => void
  setIsLoading: (loading: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  activeTab: 'dashboard',
  language: 'en',
  sidebarOpen: false,
  sidebarCollapsed: false,
  user: null,
  isLoading: false,
  setActiveTab: (tab) => set({ activeTab: tab }),
  setLanguage: (lang) => set({ language: lang }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toggleSidebarCollapsed: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setUser: (user) => set({ user }),
  setIsLoading: (isLoading) => set({ isLoading }),
}))
