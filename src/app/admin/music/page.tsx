'use client'

import { useState, useEffect } from 'react'
import { AdminAuth } from '@/components/admin/AdminAuth'
import { adminApi } from '@/lib/admin-api'

interface MusicTrack {
  id: string
  name: string
  file_url: string
  is_active: boolean
  created_at: string
  file_path: string
}

export default function AdminMusicPage() {
  const [tracks, setTracks] = useState<MusicTrack[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [newTrackFile, setNewTrackFile] = useState<File | null>(null)

  // Load existing tracks
  const loadTracks = async () => {
    console.log("Attempting to load tracks...");
    setLoading(true);
    try {
      const response = await adminApi.get('/api/admin/music')
      if (!response.ok) {
        throw new Error(`Failed to fetch tracks: ${response.statusText}`)
      }
      const data = await response.json()
      console.log("Tracks loaded successfully:", data.tracks);
      setTracks(data.tracks || [])
    } catch (error) {
      console.error('Error loading tracks:', error)
      alert('Error loading tracks. Check the console for details.');
    } finally {
      setLoading(false)
    }
  }

  // Upload new track
  const uploadTrack = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTrackFile) return

    setUploading(true)
    console.log("Attempting to upload track:", newTrackFile.name);
    try {
        const formData = new FormData();
        formData.append('file', newTrackFile);

      const response = await adminApi.post('/api/admin/music', formData)

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload track');
      }

      const data = await response.json()
      console.log("Track uploaded successfully:", data.track);

      // Reset form and reload
      setNewTrackFile(null)
      loadTracks() // This will now fetch the updated list
    } catch (error) {
      console.error('Error uploading track:', error)
      if (error instanceof Error) {
        alert(`Error uploading track: ${error.message}`)
      } else {
        alert('An unknown error occurred during upload.')
      }
    } finally {
      setUploading(false)
    }
  }

  // Toggle track active status
  const toggleActive = async (id: string, active: boolean) => {
    // This functionality will be added in the next step
    console.log("Toggling active status for track:", id);
  }

  // Delete track
  const deleteTrack = async (id: string, filePath: string) => {
    if (!confirm('Are you sure you want to delete this track?')) return
    
    console.log("Attempting to delete track:", id);
    try {
        const response = await adminApi.delete('/api/admin/music', {
            body: JSON.stringify({ id, file_path: filePath }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to delete track');
        }

        console.log("Track deleted successfully");
        loadTracks(); // Refresh the list
    } catch (error) {
        console.error('Error deleting track:', error);
        if (error instanceof Error) {
            alert(`Error deleting track: ${error.message}`);
        } else {
            alert('An unknown error occurred while deleting the track.');
        }
    }
  }

  useEffect(() => {
    loadTracks()
  }, [])

  return (
    <AdminAuth>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Music Management</h1>

        {/* Upload Form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Upload New Track</h2>
          <form onSubmit={uploadTrack} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Audio File *</label>
              <input
                type="file"
                accept="audio/*"
                onChange={(e) => setNewTrackFile(e.target.files?.[0] || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <button
              type="submit"
              disabled={uploading || !newTrackFile}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
              {uploading ? 'Uploading...' : 'Upload Track'}
            </button>
          </form>
        </div>

        {/* Tracks List */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Existing Tracks</h2>
          {loading ? (
            <p>Loading tracks...</p>
          ) : tracks.length === 0 ? (
            <p>No tracks uploaded yet.</p>
          ) : (
            <div className="space-y-4">
              {tracks.map((track) => (
                <div key={track.id} className="flex items-center justify-between border-b pb-4">
                  <div className="flex-1">
                    <h3 className="font-medium">{track.name}</h3>
                    <p className="text-sm text-gray-500">
                      Status: {track.is_active ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <audio controls className="w-48">
                      <source src={track.file_url} type="audio/mpeg" />
                    </audio>
                    <button
                      onClick={() => toggleActive(track.id, track.is_active)}
                      className={`px-3 py-1 rounded text-sm ${
                        track.is_active 
                          ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                          : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                      }`}
                    >
                      {track.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => deleteTrack(track.id, track.file_path)}
                      className="px-3 py-1 bg-red-100 text-red-800 rounded text-sm hover:bg-red-200"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminAuth>
  )
}
