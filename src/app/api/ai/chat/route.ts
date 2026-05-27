/**
 * Esync IA — Chat API Route
 *
 * Future: This route will call the OpenAI API server-side.
 * Current: Returns a mock response.
 *
 * Environment variables required (see .env.example):
 *   OPENAI_API_KEY      — OpenAI secret key (NEVER expose in client code)
 *   AI_MODEL            — Model ID (default: gpt-5-mini)
 *   NEXT_PUBLIC_AI_ENABLED — Feature flag
 *
 * Security requirements:
 *   ✓ API key stays server-side only
 *   ✓ Rate limiting must be applied before deploying
 *   ✓ User authentication must be validated before processing
 *   ✓ Input sanitization required before sending to OpenAI
 */

import { NextRequest, NextResponse } from 'next/server'
// import OpenAI from 'openai'   ← Future: uncomment after npm install openai

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { message?: string; context?: unknown[] }
    const { message } = body

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Mensagem inválida' }, { status: 400 })
    }

    // ── Future OpenAI integration ──────────────────────────────────────────
    //
    // const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    //
    // const completion = await openai.chat.completions.create({
    //   model:       process.env.AI_MODEL || 'gpt-5-mini',
    //   max_tokens:  2048,
    //   temperature: 0.7,
    //   messages: [
    //     {
    //       role: 'system',
    //       content: SYSTEM_PROMPT_INDUSTRIAL,
    //     },
    //     ...(body.context || []),
    //     { role: 'user', content: message },
    //   ],
    // })
    //
    // const response = completion.choices[0]?.message?.content || ''
    // const tokensUsed = completion.usage?.total_tokens || 0
    // ──────────────────────────────────────────────────────────────────────

    // Mock response (remove after OpenAI integration)
    await new Promise((resolve) => setTimeout(resolve, 600))

    return NextResponse.json({
      response:     'Mock response — OpenAI integration pending. Configure OPENAI_API_KEY in .env.local.',
      analysisType: 'Análise Geral',
      tokensUsed:   0,
      model:        process.env.AI_MODEL || 'gpt-5-mini',
      durationMs:   600,
    })
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor de IA' }, { status: 500 })
  }
}
