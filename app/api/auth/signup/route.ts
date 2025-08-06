import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phone, pin, call_window_start, call_window_end, timezone } = body

    // Validate input
    if (!phone || !pin || pin.length !== 6) {
      return NextResponse.json({ error: 'Invalid phone or PIN' }, { status: 400 })
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      phone,
      phone_confirm: true,
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    // Create user profile
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authData.user.id,
        phone,
        pin,
        call_window_start,
        call_window_end,
        timezone,
      })
      .select()
      .single()

    if (userError) {
      // Rollback auth user creation
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: 'Failed to create user profile' }, { status: 500 })
    }

    // Sign in the user
    const supabase = await createClient()
    const { error: signInError } = await supabase.auth.signInWithOtp({
      phone,
    })

    if (signInError) {
      return NextResponse.json({ error: signInError.message }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true,
      message: 'Account created successfully. Check your phone for the OTP.',
      userId: userData.id 
    })
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}