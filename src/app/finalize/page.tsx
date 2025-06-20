'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ArrowLeft, Film, Music, Settings, Play, GripVertical, X } from 'lucide-react'
import Link from 'next/link'

interface Clip {
  id: string
  image_url: string
  video_url: string | null
  status: string
  created_at: string
}

interface MusicTrack {
  id: string
  name: string
  file_url: string
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
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<any>(null)

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
      // Get current user
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        router.push('/login')
        return
      }
      setUser(session.user)

      // Get all user's projects
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id')
        .eq('user_id', session.user.id)

      if (projectsError) throw projectsError

      if (!projects || projects.length === 0) {
        setClips([])
        setLoading(false)
        return
      }

      // Get all completed clips for user's projects
      const allClips: Clip[] = []
      for (const project of projects) {
        const { data: projectClips, error: clipsError } = await supabase
          .from('clips')
          .select('id, image_url, image_file_path, video_url, video_file_path, status, created_at')
          .eq('project_id', project.id)
          .eq('status', 'completed')
          .not('video_url', 'is', null)
          .order('created_at', { ascending: false })

        if (!clipsError && projectClips) {
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
      const { data: musicData, error: musicError } = await supabase
        .from('music_tracks')
        .select('id, name, file_url')
        .eq('is_active', true)

      if (musicError) throw musicError

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
    try {
      const settings = {
        selectedClips: clipOrder.map((clipId, index) => ({
          clip_id: clipId,
          order: index
        })),
        musicTrackId: selectedMusicId || null,
        transitionType: transitionType,
        musicVolume: musicVolume
      }

      const response = await fetch(`/api/finalize`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save settings')
      }

      alert('Settings saved! Your video compilation will begin shortly.')
      router.push('/dashboard')
      
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Error saving settings: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  if (loading || !supabase) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-100 via-orange-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mb-4" />
          <p className="text-gray-600">Loading your clips...</p>
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
                            <div className="w-16 h-12 bg-gray-100 rounded overflow-hidden mr-3">
                              {clip.image_url ? (
                                <img
                                  src={clip.image_url}
                                  alt={`Clip ${index + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
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
                          <div className="aspect-video bg-gray-100 rounded overflow-hidden mb-2">
                            {clip.image_url ? (
                              <img
                                src={clip.image_url}
                                alt={`Clip ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
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
                <button
                  onClick={saveSettings}
                  disabled={saving || selectedClipIds.size === 0}
                  className="w-full bg-white text-purple-600 py-3 px-4 rounded-lg hover:bg-gray-50 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-all duration-200 font-medium"
                >
                  {saving ? 'Creating Video...' : 'Create Final Video'}
                </button>
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