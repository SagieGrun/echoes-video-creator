'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { OptimizedImage } from '@/components/ui/OptimizedImage'
import { ArrowLeft, Film, Music, Settings, Play, GripVertical, X } from 'lucide-react'
import Link from 'next/link'

interface Clip {
  id: string
  image_url: string
  video_url: string | null
  video_file_path: string | null
  status: string
  created_at: string
}

interface MusicTrack {
  id: string
  name: string
  file_url: string
  file_path: string
}

interface FinalizationSettings {
  selectedClips: { clip_id: string; order: number }[]
  musicTrackId: string | null
  transitionType: string
  musicVolume: number
}

export default function FinalizePage() {
  const router = useRouter()
  const [supabase, setSupabase] = useState<any>(null)
  
  // State
  const [clips, setClips] = useState<Clip[]>([])
  const [musicTracks, setMusicTracks] = useState<MusicTrack[]>([])
  const [selectedClipIds, setSelectedClipIds] = useState<Set<string>>(new Set())
  const [clipOrder, setClipOrder] = useState<string[]>([])
  const [selectedMusicId, setSelectedMusicId] = useState<string>('')
  const [transitionType, setTransitionType] = useState<string>('fade')
  const [musicVolume, setMusicVolume] = useState<number>(0.7)
  const [outputAspectRatio, setOutputAspectRatio] = useState<'16:9' | '9:16' | '1:1'>('16:9')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<any>(null)
  
  // Simple loading states
  const [startTime, setStartTime] = useState<number | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [currentPhase, setCurrentPhase] = useState<'starting' | 'processing' | 'finishing'>('starting')
  const [expectedDuration, setExpectedDuration] = useState(0)
  const [phaseTimers, setPhaseTimers] = useState<{ phase2?: NodeJS.Timeout; phase3?: NodeJS.Timeout }>({})

  // Load user's clips and music tracks
  useEffect(() => {
    // Initialize Supabase client on client side only
    if (typeof window !== 'undefined') {
      const client = createSupabaseBrowserClient()
      setSupabase(client)
    }
  }, [])

  useEffect(() => {
    if (supabase) {
      loadData()
    }
  }, [supabase])

  const loadData = async () => {
    if (!supabase) return
    
    try {
      console.log('Loading finalize page data...')
      
      // Get current user
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        router.push('/login')
        return
      }
      setUser(session.user)
      console.log('User authenticated:', session.user.id)

      // Get all user's projects
      console.log('Fetching user projects...')
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id')
        .eq('user_id', session.user.id)

      if (projectsError) {
        console.error('Error fetching projects:', projectsError)
        throw projectsError
      }
      console.log('Found projects:', projects?.length || 0)

      if (!projects || projects.length === 0) {
        setClips([])
        setLoading(false)
        return
      }

      // Get all completed clips for user's projects
      console.log('Fetching clips for projects...')
      const allClips: Clip[] = []
      for (const project of projects) {
        console.log('Fetching clips for project:', project.id)
        const { data: projectClips, error: clipsError } = await supabase
          .from('clips')
          .select('id, image_url, image_file_path, video_url, video_file_path, status, created_at')
          .eq('project_id', project.id)
          .eq('status', 'completed')
          .not('video_file_path', 'eq', null)
          .order('created_at', { ascending: false })

        if (clipsError) {
          console.error('Error fetching clips for project', project.id, ':', clipsError)
        } else if (projectClips) {
          console.log('Found clips for project', project.id, ':', projectClips.length)
          // Generate fresh signed URLs for images and videos
          const clipsWithUrls = await Promise.all(
            projectClips.map(async (clip: any) => {
              let updatedClip = { ...clip }
              
              // Generate fresh signed URL for image
              if (clip.image_file_path) {
                try {
                  const { data: signedUrlData } = await supabase.storage
                    .from('private-photos')
                    .createSignedUrl(clip.image_file_path, 3600)
                  
                  if (signedUrlData?.signedUrl) {
                    updatedClip.image_url = signedUrlData.signedUrl
                  }
                } catch (error) {
                  console.error('Error generating signed URL for image:', error)
                }
              }
              
              // Generate fresh signed URL for video
              if (clip.video_file_path) {
                try {
                  const { data: videoSignedUrlData } = await supabase.storage
                    .from('private-photos')
                    .createSignedUrl(clip.video_file_path, 3600)
                  
                  if (videoSignedUrlData?.signedUrl) {
                    updatedClip.video_url = videoSignedUrlData.signedUrl
                  }
                } catch (error) {
                  console.error('Error generating signed URL for video:', error)
                }
              }
              
              return updatedClip
            })
          )
          allClips.push(...clipsWithUrls)
        }
      }

      // Load active music tracks
      console.log('Fetching music tracks...')
      const { data: musicData, error: musicError } = await supabase
        .from('music_tracks')
        .select('id, name, file_url, file_path')
        .eq('is_active', true)

      if (musicError) {
        console.error('Error fetching music tracks:', musicError)
        throw musicError
      }
      console.log('Found music tracks:', musicData?.length || 0)

      setClips(allClips)
      setMusicTracks(musicData || [])

      // Default: select all completed clips
      const defaultSelected = new Set<string>(allClips.map((clip: Clip) => clip.id))
      const defaultOrder = allClips.map((clip: Clip) => clip.id)
      
      setSelectedClipIds(defaultSelected)
      setClipOrder(defaultOrder)

    } catch (error) {
      console.error('Error loading data:', error)
      alert('Error loading your clips')
    } finally {
      setLoading(false)
    }
  }

  // Handle clip selection
  const toggleClipSelection = (clipId: string) => {
    const newSelected = new Set(selectedClipIds)
    if (newSelected.has(clipId)) {
      newSelected.delete(clipId)
      setClipOrder(prev => prev.filter(id => id !== clipId))
    } else {
      newSelected.add(clipId)
      setClipOrder(prev => [...prev, clipId])
    }
    setSelectedClipIds(newSelected)
  }

  // Drag and drop state
  const [draggedItem, setDraggedItem] = useState<string | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  // Handle drag start
  const handleDragStart = (e: React.DragEvent, clipId: string) => {
    setDraggedItem(clipId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', clipId)
    // Add a slight delay to prevent immediate drag end
    setTimeout(() => {
      if (e.target instanceof HTMLElement) {
        e.target.style.opacity = '0.5'
      }
    }, 0)
  }

  // Handle drag over
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }

  // Handle drag leave
  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  // Handle drop
  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    const draggedClipId = e.dataTransfer.getData('text/plain')
    
    if (draggedItem && draggedClipId) {
      const draggedIndex = clipOrder.indexOf(draggedClipId)
      
      if (draggedIndex !== -1 && draggedIndex !== dropIndex) {
        const newOrder = [...clipOrder]
        const [movedClip] = newOrder.splice(draggedIndex, 1)
        newOrder.splice(dropIndex, 0, movedClip)
        setClipOrder(newOrder)
      }
    }
    
    // Reset drag state
    setDraggedItem(null)
    setDragOverIndex(null)
    
    // Reset opacity
    if (e.target instanceof HTMLElement) {
      const draggedElement = document.querySelector(`[data-clip-id="${draggedClipId}"]`)
      if (draggedElement instanceof HTMLElement) {
        draggedElement.style.opacity = '1'
      }
    }
  }

  // Handle drag end
  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedItem(null)
    setDragOverIndex(null)
    
    // Reset opacity
    if (e.target instanceof HTMLElement) {
      e.target.style.opacity = '1'
    }
  }

  // Save finalization settings
  const saveSettings = async () => {
    if (!user || !supabase) return
    
    setSaving(true)
    setStartTime(Date.now())
    setCurrentPhase('starting')
    
    // Calculate expected duration based on clip count
    const clipCount = selectedClipIds.size
    const secondsPerClip = 12 // Based on updated real performance data: more accurate timing
    const baseOverhead = 7 // Base processing time
    const calculatedDuration = baseOverhead + (clipCount * secondsPerClip)
    setExpectedDuration(calculatedDuration)
    
    // Dynamic phase transitions based on expected duration
    const phase2Start = Math.max(3, calculatedDuration * 0.05) // 5% of total time, minimum 3s
    const phase3Start = Math.max(15, calculatedDuration * 0.8) // 80% of total time, minimum 15s
    
    // Phase transition timers
    const phase2Timer = setTimeout(() => {
      setCurrentPhase('processing')
    }, phase2Start * 1000)
    
    const phase3Timer = setTimeout(() => {
      setCurrentPhase('finishing')
    }, phase3Start * 1000)
    
    // Store timers for cleanup
    setPhaseTimers({ phase2: phase2Timer, phase3: phase3Timer })
    
    try {
      // Prepare selected clips with video file paths
      const selectedClips = clipOrder.map((clipId, index) => {
        const clip = clips.find(c => c.id === clipId)
        return {
          id: clip?.id,
          video_file_path: clip?.video_file_path,
          order: index + 1
        }
      }).filter(clip => clip.id && clip.video_file_path)

      // Prepare music selection
      const selectedMusic = selectedMusicId ? 
        musicTracks.find(track => track.id === selectedMusicId) : null

      // Prepare compilation payload
      const compilationData = {
        selectedClips,
        selectedMusic: selectedMusic ? {
          id: selectedMusic.id,
          file_path: selectedMusic.file_path,
          volume: musicVolume
        } : null,
        settings: {
          transitionType,
          transitionDuration: 1.0,
          musicVolume,
          output_aspect_ratio: outputAspectRatio
        }
      }

      // Get auth token for API call
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('Authentication required')
      }

      // Call video compilation API
      const response = await fetch('/api/compile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(compilationData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to compile video')
      }

      const result = await response.json()
      
      if (result.mock) {
        alert('Lambda function not deployed yet. Check console for compilation payload.')
        console.log('Video compilation payload:', result.payload)
        // Reset UI state for mock response
        setSaving(false)
        if (phaseTimers.phase2) clearTimeout(phaseTimers.phase2)
        if (phaseTimers.phase3) clearTimeout(phaseTimers.phase3)
        setPhaseTimers({})
        setStartTime(null)
        setCurrentPhase('starting')
      } else if (result.status === 'processing') {
        // Start polling for completion status
        console.log('Video compilation started, beginning status polling...')
        if (phaseTimers.phase2) clearTimeout(phaseTimers.phase2) // Clear phase timers, polling will handle phase transitions
        if (phaseTimers.phase3) clearTimeout(phaseTimers.phase3)
        setPhaseTimers({})
        setCurrentPhase('processing')
        await pollVideoStatus(result.video_id, session.access_token)
      } else {
        // Navigate to dashboard Final Videos tab
        router.push('/dashboard?tab=videos')
      }
      
    } catch (error) {
      console.error('Error compiling video:', error)
      alert('Error compiling video: ' + (error instanceof Error ? error.message : 'Unknown error'))
      
      // Ensure UI state is reset on any error
      setSaving(false)
      if (phaseTimers.phase2) clearTimeout(phaseTimers.phase2)
      if (phaseTimers.phase3) clearTimeout(phaseTimers.phase3)
      setPhaseTimers({})
      setStartTime(null)
      setCurrentPhase('starting')
    }
  }

  // Poll video status until completion
  const pollVideoStatus = async (videoId: string, initialAccessToken: string) => {
    const maxAttempts = 60 // Poll for up to 5 minutes (60 * 5 seconds)
    let attempts = 0
    
    console.log('🎬 Starting video status polling:', { videoId, maxAttempts, timestamp: new Date().toISOString() })
    
    const poll = async (): Promise<void> => {
      try {
        attempts++
        console.log(`🔄 Polling attempt ${attempts}/${maxAttempts} at ${new Date().toISOString()}`)
        
        // Get fresh session token for each request to avoid expiration
        const { data: { session } } = await supabase.auth.getSession()
        const currentAccessToken = session?.access_token || initialAccessToken
        console.log('🔐 Using access token:', currentAccessToken ? 'Present' : 'Missing')
        
        const statusUrl = `/api/compile/status?video_id=${videoId}`
        console.log('📞 Making status request to:', statusUrl)
        
        const response = await fetch(statusUrl, {
          headers: {
            'Authorization': `Bearer ${currentAccessToken}`
          }
        })
        
        console.log('📡 Response received:', { 
          status: response.status, 
          statusText: response.statusText, 
          ok: response.ok,
          url: response.url
        })
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error('❌ Status check failed:', response.status, errorText)
          
          // If it's an auth error, try to refresh the session
          if (response.status === 401) {
            console.log('🔄 Authentication failed, attempting to refresh session...')
            const { data: { session: refreshedSession } } = await supabase.auth.getSession()
            if (!refreshedSession) {
              throw new Error('Session expired. Please refresh the page and try again.')
            }
          }
          
          throw new Error(`Failed to check video status: ${response.status} ${errorText}`)
        }
        
        const status = await response.json()
        console.log('📊 Raw API response:', JSON.stringify(status, null, 2))
        console.log('🔍 Status analysis:', {
          'status object': status,
          'status.status': status.status,
          'typeof status.status': typeof status.status,
          'status === completed': status.status === 'completed',
          'status === processing': status.status === 'processing',
          'status === failed': status.status === 'failed',
        })
        
        if (status.status === 'completed') {
          // Video is ready, navigate to dashboard
          console.log('✅ Video compilation completed successfully!')
          console.log('🎯 Final success data:', {
            video_id: status.video_id,
            file_path: status.file_path,
            completed_at: status.completed_at
          })
          
          // Reset UI state before navigation
          setSaving(false)
          setStartTime(null)
          setCurrentPhase('starting')
          
          console.log('🚀 Navigating to dashboard...')
          router.push('/dashboard?tab=videos')
          return
        } else if (status.status === 'failed') {
          console.error('💥 Video compilation failed:', status.error_message)
          throw new Error(status.error_message || 'Video compilation failed')
        } else if (status.status === 'processing') {
          // Still processing, continue polling
          console.log(`⏳ Video still processing (attempt ${attempts}/${maxAttempts})`)
          
          if (attempts < maxAttempts) {
            console.log(`⏰ Scheduling next poll in 5 seconds...`)
            // Switch to finishing phase if we've been processing for a while
            if (attempts > 4) {
              console.log('🏁 Switching to finishing phase')
              setCurrentPhase('finishing')
            }
            setTimeout(poll, 5000) // Poll every 5 seconds
          } else {
            console.error('⏰ Polling timeout reached after 5 minutes')
            throw new Error('Video compilation timed out after 5 minutes')
          }
        } else {
          console.warn('❓ Unexpected status received:', status.status)
          console.log('🤔 Full status object:', status)
          // Continue polling for unexpected statuses
          if (attempts < maxAttempts) {
            console.log(`⏰ Scheduling next poll in 5 seconds for unexpected status...`)
            setTimeout(poll, 5000)
          } else {
            throw new Error(`Unexpected status after ${maxAttempts} attempts: ${status.status}`)
          }
        }
      } catch (error) {
        console.error('💀 Error polling video status:', error)
        console.error('📍 Error details:', {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          attempt: attempts,
          videoId: videoId
        })
        
        alert('Error checking video status: ' + (error instanceof Error ? error.message : 'Unknown error'))
        
        // Reset UI state when polling fails
        setSaving(false)
        setStartTime(null)
        setCurrentPhase('starting')
      }
    }
    
    // Start polling
    console.log('🚀 Starting first poll...')
    poll()
  }

  // Update elapsed time every second during compilation
  useEffect(() => {
    if (!saving || !startTime) return

    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000)
      setElapsedTime(elapsed)
    }, 1000)

    return () => clearInterval(timer)
  }, [saving, startTime])

  if (loading || !supabase) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-100 via-orange-50 to-purple-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          {/* Header Skeleton */}
          <div className="mb-8">
            <div className="h-4 bg-gray-200 rounded w-32 mb-4 animate-pulse" />
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gray-200 rounded-lg animate-pulse" />
              <div>
                <div className="h-8 bg-gray-200 rounded w-80 mb-2 animate-pulse" />
                <div className="h-4 bg-gray-200 rounded w-64 animate-pulse" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Clip Selection Skeleton */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center mb-4">
                  <div className="w-5 h-5 bg-gray-200 rounded mr-2 animate-pulse" />
                  <div className="h-6 bg-gray-200 rounded w-48 animate-pulse" />
                </div>
                <div className="h-4 bg-gray-200 rounded w-64 mb-6 animate-pulse" />
                
                {/* Clips Grid Skeleton */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="border-2 border-gray-200 rounded-lg overflow-hidden">
                      <div className="p-2">
                        <div className="bg-gray-200 rounded overflow-hidden mb-2 w-full animate-pulse" style={{ height: '200px' }} />
                        <div className="h-4 bg-gray-200 rounded w-16 mb-1 animate-pulse" />
                        <div className="h-3 bg-gray-200 rounded w-20 animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Settings Sidebar Skeleton */}
            <div className="space-y-6">
              {/* Aspect Ratio Skeleton */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center mb-4">
                  <div className="w-5 h-5 bg-gray-200 rounded mr-2 animate-pulse" />
                  <div className="h-6 bg-gray-200 rounded w-32 animate-pulse" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-gray-200 rounded-lg animate-pulse" />
                  ))}
                </div>
              </div>

              {/* Music Skeleton */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center mb-4">
                  <div className="w-5 h-5 bg-gray-200 rounded mr-2 animate-pulse" />
                  <div className="h-6 bg-gray-200 rounded w-24 animate-pulse" />
                </div>
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-gray-200 rounded-lg animate-pulse" />
                  ))}
                </div>
              </div>

              {/* Settings Skeleton */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center mb-4">
                  <div className="w-5 h-5 bg-gray-200 rounded mr-2 animate-pulse" />
                  <div className="h-6 bg-gray-200 rounded w-28 animate-pulse" />
                </div>
                <div className="space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-32 animate-pulse" />
                  <div className="h-8 bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 bg-gray-200 rounded w-28 animate-pulse" />
                  <div className="h-6 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>

              {/* Create Button Skeleton */}
              <div className="h-12 bg-gray-200 rounded-lg animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (clips.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-100 via-orange-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 mb-4">
            <Film className="h-16 w-16 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No clips available</h3>
          <p className="text-gray-600 mb-6">
            You need to create some video clips first before you can finalize them
          </p>
          <Link
            href="/create"
            className="inline-flex items-center px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
          >
            Create Your First Clip
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-100 via-orange-50 to-purple-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Dashboard
          </Link>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Film className="h-8 w-8 text-purple-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Create Your Final Video</h1>
              <p className="text-gray-600">Select clips, choose music, and configure your compilation</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Clip Selection */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center mb-4">
                <Play className="h-5 w-5 text-blue-600 mr-2" />
                <h2 className="text-xl font-semibold">Select & Order Your Clips</h2>
              </div>
              <p className="text-gray-600 text-sm mb-4">
                Choose which clips to include in your final video
              </p>
              {/* Instructions */}
              {selectedClipIds.size > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
                  <div className="flex items-center text-blue-700 text-sm">
                    <GripVertical className="h-4 w-4 mr-2" />
                    <span>Drag and drop selected clips to reorder them</span>
                  </div>
                </div>
              )}
              
              {/* Selected Clips (Draggable) */}
              {selectedClipIds.size > 0 && (
                <div className="mb-8">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">
                    Selected Clips ({selectedClipIds.size}) - Video Order:
                  </h3>
                  <div className="space-y-2">
                    {clipOrder.map((clipId, index) => {
                      const clip = clips.find(c => c.id === clipId)
                      if (!clip) return null
                      
                      const isDragging = draggedItem === clipId
                      const isDropZone = dragOverIndex === index
                      
                      return (
                        <div key={clip.id} className="relative">
                          {/* Drop indicator above */}
                          {isDropZone && draggedItem !== clipId && (
                            <div className="h-1 bg-blue-400 rounded-full mb-2 opacity-75" />
                          )}
                          
                          <div
                            data-clip-id={clip.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, clip.id)}
                            onDragOver={(e) => {
                              e.preventDefault()
                              e.dataTransfer.dropEffect = 'move'
                              setDragOverIndex(index)
                            }}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, index)}
                            onDragEnd={handleDragEnd}
                            className={`flex items-center bg-white border-2 rounded-lg p-3 transition-all duration-200 ${
                              isDragging 
                                ? 'border-blue-300 shadow-lg cursor-grabbing opacity-50' 
                                : 'border-gray-200 hover:border-blue-300 hover:shadow-sm cursor-grab'
                            }`}
                          >
                            {/* Drag Handle */}
                            <div className="flex items-center mr-3 text-gray-400 hover:text-gray-600">
                              <GripVertical className="h-5 w-5" />
                            </div>
                            
                            {/* Order Number */}
                            <div className="flex items-center justify-center w-8 h-8 bg-blue-500 text-white text-sm font-bold rounded-full mr-3">
                              {index + 1}
                            </div>
                            
                            {/* Clip Thumbnail */}
                            <div className="w-16 bg-black rounded overflow-hidden mr-3 relative" style={{ height: '64px' }}>
                              {clip.image_url ? (
                                <img
                                  src={clip.image_url}
                                  alt={`Clip ${index + 1}`}
                                  className="absolute inset-0 w-full h-full object-contain"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <Play className="h-4 w-4 text-gray-400" />
                                </div>
                              )}
                            </div>
                            
                            {/* Clip Info */}
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">Clip {clips.findIndex(c => c.id === clip.id) + 1}</div>
                              <div className="text-xs text-gray-500">Position {index + 1} in final video</div>
                            </div>
                            
                            {/* Remove Button */}
                            <button
                              onClick={() => toggleClipSelection(clip.id)}
                              className="ml-3 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Remove from selection"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              
              {/* All Clips Grid */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  All Clips - Click to {selectedClipIds.size > 0 ? 'Add/Remove' : 'Select'}:
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {clips.map((clip, index) => {
                    const isSelected = selectedClipIds.has(clip.id)
                    
                    return (
                      <div
                        key={clip.id}
                        className={`relative border-2 rounded-lg overflow-hidden transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 shadow-md'
                            : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                        }`}
                        onClick={() => toggleClipSelection(clip.id)}
                      >
                        <div className="p-2">
                          <div className="bg-black rounded overflow-hidden mb-2 w-full relative" style={{ height: '200px' }}>
                            {clip.image_url ? (
                              <img
                                src={clip.image_url}
                                alt={`Clip ${index + 1}`}
                                className="absolute inset-0 w-full h-full object-contain"
                                loading={index < 6 ? 'eager' : 'lazy'}
                              />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <Play className="h-6 w-6 text-gray-400" />
                              </div>
                            )}
                          </div>
                          
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">Clip {index + 1}</div>
                            <div className={`text-xs mt-1 ${isSelected ? 'text-blue-600' : 'text-gray-500'}`}>
                              {isSelected ? 'Selected' : 'Click to select'}
                            </div>
                          </div>
                        </div>
                        
                        {/* Checkbox */}
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleClipSelection(clip.id)}
                          className="absolute top-2 right-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 z-20"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
              
              <div className="mt-4 text-sm text-gray-600">
                Selected: {selectedClipIds.size} of {clips.length} clips
              </div>
            </div>
          </div>

          {/* Settings Panel */}
          <div className="space-y-6">
            {/* Create Video Button - Prominent Position */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl shadow-lg p-6 text-white">
              <div className="text-center">
                <Film className="h-8 w-8 mx-auto mb-3" />
                <h3 className="text-lg font-semibold mb-2">Ready to Create?</h3>
                <p className="text-purple-100 text-sm mb-4">
                  {selectedClipIds.size} clips selected
                </p>
                
                {saving ? (
                  <div className="space-y-4">
                    {/* Adaptive Progress Display */}
                    <div className="bg-white/10 rounded-lg p-4 border border-white/20">
                      <div className="flex items-center justify-center mb-3">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent mr-3 flex-shrink-0"></div>
                        <span className="text-sm font-medium">
                          {currentPhase === 'starting' && '🚀 Starting video compilation...'}
                          {currentPhase === 'processing' && `⚙️ Processing ${selectedClipIds.size} clip${selectedClipIds.size > 1 ? 's' : ''}...`}
                          {currentPhase === 'finishing' && '🎬 Almost ready! Finalizing your video...'}
                        </span>
                      </div>
                      
                      {/* Adaptive Progress Bar */}
                      <div className="w-full bg-white/20 rounded-full h-2 mb-2 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-white to-purple-200 h-2 rounded-full transition-all duration-1000 ease-out relative"
                          style={{ 
                            width: (() => {
                              if (!expectedDuration || !startTime) return '2%'
                              const progressPercent = Math.min((elapsedTime / expectedDuration) * 100, 95)
                              // Show actual progress without artificial minimums
                              return Math.max(progressPercent, 2) + '%'  // Only minimum 2% for visibility
                            })()
                          }}
                        >
                          {/* Shimmer effect */}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
                        </div>
                      </div>
                      
                      {/* Real Time Display */}
                      <div className="flex justify-between text-xs text-purple-100">
                        <span>
                          {currentPhase === 'starting' && 'Initializing...'}
                          {currentPhase === 'processing' && 'Compiling...'}
                          {currentPhase === 'finishing' && 'Finalizing...'}
                        </span>
                        <span className="font-mono">
                          {elapsedTime}s elapsed
                          {expectedDuration > 0 && (
                            ` • ${Math.min(Math.round((elapsedTime / expectedDuration) * 100), 95)}%`
                          )}
                        </span>
                      </div>
                    </div>
                    
                    {/* Adaptive Message */}
                    <div className="text-xs text-purple-100 opacity-75 text-center">
                      <div className="flex items-center justify-center mb-1">
                        <div className="w-1 h-1 bg-purple-200 rounded-full animate-pulse mr-1"></div>
                        <div className="w-1 h-1 bg-purple-200 rounded-full animate-pulse mr-1" style={{animationDelay: '0.2s'}}></div>
                        <div className="w-1 h-1 bg-purple-200 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                      </div>
                      Compiling {selectedClipIds.size} clips
                      {selectedMusicId && ' with background music'}. 
                      <br />
                      {expectedDuration > 0 && (
                        expectedDuration > 60 
                          ? `Usually takes ${Math.round(expectedDuration / 60)} minute${Math.round(expectedDuration / 60) > 1 ? 's' : ''}.`
                          : `Usually takes ${Math.round(expectedDuration)} seconds.`
                      )}
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={saveSettings}
                    disabled={selectedClipIds.size === 0}
                    className="w-full bg-white text-purple-600 py-3 px-4 rounded-lg hover:bg-gray-50 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-all duration-200 font-medium"
                  >
                    Create Final Video
                  </button>
                )}
              </div>
            </div>

            {/* Music Selection */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center mb-4">
                <Music className="h-5 w-5 text-green-600 mr-2" />
                <h3 className="text-lg font-semibold">Background Music</h3>
              </div>
              
              <div className="space-y-3">
                <label className="flex items-center p-2 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="music"
                    value=""
                    checked={selectedMusicId === ''}
                    onChange={(e) => setSelectedMusicId(e.target.value)}
                    className="mr-3 text-blue-600"
                  />
                  <span className="text-sm font-medium">No Music</span>
                </label>
                
                {musicTracks.map((track) => (
                  <div key={track.id} className="border rounded-lg p-3 hover:bg-gray-50">
                    <label className="flex items-center justify-between cursor-pointer">
                      <div className="flex items-center">
                        <input
                          type="radio"
                          name="music"
                          value={track.id}
                          checked={selectedMusicId === track.id}
                          onChange={(e) => setSelectedMusicId(e.target.value)}
                          className="mr-3 text-blue-600"
                        />
                        <span className="text-sm font-medium">{track.name}</span>
                      </div>
                      <audio controls className="w-24 h-8">
                        <source src={track.file_url} type="audio/mpeg" />
                      </audio>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Video Settings */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center mb-4">
                <Settings className="h-5 w-5 text-orange-600 mr-2" />
                <h3 className="text-lg font-semibold">Video Settings</h3>
              </div>
              
              <div className="space-y-4">
                {/* Output Aspect Ratio */}
                <div>
                  <label className="block text-sm font-medium mb-3">Final Video Format</label>
                  <div className="grid grid-cols-3 gap-3">
                    <label className="flex flex-col items-center p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                      <input 
                        type="radio" 
                        name="aspectRatio"
                        value="16:9" 
                        checked={outputAspectRatio === '16:9'}
                        onChange={(e) => setOutputAspectRatio(e.target.value as '16:9' | '9:16' | '1:1')}
                        className="mb-2"
                      />
                      <div className="text-center">
                        <div className="text-lg mb-1">🖥️</div>
                        <div className="font-medium text-sm">Landscape</div>
                        <div className="text-xs text-gray-600">16:9 • YouTube</div>
                      </div>
                    </label>
                    
                    <label className="flex flex-col items-center p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                      <input 
                        type="radio" 
                        name="aspectRatio"
                        value="9:16" 
                        checked={outputAspectRatio === '9:16'}
                        onChange={(e) => setOutputAspectRatio(e.target.value as '16:9' | '9:16' | '1:1')}
                        className="mb-2"
                      />
                      <div className="text-center">
                        <div className="text-lg mb-1">📱</div>
                        <div className="font-medium text-sm">Portrait</div>
                        <div className="text-xs text-gray-600">9:16 • TikTok</div>
                      </div>
                    </label>
                    
                    <label className="flex flex-col items-center p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                      <input 
                        type="radio" 
                        name="aspectRatio"
                        value="1:1" 
                        checked={outputAspectRatio === '1:1'}
                        onChange={(e) => setOutputAspectRatio(e.target.value as '16:9' | '9:16' | '1:1')}
                        className="mb-2"
                      />
                      <div className="text-center">
                        <div className="text-lg mb-1">⬜</div>
                        <div className="font-medium text-sm">Square</div>
                        <div className="text-xs text-gray-600">1:1 • Instagram</div>
                      </div>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Transition Type</label>
                  <select
                    value={transitionType}
                    onChange={(e) => setTransitionType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="fade">Fade</option>
                    <option value="cut">Cut</option>
                    <option value="dissolve">Dissolve</option>
                    <option value="slide">Slide</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Music Volume: {Math.round(musicVolume * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={musicVolume}
                    onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Back Button */}
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full bg-gray-500 text-white py-3 px-4 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 