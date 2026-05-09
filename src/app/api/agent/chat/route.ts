import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { buildInsightsPrompt } from '@/lib/user-model-engine'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, message, history } = body

    if (!userId || !message) {
      return NextResponse.json(
        { error: 'userId and message are required' },
        { status: 400 }
      )
    }

    const apiKey = process.env.NVIDIA_NIM_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'NVIDIA NIM API key not configured' },
        { status: 500 }
      )
    }

    // Load user personality insights from the user model engine
    const userInsights = buildInsightsPrompt(userId)

    // Build system prompt with LifeOS context + user personality insights
    const systemPrompt = `You are LifeOS Assistant, a helpful AI companion integrated into a personal life management system called LifeOS. 

LifeOS helps users manage their tasks, health (sleep & mood), finances, habits, goals, contacts, journal, and memory.

Your role is to:
- Help users reflect on their life patterns and provide insights
- Suggest improvements based on their data
- Answer questions about their tasks, habits, mood, and other life areas
- Be supportive, practical, and data-driven in your responses
- Keep responses concise and actionable

When referencing user data, be specific and helpful. Always encourage positive habits and balanced living.

${userInsights ? `
---

${userInsights}

---
` : ''}
IMPORTANT: When the user mentions feeling tired, stressed, anxious, or overwhelmed, ALWAYS check if their behavioral data supports this (e.g., low sleep, high anxiety days) and proactively suggest adjustments. You know this user's patterns — use that knowledge naturally in conversation.`

    // Build message history
    const messages: { role: string; content: string }[] = [
      { role: 'system', content: systemPrompt },
    ]

    // Add history if provided
    if (Array.isArray(history)) {
      for (const msg of history) {
        if (msg.role && msg.content) {
          messages.push({ role: msg.role, content: msg.content })
        }
      }
    }

    // Add current message
    messages.push({ role: 'user', content: message })

    // Call NVIDIA NIM API
    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'meta/llama-3.1-8b-instruct',
        messages,
        temperature: 0.7,
        max_tokens: 1024,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('NVIDIA NIM API error:', response.status, errorText)

      // Save user message even if API fails
      await db.chatMessage.create({
        data: { userId, role: 'user', content: message },
      })

      return NextResponse.json(
        { error: 'AI service unavailable', details: errorText },
        { status: 502 }
      )
    }

    const data = await response.json()
    const assistantMessage = data.choices?.[0]?.message?.content || 'I apologize, I was unable to generate a response.'

    // Save both messages to chat history
    await db.chatMessage.create({
      data: { userId, role: 'user', content: message },
    })
    await db.chatMessage.create({
      data: { userId, role: 'assistant', content: assistantMessage },
    })

    return NextResponse.json({
      message: assistantMessage,
      usage: data.usage || null,
    })
  } catch (error) {
    console.error('Agent chat POST error:', error)
    return NextResponse.json({ error: 'Failed to process chat message' }, { status: 500 })
  }
}
