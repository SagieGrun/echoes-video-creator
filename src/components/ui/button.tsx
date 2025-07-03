import React from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
}

export function Button({ 
  variant = 'primary', 
  size = 'md', 
  className, 
  children, 
  ...props 
}: ButtonProps) {
  return (
    <button
      className={cn(
        // Base styles
        'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
        
        // Size variants
        {
          'px-3 py-1.5 text-sm': size === 'sm',
          'px-4 py-2 text-sm': size === 'md',
          'px-6 py-3 text-base': size === 'lg',
        },
        
        // Color variants
        {
          'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500': variant === 'primary',
          'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500': variant === 'secondary',
          'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500': variant === 'success',
          'bg-orange-600 text-white hover:bg-orange-700 focus:ring-orange-500': variant === 'warning',
          'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500': variant === 'ghost',
        },
        
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

// Link variant for Next.js Link components
export function ButtonLink({ 
  variant = 'primary', 
  size = 'md', 
  className, 
  children, 
  ...props 
}: Omit<ButtonProps, 'onClick'> & { href?: string }) {
  return (
    <span
      className={cn(
        // Base styles
        'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
        
        // Size variants
        {
          'px-3 py-1.5 text-sm': size === 'sm',
          'px-4 py-2 text-sm': size === 'md',
          'px-6 py-3 text-base': size === 'lg',
        },
        
        // Color variants
        {
          'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500': variant === 'primary',
          'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500': variant === 'secondary',
          'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500': variant === 'success',
          'bg-orange-600 text-white hover:bg-orange-700 focus:ring-orange-500': variant === 'warning',
          'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500': variant === 'ghost',
        },
        
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
} 