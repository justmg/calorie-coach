import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'
import { supabaseAdmin } from '@/lib/supabase/admin'

const VoiceResponse = twilio.twiml.VoiceResponse

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const digits = formData.get('Digits') as string
    const from = formData.get('From') as string
    
    const searchParams = request.nextUrl.searchParams
    const callLogId = searchParams.get('call_log_id')

    const response = new VoiceResponse()

    // Verify PIN
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('phone', from)
      .eq('pin', digits)
      .single()

    if (error || !user) {
      response.say('Invalid PIN. Please try again.')
      response.hangup()
    } else {
      // Valid PIN - connect to ElevenLabs
      response.say('PIN verified. Connecting you now.')
      
      const connect = response.connect()
      const stream = connect.stream({
        url: 'wss://api.elevenlabs.io/v1/convai/conversation'
      })
      
      stream.parameter({
        name: 'agent_id',
        value: process.env.ELEVENLABS_AGENT_ID!
      })
      stream.parameter({
        name: 'api_key',
        value: process.env.ELEVENLABS_API_KEY!
      })
      stream.parameter({
        name: 'call_log_id',
        value: callLogId || ''
      })
      stream.parameter({
        name: 'user_id',
        value: user.id
      })
      stream.parameter({
        name: 'webhook_url',
        value: `${process.env.NEXT_PUBLIC_APP_URL}/api/elevenlabs/webhook`
      })
    }

    return new NextResponse(response.toString(), {
      headers: {
        'Content-Type': 'text/xml'
      }
    })
  } catch (error) {
    console.error('PIN verification error:', error)
    const response = new VoiceResponse()
    response.say('Sorry, we encountered an error. Please try again later.')
    response.hangup()
    
    return new NextResponse(response.toString(), {
      headers: {
        'Content-Type': 'text/xml'
      }
    })
  }
}