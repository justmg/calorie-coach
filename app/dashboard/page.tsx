'use client'

import { useEffect, useState } from 'react'
import { useUser, useClerk } from '@clerk/nextjs'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CalorieEntry, User } from '@/types/database'
import { format } from 'date-fns'
import { BarChart3, Phone, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const router = useRouter()
  const { user: clerkUser, isLoaded } = useUser()
  const { signOut } = useClerk()
  const [user, setUser] = useState<User | null>(null)
  const [entries, setEntries] = useState<CalorieEntry[]>([])
  const [todayCalories, setTodayCalories] = useState(0)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (isLoaded && clerkUser) {
      checkUser()
      fetchEntries()
      
      // Set up realtime subscription
      const channel = supabase
        .channel('calorie_entries')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'calorie_entries',
          },
          () => {
            fetchEntries()
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [isLoaded, clerkUser])

  const checkUser = async () => {
    if (!clerkUser) return

    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('id', clerkUser.id)
      .single()

    if (!userData) {
      // User hasn't completed onboarding
      router.push('/onboarding')
      return
    }

    setUser(userData)
  }

  const fetchEntries = async () => {
    if (!clerkUser) return

    const { data: entriesData } = await supabase
      .from('calorie_entries')
      .select('*')
      .eq('user_id', clerkUser.id)
      .order('created_at', { ascending: false })
      .limit(30)

    if (entriesData) {
      setEntries(entriesData)
      
      // Calculate today's calories
      const today = format(new Date(), 'yyyy-MM-dd')
      const todayTotal = entriesData
        .filter(entry => entry.date === today)
        .reduce((sum, entry) => sum + entry.total_calories, 0)
      
      setTodayCalories(todayTotal)
    }
    
    setLoading(false)
  }

  const handleLogout = async () => {
    await signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">Calorie Coach Dashboard</h1>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* User Info Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Your Profile</CardTitle>
            <CardDescription>
              Call window: {user?.call_window_start} - {user?.call_window_end} ({user?.timezone})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Phone className="w-5 h-5 text-blue-600" />
              <span>{user?.phone}</span>
            </div>
          </CardContent>
        </Card>

        {/* Today's Summary */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-blue-600" />
              Today's Calories
            </CardTitle>
            <CardDescription>
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-blue-600">{todayCalories}</p>
            <p className="text-muted-foreground">calories consumed</p>
          </CardContent>
        </Card>

        {/* Recent Entries */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Entries</CardTitle>
            <CardDescription>Your calorie log history</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {entries.length === 0 ? (
                <p className="text-muted-foreground">No entries yet. You'll receive your first call during your scheduled window.</p>
              ) : (
                entries.map((entry) => (
                  <div key={entry.id} className="border-b pb-4 last:border-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{format(new Date(entry.date), 'MMMM d, yyyy')}</p>
                        <div className="mt-2 space-y-1">
                          {entry.items.map((item, index) => (
                            <p key={index} className="text-sm text-muted-foreground">
                              {item.quantity}x {item.name} - {item.calories * item.quantity} cal
                            </p>
                          ))}
                        </div>
                      </div>
                      <p className="text-xl font-semibold">{entry.total_calories} cal</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}