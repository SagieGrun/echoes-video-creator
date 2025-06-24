'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { LoadingButton } from '@/components/ui/LoadingButton'
import { ClipGeneration } from '@/components/generation/ClipGeneration'
import { ArrowLeft, Download, Play, Calendar, Clock, Film, Upload, Plus, Image as ImageIcon, Sparkles, User, ChevronDown, LogOut, CreditCard, Zap, Eye, Timer } from 'lucide-react'
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
  total_duration: number | null
  file_size: number | null
  created_at: string
  completed_at: string | null
}

interface User {
  id: string
  email: string
  credit_balance: number
}

type TabType = 'create' | 'clips' | 'videos'

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [clips, setClips] = useState<Clip[]>([])
  const [finalVideos, setFinalVideos] = useState<FinalVideo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('create')
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchParams = useSearchParams()

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
        // Ensure we're on the client side
        if (typeof window === 'undefined') return
        
        const supabase = createSupabaseBrowserClient()
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session?.user) {
          setError('Please log in to view your dashboard')
          return
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

        // Sort all clips by creation date and generate fresh signed URLs for images
        allClips.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        
        // Generate fresh signed URLs for images and videos using file paths
        const clipsWithFreshUrls = await Promise.all(
          allClips.map(async (clip) => {
            let updatedClip = { ...clip, image_url: '' }

            // Generate fresh signed URL for image
            if (clip.image_file_path) {
              try {
                const { data: signedUrlData, error: urlError } = await supabase.storage
                  .from('private-photos')
                  .createSignedUrl(clip.image_file_path, 3600) // 1 hour expiry

                if (urlError) throw urlError

                if (signedUrlData?.signedUrl) {
                  updatedClip.image_url = signedUrlData.signedUrl
                }
              } catch (error) {
                console.error('Error generating signed URL for image:', clip.id, error)
              }
            }

            // Generate fresh signed URL for video if we have a file path
            if (clip.video_file_path) {
              try {
                const { data: videoSignedUrlData, error: videoUrlError } = await supabase.storage
                  .from('private-photos')
                  .createSignedUrl(clip.video_file_path, 3600) // 1 hour expiry

                if (videoUrlError) throw videoUrlError

                if (videoSignedUrlData?.signedUrl) {
                  updatedClip.video_url = videoSignedUrlData.signedUrl
                }
              } catch (error) {
                console.error('Error generating signed URL for video:', clip.id, error)
              }
            }

            return updatedClip
          })
        )
        
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
          // Generate signed URLs for final videos
                     const finalVideosWithUrls = await Promise.all(
             (finalVideosData || []).map(async (video: any) => {
              let updatedVideo = { ...video }
              
              if (video.file_path && video.status === 'completed') {
                try {
                  const { data: signedUrlData, error: urlError } = await supabase.storage
                    .from('final-videos')
                    .createSignedUrl(video.file_path, 3600) // 1 hour expiry

                  if (!urlError && signedUrlData?.signedUrl) {
                    updatedVideo.file_url = signedUrlData.signedUrl
                  }
                } catch (error) {
                  console.error('Error generating signed URL for final video:', video.id, error)
                }
              }
              
              return updatedVideo
            })
          )
          
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
    if (!video.selected_clips || !Array.isArray(video.selected_clips)) return []
    
    return video.selected_clips
      .map(clipId => clips.find(clip => clip.id === clipId))
      .filter(clip => clip && clip.image_url)
      .slice(0, 4) // Max 4 images for thumbnail
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
                  src="/echoes-logo.png" 
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
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <div className="flex items-center justify-center mb-4">
                  <Link href="/" className="flex items-center mr-2 hover:opacity-80 transition-opacity">
                    <img 
                      src="/echoes-logo.png" 
                      alt="Echoes Logo" 
                      className="h-6 w-6"
                    />
                  </Link>
                  <Sparkles className="h-6 w-6 text-orange-500 mr-2" />
                  <h2 className="text-2xl font-bold text-gray-900">
                    Create Your Video Clip
                  </h2>
                </div>
                <p className="text-center text-gray-600 mb-6">
                  Transform your photo into a cinematic moment. Your first clip is free!
                </p>
                
                <ClipGeneration user={user} />
              </div>

              {/* Improved Tips Section */}
              <div className="mt-8 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    💡 Quick Tips for Best Results
                  </h3>
                  <p className="text-sm text-gray-600">Follow these guidelines to create amazing video clips</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Eye className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">High-Quality Photos</h4>
                      <p className="text-sm text-gray-600">Use clear, well-lit images for best results</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 p-4 bg-orange-50 rounded-lg">
                    <div className="flex-shrink-0 w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                      <Timer className="h-4 w-4 text-orange-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">~30 Second Generation</h4>
                      <p className="text-sm text-gray-600">AI processing takes about 30 seconds</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 p-4 bg-purple-50 rounded-lg">
                    <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <Zap className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">1 Credit Per Clip</h4>
                      <p className="text-sm text-gray-600">Each generation uses one credit</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 p-4 bg-green-50 rounded-lg">
                    <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <CreditCard className="h-4 w-4 text-green-600" />
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
                        <img
                          src={clip.image_url}
                          alt=""
                          className="w-full h-full object-cover"
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
                        <div className="text-xs text-blue-600 mt-1">
                          {clip.status === 'processing' ? 'Generating...' : 'Queued'}
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
                      <div className="aspect-square relative">
                        {clip.video_url ? (
                          <video
                            src={clip.video_url}
                            poster={clip.image_url || undefined}
                            controls
                            className="w-full h-full object-cover"
                            preload="metadata"
                          />
                        ) : clip.image_url ? (
                          <img
                            src={clip.image_url}
                            alt={`Clip ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                            <ImageIcon className="h-8 w-8 text-gray-400" />
                          </div>
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
                        <div className="text-xs text-green-600">
                          ✓ Completed
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {processingFinalVideos.map((video) => (
                    <div key={video.id} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                      <div className="aspect-video bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center">
                        <div className="text-center">
                          <LoadingSpinner size="lg" className="text-purple-600 mb-2 mx-auto" />
                          <p className="text-sm text-gray-600 font-medium">Compiling Video...</p>
                          <p className="text-xs text-gray-500 mt-1">{video.selected_clips?.length || 0} clips</p>
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="text-xs text-gray-500 flex items-center mb-1">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatDate(video.created_at)}
                        </div>
                        <div className="text-xs text-purple-600">
                          Processing {video.selected_clips?.length || 0} clips
                        </div>
                      </div>
                    </div>
                  ))}
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {completedFinalVideos.map((video) => {
                    const clipImages = getClipImages(video)
                    return (
                      <div key={video.id} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-shadow">
                        <div id={`video-${video.id}`} className="aspect-video relative bg-gray-100 group">
                          {clipImages.length > 0 ? (
                            <>
                              {/* Multi-image thumbnail grid */}
                              <div className="w-full h-full grid grid-cols-2 gap-0.5 p-1">
                                {clipImages.slice(0, 4).map((clip, idx) => (
                                  <div key={idx} className="relative bg-gray-200 rounded-sm overflow-hidden">
                                    <img
                                      src={clip?.image_url || ''}
                                      alt=""
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                ))}
                                {clipImages.length < 4 && 
                                  Array.from({ length: 4 - clipImages.length }).map((_, idx) => (
                                    <div key={`empty-${idx}`} className="bg-gray-200 rounded-sm"></div>
                                  ))
                                }
                              </div>
                              
                              {/* Play button overlay */}
                              {video.file_url && (
                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <button
                                    onClick={() => {
                                      const videoElement = document.createElement('video');
                                      videoElement.src = video.file_url!;
                                      videoElement.controls = true;
                                      videoElement.className = 'w-full h-full object-cover';
                                      videoElement.play();
                                      
                                      // Replace thumbnail with video
                                      const container = document.getElementById(`video-${video.id}`);
                                      if (container) {
                                        container.innerHTML = '';
                                        container.appendChild(videoElement);
                                      }
                                    }}
                                    className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-colors"
                                  >
                                    <Play className="h-8 w-8 text-gray-800 ml-1" />
                                  </button>
                                </div>
                              )}
                            </>
                          ) : video.file_url ? (
                            <video
                              src={video.file_url}
                              controls
                              className="w-full h-full object-cover"
                              preload="metadata"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Film className="h-8 w-8 text-gray-400" />
                            </div>
                          )}
                          <div className="absolute top-2 left-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              Final Video
                            </span>
                      </div>
                    </div>
                    <div className="p-4">
                          <div className="mb-3">
                            <p className="text-sm font-medium text-gray-900">
                              {video.selected_clips?.length || 0} clips • {video.transition_type} transitions
                            </p>
                            <p className="text-xs text-gray-500">
                              {video.music_track_id && '🎵 With music • '}
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
                        <LoadingButton
                          onClick={() => {
                            if (navigator.share) {
                              navigator.share({
                                    title: 'Check out my final video!',
                                    url: video.file_url!
                              })
                            } else {
                                  navigator.clipboard.writeText(video.file_url!)
                            }
                          }}
                          variant="secondary"
                          size="sm"
                              className="px-3"
                        >
                          Share
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
    </div>
  )
} 