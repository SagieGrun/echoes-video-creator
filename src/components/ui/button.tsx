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
        'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
        
        // Size variants
        {
          'px-3 py-1.5 text-sm': size === 'sm',
          'px-4 py-2 text-sm': size === 'md',
          'px-6 py-3 text-base': size === 'lg',
        },
        
        // Color variants - Professional blue-based theme
          {
          'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 shadow-sm hover:shadow-md': variant === 'primary',
          'bg-gray-50 text-gray-700 hover:bg-gray-100 focus:ring-gray-500 border border-gray-200 hover:border-gray-300': variant === 'secondary',
          'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500 shadow-sm hover:shadow-md': variant === 'success',
          'bg-amber-600 text-white hover:bg-amber-700 focus:ring-amber-500 shadow-sm hover:shadow-md': variant === 'warning',
          'bg-transparent text-gray-600 hover:bg-gray-50 focus:ring-gray-500': variant === 'ghost',
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
        'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 cursor-pointer',
        
        // Size variants
        {
          'px-3 py-1.5 text-sm': size === 'sm',
          'px-4 py-2 text-sm': size === 'md',
          'px-6 py-3 text-base': size === 'lg',
        },
        
        // Color variants - Professional blue-based theme
        {
          'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 shadow-sm hover:shadow-md': variant === 'primary',
          'bg-gray-50 text-gray-700 hover:bg-gray-100 focus:ring-gray-500 border border-gray-200 hover:border-gray-300': variant === 'secondary',
          'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500 shadow-sm hover:shadow-md': variant === 'success',
          'bg-amber-600 text-white hover:bg-amber-700 focus:ring-amber-500 shadow-sm hover:shadow-md': variant === 'warning',
          'bg-transparent text-gray-600 hover:bg-gray-50 focus:ring-gray-500': variant === 'ghost',
        },
        
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
} 