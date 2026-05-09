import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { buildInsightsPrompt } from '@/lib/user-model-engine'
import { searchMemory, buildMemoryContext } from '@/lib/semantic-memory'

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

    // Perform contextual memory search — this uses user-profile.json
    // correlations to boost relevant memories automatically
    let memoryContext = ''
    try {
      const searchResponse = await searchMemory(userId, message)
      memoryContext = buildMemoryContext(searchResponse)
    } catch (e) {
      console.warn('Semantic memory search failed, continuing without it:', e)
    }

    // Build system prompt with LifeOS context + user personality insights
    // + COMPASSIONATE ACTION PROTOCOL
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
COMPASSIONATE ACTION PROTOCOL:

You are not just a data analyst. You are a compassionate companion who understands this user deeply through their behavioral patterns.

RULES:
1. If you detect that the user is asking about a problem (fatigue, anxiety, stress, pressure, feeling down) AND you have historical data that explains why, **do NOT just tell them the cause directly in a clinical way.** Instead, retrieve a specific memory from the semantic fabric and present it to them with warmth and empathy.

2. Always frame your observations as caring curiosity, not diagnosis. Say things like "I notice..." or "It seems like..." rather than "Your data shows that..."

3. When suggesting a solution, ground it in a real past experience. Reference a specific date or event when a similar situation occurred and what helped. This makes your advice feel personal, not generic.

4. If the user's profile reveals they are sleep-sensitive (sleep patterns strongly affect their mood/productivity), and they mention fatigue — gently guide them toward rest strategies rather than productivity hacks.

5. If the user's profile reveals anxiety patterns, be extra gentle. Avoid overwhelming them with multiple suggestions. Offer ONE clear, actionable step first, then ask if they want more.

6. EXAMPLE of desired behavior:
   - User: "I'm so exhausted today and I don't know why."
   - You: "I notice you're feeling really drained today. When this happened before — like on October 15th — I saw that you'd had a rough night with only 5 hours of sleep, and canceling your afternoon meetings helped you recover. Would you like to look at your schedule today and see if we can carve out some rest time?"

7. If you have relevant memories from the semantic fabric (provided below), USE them. They contain real events and patterns from this user's life. Weave them naturally into your response.

${memoryContext ? `
---

${memoryContext}

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
