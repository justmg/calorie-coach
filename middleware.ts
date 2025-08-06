import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createClerkClient } from '@clerk/nextjs/server'

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/onboarding',
  '/api/calls(.*)',
  '/api/logs(.*)',
  '/api/meal-entry(.*)',
  '/api/profile(.*)',
])

const isPublicRoute = createRouteMatcher([
  '/',
  '/login(.*)',
  '/signup(.*)',
  '/sso-callback',
])

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY!,
})

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth()

  // Protect routes that require authentication
  if (isProtectedRoute(req)) {
    await auth.protect()
    
    // Skip onboarding check for API routes and the onboarding page itself
    if (req.url.includes('/api/') || req.url.includes('/onboarding')) {
      return NextResponse.next()
    }
    
    // For dashboard routes, check onboarding status
    if (userId && req.url.includes('/dashboard')) {
      try {
        // Fetch fresh user data from Clerk
        const user = await clerkClient.users.getUser(userId)
        const onboardingComplete = user.publicMetadata?.onboardingComplete === true
        
        console.log('Middleware check (fresh):', { 
          userId, 
          onboardingComplete, 
          url: req.url,
          publicMetadata: user.publicMetadata 
        })
        
        if (!onboardingComplete) {
          console.log('Redirecting to onboarding')
          return NextResponse.redirect(new URL('/onboarding', req.url))
        }
      } catch (error) {
        console.error('Error fetching user data:', error)
        // If we can't fetch user data, redirect to onboarding to be safe
        return NextResponse.redirect(new URL('/onboarding', req.url))
      }
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!.*\\..*|_next).*)',
    '/',
    '/(api|trpc)(.*)'
  ],
}