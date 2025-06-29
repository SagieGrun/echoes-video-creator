import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getAppUrl(): string {
  const isDevelopment = process.env.NODE_ENV === 'development'
  return isDevelopment ? '/create' : process.env.NEXT_PUBLIC_APP_URL || 'https://your-echoes.com'
} 