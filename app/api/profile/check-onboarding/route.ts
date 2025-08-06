import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClerkClient } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
})

export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check Clerk metadata
    const user = await clerkClient.users.getUser(userId)
    const onboardingComplete = user.publicMetadata?.onboardingComplete === true
    
    // Also check if user exists in database as a fallback
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', userId)
      .single()
    
    const hasProfile = !!userData
    
    return NextResponse.json({ 
      onboardingComplete,
      hasProfile,
      shouldRedirect: onboardingComplete || hasProfile
    })
  } catch (error) {
    console.error('Check onboarding error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}