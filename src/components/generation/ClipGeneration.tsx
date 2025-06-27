'use client'

import { useState, useEffect } from 'react'
import { PhotoUpload } from '@/components/upload/PhotoUpload'
import { CreditPurchase } from '@/components/credits/CreditPurchase'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { LoadingButton } from '@/components/ui/LoadingButton'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { VideoPlayer } from '@/components/ui/VideoPlayer'
import { uploadPhoto } from '@/lib/supabase/storage'
import { createSupabaseBrowserClient } from '@/lib/supabase'

interface ClipGenerationState {
  phase: 'upload' | 'generating' | 'completed' | 'error'
  clipId?: string
  progress: number
  message: string
  videoUrl?: string
  creditsRemaining?: number
  estimatedTime?: number
}

interface User {
  id: string
  email: string
  credit_balance: number
}

interface ClipGenerationProps {
  user?: User | null
}

// For the completion preview, we'll let the video determine its own aspect ratio
// The VideoPlayer component will automatically adapt to the video's dimensions

export function ClipGeneration({ user: propUser }: ClipGenerationProps) {
  const [user, setUser] = useState<User | null>(propUser || null)
  const [state, setState] = useState<ClipGenerationState>({
    phase: 'upload',
    progress: 0,
    message: 'Upload a photo to get started'
  })
  const [isUploading, setIsUploading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null)
  const [showCreditPurchase, setShowCreditPurchase] = useState(false)

  // Update user state when prop changes
  useEffect(() => {
    if (propUser) {
      setUser(propUser)
    }
  }, [propUser])

  // Only check user if not provided via props
  useEffect(() => {
    if (!propUser) {
      const checkUser = async () => {
        try {
          const supabase = createSupabaseBrowserClient()
          const { data: { session } } = await supabase.auth.getSession()
          
          if (session?.user) {
            // Fetch user profile with credit balance
            const { data: userData, error } = await supabase
              .from('users')
              .select('id, email, credit_balance')
              .eq('id', session.user.id)
              .single()

            if (userData && !error) {
              setUser(userData)
            }
          }
        } catch (error) {
          console.error('Error checking user:', error)
        }
      }

      checkUser()
    }
  }, [propUser])

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval)
      }
    }
  }, [pollingInterval])

  const handlePhotoSelected = async (file: File) => {
    if (!user) {
      setState({
        phase: 'error',
        progress: 0,
        message: 'Please log in to generate clips'
      })
      return
    }

    if (user.credit_balance < 1) {
      setState({
        phase: 'error',
        progress: 0,
        message: 'Insufficient credits. Please purchase more credits to continue.'
      })
      setShowCreditPurchase(true)
      return
    }

    try {
      setIsUploading(true)
      setUploadProgress(0)
      
      setState({
        phase: 'upload',
        progress: 0,
        message: 'Processing your photo...'
      })

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      // Upload photo to Supabase storage
      const result = await uploadPhoto(file)
      
      setUploadProgress(100)
      clearInterval(progressInterval)

      setState({
        phase: 'upload',
        progress: 100,
        message: 'Photo uploaded successfully!'
      })

      // Brief pause to show completion
      await new Promise(resolve => setTimeout(resolve, 500))

      setIsGenerating(true)
      setState({
        phase: 'generating',
        progress: 0,
        message: 'Starting AI generation...'
      })

      // Get the user's auth token
      const supabase = createSupabaseBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('Authentication required')
      }

      // Start clip generation using Edge Function
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/clip-generation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        },
        body: JSON.stringify({
          image_url: result.url,        // Signed URL for immediate use
          image_file_path: result.path, // File path for storage
          project_id: result.projectId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to start generation')
      }

      const { clip_id, credits_remaining, estimated_time } = await response.json()

      setState({
        phase: 'generating',
        progress: 10,
        message: 'AI is creating your video clip...',
        clipId: clip_id,
        creditsRemaining: credits_remaining,
        estimatedTime: estimated_time
      })

      // Update user credit balance
      setUser(prev => prev ? { ...prev, credit_balance: credits_remaining } : null)

      // Start polling for status updates
      startStatusPolling(clip_id)

    } catch (error) {
      console.error('Error in clip generation:', error)
      setState({
        phase: 'error',
        progress: 0,
        message: error instanceof Error ? error.message : 'Failed to generate clip'
      })
    } finally {
      setIsUploading(false)
      setIsGenerating(false)
      setUploadProgress(0)
    }
  }

  const startStatusPolling = (clipId: string) => {
    let intervalId: NodeJS.Timeout | null = null
    
    const poll = async () => {
      try {
        // Get the user's auth token
        const supabase = createSupabaseBrowserClient()
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
          throw new Error('Authentication required')
        }

        const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/clip-status?clip_id=${clipId}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          }
        })
        
        if (!response.ok) {
          throw new Error('Failed to check status')
        }

        const statusData = await response.json()
        
        setState(prev => ({
          ...prev,
          progress: statusData.progress,
          estimatedTime: statusData.estimated_time,
          message: getStatusMessage(statusData.status, statusData.estimated_time)
        }))

        if (statusData.status === 'completed') {
          console.log('Clip completed! Video URL received:', statusData.video_url)
          
          setState(prev => ({
            ...prev,
            phase: 'completed',
            progress: 100,
            message: 'Your clip is ready!',
            videoUrl: statusData.video_url
          }))
          
          // Clear polling immediately
          if (intervalId) {
            clearInterval(intervalId)
            intervalId = null
          }
          setPollingInterval(null)
          return // Stop polling
          
        } else if (statusData.status === 'failed') {
          setState(prev => ({
            ...prev,
            phase: 'error',
            progress: 0,
            message: statusData.error_message || 'Generation failed'
          }))
          
          // Clear polling immediately
          if (intervalId) {
            clearInterval(intervalId)
            intervalId = null
          }
          setPollingInterval(null)
          return // Stop polling
        }

      } catch (error) {
        console.error('Error polling status:', error)
      }
    }

    // Poll immediately and then every 3 seconds
    poll().then(() => {
      // Only set up interval if not already completed
      if (intervalId === null) {
        intervalId = setInterval(poll, 3000)
        setPollingInterval(intervalId)
      }
    })
  }

  const getStatusMessage = (status: string, estimatedTime?: number): string => {
    switch (status) {
      case 'pending':
        return 'Preparing your generation...'
      case 'processing':
        return estimatedTime 
          ? `Generating clip... ~${estimatedTime}s remaining`
          : 'Generating your clip...'
      case 'completed':
        return 'Your clip is ready!'
      case 'failed':
        return 'Generation failed'
      default:
        return 'Processing...'
    }
  }

  const handleRetry = () => {
    setState({
      phase: 'upload',
      progress: 0,
      message: 'Upload a photo to try again'
    })
  }

  const handleNewClip = () => {
    setState({
      phase: 'upload',
      progress: 0,
      message: 'Upload another photo to create a new clip'
    })
  }

  const handlePurchaseComplete = (credits: number) => {
    // Update user credits
    setUser(prev => prev ? { ...prev, credit_balance: prev.credit_balance + credits } : null)
    setShowCreditPurchase(false)
    
    // Reset to upload state
    setState({
      phase: 'upload',
      progress: 0,
      message: 'Credits added! Upload a photo to create your clip'
    })
  }

  return (
    <div className="space-y-4">
      {/* Credit Balance Display */}
      {user && (
        <div className="bg-gradient-to-r from-orange-50 to-purple-50 rounded-lg p-3 text-center border border-orange-100">
          <p className="text-sm text-gray-600">
            Credit Balance: <span className="font-semibold text-orange-600">{user.credit_balance}</span>
            {user.credit_balance === 0 && (
              <span className="ml-2 text-red-500">(Purchase more to continue)</span>
            )}
          </p>
        </div>
      )}

      {/* Upload Phase */}
      {state.phase === 'upload' && !isUploading && (
        <PhotoUpload
          onPhotoSelected={handlePhotoSelected}
          maxSize={5 * 1024 * 1024}
          acceptedTypes={['image/jpeg', 'image/png']}
        />
      )}

      {/* Upload Loading State */}
      {isUploading && (
        <div className="bg-gradient-to-br from-orange-50 to-purple-50 rounded-lg p-4 text-center space-y-3 border border-orange-100">
          <LoadingSpinner size="lg" className="mx-auto" />
          <div>
            <p className="font-medium text-gray-900">{state.message}</p>
            <p className="text-sm text-gray-500 mt-1">Please wait while we process your photo</p>
          </div>
          <ProgressBar 
            progress={uploadProgress} 
            label="Upload Progress"
            variant="primary"
            className="max-w-md mx-auto"
          />
        </div>
      )}

      {/* Generation Progress */}
      {state.phase === 'generating' && (
        <div className="bg-gradient-to-br from-orange-50 to-purple-50 rounded-lg p-4 text-center space-y-3 border border-orange-100">
          <div className="relative w-20 h-20 mx-auto">
            <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="currentColor"
                strokeWidth="6"
                fill="transparent"
                className="text-gray-200"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="currentColor"
                strokeWidth="6"
                fill="transparent"
                strokeDasharray={`${2 * Math.PI * 40}`}
                strokeDashoffset={`${2 * Math.PI * 40 * (1 - state.progress / 100)}`}
                className="text-orange-500 transition-all duration-500 ease-out"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-lg font-bold text-gray-700">{state.progress}%</div>
                <LoadingSpinner size="sm" className="mt-1 mx-auto" />
              </div>
            </div>
          </div>
          
          <div className="space-y-1">
            <p className="text-base font-semibold text-gray-900">{state.message}</p>
            {state.estimatedTime && state.estimatedTime > 0 && (
              <p className="text-sm text-gray-500">
                ⏱️ Estimated time remaining: {state.estimatedTime} seconds
              </p>
            )}
            <p className="text-xs text-gray-400">
              🎬 AI is analyzing your photo and creating cinematic motion
            </p>
          </div>

          <ProgressBar 
            progress={state.progress} 
            label="Generation Progress"
            variant="primary"
            size="md"
            className="max-w-md mx-auto"
          />
        </div>
      )}

      {/* Completed State */}
      {state.phase === 'completed' && state.videoUrl && (
        <div className="bg-gradient-to-br from-green-50 via-orange-50 to-purple-50 rounded-lg p-6 text-center space-y-4 border border-green-200">
          <div className="text-green-600 text-4xl mb-4">✓</div>
          <h3 className="text-xl font-semibold text-gray-900">Your clip is ready!</h3>
          
          <div className="flex justify-center">
            <div className="w-full max-w-sm sm:max-w-md">
              <VideoPlayer
                src={state.videoUrl}
                showControls={true}
                className="rounded-lg shadow-lg"
                preload="metadata"
              />
            </div>
          </div>

          <div className="flex gap-4 justify-center">
            <LoadingButton
              onClick={() => window.open(state.videoUrl, '_blank')}
              variant="primary"
              size="lg"
            >
              Download Video
            </LoadingButton>
            <LoadingButton
              onClick={() => window.location.href = '/dashboard'}
              variant="secondary"
              size="lg"
            >
              View All Clips
            </LoadingButton>
            <LoadingButton
              onClick={handleNewClip}
              variant="secondary"
              size="lg"
              className="border border-gray-300"
            >
              Create Another
            </LoadingButton>
          </div>

          {state.creditsRemaining !== undefined && (
            <p className="text-sm text-gray-500">
              Credits remaining: {state.creditsRemaining}
            </p>
          )}
        </div>
      )}

      {/* Error State */}
      {state.phase === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center space-y-4">
          <div className="text-red-500 text-4xl mb-4">⚠</div>
          <h3 className="text-lg font-semibold text-red-800">Something went wrong</h3>
          <p className="text-red-600">{state.message}</p>
          
          <div className="flex gap-3 justify-center">
            {user && user.credit_balance < 1 ? (
              <LoadingButton
                onClick={() => setShowCreditPurchase(true)}
                variant="primary"
                size="lg"
              >
                Buy Credits
              </LoadingButton>
            ) : (
              <LoadingButton
                onClick={handleRetry}
                variant="danger"
                size="lg"
              >
                Try Again
              </LoadingButton>
            )}
          </div>
        </div>
      )}

      {/* Credit Purchase Modal */}
      {showCreditPurchase && (
        <CreditPurchase
          onClose={() => setShowCreditPurchase(false)}
          onPurchaseComplete={handlePurchaseComplete}
        />
      )}
    </div>
  )
} 