import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // ElevenLabs sends various event types
    const { event_type, conversation_id, transcript, metadata } = body

    if (event_type === 'conversation.completed') {
      // Extract call_log_id and user_id from metadata
      const { call_log_id, user_id } = metadata || {}

      if (!call_log_id || !user_id) {
        return NextResponse.json({ error: 'Missing metadata' }, { status: 400 })
      }

      // Send transcript to n8n for processing
      const processResponse = await fetch(`${process.env.N8N_WEBHOOK_URL}/process-transcript`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          transcript,
          call_log_id,
          user_id,
          conversation_id
        })
      })

      if (!processResponse.ok) {
        throw new Error('Failed to process transcript')
      }

      return NextResponse.json({ success: true })
    }

    // Handle other event types as needed
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('ElevenLabs webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}