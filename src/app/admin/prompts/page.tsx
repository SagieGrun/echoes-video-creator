'use client'

import { useState, useEffect } from 'react'
import { adminApi } from '@/lib/admin-api'

interface SystemPrompt {
  prompt: string
  updated_at: string
}

const DEFAULT_SYSTEM_PROMPT = `You are an AI assistant that helps create cinematic, emotional video clips from static photos. 

When generating video clips:
- Focus on subtle, natural movements that bring the photo to life
- Add gentle camera movements like slow pans or zooms
- Create atmospheric effects like light changes or environmental movement
- Maintain the emotional tone and story of the original photo
- Keep movements realistic and not overly dramatic
- Ensure the clip feels cinematic and professional

The goal is to transform static memories into living, breathing moments that evoke emotion and nostalgia.`

export default function PromptsPage() {
  const [systemPrompt, setSystemPrompt] = useState<SystemPrompt>({ prompt: DEFAULT_SYSTEM_PROMPT, updated_at: '' })
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editingPrompt, setEditingPrompt] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetchSystemPrompt()
  }, [])

  const fetchSystemPrompt = async () => {
    try {
      const response = await adminApi.get('/api/admin/system-prompt')
      const data = await response.json()
      if (data.systemPrompt) {
        setSystemPrompt(data.systemPrompt)
      }
    } catch (error) {
      console.error('Failed to fetch system prompt:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = () => {
    setEditingPrompt(systemPrompt.prompt)
    setIsEditing(true)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await adminApi.post('/api/admin/system-prompt', { prompt: editingPrompt })

      if (response.ok) {
        const data = await response.json()
        setSystemPrompt(data.systemPrompt)
        setIsEditing(false)
        setEditingPrompt('')
      }
    } catch (error) {
      console.error('Failed to save system prompt:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditingPrompt('')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-lg text-gray-600">Loading system prompt...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Prompt</h1>
          <p className="text-gray-600 mt-2">Configure the AI model's system prompt for video generation</p>
        </div>
        {!isEditing && (
          <button
            onClick={handleEdit}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Edit Prompt
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Current System Prompt</h2>
          {systemPrompt.updated_at && (
            <p className="text-sm text-gray-500 mt-1">
              Last updated: {new Date(systemPrompt.updated_at).toLocaleString()}
            </p>
          )}
        </div>
        
        <div className="p-6">
          {isEditing ? (
            <div className="space-y-4">
              <textarea
                value={editingPrompt}
                onChange={(e) => setEditingPrompt(e.target.value)}
                rows={12}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                placeholder="Enter the system prompt for AI video generation..."
              />
              
              <div className="flex justify-end gap-4">
                <button
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving || !editingPrompt.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </div>
                  ) : (
                    'Save Prompt'
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="bg-gray-50 rounded-lg p-4 border">
                <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
                  {systemPrompt.prompt}
                </pre>
              </div>
              
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="text-sm font-medium text-blue-800 mb-2">How this works:</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• This prompt is sent to the AI model before each video generation request</li>
                  <li>• It guides the model on how to create cinematic movements from static photos</li>
                  <li>• Changes here will affect all future video generations</li>
                  <li>• Keep it clear and specific for best results</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 