import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(request: NextRequest) {
  console.log('API KEY starts with:', process.env.ANTHROPIC_API_KEY?.substring(0, 20))

  try {
    const { title, ingredients, cuisine } = await request.json()

    if (!title) {
      return NextResponse.json({ steps: [] }, { status: 400 })
    }

    const ingredientList = Array.isArray(ingredients)
      ? ingredients.slice(0, 15).join(', ')
      : 'various ingredients'

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Generate 6-8 simple cooking steps for making "${title}".
Cuisine: ${cuisine || 'International'}
Main ingredients: ${ingredientList}

Rules:
- Each step must be 1-2 sentences, clear and actionable
- Include timing where relevant (e.g. "cook for 5 minutes")
- Cover: prep → cooking → seasoning → serving
- Do NOT include "Step 1:" labels in your text
- Return ONLY a valid JSON array of strings, nothing else
- No markdown, no explanation, just the JSON array

Example format: ["Prepare all ingredients by washing and chopping.", "Heat oil in a large pan over medium-high heat."]`,
        },
      ],
    })

    const responseText =
      message.content[0].type === 'text' ? message.content[0].text.trim() : '[]'

    const steps = JSON.parse(responseText)

    return NextResponse.json({ steps: Array.isArray(steps) ? steps : [] })
  } catch (error) {
    console.error('Generate steps error:', error)
    return NextResponse.json({ steps: [] }, { status: 500 })
  }
}
