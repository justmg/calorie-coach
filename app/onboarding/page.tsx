'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function OnboardingPage() {
  const router = useRouter()
  const { user } = useUser()
  const [pin, setPin] = useState('')
  const [callWindowStart, setCallWindowStart] = useState('09:00')
  const [callWindowEnd, setCallWindowEnd] = useState('10:00')
  const [timezone, setTimezone] = useState('America/New_York')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    console.log('Submitting onboarding form...', {
      pin: pin.length,
      call_window_start: callWindowStart,
      call_window_end: callWindowEnd,
      timezone,
    })

    try {
      const response = await fetch('/api/profile/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pin,
          call_window_start: callWindowStart,
          call_window_end: callWindowEnd,
          timezone,
        }),
      })

      console.log('Response status:', response.status)
      console.log('Response ok:', response.ok)

      if (response.ok) {
        const data = await response.json()
        console.log('Onboarding successful:', data)
        console.log('Reloading user session...')
        
        // Force reload the user to get updated metadata
        if (user) {
          await user.reload()
          console.log('User reloaded, metadata:', user.publicMetadata)
        }
        
        // Wait for metadata to propagate
        let retries = 0
        const checkOnboarding = async () => {
          try {
            const checkResponse = await fetch('/api/profile/check-onboarding')
            const checkData = await checkResponse.json()
            console.log('Onboarding check:', checkData)
            
            if (checkData.shouldRedirect || retries >= 3) {
              console.log('Redirecting to dashboard...')
              // Use window.location.href for a full page reload
              window.location.href = '/dashboard'
            } else {
              retries++
              setTimeout(checkOnboarding, 1000)
            }
          } catch (err) {
            console.error('Check failed, redirecting anyway:', err)
            window.location.href = '/dashboard'
          }
        }
        
        // Start checking after a small delay
        setTimeout(checkOnboarding, 500)
      } else {
        const data = await response.json()
        console.error('Onboarding error:', data)
        alert(data.error || 'Failed to complete onboarding')
      }
    } catch (error) {
      console.error('Onboarding request error:', error)
      alert('Failed to complete onboarding')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
          <CardDescription>
            Set up your call preferences for Calorie Coach
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="pin">6-Digit PIN</Label>
              <Input
                id="pin"
                type="password"
                placeholder="000000"
                maxLength={6}
                pattern="[0-9]{6}"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                required
              />
              <p className="text-sm text-muted-foreground mt-1">
                You'll use this PIN to authenticate during calls
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="call-window-start">Call Window Start</Label>
                <Input
                  id="call-window-start"
                  type="time"
                  value={callWindowStart}
                  onChange={(e) => setCallWindowStart(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="call-window-end">Call Window End</Label>
                <Input
                  id="call-window-end"
                  type="time"
                  value={callWindowEnd}
                  onChange={(e) => setCallWindowEnd(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="timezone">Timezone</Label>
              <select
                id="timezone"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                required
              >
                <option value="America/New_York">Eastern Time</option>
                <option value="America/Chicago">Central Time</option>
                <option value="America/Denver">Mountain Time</option>
                <option value="America/Los_Angeles">Pacific Time</option>
              </select>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Saving...' : 'Complete Setup'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}