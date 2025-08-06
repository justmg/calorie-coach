import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClerkClient } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
})

export async function POST(request: NextRequest) {
  try {
    console.log('Onboarding API called')
    const { userId } = await auth()
    
    if (!userId) {
      console.log('No userId found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    console.log('Processing onboarding for user:', userId)

    const body = await request.json()
    const { 
      pin, 
      call_window_start, 
      call_window_end, 
      timezone,
      age,
      gender,
      height_cm,
      weight_kg,
      activity_level,
      goal_type,
      weekly_goal_kg,
      bmr,
      tdee,
      target_calories
    } = body

    // Validate input
    if (!pin || pin.length !== 6) {
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 400 })
    }
    
    // Validate TDEE data
    if (!age || !gender || !height_cm || !weight_kg || !activity_level || !goal_type) {
      return NextResponse.json({ error: 'Missing required TDEE data' }, { status: 400 })
    }

    // Get user's phone number from Clerk
    console.log('Fetching user from Clerk...')
    const user = await clerkClient.users.getUser(userId)
    console.log('User from Clerk:', { 
      id: user.id, 
      phoneNumbers: user.phoneNumbers?.length || 0,
      hasPhone: user.phoneNumbers?.[0]?.phoneNumber ? true : false 
    })
    
    let phone = user.phoneNumbers[0]?.phoneNumber
    
    // If no phone number in Clerk, use a placeholder or email-based fallback
    if (!phone) {
      console.log('No phone number found, using email as fallback')
      phone = user.emailAddresses[0]?.emailAddress?.replace('@', '_at_') || `user_${userId.slice(-8)}`
    }
    
    console.log('Using phone/identifier:', phone)

    // Create or update user profile in Supabase
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: userId, // Use Clerk user ID
        clerk_user_id: userId,
        phone,
        pin,
        call_window_start,
        call_window_end,
        timezone,
        age,
        gender,
        height_cm,
        weight_kg,
        activity_level,
        goal_type,
        weekly_goal_kg: weekly_goal_kg || 0,
        bmr,
        tdee,
        target_calories
      })
      .select()
      .single()

    if (userError) {
      console.error('Supabase error:', userError)
      return NextResponse.json({ error: 'Failed to create user profile' }, { status: 500 })
    }

    console.log('User created in Supabase:', userData.id)

    // Update Clerk user metadata to mark onboarding as complete
    console.log('Updating Clerk metadata...')
    const updatedUser = await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: {
        onboardingComplete: true,
      },
    })

    console.log('Onboarding completed successfully for user:', userId)
    console.log('Updated metadata:', updatedUser.publicMetadata)
    
    return NextResponse.json({ 
      success: true,
      message: 'Onboarding completed successfully',
      userId: userData.id,
      publicMetadata: updatedUser.publicMetadata
    })
  } catch (error) {
    console.error('Onboarding error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}