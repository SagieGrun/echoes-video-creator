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
        
        // Color variants - Professional muted slate theme
          {
          'bg-slate-700 text-white hover:bg-slate-800 focus:ring-slate-500 shadow-sm hover:shadow-md': variant === 'primary',
          'bg-slate-100 text-slate-700 hover:bg-slate-200 focus:ring-slate-400 border border-slate-200 hover:border-slate-300': variant === 'secondary',
          'bg-slate-600 text-white hover:bg-slate-700 focus:ring-slate-500 shadow-sm hover:shadow-md': variant === 'success',
          'bg-slate-500 text-white hover:bg-slate-600 focus:ring-slate-400 shadow-sm hover:shadow-md': variant === 'warning',
          'bg-transparent text-slate-600 hover:bg-slate-50 focus:ring-slate-400': variant === 'ghost',
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
        
        // Color variants - Professional muted slate theme
        {
          'bg-slate-700 text-white hover:bg-slate-800 focus:ring-slate-500 shadow-sm hover:shadow-md': variant === 'primary',
          'bg-slate-100 text-slate-700 hover:bg-slate-200 focus:ring-slate-400 border border-slate-200 hover:border-slate-300': variant === 'secondary',
          'bg-slate-600 text-white hover:bg-slate-700 focus:ring-slate-500 shadow-sm hover:shadow-md': variant === 'success',
          'bg-slate-500 text-white hover:bg-slate-600 focus:ring-slate-400 shadow-sm hover:shadow-md': variant === 'warning',
          'bg-transparent text-slate-600 hover:bg-slate-50 focus:ring-slate-400': variant === 'ghost',
        },
        
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
} 