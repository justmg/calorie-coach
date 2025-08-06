import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'
import { supabaseAdmin } from '@/lib/supabase/admin'

const VoiceResponse = twilio.twiml.VoiceResponse

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const from = formData.get('From') as string
    const callSid = formData.get('CallSid') as string
    
    const searchParams = request.nextUrl.searchParams
    const callLogId = searchParams.get('call_log_id')
    const userId = searchParams.get('user_id')

    const response = new VoiceResponse()

    // Verify caller by phone number
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('phone', from)
      .single()

    if (error || !user) {
      // Unknown caller - request PIN
      const gather = response.gather({
        action: `/api/twilio/verify-pin?call_log_id=${callLogId}`,
        method: 'POST',
        numDigits: 6,
        timeout: 10
      })
      gather.say('Welcome to Calorie Coach. Please enter your 6-digit PIN.')
      
      response.say('We didn\'t receive your PIN. Please try again.')
      response.hangup()
    } else {
      // Known caller - connect to ElevenLabs
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
    console.error('Twilio voice error:', error)
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