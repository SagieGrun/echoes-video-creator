'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { LoadingButton } from '@/components/ui/LoadingButton'
import { ClipGeneration } from '@/components/generation/ClipGeneration'
import { VideoPlayer } from '@/components/ui/VideoPlayer'
import { OptimizedImage } from '@/components/ui/OptimizedImage'
import { SocialShare } from '@/components/ui/SocialShare'
import { generateClipUrls, generateVideoUrls } from '@/lib/storage-optimizer'
import { ArrowLeft, Download, Play, Calendar, Clock, Film, Upload, Plus, Image as ImageIcon, Sparkles, User, ChevronDown, LogOut, CreditCard, Zap, Eye, Timer, Trash2, X } from 'lucide-react'
import Link from 'next/link'

interface Clip {
  id: string
  project_id: string
  image_url: string
  image_file_path: string
  video_url: string | null
  video_file_path: string | null
  prompt: string | null
  status: 'pending' | 'processing' | 'completed' | 'failed'
  created_at: string
  updated_at: string
}

interface FinalVideo {
  id: string
  project_id: string
  user_id: string
  selected_clips: any[]
  music_track_id: string | null
  transition_type: string
  music_volume: number
  status: 'draft' | 'processing' | 'completed' | 'failed'
  file_url: string | null
  file_path: string | null
  public_url: string | null
  total_duration: number | null
  file_size: number | null
  output_aspect_ratio?: string
  created_at: string
  completed_at: string | null
}

interface User {
  id: string
  email: string
  credit_balance: number
}

type TabType = 'create' | 'clips' | 'videos'

function DashboardContent() {
  const [user, setUser] = useState<User | null>(null)
  const [clips, setClips] = useState<Clip[]>([])
  const [finalVideos, setFinalVideos] = useState<FinalVideo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('clips')
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchParams = useSearchParams()
  const [deletingVideoId, setDeletingVideoId] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [deletingClipId, setDeletingClipId] = useState<string | null>(null)
  const [showDeleteClipConfirm, setShowDeleteClipConfirm] = useState<string | null>(null)

  // Handle tab parameter from URL
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam && ['create', 'clips', 'videos'].includes(tabParam)) {
      setActiveTab(tabParam as TabType)
    }
  }, [searchParams])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        const supabase = createSupabaseBrowserClient()
        
        // Get current session and refresh if needed
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Session error:', sessionError)
          throw new Error('Authentication failed')
        }
        
        if (!session) {
          throw new Error('Not authenticated')
        }
        
        // Refresh session if it's close to expiring (within 5 minutes)
        const now = Math.floor(Date.now() / 1000)
        const expiresAt = session.expires_at || 0
        const timeUntilExpiry = expiresAt - now
        
        if (timeUntilExpiry < 300) { // Less than 5 minutes
          console.log('Refreshing session as it expires soon')
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
          if (refreshError) {
            console.error('Session refresh error:', refreshError)
          } else if (refreshData.session) {
            console.log('Session refreshed successfully')
          }
        }

        // Fetch user profile
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, email, credit_balance')
          .eq('id', session.user.id)
          .single()

        if (userError || !userData) {
          setError('Failed to load user profile')
          return
        }

        setUser(userData)

        // Fetch clips using the clip-details Edge Function approach
        // First, get all projects for this user
        const { data: projects, error: projectsError } = await supabase
          .from('projects')
          .select('id')
          .eq('user_id', session.user.id)

        if (projectsError) {
          console.error('Error fetching projects:', projectsError)
          setError('Failed to load your projects')
          return
        }

        if (!projects || projects.length === 0) {
          setClips([])
          return
        }

        // Then get clips for each project
        const allClips: Clip[] = []
        for (const project of projects) {
          const { data: projectClips, error: clipsError } = await supabase
            .from('clips')
            .select(`
              id,
              project_id,
              image_url,
              image_file_path,
              video_url,
              video_file_path,
              prompt,
              status,
              created_at,
              updated_at
            `)
            .eq('project_id', project.id)
            .order('created_at', { ascending: false })

          if (!clipsError && projectClips) {
            allClips.push(...projectClips)
          }
        }

        // Sort all clips by creation date
        allClips.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        
        // Generate fresh signed URLs using optimized batch approach
        const clipUrls = await generateClipUrls(allClips)
        
        // Merge URLs back into clips
        const clipsWithFreshUrls = allClips.map((clip) => {
          const urlData = clipUrls.find(u => u.id === clip.id)
          return {
            ...clip,
            image_url: urlData?.image_url || '',
            video_url: urlData?.video_url || null
          }
        })
        
        console.log('Dashboard clips with fresh URLs:', clipsWithFreshUrls.map(clip => ({
          id: clip.id,
          status: clip.status,
          has_fresh_url: clip.image_url?.includes('token='),
          image_file_path: clip.image_file_path
        })))
        
        setClips(clipsWithFreshUrls)

        // Fetch final videos
        const { data: finalVideosData, error: finalVideosError } = await supabase
          .from('final_videos')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })

        if (finalVideosError) {
          console.error('Error fetching final videos:', finalVideosError)
        } else {
          console.log('Final videos from database:', finalVideosData?.map((v: any) => ({
            id: v.id,
            status: v.status,
            public_url: v.public_url,
            file_path: v.file_path,
            created_at: v.created_at
          })))
          
          // Use public URLs directly - no need for signed URL generation
          const finalVideosWithUrls = (finalVideosData || []).map((video: any) => ({
            ...video,
            file_url: video.public_url || null // Use public_url directly
          }))
          
          console.log('Final videos with public URLs:', finalVideosWithUrls.map((v: any) => ({
            id: v.id,
            has_file_url: !!v.file_url,
            file_url_preview: v.file_url?.substring(0, 100) + '...'
          })))
          
          setFinalVideos(finalVideosWithUrls)
        }

      } catch (error) {
        console.error('Error fetching user data:', error)
        setError('Failed to load dashboard')
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserData()
  }, [])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      completed: { color: 'bg-green-100 text-green-800', text: 'Completed' },
      processing: { color: 'bg-blue-100 text-blue-800', text: 'Processing' },
      pending: { color: 'bg-yellow-100 text-yellow-800', text: 'Pending' },
      failed: { color: 'bg-red-100 text-red-800', text: 'Failed' }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    )
  }

  const handleLogout = async () => {
    try {
      const supabase = createSupabaseBrowserClient()
      await supabase.auth.signOut()
      window.location.href = '/login'
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-100 via-orange-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mb-4 mx-auto" />
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-100 via-orange-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center text-orange-600 hover:text-orange-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  const completedClips = clips.filter(clip => clip.status === 'completed' && clip.image_url)
  const processingClips = clips.filter(clip => (clip.status === 'processing' || clip.status === 'pending'))
  const completedFinalVideos = finalVideos.filter(video => video.status === 'completed' && video.file_url)
  const processingFinalVideos = finalVideos.filter(video => video.status === 'processing')

  const tabs = [
    { id: 'create' as TabType, label: 'Create New', icon: Plus },
    { id: 'clips' as TabType, label: 'Clip Library', icon: ImageIcon },
    { id: 'videos' as TabType, label: 'Final Videos', icon: Film }
  ]

  // Helper function to create multi-image thumbnail for final videos
  const getClipImages = (video: FinalVideo) => {
    if (!video.selected_clips || !Array.isArray(video.selected_clips)) {
      console.log(`No selected_clips for video ${video.id}:`, video.selected_clips)
      return []
    }
    
    console.log(`Getting clip images for video ${video.id}:`, {
      selected_clips: video.selected_clips,
      total_clips_available: clips.length,
      clips_with_images: clips.filter(c => c.image_url).length
    })
    
    const matchedClips = video.selected_clips
      .map(clipData => {
        // Handle both formats: string clipId or object {clip_id, order}
        const clipId = typeof clipData === 'string' ? clipData : clipData?.clip_id
        const foundClip = clips.find(clip => clip.id === clipId)
        
        if (!foundClip) {
          console.log(`Clip not found for ID: ${clipId}`)
        } else if (!foundClip.image_url) {
          console.log(`Clip found but no image_url: ${clipId}`)
        } else {
          console.log(`Clip found with image_url: ${clipId} has_image_url: true`)
        }
        
        return foundClip
      })
      .filter(Boolean)
    
    console.log(`Matched ${matchedClips.length} clips for video ${video.id}`)
    return matchedClips
  }

  const handleDeleteVideo = async (videoId: string) => {
    try {
      setDeletingVideoId(videoId)
      
      const supabase = createSupabaseBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('Not authenticated')
      }
      
      // Call the secure delete API endpoint with authorization header
      const response = await fetch('/api/videos/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ videoId }),
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete video')
      }
      
      console.log(`Successfully deleted video ${videoId}`)
      
      // Only update UI state after successful API call
      setFinalVideos(prevVideos => prevVideos.filter(video => video.id !== videoId))
      setShowDeleteConfirm(null)
      
    } catch (error) {
      console.error('Error deleting video:', error)
      setError(error instanceof Error ? error.message : 'Failed to delete video')
      setShowDeleteConfirm(null)
      // Don't update videos state on error - keep the video visible
    } finally {
      setDeletingVideoId(null)
    }
  }

  const handleDeleteClip = async (clipId: string) => {
    try {
      setDeletingClipId(clipId)
      
      const supabase = createSupabaseBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('Not authenticated')
      }
      
      // Call the secure delete API endpoint with authorization header
      const response = await fetch('/api/clips/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ clipId }),
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete clip')
      }
      
      console.log(`Successfully deleted clip ${clipId}`)
      
      // Only update UI state after successful API call
      setClips(prevClips => prevClips.filter(clip => clip.id !== clipId))
      setShowDeleteClipConfirm(null)
      
    } catch (error) {
      console.error('Error deleting clip:', error)
      setError(error instanceof Error ? error.message : 'Failed to delete clip')
      setShowDeleteClipConfirm(null)
      // Don't update clips state on error - keep the clip visible
    } finally {
      setDeletingClipId(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-100 via-orange-50 to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
              <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
                <img 
                  src="echoes-logo.png" 
                  alt="Echoes Logo" 
                  className="h-8 w-8"
                />
                <h1 className="text-3xl font-bold text-gray-900">Your Dashboard</h1>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Credits</span>
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
                <span className="text-2xl font-bold text-blue-600">{user?.credit_balance}</span>
              </div>
              {user?.credit_balance === 0 && (
                <button
                  onClick={() => setActiveTab('create')}
                  className="text-sm bg-orange-500 text-white px-3 py-1 rounded-lg hover:bg-orange-600 transition-colors"
                >
                  Buy Credits
                </button>
              )}
              
              {/* User Profile Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="flex items-center space-x-2 bg-white border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-gray-600" />
                  </div>
                  <ChevronDown className="h-4 w-4 text-gray-600" />
                </button>
                
                {showUserDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-10">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900 truncate">{user?.email}</p>
                      <p className="text-xs text-gray-500">{user?.credit_balance} credits</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <LogOut className="h-4 w-4 mr-3" />
                      Logout
                    </button>
                  </div>
              )}
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
                      activeTab === tab.id
                        ? 'border-orange-500 text-orange-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'create' && (
          <div className="space-y-8">
            {/* Embedded Create Page Content */}
            <div className="max-w-2xl mx-auto">
              <div className="bg-gradient-to-br from-orange-50 via-orange-25 to-purple-50 rounded-2xl shadow-xl p-6 border border-orange-100">
                <div className="flex items-center justify-center mb-4">
                  <Link href="/" className="flex items-center mr-2 hover:opacity-80 transition-opacity">
                    <img 
                      src="echoes-logo.png" 
                      alt="Echoes Logo" 
                      className="h-6 w-6"
                    />
                  </Link>
                  <Sparkles className="h-6 w-6 text-orange-500 mr-2" />
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-purple-600 bg-clip-text text-transparent">
                    Create Your Video Clip
                  </h2>
                </div>
                <p className="text-center text-gray-700 mb-6">
                  Transform your photo into a cinematic moment. Your first clip is free!
                </p>
                
                <ClipGeneration 
                  user={user} 
                  onClipCompleted={() => {
                    // Refresh dashboard data when clip generation completes
                    console.log('Clip generation completed, refreshing dashboard data...')
                    // Re-fetch data to show the new clip immediately
                    window.location.reload() // Simple but effective solution
                  }}
                />
              </div>

              {/* Improved Tips Section */}
              <div className="mt-8 bg-gradient-to-br from-orange-50 via-purple-25 to-purple-50 rounded-2xl shadow-sm border border-orange-100 p-6">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold bg-gradient-to-r from-orange-600 to-purple-600 bg-clip-text text-transparent mb-2">
                    💡 Quick Tips for Best Results
                  </h3>
                  <p className="text-sm text-gray-600">Follow these guidelines to create amazing video clips</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start space-x-3 p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg border border-orange-200">
                    <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-500 rounded-full flex items-center justify-center">
                      <Eye className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">High-Quality Photos</h4>
                      <p className="text-sm text-gray-600">Use clear, well-lit images for best results</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
                    <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-purple-400 to-purple-500 rounded-full flex items-center justify-center">
                      <Timer className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">~30 Second Generation</h4>
                      <p className="text-sm text-gray-600">AI processing takes about 30 seconds</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 p-4 bg-gradient-to-br from-orange-50 via-orange-100 to-purple-100 rounded-lg border border-orange-200">
                    <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-orange-500 to-purple-500 rounded-full flex items-center justify-center">
                      <Zap className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">1 Credit Per Clip</h4>
                      <p className="text-sm text-gray-600">Each generation uses one credit</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 p-4 bg-gradient-to-br from-purple-50 via-purple-100 to-orange-100 rounded-lg border border-purple-200">
                    <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-purple-500 to-orange-500 rounded-full flex items-center justify-center">
                      <CreditCard className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">First Clip Free</h4>
                      <p className="text-sm text-gray-600">Try it out with no cost</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'clips' && (
          <div className="space-y-8">
        {/* Processing Clips */}
        {processingClips.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-700 mb-4">Currently Processing</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {processingClips.map((clip) => (
                <div key={clip.id} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                      <div className="aspect-square bg-gradient-to-br from-blue-100 to-orange-100 flex items-center justify-center relative">
                    {clip.image_url ? (
                      <>
                        <OptimizedImage
                          src={clip.image_url}
                          alt=""
                          className="w-full h-full"
                          fallbackIcon={<ImageIcon className="h-8 w-8" />}
                        />
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <div className="text-center">
                                <LoadingSpinner size="md" className="text-white mb-2 mx-auto" />
                                <p className="text-xs text-white font-medium">Processing...</p>
                          </div>
                        </div>
                          </>
                        ) : (
                          <div className="text-center">
                            <LoadingSpinner size="md" className="text-blue-500 mb-2 mx-auto" />
                            <p className="text-xs text-gray-600 font-medium">Processing...</p>
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <div className="text-xs text-gray-500 flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatDate(clip.created_at)}
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-blue-600">
                            {clip.status === 'processing' ? 'Generating...' : 'Queued'}
                          </div>
                          <LoadingButton
                            onClick={() => setShowDeleteClipConfirm(clip.id)}
                            variant="secondary"
                            size="sm"
                            className="px-2 py-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                            disabled={deletingClipId === clip.id}
                            loading={deletingClipId === clip.id}
                          >
                            <Trash2 className="h-3 w-3" />
                          </LoadingButton>
                        </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completed Clips */}
            {completedClips.length > 0 ? (
        <div>
                {/* Create Final Video Section */}
                <div className="mb-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <Film className="h-5 w-5 text-purple-600" />
            </div>
                  <div>
                        <h3 className="font-semibold text-gray-900">Ready to Create Your Final Video?</h3>
                        <p className="text-sm text-gray-600">
                          Combine your clips with music and transitions to create a professional video compilation
                        </p>
                      </div>
                  </div>
                  <Link
                    href="/finalize"
                      className="inline-flex items-center px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium"
                  >
                      <Film className="h-4 w-4 mr-2" />
                    Create Final Video
                  </Link>
                </div>
              </div>

                <h3 className="text-lg font-medium text-gray-700 mb-4">
                  Your Clip Library ({completedClips.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {completedClips.map((clip, index) => (
                  <div key={clip.id} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-shadow">
                      <div className="relative bg-black rounded-t-xl overflow-hidden min-h-[200px] max-h-[320px] flex items-center justify-center">
                        {clip.video_url ? (
                          <VideoPlayer
                            src={clip.video_url}
                            poster={clip.image_url || undefined}
                            showControls={true}
                            className="w-full h-full object-contain"
                            preload="metadata"
                            width={300}
                            height={300}
                          />
                        ) : (
                          <OptimizedImage
                            src={clip.image_url}
                            alt={`Clip ${index + 1}`}
                            className="w-full h-full object-contain"
                            fallbackIcon={<ImageIcon className="h-8 w-8" />}
                            priority={index < 4} // Prioritize first 4 clips for above-the-fold loading
                            width={300}
                            height={300}
                          />
                        )}
                        <div className="absolute top-2 left-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            AI Clip
                          </span>
                        </div>
                      </div>
                      <div className="p-3">
                        <div className="text-xs text-gray-500 flex items-center mb-1">
                          <Calendar className="h-3 w-3 mr-1" />
                          {formatDate(clip.updated_at)}
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-green-600">
                            ✓ Completed
                          </div>
                          <LoadingButton
                            onClick={() => setShowDeleteClipConfirm(clip.id)}
                            variant="secondary"
                            size="sm"
                            className="px-2 py-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                            disabled={deletingClipId === clip.id}
                            loading={deletingClipId === clip.id}
                          >
                            <Trash2 className="h-3 w-3" />
                          </LoadingButton>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                        </div>
                      ) : (
              <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
                <div className="text-gray-400 mb-4">
                  <ImageIcon className="h-16 w-16 mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No clips yet</h3>
                <p className="text-gray-600 mb-6">
                  Upload your first photo to create AI-generated video clips
                </p>
                <button
                  onClick={() => setActiveTab('create')}
                  className="inline-flex items-center px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
                >
                  <Upload className="h-5 w-5 mr-2" />
                  Upload Photo
                </button>
                          </div>
            )}
                        </div>
                      )}

        {activeTab === 'videos' && (
          <div className="space-y-8">
            {/* Processing Final Videos */}
            {processingFinalVideos.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-700 mb-4">Currently Compiling</h3>
                <div className="flex flex-wrap gap-6 justify-center lg:justify-start">
                  {processingFinalVideos.map((video) => {
                    // Processing videos default to landscape since we don't know the aspect ratio yet
                    const processingCardStyle = { width: '400px', height: 'auto' }
                    const processingVideoStyle = { aspectRatio: '16/9' }
                    
                    return (
                      <div key={video.id} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 flex flex-col" style={processingCardStyle}>
                        <div className="bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center" style={processingVideoStyle}>
                          <div className="text-center">
                            <LoadingSpinner size="lg" className="text-purple-600 mb-2 mx-auto" />
                            <p className="text-sm text-gray-600 font-medium">Compiling Video...</p>
                            <p className="text-xs text-gray-500 mt-1">{video.selected_clips?.length || 0} clips</p>
                          </div>
                        </div>
                        <div className="p-4 flex-shrink-0">
                          <div className="text-xs text-gray-500 flex items-center mb-1">
                            <Clock className="h-3 w-3 mr-1" />
                            {formatDate(video.created_at)}
                          </div>
                          <div className="text-xs text-purple-600">
                            Processing {video.selected_clips?.length || 0} clips
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Create Another Final Video CTA */}
            {completedClips.length > 0 && (
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <Film className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Ready to Create Another Final Video?</h3>
                      <p className="text-sm text-gray-600">Combine your clips with music and transitions to create a professional video compilation</p>
                    </div>
                  </div>
                  <Link
                    href="/finalize"
                    className="inline-flex items-center px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium"
                  >
                    <Film className="h-4 w-4 mr-2" />
                    Create Final Video
                  </Link>
                </div>
              </div>
            )}

            {/* Completed Final Videos */}
            {completedFinalVideos.length > 0 ? (
              <div>
                <h3 className="text-lg font-medium text-gray-700 mb-4">
                  Your Final Videos ({completedFinalVideos.length})
                </h3>
                <div className="flex flex-wrap gap-6 justify-center lg:justify-start">
                  {completedFinalVideos.map((video) => {
                    const clipImages = getClipImages(video)
                    
                    // Define card dimensions based on aspect ratio
                    const getCardStyle = () => {
                      if (video.output_aspect_ratio === '9:16') {
                        // Portrait: Adjusted width to account for metadata section
                        return { width: '300px', height: 'auto' }
                      } else if (video.output_aspect_ratio === '1:1') {
                        // Square: Equal width and height
                        return { width: '340px', height: 'auto' }
                      } else {
                        // Landscape/Default: Wide and short
                        return { width: '420px', height: 'auto' }
                      }
                    }
                    
                    const getVideoContainerStyle = () => {
                      if (video.output_aspect_ratio === '9:16') {
                        // Portrait: Slightly shorter to account for metadata making total card more proportional
                        return { aspectRatio: '10/16' }
                      } else if (video.output_aspect_ratio === '1:1') {
                        return { aspectRatio: '1/1' }
                      } else {
                        return { aspectRatio: '16/9' }
                      }
                    }
                    
                    return (
                      <div 
                        key={video.id} 
                        className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-shadow flex flex-col"
                        style={getCardStyle()}
                      >
                        <div 
                          className="bg-black overflow-hidden relative flex items-center justify-center"
                          style={getVideoContainerStyle()}
                        >
                          {video.file_url ? (
                            <VideoPlayer
                              src={video.file_url}
                              className="absolute inset-0 w-full h-full object-contain"
                              thumbnailWithControls={true}
                              preload="metadata"
                              thumbnailContent={
                                clipImages.length > 0 ? (
                                  clipImages.length === 1 ? (
                                    // Single clip: Fill entire thumbnail
                                    <div className="w-full h-full">
                                      <OptimizedImage
                                        src={clipImages[0]?.image_url}
                                        alt=""
                                        className="w-full h-full object-cover"
                                        fallbackIcon={<Film className="h-8 w-8" />}
                                        width={400}
                                        height={400}
                                        onError={() => {
                                          console.log(`Failed to load image for clip ${clipImages[0]?.id}:`, clipImages[0]?.image_url)
                                        }}
                                      />
                                    </div>
                                  ) : (
                                    // Multiple clips: Grid layout
                                    <div className={`w-full h-full ${
                                      video.output_aspect_ratio === '9:16' 
                                        ? clipImages.length <= 2 
                                          ? 'grid grid-cols-2 grid-rows-1' // Portrait: 2 columns, 1 row (side by side vertical strips)
                                          : 'grid grid-cols-2 grid-rows-2' // Portrait: 2x2 grid (better for portrait images)
                                        : video.output_aspect_ratio === '1:1'
                                        ? clipImages.length <= 2
                                          ? 'grid grid-cols-2 grid-rows-1' // Square: 2 columns, 1 row for 2 clips
                                          : 'grid grid-cols-2 grid-rows-2' // Square: 2x2 grid for 3+ clips
                                        : clipImages.length <= 2
                                        ? 'grid grid-cols-2 grid-rows-1' // Landscape: 2 columns, 1 row for 2 clips
                                        : 'grid grid-cols-2 grid-rows-2' // Landscape: 2x2 grid for 3+ clips
                                    }`}>
                                      {clipImages.slice(0, Math.min(clipImages.length, 4)).map((clip, idx) => {
                                        // For mixed aspect ratios, use smart object-fit based on final video format
                                        const getClipObjectFit = () => {
                                          // If final video is portrait, prioritize showing full height of clips
                                          if (video.output_aspect_ratio === '9:16') {
                                            return 'object-cover' // Fill the grid cell completely
                                          }
                                          // For square and landscape final videos, balance coverage and visibility
                                          return 'object-cover'
                                        }
                                        
                                        return (
                                          <div key={idx} className="relative bg-gray-800 overflow-hidden">
                                            <OptimizedImage
                                              src={clip?.image_url}
                                              alt=""
                                              className={`w-full h-full ${getClipObjectFit()}`}
                                              fallbackIcon={<Film className="h-6 w-6" />}
                                              width={200}
                                              height={200}
                                              onError={() => {
                                                console.log(`Failed to load image for clip ${clip?.id}:`, clip?.image_url)
                                              }}
                                            />
                                            {/* Add subtle aspect ratio indicator for mixed content */}
                                            {clipImages.length > 1 && (
                                              <div className="absolute top-1 right-1 w-2 h-2 bg-white/30 rounded-full opacity-60" />
                                            )}
                                          </div>
                                        )
                                      })}
                                      {/* Fill remaining slots with "+" indicator if more clips exist */}
                                      {clipImages.length > 4 && (
                                        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                                          +{clipImages.length - 4}
                                        </div>
                                      )}
                                    </div>
                                  )
                                ) : (
                                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                    <Film className="h-12 w-12 text-gray-400" />
                                  </div>
                                )
                              }
                            />
                          ) : (
                            <div className="absolute inset-0 w-full h-full flex items-center justify-center">
                              <Film className="h-8 w-8 text-gray-400" />
                            </div>
                          )}
                          <div className="absolute top-2 left-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              Final Video
                            </span>
                          </div>
                        </div>
                        <div className="p-4 flex-shrink-0">
                          <div className="mb-3">
                            <p className="text-sm font-medium text-gray-900">
                              {video.selected_clips?.length || 0} clips • {video.transition_type} transitions
                            </p>
                            <p className="text-xs text-gray-500">
                              {video.music_track_id && '🎵 With music • '}
                              {video.output_aspect_ratio ? (
                                <>
                                  {video.output_aspect_ratio === '9:16' && '📱 Portrait • '}
                                  {video.output_aspect_ratio === '16:9' && '🖥️ Landscape • '}
                                  {video.output_aspect_ratio === '1:1' && '⬜ Square • '}
                                </>
                              ) : (
                                '🖥️ Legacy • ' // For older videos without aspect ratio data
                              )}
                              {video.file_size && `${(video.file_size / (1024 * 1024)).toFixed(1)} MB`}
                            </p>
                          </div>
                          <div className="text-xs text-gray-500 flex items-center mb-3">
                          <Calendar className="h-3 w-3 mr-1" />
                            {formatDate(video.completed_at || video.created_at)}
                      </div>
                      <div className="flex gap-2">
                        <LoadingButton
                              onClick={() => window.open(video.file_url!, '_blank')}
                          variant="primary"
                          size="sm"
                          className="flex-1"
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </LoadingButton>
                        <SocialShare 
                          videoId={video.id}
                          title="Check out my final video!"
                        />
                        <LoadingButton
                          onClick={() => setShowDeleteConfirm(video.id)}
                          variant="secondary"
                          size="sm"
                          className="px-3 text-red-600 hover:text-red-700 hover:bg-red-50"
                          disabled={deletingVideoId === video.id}
                          loading={deletingVideoId === video.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </LoadingButton>
                      </div>
                    </div>
                  </div>
                    )
                  })}
                </div>
              </div>
            ) : null}

            {/* Empty State */}
            {completedFinalVideos.length === 0 && (
              <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
                <div className="text-gray-400 mb-4">
                  <Film className="h-16 w-16 mx-auto" />
        </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No final videos yet</h3>
                <p className="text-gray-600 mb-6">
                  Combine your clips with music to create professional video compilations
                </p>
                {completedClips.length > 0 ? (
          <Link
                    href="/finalize"
                    className="inline-flex items-center px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium"
          >
                    <Film className="h-5 w-5 mr-2" />
                    Create Final Video
          </Link>
                ) : (
                  <div className="text-sm text-gray-500">
                    Upload photos and create clips first
                  </div>
                )}
              </div>
            )}
        </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Delete Final Video</h3>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-600">
                Are you sure you want to delete this final video? This action cannot be undone.
              </p>
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">
                  <strong>Warning:</strong> This will permanently remove the video from your account and storage.
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                disabled={deletingVideoId === showDeleteConfirm}
              >
                Cancel
              </button>
              <LoadingButton
                onClick={() => handleDeleteVideo(showDeleteConfirm)}
                variant="secondary"
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white"
                disabled={deletingVideoId === showDeleteConfirm}
                loading={deletingVideoId === showDeleteConfirm}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Video
              </LoadingButton>
            </div>
          </div>
        </div>
      )}

      {/* Delete Clip Confirmation Dialog */}
      {showDeleteClipConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Delete Clip</h3>
              <button
                onClick={() => setShowDeleteClipConfirm(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-600">
                Are you sure you want to delete this clip? This action cannot be undone.
              </p>
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">
                  <strong>Warning:</strong> This will permanently remove the clip from your account and storage.
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteClipConfirm(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                disabled={deletingClipId === showDeleteClipConfirm}
              >
                Cancel
              </button>
              <LoadingButton
                onClick={() => handleDeleteClip(showDeleteClipConfirm)}
                variant="secondary"
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white"
                disabled={deletingClipId === showDeleteClipConfirm}
                loading={deletingClipId === showDeleteClipConfirm}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Clip
              </LoadingButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <DashboardContent />
    </Suspense>
  )
} 