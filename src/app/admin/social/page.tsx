'use client'

import { useState, useEffect } from 'react'
import { SocialSharingConfig, DEFAULT_SOCIAL_CONFIG } from '@/types/social'

export default function SocialPage() {
  const [config, setConfig] = useState<SocialSharingConfig>(DEFAULT_SOCIAL_CONFIG)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editingConfig, setEditingConfig] = useState<SocialSharingConfig>(DEFAULT_SOCIAL_CONFIG)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/admin/social')
      const data = await response.json()
      if (data.config) {
        setConfig(data.config)
      }
    } catch (error) {
      console.error('Failed to fetch social config:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = () => {
    setEditingConfig({ ...config })
    setIsEditing(true)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/admin/social', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ config: editingConfig }),
      })

      if (response.ok) {
        const data = await response.json()
        setConfig(data.config)
        setIsEditing(false)
      }
    } catch (error) {
      console.error('Failed to save social config:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditingConfig({ ...config })
  }

  const updatePlatform = (platform: keyof typeof config.platforms, field: string, value: any) => {
    setEditingConfig(prev => ({
      ...prev,
      platforms: {
        ...prev.platforms,
        [platform]: {
          ...prev.platforms[platform],
          [field]: value
        }
      }
    }))
  }

  const updateGeneralSetting = (field: keyof SocialSharingConfig, value: any) => {
    setEditingConfig(prev => ({
      ...prev,
      [field]: value
    }))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-lg text-gray-600">Loading social sharing configuration...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Social Sharing</h1>
          <p className="text-gray-600 mt-2">Configure social media sharing messages and settings</p>
        </div>
        {!isEditing && (
          <button
            onClick={handleEdit}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Edit Settings
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Social Sharing Configuration</h2>
          {config.updated_at && (
            <p className="text-sm text-gray-500 mt-1">
              Last updated: {new Date(config.updated_at).toLocaleString()}
            </p>
          )}
        </div>
        
        <div className="p-6">
          {isEditing ? (
            <div className="space-y-8">
              {/* General Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">General Settings</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Default Message Template
                  </label>
                  <textarea
                    value={editingConfig.defaultMessage}
                    onChange={(e) => updateGeneralSetting('defaultMessage', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Default message for sharing..."
                  />
                  <p className="text-xs text-gray-500 mt-1">Use {'{VIDEO_URL}'} for the video link</p>
                </div>

                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editingConfig.includeAppUrl}
                      onChange={(e) => updateGeneralSetting('includeAppUrl', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Include app URL in messages</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editingConfig.trackSharing}
                      onChange={(e) => updateGeneralSetting('trackSharing', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Track sharing analytics</span>
                  </label>
                </div>
              </div>

              {/* Platform Settings */}
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900">Platform Settings</h3>
                
                {Object.entries(editingConfig.platforms).map(([platformKey, platform]) => (
                  <div key={platformKey} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <img 
                          src={platform.icon} 
                          alt={`${platformKey} logo`}
                          className="w-6 h-6 object-contain"
                          onError={(e) => {
                            // Fallback to text if image fails to load
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                            const fallback = target.nextElementSibling as HTMLElement
                            if (fallback) fallback.style.display = 'flex'
                          }}
                        />
                        <span className="w-6 h-6 bg-gray-200 rounded text-xs flex items-center justify-center font-semibold text-gray-600 capitalize" style={{display: 'none'}}>
                          {platformKey.charAt(0)}
                        </span>
                        <h4 className="text-md font-medium text-gray-900 capitalize">{platformKey}</h4>
                      </div>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={platform.enabled}
                          onChange={(e) => updatePlatform(platformKey as keyof typeof config.platforms, 'enabled', e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Enabled</span>
                      </label>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Message Template
                      </label>
                      <textarea
                        value={platform.message}
                        onChange={(e) => updatePlatform(platformKey as keyof typeof config.platforms, 'message', e.target.value)}
                        rows={2}
                        disabled={!platform.enabled}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                        placeholder={`Message for ${platformKey}...`}
                      />
                      <p className="text-xs text-gray-500 mt-1">Use {'{VIDEO_URL}'} for the video link</p>
                    </div>
                  </div>
                ))}
              </div>
              
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
                  disabled={isSaving}
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
                    'Save Settings'
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Current Settings Display */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">General Settings</h3>
                <div className="bg-gray-50 rounded-lg p-4 border">
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium text-gray-700">Default Message:</span>
                      <p className="text-sm text-gray-600 mt-1">{config.defaultMessage}</p>
                    </div>
                    <div className="flex space-x-4 text-sm">
                      <span className={`${config.includeAppUrl ? 'text-green-600' : 'text-gray-500'}`}>
                        {config.includeAppUrl ? '✓' : '✗'} Include app URL
                      </span>
                      <span className={`${config.trackSharing ? 'text-green-600' : 'text-gray-500'}`}>
                        {config.trackSharing ? '✓' : '✗'} Track sharing
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Platform Settings</h3>
                <div className="grid gap-4">
                  {Object.entries(config.platforms).map(([platformKey, platform]) => (
                    <div key={platformKey} className="bg-gray-50 rounded-lg p-4 border">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <img 
                            src={platform.icon} 
                            alt={`${platformKey} logo`}
                            className="w-6 h-6 object-contain"
                            onError={(e) => {
                              // Fallback to text if image fails to load
                              const target = e.target as HTMLImageElement
                              target.style.display = 'none'
                              const fallback = target.nextElementSibling as HTMLElement
                              if (fallback) fallback.style.display = 'flex'
                            }}
                          />
                          <span className="w-6 h-6 bg-gray-200 rounded text-xs flex items-center justify-center font-semibold text-gray-600 capitalize" style={{display: 'none'}}>
                            {platformKey.charAt(0)}
                          </span>
                          <h4 className="text-md font-medium text-gray-900 capitalize">{platformKey}</h4>
                        </div>
                        <span className={`text-sm px-2 py-1 rounded ${
                          platform.enabled 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {platform.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{platform.message}</p>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="text-sm font-medium text-blue-800 mb-2">How this works:</h3>
                                 <ul className="text-sm text-blue-700 space-y-1">
                   <li>• Users can share their videos directly to enabled platforms</li>
                   <li>• Messages are auto-populated with your configured templates</li>
                   <li>• Use {'{VIDEO_URL}'} in messages to include the video link</li>
                   <li>• Platform-specific sharing opens the respective app or website</li>
                 </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 