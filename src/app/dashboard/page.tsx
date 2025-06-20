'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { LoadingButton } from '@/components/ui/LoadingButton'
import { ArrowLeft, Download, Play, Calendar, Clock, Film } from 'lucide-react'
import Link from 'next/link'

interface Clip {
  id: string
  project_id: string
  image_url: string
  image_file_path: string
  video_url: string | null
  prompt: string | null
  status: 'pending' | 'processing' | 'completed' | 'failed'
  created_at: string
  updated_at: string
}

interface User {
  id: string
  email: string
  credit_balance: number
}



export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [clips, setClips] = useState<Clip[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-100 via-orange-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mb-4" />
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
          <Link
            href="/create"
            className="inline-flex items-center text-orange-600 hover:text-orange-700"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Create
          </Link>
        </div>
      </div>
    )
  }

  const completedClips = clips.filter(clip => clip.status === 'completed' && clip.video_url)
  const processingClips = clips.filter(clip => (clip.status === 'processing' || clip.status === 'pending') && !clip.video_url)

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-100 via-orange-50 to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href="/create"
                className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Create
              </Link>
              <div className="flex items-center space-x-3">
                <img 
                  src="/echoes-logo.png" 
                  alt="Echoes Logo" 
                  className="h-8 w-8"
                />
                <h1 className="text-3xl font-bold text-gray-900">Your Dashboard</h1>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-600">Credit Balance</span>
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
                <span className="text-2xl font-bold text-blue-600">{user?.credit_balance}</span>
              </div>
              {user?.credit_balance === 0 && (
                <Link
                  href="/create"
                  className="text-sm bg-orange-500 text-white px-3 py-1 rounded-lg hover:bg-orange-600 transition-colors"
                >
                  Buy Credits
                </Link>
              )}
            </div>
          </div>
        </div>



        {/* Processing Clips */}
        {processingClips.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Currently Processing</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {processingClips.map((clip) => (
                <div key={clip.id} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                  <div className="aspect-video bg-gray-100 relative overflow-hidden">
                    {clip.image_url ? (
                      <>
                        <img
                          src={clip.image_url}
                          alt=""
                          className="w-full h-full object-cover"

                          onError={(e) => {
                            console.error('Failed to load processing image:', clip.image_url);
                            // Hide the image and show fallback
                            e.currentTarget.style.display = 'none';
                            const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <div className="text-center">
                            <LoadingSpinner size="lg" className="text-white mb-2 mx-auto" />
                            <p className="text-sm text-white font-medium">Processing...</p>
                          </div>
                        </div>
                        <div className="absolute top-3 left-3">
                          {getStatusBadge(clip.status)}
                        </div>
                        {/* Fallback div (hidden by default) */}
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-100 to-rose-100 items-center justify-center" style={{display: 'none'}}>
                          <div className="text-center">
                            <LoadingSpinner size="lg" className="text-orange-500 mb-2 mx-auto" />
                            <p className="text-sm text-gray-600 font-medium">Processing...</p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-orange-100 to-rose-100 flex items-center justify-center">
                        <div className="text-center">
                          <LoadingSpinner size="lg" className="text-orange-500 mb-2 mx-auto" />
                          <p className="text-sm text-gray-600 font-medium">Processing...</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-gray-500 flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatDate(clip.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {clip.status === 'processing' ? 'Generating your video...' : 'Queued for processing...'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completed Clips */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Your Video Clips</h2>
          
          {completedClips.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
              <div className="text-gray-400 mb-4">
                <Play className="h-16 w-16 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No completed clips yet</h3>
              <p className="text-gray-600 mb-6">
                Create your first video clip to see it here
              </p>
              <Link
                href="/create"
                className="inline-flex items-center px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
              >
                Create Your First Clip
              </Link>
            </div>
          ) : (
            <>
              {/* Create Final Video CTA */}
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-6 mb-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Ready to create your final video?</h3>
                    <p className="text-gray-600 text-sm">
                      Select your favorite clips, add music, and create a professional video compilation
                    </p>
                  </div>
                  <Link
                    href="/finalize"
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium whitespace-nowrap ml-4"
                  >
                    <Film className="h-5 w-5 mr-2" />
                    Create Final Video
                  </Link>
                </div>
              </div>

              {/* Clips Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {completedClips.map((clip) => (
                  <div key={clip.id} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-shadow">
                    <div className="aspect-video relative group bg-gray-100">
                      {clip.image_url ? (
                        <div className="w-full h-full relative">
                          <video
                            src={clip.video_url!}
                            controls
                            className="w-full h-full object-cover"
                            preload="metadata"
                          >
                            Your browser does not support the video tag.
                          </video>
                          {/* Thumbnail overlay - shows until video starts playing */}
                          <div 
                            className="absolute inset-0 bg-cover bg-center pointer-events-none"
                            style={{ backgroundImage: `url(${clip.image_url})` }}
                            onLoad={() => console.log('Thumbnail loaded for clip:', clip.id)}
                            onError={() => console.error('Thumbnail failed to load for clip:', clip.id)}
                          />
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200">
                          <div className="text-center text-gray-500">
                            <p>Thumbnail unavailable</p>
                          </div>
                        </div>
                      )}
                      <div className="absolute top-3 left-3">
                        {getStatusBadge(clip.status)}
                      </div>
                    </div>
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs text-gray-500 flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {clip.status === 'completed' ? formatDate(clip.updated_at) : formatDate(clip.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-4">
                        Your generated video clip
                      </p>
                      <div className="flex gap-2">
                        <LoadingButton
                          onClick={() => window.open(clip.video_url!, '_blank')}
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
                                title: 'Check out my video clip!',
                                url: clip.video_url!
                              })
                            } else {
                              navigator.clipboard.writeText(clip.video_url!)
                            }
                          }}
                          variant="secondary"
                          size="sm"
                        >
                          Share
                        </LoadingButton>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Create New Clip CTA */}
        <div className="mt-12 text-center">
          <Link
            href="/create"
            className="inline-flex items-center px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
          >
            Create New Clip
          </Link>
        </div>
      </div>
    </div>
  )
} 