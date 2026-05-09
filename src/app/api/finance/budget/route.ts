import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const month = searchParams.get('month') // format: YYYY-MM

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    // Determine date range
    let startDate: Date
    let endDate: Date

    if (month) {
      const [year, m] = month.split('-').map(Number)
      startDate = new Date(year, m - 1, 1)
      endDate = new Date(year, m, 0, 23, 59, 59, 999)
    } else {
      // Current month
      const now = new Date()
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    }

    const expenses = await db.expense.findMany({
      where: {
        userId,
        date: { gte: startDate, lte: endDate },
      },
    })

    // Get monthly budget from settings
    const budgetSetting = await db.settings.findUnique({
      where: { userId_key: { userId, key: 'monthly_budget' } },
    })
    const monthlyBudget = budgetSetting ? parseFloat(budgetSetting.value) : 5000

    // Calculate totals
    const totalIncome = expenses
      .filter(e => e.type === 'income')
      .reduce((sum, e) => sum + e.amount, 0)

    const totalExpenses = expenses
      .filter(e => e.type === 'expense')
      .reduce((sum, e) => sum + e.amount, 0)

    // Expenses by category
    const expensesByCategory: Record<string, number> = {}
    expenses.filter(e => e.type === 'expense').forEach(e => {
      expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + e.amount
    })

    const remaining = monthlyBudget - totalExpenses
    const percentUsed = monthlyBudget > 0 ? (totalExpenses / monthlyBudget) * 100 : 0

    return NextResponse.json({
      month: month || `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`,
      monthlyBudget,
      totalIncome: parseFloat(totalIncome.toFixed(2)),
      totalExpenses: parseFloat(totalExpenses.toFixed(2)),
      remaining: parseFloat(remaining.toFixed(2)),
      percentUsed: parseFloat(percentUsed.toFixed(1)),
      expensesByCategory: Object.fromEntries(
        Object.entries(expensesByCategory).map(([k, v]) => [k, parseFloat(v.toFixed(2))])
      ),
    })
  } catch (error) {
    console.error('Budget GET error:', error)
    return NextResponse.json({ error: 'Failed to compute budget summary' }, { status: 500 })
  }
}
