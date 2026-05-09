'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import {
  Plus, CheckSquare, Clock, AlertCircle, Circle, CheckCircle2,
  Flame, LayoutList, GripVertical, ArrowUpDown, Columns3,
  XCircle, Minus
} from 'lucide-react'
import { translations } from '@/lib/i18n'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  userId: string
  language: 'en' | 'ar'
}

const priorityConfig: Record<string, { gradient: string; bg: string; icon: string; color: string }> = {
  urgent: { gradient: 'from-red-500 to-rose-600', bg: 'bg-red-50 dark:bg-red-950/20', icon: '🔴', color: 'text-red-600 dark:text-red-400' },
  high: { gradient: 'from-orange-500 to-amber-600', bg: 'bg-orange-50 dark:bg-orange-950/20', icon: '🟠', color: 'text-orange-600 dark:text-orange-400' },
  medium: { gradient: 'from-amber-400 to-yellow-500', bg: 'bg-amber-50 dark:bg-amber-950/20', icon: '🟡', color: 'text-amber-600 dark:text-amber-400' },
  low: { gradient: 'from-gray-400 to-gray-500', bg: 'bg-gray-50 dark:bg-gray-950/20', icon: '⚪', color: 'text-gray-600 dark:text-gray-400' },
}

const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 }

const statusConfig: Record<string, { label: string; icon: any; color: string; bg: string; headerBg: string; headerIcon: string }> = {
  pending: {
    label: 'Pending',
    icon: Circle,
    color: 'text-gray-600 dark:text-gray-400',
    bg: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    headerBg: 'bg-gray-50 dark:bg-gray-900/30',
    headerIcon: 'text-gray-500 dark:text-gray-400',
  },
  in_progress: {
    label: 'In Progress',
    icon: Clock,
    color: 'text-cyan-600 dark:text-cyan-400',
    bg: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300',
    headerBg: 'bg-cyan-50 dark:bg-cyan-950/20',
    headerIcon: 'text-cyan-500 dark:text-cyan-400',
  },
  completed: {
    label: 'Completed',
    icon: CheckCircle2,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
    headerBg: 'bg-emerald-50 dark:bg-emerald-950/20',
    headerIcon: 'text-emerald-500 dark:text-emerald-400',
  },
  cancelled: {
    label: 'Cancelled',
    icon: XCircle,
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300',
    headerBg: 'bg-rose-50 dark:bg-rose-950/20',
    headerIcon: 'text-rose-500 dark:text-rose-400',
  },
}

const statusOrder: Record<string, number> = { pending: 0, in_progress: 1, completed: 2, cancelled: 3 }

type SortMode = 'custom' | 'priority' | 'dueDate' | 'status'
type ViewMode = 'list' | 'board'

export default function TasksPanel({ userId, language }: Props) {
  const t = translations[language]
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', category: '', dueDate: '' })
  const [sortBy, setSortBy] = useState<SortMode>('custom')
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [kanbanDragStatus, setKanbanDragStatus] = useState<string | null>(null)
  const [kanbanDragTaskId, setKanbanDragTaskId] = useState<string | null>(null)

  const loadTasks = async () => {
    if (!userId) return
    try {
      const res = await fetch(`/api/tasks?userId=${userId}`)
      if (res.ok) {
        const data = await res.json()
        setTasks(Array.isArray(data) ? data : data.tasks || [])
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadTasks() }, [userId])

  const addTask = async () => {
    if (!form.title) return
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ...form }),
    })
    setForm({ title: '', description: '', priority: 'medium', category: '', dueDate: '' })
    setDialogOpen(false)
    loadTasks()
  }

  const toggleTask = async (task: any) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed'
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ...task, status: newStatus, id: task.id }),
    })
    loadTasks()
  }

  const updateTaskStatus = async (task: any, newStatus: string) => {
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: task.id, userId, status: newStatus }),
    })
    loadTasks()
  }

  const safeTasks = Array.isArray(tasks) ? tasks : []
  const filtered = filter === 'all' ? safeTasks : safeTasks.filter(t => t.status === filter)

  // Sort the filtered tasks based on sortBy
  const sortedTasks = (() => {
    if (sortBy === 'custom') return filtered
    const sorted = [...filtered]
    switch (sortBy) {
      case 'priority':
        sorted.sort((a, b) => (priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99))
        break
      case 'dueDate':
        sorted.sort((a, b) => {
          if (!a.dueDate && !b.dueDate) return 0
          if (!a.dueDate) return 1
          if (!b.dueDate) return -1
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        })
        break
      case 'status':
        sorted.sort((a, b) => (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99))
        break
    }
    return sorted
  })()

  // Drag and drop handlers (list mode)
  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    if (sortBy !== 'custom') return
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }, [sortBy])

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index)
    }
  }, [draggedIndex])

  const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === dropIndex) return

    const newFiltered = [...filtered]
    const [movedTask] = newFiltered.splice(draggedIndex, 1)
    newFiltered.splice(dropIndex, 0, movedTask)

    const newTasks = [...safeTasks]
    const filteredIds = new Set(filtered.map(t => t.id))
    let filteredIdx = 0
    for (let i = 0; i < newTasks.length; i++) {
      if (filteredIds.has(newTasks[i].id)) {
        newTasks[i] = newFiltered[filteredIdx]
        filteredIdx++
      }
    }
    setTasks(newTasks)
    setDraggedIndex(null)
    setDragOverIndex(null)
  }, [draggedIndex, filtered, safeTasks])

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }, [])

  // Kanban drag handlers (board mode)
  const handleKanbanDragStart = useCallback((e: React.DragEvent, task: any) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', task.id)
    setKanbanDragTaskId(task.id)
    setKanbanDragStatus(task.status)
  }, [])

  const handleKanbanColumnDragOver = useCallback((e: React.DragEvent, status: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setKanbanDragStatus(status)
  }, [])

  const handleKanbanColumnDragLeave = useCallback(() => {
    setKanbanDragStatus(null)
  }, [])

  const handleKanbanColumnDrop = useCallback(async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault()
    const taskId = e.dataTransfer.getData('text/plain')
    setKanbanDragStatus(null)
    setKanbanDragTaskId(null)

    if (!taskId) return

    const task = safeTasks.find(t => t.id === taskId)
    if (!task || task.status === targetStatus) return

    await updateTaskStatus(task, targetStatus)
  }, [safeTasks, userId])

  const handleKanbanDragEnd = useCallback(() => {
    setKanbanDragStatus(null)
    setKanbanDragTaskId(null)
  }, [])

  // Stats
  const totalTasks = safeTasks.length
  const completedCount = safeTasks.filter(t => t.status === 'completed').length
  const pendingCount = safeTasks.filter(t => t.status === 'pending').length
  const inProgressCount = safeTasks.filter(t => t.status === 'in_progress').length
  const urgentCount = safeTasks.filter(t => t.priority === 'urgent' || t.priority === 'high').length
  const completionRate = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0

  // Helper for due date countdown
  const getDueDateInfo = (task: any) => {
    if (!task.dueDate) return null
    const daysUntilDue = Math.ceil((new Date(task.dueDate).getTime() - Date.now()) / 86400000)
    const isCompleted = task.status === 'completed'
    return {
      days: daysUntilDue,
      isOverdue: daysUntilDue < 0,
      isDueSoon: daysUntilDue <= 2 && daysUntilDue >= 0,
      isCompleted,
      text: daysUntilDue < 0 ? `${Math.abs(daysUntilDue)}d overdue` : daysUntilDue === 0 ? 'Due today' : `${daysUntilDue}d left`,
      className: isCompleted ? '' :
        daysUntilDue < 0 ? 'text-rose-600 dark:text-rose-400' :
        daysUntilDue <= 2 ? 'text-amber-600 dark:text-amber-400' :
        'text-muted-foreground',
    }
  }

  // Kanban columns data
  const kanbanColumns = ['pending', 'in_progress', 'completed', 'cancelled'] as const
  const kanbanTasksByStatus: Record<string, any[]> = {}
  for (const status of kanbanColumns) {
    kanbanTasksByStatus[status] = safeTasks.filter(t => t.status === status)
  }

  if (loading) return <div className="space-y-3">{[1,2,3].map(i => <Card key={i} className="animate-pulse"><CardContent className="p-4"><div className="h-12 bg-muted rounded" /></CardContent></Card>)}</div>

  return (
    <div className="space-y-4">
      {/* Header with view toggle */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600">
            <LayoutList className="w-4 h-4 text-white" />
          </div>

          {/* View Toggle */}
          <div className="flex items-center rounded-lg border border-border p-0.5">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              className={`h-7 px-2.5 ${viewMode === 'list' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
              onClick={() => setViewMode('list')}
            >
              <LayoutList className="w-3.5 h-3.5 me-1.5" />
              <span className="text-xs">List</span>
            </Button>
            <Button
              variant={viewMode === 'board' ? 'default' : 'ghost'}
              size="sm"
              className={`h-7 px-2.5 ${viewMode === 'board' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
              onClick={() => setViewMode('board')}
            >
              <Columns3 className="w-3.5 h-3.5 me-1.5" />
              <span className="text-xs">Board</span>
            </Button>
          </div>

          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tasks</SelectItem>
              <SelectItem value="pending">{t.pending}</SelectItem>
              <SelectItem value="in_progress">{t.inProgress}</SelectItem>
              <SelectItem value="completed">{t.completed}</SelectItem>
            </SelectContent>
          </Select>

          {viewMode === 'list' && (
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortMode)}>
              <SelectTrigger className="w-36">
                <ArrowUpDown className="w-3.5 h-3.5 me-1.5 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">Custom Order</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
                <SelectItem value="dueDate">Due Date</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 me-2" />{t.addTask}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t.addTask}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder={t.title} value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
              <Input placeholder={t.description} value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
              <Select value={form.priority} onValueChange={v => setForm({...form, priority: v})}>
                <SelectTrigger><SelectValue placeholder={t.priority} /></SelectTrigger>
                <SelectContent>
                  {Object.entries(priorityConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.icon} {key}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input placeholder={t.category} value={form.category} onChange={e => setForm({...form, category: e.target.value})} />
              <Input type="date" value={form.dueDate} onChange={e => setForm({...form, dueDate: e.target.value})} />
              <Button onClick={addTask} className="w-full bg-emerald-600 hover:bg-emerald-700">{t.save}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 card-elevated">
          <CardContent className="p-5 text-center">
            <div className="relative w-16 h-16 mx-auto mb-2">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" className="text-muted/30" strokeWidth="3" />
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#10b981" strokeWidth="3" strokeDasharray={`${completionRate}, 100`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold stat-value">{completionRate}%</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Completion Rate</p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-cyan-50 dark:bg-cyan-950/20 card-elevated">
          <CardContent className="p-5">
            <div className="p-2 rounded-xl bg-cyan-100 dark:bg-cyan-900/50 w-fit mb-3">
              <Clock className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            </div>
            <p className="text-xs text-muted-foreground">In Progress</p>
            <p className="text-xl font-bold stat-value">{inProgressCount}</p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-amber-50 dark:bg-amber-950/20 card-elevated">
          <CardContent className="p-5">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/50 w-fit mb-3">
              <Flame className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <p className="text-xs text-muted-foreground">Urgent/High</p>
            <p className="text-xl font-bold stat-value">{urgentCount}</p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-emerald-50 dark:bg-emerald-950/20 card-elevated">
          <CardContent className="p-5">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 w-fit mb-3">
              <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-xs text-muted-foreground">Completed</p>
            <p className="text-xl font-bold stat-value">{completedCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* View Content */}
      <AnimatePresence mode="wait">
        {viewMode === 'list' ? (
          <motion.div
            key="list-view"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {/* Filter bar with glass-card */}
            <div className="glass-card rounded-xl p-3 mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                {sortBy === 'custom' && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <GripVertical className="w-3.5 h-3.5" />
                    <span>Drag tasks to reorder</span>
                  </div>
                )}
                {sortBy !== 'custom' && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <ArrowUpDown className="w-3.5 h-3.5" />
                    <span>Sorted by {sortBy}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Task List */}
            <div className="space-y-2">
              {sortedTasks.length === 0 && (
                <Card><CardContent className="p-8 text-center text-muted-foreground">{t.noData}</CardContent></Card>
              )}
              {sortedTasks.map((task, i) => {
                const pConfig = priorityConfig[task.priority] || priorityConfig.medium
                const sConfig = statusConfig[task.status] || statusConfig.pending
                const isCompleted = task.status === 'completed'
                const dueInfo = getDueDateInfo(task)
                const isDragging = draggedIndex === i
                const isDragOver = dragOverIndex === i && draggedIndex !== i
                const canDrag = sortBy === 'custom'

                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    {isDragOver && (
                      <div className="h-1 rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 mb-1 mx-4 animate-pulse" />
                    )}
                    <Card
                      className={`card-elevated card-hover-lift hover:shadow-md transition-all duration-200 overflow-hidden ${
                        isCompleted ? 'opacity-60' : ''
                      } ${
                        isDragging ? 'opacity-40 border-dashed border-2 border-emerald-400 dark:border-emerald-600 shadow-lg' : ''
                      }`}
                    >
                      <div className={`h-0.5 bg-gradient-to-r ${pConfig.gradient}`} />
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div
                            className={`mt-1 shrink-0 flex items-center ${
                              canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-default opacity-30'
                            }`}
                            draggable={canDrag}
                            onDragStart={(e) => handleDragStart(e, i)}
                            onDragEnd={handleDragEnd}
                          >
                            <GripVertical className={`w-4 h-4 ${canDrag ? 'text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400' : 'text-muted-foreground/30'}`} />
                          </div>
                          <Checkbox
                            checked={isCompleted}
                            onCheckedChange={() => toggleTask(task)}
                            className="mt-1 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className={`font-medium ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                                {task.title}
                              </p>
                              {task.category && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">{task.category}</Badge>
                              )}
                            </div>
                            {task.description && <p className="text-sm text-muted-foreground truncate">{task.description}</p>}
                            <div className="flex items-center gap-2 mt-2">
                              <Badge className={`${pConfig.bg} border-0 text-xs`}>{pConfig.icon} {task.priority}</Badge>
                              <Badge className={`${sConfig.bg} text-xs`}>{sConfig.label}</Badge>
                              {dueInfo && !dueInfo.isCompleted && (
                                <span className={`text-xs flex items-center gap-1 ${dueInfo.className}`}>
                                  <Clock className="w-3 h-3" />
                                  {dueInfo.text}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="board-view"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {/* Kanban Board */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {kanbanColumns.map((status) => {
                const config = statusConfig[status]
                const StatusIcon = config.icon
                const columnTasks = kanbanTasksByStatus[status] || []
                const isDropTarget = kanbanDragStatus === status && kanbanDragTaskId !== null

                return (
                  <div
                    key={status}
                    className={`rounded-xl ${config.headerBg} card-elevated transition-all duration-200 ${
                      isDropTarget ? 'ring-2 ring-emerald-400 ring-dashed bg-emerald-50/50 dark:bg-emerald-950/20' : ''
                    }`}
                    onDragOver={(e) => handleKanbanColumnDragOver(e, status)}
                    onDragLeave={handleKanbanColumnDragLeave}
                    onDrop={(e) => handleKanbanColumnDrop(e, status)}
                  >
                    {/* Column Header */}
                    <div className="p-3 border-b border-border/50">
                      <div className="flex items-center gap-2">
                        <StatusIcon className={`w-4 h-4 ${config.headerIcon}`} />
                        <span className="font-medium text-sm">{config.label}</span>
                        <motion.div
                          key={columnTasks.length}
                          initial={{ scale: 0.8 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                        >
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 min-w-5 flex items-center justify-center">
                            {columnTasks.length}
                          </Badge>
                        </motion.div>
                      </div>
                    </div>

                    {/* Column Content */}
                    <div className="p-2 space-y-2 max-h-96 overflow-y-auto custom-scrollbar min-h-[80px]">
                      {columnTasks.length === 0 && (
                        <div className={`rounded-lg border-2 border-dashed border-border/50 p-4 text-center ${
                          isDropTarget ? 'border-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/10' : ''
                        }`}>
                          <Minus className="w-4 h-4 mx-auto mb-1 text-muted-foreground/40" />
                          <p className="text-xs text-muted-foreground/60">Drop tasks here</p>
                        </div>
                      )}
                      {columnTasks.map((task) => {
                        const pConfig = priorityConfig[task.priority] || priorityConfig.medium
                        const dueInfo = getDueDateInfo(task)
                        const isCompleted = task.status === 'completed'
                        const isThisDragged = kanbanDragTaskId === task.id

                        return (
                          <motion.div
                            key={task.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: isThisDragged ? 0.4 : 1, scale: 1 }}
                            transition={{ duration: 0.15 }}
                          >
                            <Card
                              className={`card-elevated card-hover-lift cursor-grab active:cursor-grabbing transition-all duration-200 overflow-hidden ${
                                isThisDragged ? 'border-dashed border-2 border-emerald-400 dark:border-emerald-600' : ''
                              } ${isCompleted ? 'opacity-60' : ''}`}
                              draggable
                              onDragStart={(e) => handleKanbanDragStart(e, task)}
                              onDragEnd={handleKanbanDragEnd}
                            >
                              <div className={`h-0.5 bg-gradient-to-r ${pConfig.gradient}`} />
                              <CardContent className="p-3">
                                <p className={`font-medium text-sm truncate mb-1.5 ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                                  {task.title}
                                </p>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {task.category && (
                                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">{task.category}</Badge>
                                  )}
                                  <span className="text-[10px]">{pConfig.icon}</span>
                                  {dueInfo && !dueInfo.isCompleted && (
                                    <span className={`text-[10px] flex items-center gap-0.5 ${dueInfo.className}`}>
                                      <Clock className="w-2.5 h-2.5" />
                                      {dueInfo.text}
                                    </span>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
