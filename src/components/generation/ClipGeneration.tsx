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
  phase: 'upload' | 'confirm' | 'generating' | 'completed' | 'error'
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
  onClipCompleted?: () => void  // Add callback for when clip generation completes
}

// For the completion preview, we'll let the video determine its own aspect ratio
// The VideoPlayer component will automatically adapt to the video's dimensions

export function ClipGeneration({ user: propUser, onClipCompleted }: ClipGenerationProps) {
  const [user, setUser] = useState<User | null>(propUser || null)
  const [state, setState] = useState<ClipGenerationState>({
    phase: 'upload',
    progress: 0,
    message: 'Upload a photo to get started'
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadedPhoto, setUploadedPhoto] = useState<{url: string, path: string, projectId: string} | null>(null)
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
      setSelectedFile(file)
      
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
      setUploadedPhoto(result)

      setState({
        phase: 'confirm',
        progress: 0,
        message: 'Photo uploaded! Please confirm to proceed with AI generation.'
      })

    } catch (error) {
      console.error('Upload error:', error)
      setState({
        phase: 'error',
        progress: 0,
        message: error instanceof Error ? error.message : 'Failed to upload photo'
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleConfirmGeneration = async () => {
    if (!uploadedPhoto || !user) return

    const requestId = Math.random().toString(36).substring(2, 15)
    console.log(`[FRONTEND-${requestId}] === GENERATION REQUEST START ===`, {
      timestamp: new Date().toISOString(),
      uploadedPhoto: selectedFile?.name || 'unknown',
      fileSize: selectedFile?.size || 0,
      uploadedPhotoUrl: uploadedPhoto.url
    })

    try {
      setIsGenerating(true)
      setState({
        phase: 'generating',
        progress: 0,
        message: 'Starting AI generation...'
      })

      // Get the user's auth token
      console.log(`[FRONTEND-${requestId}] Step 1: Getting user session`)
      const supabase = createSupabaseBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        console.error(`[FRONTEND-${requestId}] ERROR: No session found`)
        throw new Error('Authentication required')
      }
      console.log(`[FRONTEND-${requestId}] Step 1 SUCCESS: Session obtained`)

      // Start clip generation using Edge Function
      console.log(`[FRONTEND-${requestId}] Step 2: Preparing fetch request`)
      const requestPayload = {
        image_url: uploadedPhoto.url,
        image_file_path: uploadedPhoto.path,
        project_id: uploadedPhoto.projectId
      }
      
      console.log(`[FRONTEND-${requestId}] Step 2: Request payload prepared`, {
        hasImageUrl: !!requestPayload.image_url,
        imageUrlLength: requestPayload.image_url?.length,
        hasImageFilePath: !!requestPayload.image_file_path,
        hasProjectId: !!requestPayload.project_id
      })

      const startTime = Date.now()
      console.log(`[FRONTEND-${requestId}] Step 3: Starting fetch call at ${startTime}`)
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/clip-generation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        },
        body: JSON.stringify(requestPayload)
      })

      const endTime = Date.now()
      const duration = endTime - startTime
      
      console.log(`[FRONTEND-${requestId}] Step 3 RESPONSE: Fetch completed`, {
        duration: `${duration}ms`,
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[FRONTEND-${requestId}] ERROR: Bad response`, {
          status: response.status,
          statusText: response.statusText,
          errorText
        })
        throw new Error(`Failed to generate clip: ${response.status} - ${errorText}`)
      }

      console.log(`[FRONTEND-${requestId}] Step 4: Parsing response body`)
      const result = await response.json()
      
      console.log(`[FRONTEND-${requestId}] Step 4 SUCCESS: Response parsed`, {
        result,
        totalDuration: `${Date.now() - startTime}ms`
      })

      // Start polling for clip status
      console.log(`[FRONTEND-${requestId}] Step 5: Starting status polling`)
      setState({
        phase: 'generating',
        progress: 10,
        message: 'AI generation in progress...',
        clipId: result.clipId
      })

      // Poll for status updates
      const statusInterval = setInterval(async () => {
        try {
          console.log(`[FRONTEND-${requestId}] POLLING: Checking clip status`)
          const statusResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/clip-status`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
              'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            },
            body: JSON.stringify({ clipId: result.clipId })
          })

          if (statusResponse.ok) {
            const statusData = await statusResponse.json()
            console.log(`[FRONTEND-${requestId}] POLLING: Status update`, statusData)
            
            // ADD DETAILED LOGGING OF STATUS DATA
            console.log(`[FRONTEND-${requestId}] POLLING: Detailed status analysis`, {
              status: statusData.status,
              progress: statusData.progress,
              hasErrorMessage: !!statusData.error_message,
              errorMessage: statusData.error_message,
              hasVideoUrl: !!statusData.video_url,
              allKeys: Object.keys(statusData)
            })
            
            setState({
              phase: 'generating',
              progress: Math.min(statusData.progress || 0, 95),
              message: `AI generation ${statusData.progress || 0}% complete...`,
              clipId: result.clipId
            })

            if (statusData.status === 'completed') {
              console.log(`[FRONTEND-${requestId}] POLLING: Generation completed!`)
              clearInterval(statusInterval)
              setState({
                phase: 'completed',
                progress: 100,
                message: 'AI generation completed!',
                clipId: result.clipId
              })
              onClipCompleted?.()
            } else if (statusData.status === 'failed') {
              console.error(`[FRONTEND-${requestId}] POLLING: Generation failed`, statusData)
              clearInterval(statusInterval)
              
              // Create user-friendly error message based on the specific error
              let userErrorMessage = 'Generation failed'
              
              if (statusData.error_message) {
                const errorMsg = statusData.error_message.toLowerCase()
                
                if (errorMsg.includes('content moderation') || errorMsg.includes('public figure') || errorMsg.includes('safety')) {
                  userErrorMessage = 'Image rejected by AI content policy. Please try landscapes, objects, or images without recognizable people.'
                } else if (errorMsg.includes('timeout') || errorMsg.includes('time')) {
                  userErrorMessage = 'Generation timed out. Please try again with a simpler image.'
                } else if (errorMsg.includes('invalid') || errorMsg.includes('format')) {
                  userErrorMessage = 'Invalid image format. Please use JPEG or PNG files.'
                } else if (errorMsg.includes('resolution') || errorMsg.includes('size')) {
                  userErrorMessage = 'Image size issue. Please use images between 512x512 and 2048x2048 pixels.'
                } else {
                  // Show the actual error message if it's not too technical
                  userErrorMessage = statusData.error_message.length > 100 
                    ? 'Generation failed due to technical issue. Please try a different image.'
                    : statusData.error_message
                }
              }
              
              console.log(`[FRONTEND-${requestId}] POLLING: User-friendly error message:`, userErrorMessage)
              throw new Error(userErrorMessage)
            }
          } else {
            console.warn(`[FRONTEND-${requestId}] POLLING: Status check failed`, {
              status: statusResponse.status,
              statusText: statusResponse.statusText
            })
          }
        } catch (error) {
          console.error(`[FRONTEND-${requestId}] POLLING ERROR:`, error)
        }
      }, 5000)

      // Set timeout for polling
      setTimeout(() => {
        clearInterval(statusInterval)
        console.log(`[FRONTEND-${requestId}] TIMEOUT: Polling timeout reached`)
        setState({
          phase: 'completed',
          progress: 100,
          message: 'Generation started! Check your dashboard for results.',
          clipId: result.clipId
        })
      }, 180000) // 3 minutes timeout

    } catch (error) {
      const errorEndTime = Date.now()
      console.error(`[FRONTEND-${requestId}] === GENERATION REQUEST FAILED ===`, {
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : error,
        timestamp: new Date().toISOString(),
        duration: `${errorEndTime - (Date.now() - 1000)}ms` // Approximate duration
      })
      
      setIsGenerating(false)
      setState({
        phase: 'error',
        progress: 0,
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  const handleCancelConfirmation = () => {
    setSelectedFile(null)
    setUploadedPhoto(null)
    setState({
      phase: 'upload',
      progress: 0,
      message: 'Upload a photo to get started'
    })
  }

  const startStatusPolling = (clipId: string) => {
    if (pollingInterval) clearInterval(pollingInterval)
    
    const poll = async () => {
      try {
        const supabase = createSupabaseBrowserClient()
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
          throw new Error('Authentication required')
        }

        const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/clip-status`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          },
          body: JSON.stringify({ clip_id: clipId }),
        })

        if (!response.ok) {
          throw new Error('Failed to fetch status')
        }

        const { status, video_url, progress, message } = await response.json()

        setState(prev => ({
          ...prev,
          progress,
          message: getStatusMessage(status, prev.estimatedTime)
        }))

                    if (status === 'completed' && video_url) {
              setState(prev => ({
                ...prev,
                phase: 'completed',
                progress: 100,
                message: 'Your video clip is ready!',
                videoUrl: video_url
              }))
              if (pollingInterval) {
                clearInterval(pollingInterval)
                setPollingInterval(null)
              }
              onClipCompleted?.()
            } else if (status === 'failed') {
          // Create user-friendly error message
          let userErrorMessage = 'Generation failed'
          if (message) {
            const errorMsg = message.toLowerCase()
            if (errorMsg.includes('content moderation') || errorMsg.includes('public figure') || errorMsg.includes('safety')) {
              userErrorMessage = 'Image rejected by AI content policy. Please try landscapes, objects, or images without recognizable people.'
            } else if (errorMsg.includes('timeout') || errorMsg.includes('time')) {
              userErrorMessage = 'Generation timed out. Please try again with a simpler image.'
            } else if (errorMsg.includes('invalid') || errorMsg.includes('format')) {
              userErrorMessage = 'Invalid image format. Please use JPEG or PNG files.'
            } else if (errorMsg.includes('resolution') || errorMsg.includes('size')) {
              userErrorMessage = 'Image size issue. Please use images between 512x512 and 2048x2048 pixels.'
            } else {
              userErrorMessage = message.length > 100 
                ? 'Generation failed due to technical issue. Please try a different image.'
                : message
            }
          }
          
          setState(prev => ({
            ...prev,
            phase: 'error',
            progress: 0,
            message: userErrorMessage
          }))
          if (pollingInterval) {
            clearInterval(pollingInterval)
            setPollingInterval(null)
          }
        }
      } catch (error) {
        console.error('Status polling error:', error)
        setState(prev => ({
          ...prev,
          phase: 'error',
          progress: 0,
          message: 'Failed to check generation status'
        }))
        if (pollingInterval) {
          clearInterval(pollingInterval)
          setPollingInterval(null)
        }
      }
    }

    // Start polling immediately, then every 3 seconds
    poll()
    const interval = setInterval(poll, 3000)
    setPollingInterval(interval)
  }

  const getStatusMessage = (status: string, estimatedTime?: number): string => {
    switch (status) {
      case 'processing':
        return estimatedTime ? `AI is working on your clip... (usually takes ${estimatedTime}s)` : 'AI is working on your clip...'
      case 'queued':
        return 'Your clip is in the queue...'
      case 'completed':
        return 'Your video clip is ready!'
      case 'failed':
        return 'Generation failed. Please try a different image.'
      default:
        return 'Processing...'
    }
  }

  const handleRetry = () => {
    setState({
      phase: 'upload',
      progress: 0,
      message: 'Upload a photo to get started'
    })
    setSelectedFile(null)
    setUploadedPhoto(null)
  }

  const handleNewClip = () => {
    setState({
      phase: 'upload',
      progress: 0,
      message: 'Upload a photo to get started'
    })
    setSelectedFile(null)
    setUploadedPhoto(null)
  }

  const handlePurchaseComplete = (credits: number) => {
    setUser(prev => prev ? { ...prev, credit_balance: credits } : null)
    setShowCreditPurchase(false)
    setState({
      phase: 'upload',
      progress: 0,
      message: 'Upload a photo to get started'
    })
  }

  // Show credit purchase modal
  if (showCreditPurchase) {
    return (
             <CreditPurchase
         onPurchaseComplete={handlePurchaseComplete}
         onClose={() => setShowCreditPurchase(false)}
       />
    )
  }

  return (
    <div className="space-y-6">
      {/* Credit Balance Display */}
      {user && (
        <div className="text-center">
          <p className="text-gray-600">
            Credit Balance: <span className="font-semibold text-orange-600">{user.credit_balance}</span>
            {user.credit_balance === 0 && (
              <span className="text-red-500 ml-2">
                (Purchase more to continue)
              </span>
            )}
          </p>
        </div>
      )}

      {/* Phase: Upload */}
      {state.phase === 'upload' && !selectedFile && (
        <PhotoUpload 
          onPhotoSelected={handlePhotoSelected}
          maxSize={5 * 1024 * 1024} // 5MB
        />
      )}

      {/* Upload Processing State - Show preview while uploading */}
      {state.phase === 'upload' && selectedFile && isUploading && (
        <div className="text-center space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-blue-800 mb-4">
              📤 Uploading Your Photo
            </h3>
            
            {/* Keep showing the photo during upload */}
            <div className="relative max-w-md mx-auto mb-4">
              <img 
                src={URL.createObjectURL(selectedFile)} 
                alt="Uploading photo preview"
                className="w-full rounded-lg shadow-lg"
              />
              {/* Upload overlay */}
              <div className="absolute inset-0 bg-black/20 rounded-lg flex items-center justify-center">
                <div className="bg-white/90 px-4 py-2 rounded-full">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                    <span className="text-blue-700 font-medium">Uploading {uploadProgress}%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-sm text-blue-600">
              <p><strong>File:</strong> {selectedFile.name}</p>
              <p><strong>Size:</strong> {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          </div>
        </div>
      )}

      {/* Phase: Confirm */}
      {state.phase === 'confirm' && selectedFile && uploadedPhoto && (
        <div className="text-center space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-green-800 mb-4">
              📸 Photo Ready for AI Generation
            </h3>
            
            {/* Photo Preview */}
            <div className="relative max-w-md mx-auto mb-6">
              <img 
                src={uploadedPhoto.url} 
                alt="Selected photo preview"
                className="w-full rounded-lg shadow-lg"
              />
            </div>

            <div className="space-y-4">
              <p className="text-green-700">
                Your photo has been uploaded successfully! This will use <span className="font-semibold">1 credit</span> to generate your AI video clip.
              </p>
              
              <div className="text-sm text-green-600 bg-green-100 rounded-lg p-3">
                <p><strong>File:</strong> {selectedFile.name}</p>
                <p><strong>Size:</strong> {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                <p><strong>Generation time:</strong> Usually 30-60 seconds</p>
              </div>

              <div className="flex gap-4 justify-center">
                <button
                  onClick={handleCancelConfirmation}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-full hover:bg-gray-50 transition-colors"
                  disabled={isGenerating}
                >
                  Cancel & Choose Different Photo
                </button>
                <LoadingButton
                  onClick={handleConfirmGeneration}
                  loading={isGenerating}
                  className="px-8 py-3 bg-gradient-to-r from-orange-500 to-purple-500 text-white rounded-full hover:from-orange-600 hover:to-purple-600 transition-all transform hover:scale-105"
                >
                  {isGenerating ? 'Starting Generation...' : 'Confirm & Generate Video'}
                </LoadingButton>
              </div>
            </div>
          </div>
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
    </div>
  )
} 