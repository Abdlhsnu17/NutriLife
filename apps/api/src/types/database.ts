import type { RowDataPacket } from 'mysql2/promise'

export type Role = 'USER' | 'NUTRITIONIST' | 'ADMIN'
export interface UserRow extends RowDataPacket { id: string; email: string; name: string; role: Role; passwordHash: string | null; avatarUrl: string | null }
export interface MealRow extends RowDataPacket { id: string; userId: string; mealType: 'BREAKFAST' | 'LUNCH' | 'SNACK' | 'DINNER'; name: string; calories: number; protein: number; carbs: number; fat: number; loggedAt: Date }
export interface NutritionRow extends RowDataPacket { calories: number; protein: number; carbs: number; fat: number }
export interface GoalRow extends RowDataPacket { type: 'CALORIES' | 'WATER' | 'STEPS' | 'WEIGHT' | 'PROTEIN' | 'CARBS' | 'FAT'; target: number; unit: string }
export interface TotalRow extends RowDataPacket { total: number }
export interface WeightRow extends RowDataPacket { weight: number; loggedAt: Date }
export interface WeeklyActivityRow extends RowDataPacket { day: string; steps: number }
export interface ResetTokenRow extends RowDataPacket { id: string; userId: string }
export interface RecipeRow extends RowDataPacket { id: string; title: string; category: string; ingredients: string; steps: string; totalIngredients: number; totalSteps: number }
export interface NutritionItemRow extends RowDataPacket { id: string; name: string; brand: string; kind: 'FOOD' | 'DRINK'; calories: number; protein: number; carbs: number; fat: number; fiber: number; sugar: number; sodium: number }
