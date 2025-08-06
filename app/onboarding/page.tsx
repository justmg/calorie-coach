'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  calculateTDEEComplete, 
  getActivityLevelDescription, 
  getRecommendedWeeklyGoal,
  validateTDEEInput,
  type Gender,
  type ActivityLevel,
  type GoalType
} from '@/lib/tdee-calculator'

export default function OnboardingPage() {
  const router = useRouter()
  const { user } = useUser()
  const [step, setStep] = useState(1) // Multi-step form
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  
  // Step 1: Basic Info
  const [pin, setPin] = useState('')
  const [callWindowStart, setCallWindowStart] = useState('09:00')
  const [callWindowEnd, setCallWindowEnd] = useState('10:00')
  const [timezone, setTimezone] = useState('America/New_York')
  
  // Step 2: Physical Stats
  const [age, setAge] = useState('')
  const [gender, setGender] = useState<Gender>('male')
  const [heightCm, setHeightCm] = useState('')
  const [weightKg, setWeightKg] = useState('')
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate')
  
  // Step 3: Goals
  const [goalType, setGoalType] = useState<GoalType>('maintain')
  const [weeklyGoalKg, setWeeklyGoalKg] = useState('')
  const [tdeeResult, setTdeeResult] = useState<any>(null)

  const calculateTDEE = () => {
    const input = {
      age: parseInt(age),
      gender,
      heightCm: parseFloat(heightCm),
      weightKg: parseFloat(weightKg),
      activityLevel,
      goalType,
      weeklyGoalKg: weeklyGoalKg ? parseFloat(weeklyGoalKg) : getRecommendedWeeklyGoal(goalType)
    }
    
    const validationErrors = validateTDEEInput(input)
    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      return false
    }
    
    const result = calculateTDEEComplete(input)
    setTdeeResult(result)
    setErrors([])
    return true
  }
  
  const handleNextStep = () => {
    if (step === 1) {
      if (!pin || pin.length !== 6) {
        setErrors(['PIN must be 6 digits'])
        return
      }
      setErrors([])
      setStep(2)
    } else if (step === 2) {
      if (calculateTDEE()) {
        setStep(3)
      }
    }
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (step < 3) {
      handleNextStep()
      return
    }
    
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
          age: parseInt(age),
          gender,
          height_cm: parseFloat(heightCm),
          weight_kg: parseFloat(weightKg),
          activity_level: activityLevel,
          goal_type: goalType,
          weekly_goal_kg: weeklyGoalKg ? parseFloat(weeklyGoalKg) : getRecommendedWeeklyGoal(goalType),
          bmr: tdeeResult?.bmr,
          tdee: tdeeResult?.tdee,
          target_calories: tdeeResult?.targetCalories
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
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
          <CardDescription>
            Step {step} of 3 - {step === 1 ? 'Call Preferences' : step === 2 ? 'Physical Stats' : 'Goals & Targets'}
          </CardDescription>
          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {errors.map((error, i) => (
                  <p key={i} className="text-sm">{error}</p>
                ))}
              </div>
            )}
            
            {/* Step 1: Call Preferences */}
            {step === 1 && (
              <>
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
              </>
            )}
            
            {/* Step 2: Physical Stats */}
            {step === 2 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="age">Age</Label>
                    <Input
                      id="age"
                      type="number"
                      placeholder="25"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="gender">Gender</Label>
                    <select
                      id="gender"
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors"
                      value={gender}
                      onChange={(e) => setGender(e.target.value as Gender)}
                      required
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="height">Height (cm)</Label>
                    <Input
                      id="height"
                      type="number"
                      placeholder="175"
                      value={heightCm}
                      onChange={(e) => setHeightCm(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="weight">Weight (kg)</Label>
                    <Input
                      id="weight"
                      type="number"
                      step="0.1"
                      placeholder="70"
                      value={weightKg}
                      onChange={(e) => setWeightKg(e.target.value)}
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="activity">Activity Level</Label>
                  <select
                    id="activity"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors"
                    value={activityLevel}
                    onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)}
                    required
                  >
                    <option value="sedentary">Sedentary (little to no exercise)</option>
                    <option value="light">Light (exercise 1-3 days/week)</option>
                    <option value="moderate">Moderate (exercise 3-5 days/week)</option>
                    <option value="active">Active (exercise 6-7 days/week)</option>
                    <option value="very_active">Very Active (2x per day, physical job)</option>
                  </select>
                  <p className="text-sm text-muted-foreground mt-1">
                    {getActivityLevelDescription(activityLevel)}
                  </p>
                </div>
              </>
            )}
            
            {/* Step 3: Goals */}
            {step === 3 && (
              <>
                <div>
                  <Label htmlFor="goal">Goal</Label>
                  <select
                    id="goal"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors"
                    value={goalType}
                    onChange={(e) => {
                      setGoalType(e.target.value as GoalType)
                      setWeeklyGoalKg(getRecommendedWeeklyGoal(e.target.value as GoalType).toString())
                    }}
                    required
                  >
                    <option value="maintain">Maintain Weight</option>
                    <option value="lose">Lose Weight</option>
                    <option value="gain">Gain Weight</option>
                  </select>
                </div>
                
                {goalType !== 'maintain' && (
                  <div>
                    <Label htmlFor="weekly-goal">Weekly Goal (kg)</Label>
                    <Input
                      id="weekly-goal"
                      type="number"
                      step="0.1"
                      placeholder={getRecommendedWeeklyGoal(goalType).toString()}
                      value={weeklyGoalKg}
                      onChange={(e) => setWeeklyGoalKg(e.target.value)}
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Recommended: {getRecommendedWeeklyGoal(goalType)} kg per week
                    </p>
                  </div>
                )}
                
                {tdeeResult && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                    <h3 className="font-semibold text-blue-900">Your Daily Targets</h3>
                    <div className="space-y-1 text-sm">
                      <p><span className="font-medium">BMR:</span> {tdeeResult.bmr} kcal/day</p>
                      <p><span className="font-medium">TDEE:</span> {tdeeResult.tdee} kcal/day</p>
                      <p className="text-lg font-semibold text-blue-900">
                        Target: {tdeeResult.targetCalories} kcal/day
                      </p>
                      <div className="pt-2 border-t border-blue-200">
                        <p className="font-medium mb-1">Recommended Macros:</p>
                        <p>Protein: {tdeeResult.proteinGrams}g</p>
                        <p>Carbs: {tdeeResult.carbGrams}g</p>
                        <p>Fat: {tdeeResult.fatGrams}g</p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            
            <div className="flex gap-3">
              {step > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(step - 1)}
                  className="flex-1"
                >
                  Back
                </Button>
              )}
              <Button 
                type="submit" 
                className="flex-1" 
                disabled={loading}
                onClick={step < 3 ? handleNextStep : undefined}
              >
                {loading ? 'Saving...' : step < 3 ? 'Next' : 'Complete Setup'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}