'use client'

import { useState, useRef, useEffect } from 'react'
import { Film, ImageIcon, RefreshCw } from 'lucide-react'

interface OptimizedImageProps {
  src?: string | null
  alt: string
  className?: string
  fallbackIcon?: React.ReactNode
  onLoad?: () => void
  onError?: () => void
  priority?: boolean // For above-the-fold images
  aspectRatio?: string // e.g., "16/9", "4/3", "1/1" for layout shift prevention
  width?: number // Explicit width for size hints
  height?: number // Explicit height for size hints
}

export function OptimizedImage({
  src,
  alt,
  className = '',
  fallbackIcon,
  onLoad,
  onError,
  priority = false,
  aspectRatio,
  width,
  height
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [isVisible, setIsVisible] = useState(priority) // Load immediately if priority
  const imgRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || !containerRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      {
        rootMargin: '50px' // Start loading 50px before entering viewport
      }
    )

    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [priority])

  const handleLoad = () => {
    setIsLoading(false)
    setHasError(false)
    onLoad?.()
  }

  const handleError = () => {
    setIsLoading(false)
    setHasError(true)
    onError?.()
  }

  const handleRetry = () => {
    setHasError(false)
    setIsLoading(true)
    // Force reload by updating the src
    if (imgRef.current && src) {
      imgRef.current.src = src
    }
  }

  // Get container style with aspect ratio for layout shift prevention
  const getContainerStyle = () => {
    const baseStyle: React.CSSProperties = {}
    
    if (aspectRatio) {
      baseStyle.aspectRatio = aspectRatio
    } else if (width && height) {
      baseStyle.aspectRatio = `${width}/${height}`
    }
    
    return baseStyle
  }

  // Skeleton loading component
  const SkeletonLoader = () => (
    <div className={`relative ${className}`} style={getContainerStyle()}>
      {/* Shimmer background */}
      <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-pulse" />
      
      {/* Shimmer wave effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent animate-pulse bg-[length:200%_100%] animate-[shimmer_2s_infinite]" />
      
      {/* Content placeholder */}
      <div className="relative w-full h-full flex items-center justify-center bg-gray-100">
        <div className="w-6 h-6 bg-gray-300 rounded animate-pulse opacity-60" />
      </div>
    </div>
  )

  // Error state component
  const ErrorState = () => (
    <div className={`bg-gray-100 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center p-2 ${className}`} style={getContainerStyle()}>
      <div className="text-gray-400 mb-2">
        {fallbackIcon || <ImageIcon className="h-6 w-6" />}
      </div>
      <button
        onClick={handleRetry}
        className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors"
        title="Retry loading image"
      >
        <RefreshCw className="h-3 w-3" />
        Retry
      </button>
    </div>
  )

  // No src provided
  if (!src) {
    return (
      <div className={`bg-gray-200 flex items-center justify-center ${className}`} style={getContainerStyle()}>
        <div className="text-gray-400">
          {fallbackIcon || <ImageIcon className="h-6 w-6" />}
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className={`relative overflow-hidden ${className}`} style={getContainerStyle()}>
      {/* Show skeleton while loading or not visible */}
      {(isLoading || !isVisible) && !hasError && <SkeletonLoader />}
      
      {/* Show error state */}
      {hasError && <ErrorState />}
      
      {/* Actual image - only render when visible */}
      {isVisible && !hasError && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          width={width}
          height={height}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isLoading ? 'opacity-0' : 'opacity-100'
          }`}
          onLoad={handleLoad}
          onError={handleError}
          loading={priority ? 'eager' : 'lazy'}
        />
      )}
    </div>
  )
} 