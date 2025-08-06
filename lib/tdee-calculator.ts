export type Gender = 'male' | 'female' | 'other'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
export type GoalType = 'maintain' | 'lose' | 'gain'

export interface TDEEInput {
  age: number
  gender: Gender
  heightCm: number
  weightKg: number
  activityLevel: ActivityLevel
  goalType: GoalType
  weeklyGoalKg?: number
}

export interface TDEEResult {
  bmr: number
  tdee: number
  targetCalories: number
  proteinGrams: number
  carbGrams: number
  fatGrams: number
}

/**
 * Calculate Basal Metabolic Rate using Mifflin-St Jeor Equation
 */
export function calculateBMR(
  weightKg: number,
  heightCm: number,
  age: number,
  gender: Gender
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  
  switch (gender) {
    case 'male':
      return base + 5
    case 'female':
      return base - 161
    case 'other':
      return base - 78 // Average of male and female
    default:
      return base - 78
  }
}

/**
 * Calculate Total Daily Energy Expenditure based on activity level
 */
export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  const activityMultipliers: Record<ActivityLevel, number> = {
    sedentary: 1.2,      // Little to no exercise
    light: 1.375,        // Light exercise 1-3 days/week
    moderate: 1.55,      // Moderate exercise 3-5 days/week
    active: 1.725,       // Heavy exercise 6-7 days/week
    very_active: 1.9     // Very heavy exercise, physical job
  }
  
  return bmr * activityMultipliers[activityLevel]
}

/**
 * Calculate target calories based on goal
 */
export function calculateTargetCalories(
  tdee: number,
  goalType: GoalType,
  weeklyGoalKg: number = 0
): number {
  // 7700 kcal = 1kg of body weight
  const dailyAdjustment = (weeklyGoalKg * 7700) / 7
  
  switch (goalType) {
    case 'lose':
      // Ensure minimum 1200 kcal for safety
      return Math.max(1200, Math.round(tdee - dailyAdjustment))
    case 'gain':
      return Math.round(tdee + dailyAdjustment)
    case 'maintain':
    default:
      return Math.round(tdee)
  }
}

/**
 * Calculate recommended macronutrient distribution
 */
export function calculateMacros(targetCalories: number, goalType: GoalType) {
  let proteinPercentage: number
  let carbPercentage: number
  let fatPercentage: number
  
  switch (goalType) {
    case 'lose':
      // Higher protein for muscle preservation during deficit
      proteinPercentage = 0.30
      carbPercentage = 0.35
      fatPercentage = 0.35
      break
    case 'gain':
      // Balanced for muscle building
      proteinPercentage = 0.25
      carbPercentage = 0.45
      fatPercentage = 0.30
      break
    case 'maintain':
    default:
      // Balanced maintenance
      proteinPercentage = 0.25
      carbPercentage = 0.40
      fatPercentage = 0.35
      break
  }
  
  // Calculate grams (4 cal/g for protein and carbs, 9 cal/g for fat)
  const proteinCalories = targetCalories * proteinPercentage
  const carbCalories = targetCalories * carbPercentage
  const fatCalories = targetCalories * fatPercentage
  
  return {
    proteinGrams: Math.round(proteinCalories / 4),
    carbGrams: Math.round(carbCalories / 4),
    fatGrams: Math.round(fatCalories / 9)
  }
}

/**
 * Main TDEE calculation function
 */
export function calculateTDEEComplete(input: TDEEInput): TDEEResult {
  const bmr = calculateBMR(input.weightKg, input.heightCm, input.age, input.gender)
  const tdee = calculateTDEE(bmr, input.activityLevel)
  const targetCalories = calculateTargetCalories(tdee, input.goalType, input.weeklyGoalKg)
  const macros = calculateMacros(targetCalories, input.goalType)
  
  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    targetCalories,
    ...macros
  }
}

/**
 * Get activity level description
 */
export function getActivityLevelDescription(level: ActivityLevel): string {
  const descriptions: Record<ActivityLevel, string> = {
    sedentary: 'Little to no exercise, desk job',
    light: 'Light exercise 1-3 days per week',
    moderate: 'Moderate exercise 3-5 days per week',
    active: 'Heavy exercise 6-7 days per week',
    very_active: 'Very heavy exercise, physical job, training 2x per day'
  }
  
  return descriptions[level]
}

/**
 * Get recommended weekly weight change based on goal
 */
export function getRecommendedWeeklyGoal(goalType: GoalType): number {
  switch (goalType) {
    case 'lose':
      return 0.5 // 0.5 kg per week (safe weight loss)
    case 'gain':
      return 0.25 // 0.25 kg per week (lean muscle gain)
    case 'maintain':
    default:
      return 0
  }
}

/**
 * Validate TDEE input
 */
export function validateTDEEInput(input: Partial<TDEEInput>): string[] {
  const errors: string[] = []
  
  if (!input.age || input.age < 15 || input.age > 100) {
    errors.push('Age must be between 15 and 100')
  }
  
  if (!input.heightCm || input.heightCm < 100 || input.heightCm > 250) {
    errors.push('Height must be between 100 and 250 cm')
  }
  
  if (!input.weightKg || input.weightKg < 30 || input.weightKg > 300) {
    errors.push('Weight must be between 30 and 300 kg')
  }
  
  if (input.weeklyGoalKg !== undefined) {
    if (input.goalType === 'lose' && input.weeklyGoalKg > 1) {
      errors.push('Weekly weight loss should not exceed 1 kg for health reasons')
    }
    if (input.goalType === 'gain' && input.weeklyGoalKg > 0.5) {
      errors.push('Weekly weight gain should not exceed 0.5 kg to minimize fat gain')
    }
  }
  
  return errors
}