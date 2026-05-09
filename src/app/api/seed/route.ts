import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

function daysAgo(days: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(0, 0, 0, 0)
  return d
}

export async function GET() {
  try {
    // Check if user already exists to avoid expensive bcrypt
    let user = await db.user.findUnique({ where: { email: 'operator@lifeos.com' } })
    
    if (user) {
      // Check if already seeded
      const existingTasks = await db.task.count({ where: { userId: user.id } })
      if (existingTasks > 5) {
        return NextResponse.json({ success: true, message: 'Already seeded', userId: user.id })
      }
    } else {
      // Create user with hashed password
      const hashedPassword = await bcrypt.hash('lifeos2025', 10)
      user = await db.user.create({
        data: {
          email: 'operator@lifeos.com',
          name: 'LifeOS Operator',
          password: hashedPassword,
          timezone: 'Asia/Hebron',
          language: 'en',
          theme: 'system',
        },
      })
    }

    const userId = user.id

    // Clean up
    await db.notification.deleteMany({ where: { userId } })
    await db.habitLog.deleteMany({ where: { userId } })
    await db.habit.deleteMany({ where: { userId } })
    await db.memoryNode.deleteMany({ where: { userId } })
    await db.journal.deleteMany({ where: { userId } })
    await db.contact.deleteMany({ where: { userId } })
    await db.goal.deleteMany({ where: { userId } })
    await db.mood.deleteMany({ where: { userId } })
    await db.expense.deleteMany({ where: { userId } })
    await db.sleep.deleteMany({ where: { userId } })
    await db.task.deleteMany({ where: { userId } })
    await db.settings.deleteMany({ where: { userId } })

    // Create tasks using createMany
    await db.task.createMany({
      data: [
        { userId, title: 'Review quarterly report', description: 'Go through Q4 financial report', status: 'pending', priority: 'high', category: 'work', dueDate: daysAgo(-2) },
        { userId, title: 'Schedule dentist appointment', description: 'Regular checkup overdue', status: 'pending', priority: 'medium', category: 'health', dueDate: daysAgo(-5) },
        { userId, title: 'Update project documentation', description: 'Add new API endpoints to docs', status: 'in_progress', priority: 'medium', category: 'work', dueDate: daysAgo(-1) },
        { userId, title: 'Buy groceries', description: 'Fruits, vegetables, milk', status: 'completed', priority: 'low', category: 'personal', dueDate: daysAgo(1), completedAt: daysAgo(1) },
        { userId, title: 'Prepare presentation slides', description: 'Team meeting next Monday', status: 'pending', priority: 'urgent', category: 'work', dueDate: daysAgo(-3) },
        { userId, title: 'Read "Atomic Habits"', description: 'Finish chapters 5-8', status: 'in_progress', priority: 'low', category: 'education', dueDate: daysAgo(-7) },
        { userId, title: 'Fix login page bug', description: 'Users report 500 errors', status: 'completed', priority: 'urgent', category: 'work', dueDate: daysAgo(3), completedAt: daysAgo(2) },
        { userId, title: 'Plan weekend trip', description: 'Research hotels and activities', status: 'pending', priority: 'low', category: 'personal', dueDate: daysAgo(-4) },
        { userId, title: 'Call insurance company', description: 'Discuss policy renewal', status: 'pending', priority: 'high', category: 'finance', dueDate: daysAgo(-1) },
        { userId, title: 'Submit expense reports', description: 'March trip expenses', status: 'completed', priority: 'medium', category: 'finance', dueDate: daysAgo(5), completedAt: daysAgo(4) },
      ],
    })

    // Create sleep data
    const sleepData = []
    for (let i = 0; i < 14; i++) {
      const quality = Math.min(5, Math.floor(Math.random() * 3) + 2 + (i % 3 === 0 ? 1 : 0))
      const bedHour = 22 + Math.floor(Math.random() * 2)
      const wakeHour = 6 + Math.floor(Math.random() * 2)
      const duration = parseFloat((8 + (Math.random() - 0.5) * 2).toFixed(1))
      sleepData.push({
        userId, date: daysAgo(i),
        bedtime: `${String(bedHour).padStart(2, '0')}:00`,
        wakeTime: `${String(wakeHour).padStart(2, '0')}:00`,
        duration, quality,
        notes: i % 4 === 0 ? 'Felt rested' : null,
      })
    }
    await db.sleep.createMany({ data: sleepData })

    // Create expense data (reduced)
    const expenseCategories = ['food', 'transport', 'entertainment', 'utilities', 'shopping', 'health', 'rent']
    const expenseData = []
    for (let i = 0; i < 14; i++) {
      const cat = expenseCategories[Math.floor(Math.random() * expenseCategories.length)]
      expenseData.push({
        userId, amount: parseFloat((Math.random() * 100 + 5).toFixed(2)),
        category: cat, description: `${cat} expense`, date: daysAgo(i), type: 'expense',
      })
    }
    // Add income
    expenseData.push({ userId, amount: 3500, category: 'salary', description: 'Monthly salary', date: daysAgo(1), type: 'income' })
    expenseData.push({ userId, amount: 2500, category: 'freelance', description: 'Freelance project', date: daysAgo(15), type: 'income' })
    await db.expense.createMany({ data: expenseData })

    // Create habits
    const habitDefs = [
      { userId, name: 'Morning Meditation', description: '10 minutes mindfulness', icon: '🧘', color: '#8b5cf6', frequency: 'daily', target: 1 },
      { userId, name: 'Exercise', description: '30 min workout', icon: '💪', color: '#10b981', frequency: 'daily', target: 1 },
      { userId, name: 'Reading', description: 'Read for 30 minutes', icon: '📚', color: '#f59e0b', frequency: 'daily', target: 1 },
      { userId, name: 'Journaling', description: 'Write daily reflection', icon: '📝', color: '#ec4899', frequency: 'daily', target: 1 },
      { userId, name: 'Weekly Review', description: 'Plan the upcoming week', icon: '📋', color: '#6366f1', frequency: 'weekly', target: 1 },
    ]
    for (const h of habitDefs) {
      const habit = await db.habit.create({ data: h })
      const logData = []
      for (let i = 0; i < 7; i++) {
        logData.push({ habitId: habit.id, userId, date: daysAgo(i), value: Math.random() > 0.3 ? 1 : 0, notes: null })
      }
      await db.habitLog.createMany({ data: logData })
    }

    // Create mood data
    const moodLabels = ['happy', 'calm', 'energetic', 'tired', 'anxious', 'sad']
    const moodData = []
    for (let i = 0; i < 14; i++) {
      moodData.push({
        userId, value: Math.min(10, Math.floor(Math.random() * 5) + 4),
        label: moodLabels[Math.floor(Math.random() * moodLabels.length)],
        notes: null, date: daysAgo(i),
      })
    }
    await db.mood.createMany({ data: moodData })

    // Create goals
    await db.goal.createMany({
      data: [
        { userId, title: 'Run a half marathon', description: 'Train for 21km race', category: 'health', progress: 35, targetDate: daysAgo(-60), status: 'active' },
        { userId, title: 'Save $10,000', description: 'Build emergency fund', category: 'finance', progress: 62, targetDate: daysAgo(-90), status: 'active' },
        { userId, title: 'Learn TypeScript', description: 'Complete advanced course', category: 'education', progress: 80, targetDate: daysAgo(-30), status: 'active' },
        { userId, title: 'Read 24 books', description: 'Two books per month', category: 'personal', progress: 45, targetDate: daysAgo(-270), status: 'active' },
        { userId, title: 'Launch side project', description: 'Build and ship MVP', category: 'career', progress: 20, targetDate: daysAgo(-45), status: 'active' },
      ],
    })

    // Create contacts
    await db.contact.createMany({
      data: [
        { userId, name: 'Sarah Chen', email: 'sarah@example.com', phone: '+1-555-0101', company: 'TechCorp', role: 'Product Manager', tags: 'work,friend', notes: 'Met at conference', lastContact: daysAgo(5) },
        { userId, name: 'James Wilson', email: 'james@example.com', phone: '+1-555-0102', company: 'DesignHub', role: 'UX Designer', tags: 'work', notes: 'Collaborating on project', lastContact: daysAgo(10) },
        { userId, name: 'Maria Garcia', email: 'maria@example.com', phone: '+1-555-0103', company: 'FinanceFirst', role: 'Financial Advisor', tags: 'finance', notes: 'Handles investments', lastContact: daysAgo(3) },
        { userId, name: 'Dr. Ahmed Khan', email: 'ahmed@example.com', phone: '+1-555-0104', company: 'City Medical', role: 'General Physician', tags: 'health', notes: 'Annual checkup', lastContact: daysAgo(15) },
        { userId, name: 'Lisa Park', email: 'lisa@example.com', phone: '+1-555-0105', company: 'FitLife', role: 'Personal Trainer', tags: 'health,friend', notes: 'Tue/Thu sessions', lastContact: daysAgo(2) },
        { userId, name: 'David Kim', email: 'david@example.com', phone: '+1-555-0108', company: 'CloudNine', role: 'CTO', tags: 'work,mentor', notes: 'Career mentor', lastContact: daysAgo(7) },
      ],
    })

    // Create journals
    await db.journal.createMany({
      data: [
        { userId, title: 'A productive morning', content: 'Started with meditation and workout. Felt energized and focused. Completed the project proposal ahead of schedule.', mood: 'happy', tags: 'productivity,health', date: daysAgo(1) },
        { userId, title: 'Reflections on teamwork', content: 'Great brainstorming session with the team. Everyone contributed creative ideas.', mood: 'energetic', tags: 'work,team', date: daysAgo(2) },
        { userId, title: 'Challenging day', content: 'Meetings back-to-back. Feeling drained. Need better boundaries.', mood: 'tired', tags: 'work,stress', date: daysAgo(3) },
        { userId, title: 'Weekend hike', content: 'Explored the mountain trail. Weather was perfect. Need to do this more often.', mood: 'happy', tags: 'nature,exercise', date: daysAgo(5) },
        { userId, title: 'Learning new skills', content: 'Spent evening learning Rust. The ownership model is fascinating.', mood: 'calm', tags: 'education,programming', date: daysAgo(7) },
      ],
    })

    // Create memory nodes
    await db.memoryNode.createMany({
      data: [
        { userId, type: 'preference', key: 'coffee_preference', value: 'Prefers oat milk latte, no sugar', source: 'chat' },
        { userId, type: 'preference', key: 'work_hours', value: 'Most productive between 9-12am', source: 'inference' },
        { userId, type: 'person', key: 'sarah_chen', value: 'Product Manager at TechCorp', source: 'manual' },
        { userId, type: 'person', key: 'david_kim', value: 'CTO at CloudNine, career mentor', source: 'manual' },
        { userId, type: 'event', key: 'team_offsite_2025', value: 'Annual team offsite in March', source: 'manual' },
        { userId, type: 'place', key: 'mountain_trail', value: 'Favorite hiking spot near the lake', source: 'chat' },
        { userId, type: 'skill', key: 'typescript', value: 'Advanced level', source: 'inference' },
        { userId, type: 'fact', key: 'birthday', value: 'March 15', source: 'manual' },
        { userId, type: 'fact', key: 'allergies', value: 'Shellfish allergy', source: 'manual' },
        { userId, type: 'preference', key: 'exercise_time', value: 'Prefers morning workouts at 7am', source: 'inference' },
      ],
    })

    // Create notifications
    await db.notification.createMany({
      data: [
        { userId, type: 'alert', title: 'Overdue Task', message: 'Your task "Review quarterly report" is overdue by 2 days', read: false },
        { userId, type: 'reminder', title: 'Habit Reminder', message: "Don't forget your morning meditation today", read: false },
        { userId, type: 'insight', title: 'Sleep Pattern', message: 'Your sleep quality has improved 15% this week', read: true },
        { userId, type: 'alert', title: 'Budget Warning', message: "You've spent 80% of your entertainment budget", read: false },
        { userId, type: 'system', title: 'Weekly Report Ready', message: 'Your weekly life report is ready to view', read: true },
      ],
    })

    // Create settings
    await db.settings.createMany({
      data: [
        { userId, key: 'monthly_budget', value: '5000' },
        { userId, key: 'daily_briefing_time', value: '08:00' },
        { userId, key: 'notifications_enabled', value: 'true' },
        { userId, key: 'sleep_reminder', value: '22:00' },
        { userId, key: 'exercise_reminder', value: '07:00' },
        { userId, key: 'theme', value: 'system' },
        { userId, key: 'language', value: 'en' },
      ],
    })

    return NextResponse.json({ success: true, message: 'Database seeded', userId })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
