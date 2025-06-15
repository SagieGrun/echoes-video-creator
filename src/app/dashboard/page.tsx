'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { LoadingButton } from '@/components/ui/LoadingButton'
import { ArrowLeft, Download, Play, Calendar, Clock } from 'lucide-react'
import Link from 'next/link'

interface Clip {
  id: string
  project_id: string
  image_url: string
  video_url: string | null
  prompt: string | null
  status: 'pending' | 'processing' | 'completed' | 'failed'
  created_at: string
  completed_at: string | null
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
              video_url,
              prompt,
              status,
              created_at,
              completed_at
            `)
            .eq('project_id', project.id)
            .order('created_at', { ascending: false })

          if (!clipsError && projectClips) {
            allClips.push(...projectClips)
          }
        }

        // Sort all clips by creation date
        allClips.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        setClips(allClips)

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
  const processingClips = clips.filter(clip => clip.status === 'processing' || clip.status === 'pending')

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-100 via-orange-50 to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href="/create"
                className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Create
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">Your Dashboard</h1>
              <p className="text-gray-600 mt-2">
                Welcome back, {user?.email}
              </p>
            </div>
            <div className="text-right">
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <p className="text-sm text-gray-600">Credit Balance</p>
                <p className="text-2xl font-bold text-blue-600">{user?.credit_balance}</p>
                {user?.credit_balance === 0 && (
                  <Link
                    href="/create"
                    className="text-sm text-orange-600 hover:text-orange-700"
                  >
                    Purchase Credits
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-md">
                <Play className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completed Clips</p>
                <p className="text-2xl font-bold text-gray-900">{completedClips.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-md">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Processing</p>
                <p className="text-2xl font-bold text-gray-900">{processingClips.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-md">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Clips</p>
                <p className="text-2xl font-bold text-gray-900">{clips.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Processing Clips */}
        {processingClips.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Currently Processing</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {processingClips.map((clip) => (
                <div key={clip.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                  <div className="aspect-video bg-gray-100 flex items-center justify-center">
                    <img
                      src={clip.image_url}
                      alt="Processing clip"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <LoadingSpinner size="md" className="text-white" />
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      {getStatusBadge(clip.status)}
                      <span className="text-xs text-gray-500">
                        {formatDate(clip.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {clip.prompt || 'Generating your video...'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completed Clips */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Video Clips</h2>
          
          {completedClips.length === 0 ? (
            <div className="bg-white rounded-lg p-12 text-center">
              <div className="text-gray-400 mb-4">
                <Play className="h-16 w-16 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No completed clips yet</h3>
              <p className="text-gray-600 mb-6">
                Create your first video clip to see it here
              </p>
              <Link
                href="/create"
                className="inline-flex items-center px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                Create Your First Clip
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {completedClips.map((clip) => (
                <div key={clip.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                  <div className="aspect-video">
                    <video
                      src={clip.video_url!}
                      poster={clip.image_url}
                      controls
                      className="w-full h-full object-cover"
                      preload="metadata"
                    >
                      Your browser does not support the video tag.
                    </video>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      {getStatusBadge(clip.status)}
                      <span className="text-xs text-gray-500">
                        {clip.completed_at ? formatDate(clip.completed_at) : formatDate(clip.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      {clip.prompt || 'Your generated video clip'}
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