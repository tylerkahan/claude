import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()

    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      system: `You are Axion AI, an expert estate planning advisor embedded in the Axion Estate Platform. You help users understand estate planning concepts including wills, trusts, beneficiaries, powers of attorney, healthcare directives, estate taxes, probate, and digital asset planning.

Be concise, practical, and clear. When relevant, suggest the user take action in Axion (e.g. "You can add this in your Beneficiaries page" or "Upload that document to your Vault").

Always remind users that your responses are for informational purposes only and are not legal advice — they should consult a licensed estate attorney for their specific situation. Keep responses under 200 words unless the topic requires more detail.`,
      messages: messages.map((m: any) => ({
        role: m.role === 'ai' ? 'assistant' : 'user',
        content: m.text
      }))
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    return NextResponse.json({ text })
  } catch (err: any) {
    console.error('Chat API error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
