'use client'

import { useState, useEffect } from 'react'
import { SocialSharingConfig, DEFAULT_SOCIAL_CONFIG } from '@/types/social'

interface PLGSettings {
  referral_reward_credits: number
  share_reward_credits: number
}

interface PLGStats {
  totalReferrals: number
  rewardedReferrals: number
  totalShares: number
  approvedShares: number
  totalCreditsAwarded: number
  topReferrers: { userId: string; referralCount: number }[]
  thisMonth: {
    referrals: number
    shares: number
  }
}

export default function PLGPage() {
  const [socialConfig, setSocialConfig] = useState<SocialSharingConfig>(DEFAULT_SOCIAL_CONFIG)
  const [plgSettings, setPLGSettings] = useState<PLGSettings>({
    referral_reward_credits: 5,
    share_reward_credits: 2
  })
  const [stats, setStats] = useState<PLGStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editingSocialConfig, setEditingSocialConfig] = useState<SocialSharingConfig>(DEFAULT_SOCIAL_CONFIG)
  const [editingPLGSettings, setEditingPLGSettings] = useState<PLGSettings>({
    referral_reward_credits: 5,
    share_reward_credits: 2
  })
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetchConfigs()
  }, [])

  const fetchConfigs = async () => {
    try {
      const response = await fetch('/api/admin/plg')
      const data = await response.json()
      if (data.socialConfig) {
        setSocialConfig(data.socialConfig)
      }
      if (data.plgSettings) {
        setPLGSettings(data.plgSettings)
      }
      if (data.stats) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to fetch PLG configs:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = () => {
    setEditingSocialConfig({ ...socialConfig })
    setEditingPLGSettings({ ...plgSettings })
    setIsEditing(true)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/admin/plg', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          socialConfig: editingSocialConfig,
          plgSettings: editingPLGSettings
        }),
      })

      if (response.ok) {
        setSocialConfig(editingSocialConfig)
        setPLGSettings(editingPLGSettings)
        setIsEditing(false)
        // Refresh stats
        fetchConfigs()
      }
    } catch (error) {
      console.error('Failed to save PLG configs:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditingSocialConfig({ ...socialConfig })
    setEditingPLGSettings({ ...plgSettings })
  }

  const updatePlatform = (platform: keyof typeof socialConfig.platforms, field: string, value: any) => {
    setEditingSocialConfig(prev => ({
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

  const updateSocialSetting = (field: keyof SocialSharingConfig, value: any) => {
    setEditingSocialConfig(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const updatePLGSetting = (field: keyof PLGSettings, value: number) => {
    setEditingPLGSettings(prev => ({
      ...prev,
      [field]: value
    }))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-lg text-gray-600">Loading PLG configuration...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">PLG (Product-Led Growth)</h1>
          <p className="text-gray-600 mt-2">Configure referral rewards, social sharing, and view growth statistics</p>
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

      {/* PLG Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Total Referrals</h3>
            <div className="text-3xl font-bold text-blue-600">{stats.totalReferrals}</div>
            <div className="text-sm text-gray-500">{stats.rewardedReferrals} rewarded</div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Share Submissions</h3>
            <div className="text-3xl font-bold text-green-600">{stats.totalShares}</div>
            <div className="text-sm text-gray-500">{stats.approvedShares} approved</div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Credits Awarded</h3>
            <div className="text-3xl font-bold text-purple-600">{stats.totalCreditsAwarded}</div>
            <div className="text-sm text-gray-500">Via PLG system</div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">This Month</h3>
            <div className="text-lg font-semibold text-gray-900">
              {stats.thisMonth.referrals} referrals
            </div>
            <div className="text-sm text-gray-500">{stats.thisMonth.shares} shares</div>
          </div>
        </div>
      )}



      <div className="space-y-8">
        {/* PLG Reward Settings */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">PLG Reward Settings</h2>
            <p className="text-sm text-gray-500 mt-1">Configure credit rewards for referrals and sharing</p>
          </div>
          
          <div className="p-6">
            {isEditing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Referral Reward Credits
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editingPLGSettings.referral_reward_credits}
                    onChange={(e) => updatePLGSetting('referral_reward_credits', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Credits awarded to both referrer and referred user on first purchase</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Share Reward Credits
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editingPLGSettings.share_reward_credits}
                    onChange={(e) => updatePLGSetting('share_reward_credits', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Credits awarded for sharing screenshot (one-time per user)</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="text-sm font-medium text-gray-700">Referral Reward Credits</div>
                  <div className="text-2xl font-bold text-blue-600">{plgSettings.referral_reward_credits}</div>
                  <div className="text-xs text-gray-500">Per successful referral</div>
                </div>
                
                <div>
                  <div className="text-sm font-medium text-gray-700">Share Reward Credits</div>
                  <div className="text-2xl font-bold text-green-600">{plgSettings.share_reward_credits}</div>
                  <div className="text-xs text-gray-500">Per share submission</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Social Sharing Configuration */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Social Sharing Configuration</h2>
            {socialConfig.updated_at && (
              <p className="text-sm text-gray-500 mt-1">
                Last updated: {new Date(socialConfig.updated_at).toLocaleString()}
              </p>
            )}
          </div>
          
          <div className="p-6">
            {isEditing ? (
              <div className="space-y-6">
                {/* General Settings */}
                <div className="space-y-4">
                  <h3 className="text-md font-medium text-gray-900">General Settings</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Default Message Template
                    </label>
                    <textarea
                      value={editingSocialConfig.defaultMessage}
                      onChange={(e) => updateSocialSetting('defaultMessage', e.target.value)}
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
                        checked={editingSocialConfig.includeAppUrl}
                        onChange={(e) => updateSocialSetting('includeAppUrl', e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Include app URL in messages</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={editingSocialConfig.trackSharing}
                        onChange={(e) => updateSocialSetting('trackSharing', e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Track sharing analytics</span>
                    </label>
                  </div>
                </div>

                {/* Platform Settings */}
                <div className="space-y-6">
                  <h3 className="text-md font-medium text-gray-900">Platform Settings</h3>
                  
                  {Object.entries(editingSocialConfig.platforms).map(([platformKey, platform]) => (
                    <div key={platformKey} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2">
                          <img 
                            src={platform.icon} 
                            alt={`${platformKey} logo`}
                            className="w-6 h-6 object-contain"
                            onError={(e) => {
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
                            onChange={(e) => updatePlatform(platformKey as keyof typeof socialConfig.platforms, 'enabled', e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">Enabled</span>
                        </label>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Custom Message
                        </label>
                        <textarea
                          value={platform.message}
                          onChange={(e) => updatePlatform(platformKey as keyof typeof socialConfig.platforms, 'message', e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder={`Custom message for ${platformKey}...`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-gray-700">Default Message</div>
                  <div className="text-gray-900 mt-1">{socialConfig.defaultMessage}</div>
                </div>
                
                <div className="flex space-x-6">
                  <div className="flex items-center">
                    <div className="text-sm text-gray-700">Include App URL: </div>
                    <div className={`ml-2 text-sm font-medium ${socialConfig.includeAppUrl ? 'text-green-600' : 'text-red-600'}`}>
                      {socialConfig.includeAppUrl ? 'Yes' : 'No'}
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <div className="text-sm text-gray-700">Track Sharing: </div>
                    <div className={`ml-2 text-sm font-medium ${socialConfig.trackSharing ? 'text-green-600' : 'text-red-600'}`}>
                      {socialConfig.trackSharing ? 'Yes' : 'No'}
                    </div>
                  </div>
                </div>
                
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">Platform Status</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(socialConfig.platforms).map(([platform, config]) => (
                      <div key={platform} className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${config.enabled ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span className="text-sm text-gray-700 capitalize">{platform}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Save/Cancel Buttons */}
        {isEditing && (
          <div className="flex justify-end space-x-4">
            <button
              onClick={handleCancel}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
} 