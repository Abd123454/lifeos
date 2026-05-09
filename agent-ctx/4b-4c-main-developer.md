# Task 4b-4c: Upgrade Tasks Panel (drag-and-drop) and Health Panel (comparison charts)

## Work Log

### Part 1: Tasks Panel - Drag-and-Drop Reordering
- Read existing tasks-panel.tsx (completion ring, priority config, status config, due date countdown, category badges)
- Added HTML5 drag-and-drop implementation using onDragStart, onDragOver, onDrop, onDragEnd events
- Added GripVertical icon from lucide-react as drag handle on the left side of each task card
- Drag handle shows cursor-grab (active:cursor-grabbing when dragging)
- Dragging card: reduced opacity (opacity-40) and dashed border (border-dashed border-2 border-emerald-400)
- Drop target: animated insertion line above the target card (h-1 bg-gradient emerald→teal with animate-pulse)
- After dropping, tasks are reordered in local state by splicing the filtered array and syncing back to the main tasks state
- Added "Sort by" dropdown with ArrowUpDown icon: Priority, Due Date, Status, Custom (default)
- Drag-and-drop only works in "Custom" sort mode; handle is visually dimmed (opacity-30, cursor-default) in other modes
- Sort modes: Priority (urgent→low), Due Date (earliest first, no date last), Status (pending→cancelled)
- Added "Drag tasks to reorder" helper text visible in custom sort mode
- All existing functionality preserved
- Changed "In Progress" stat card from blue to cyan to avoid blue primary colors

### Part 2: Health Panel - Comparison Charts & Time Range Toggle
- Added time range selector at the top: "7D", "14D", "30D" buttons (defaults to 7D)
- Time range passed to API call with days parameter
- Data reloads when time range changes
- Added sleep comparison section: "This Week vs Last Week" with side-by-side cards
- Percentage change indicator with ArrowUpRight/ArrowDownRight icons (emerald for improvement, rose for decline)
- Added dual-axis ComposedChart: bars for duration (left Y) and line for quality (right Y)
- Added "Sleep Insights" card: Best Sleep Day, Average Schedule, Recommendation
- Changed duration chart from BarChart to AreaChart for consistency
- All existing functionality preserved

## Files Modified
- src/components/dashboard/tasks-panel.tsx
- src/components/dashboard/health-panel.tsx

## Status
- ✅ Lint passes
- ✅ Dev server running without errors
