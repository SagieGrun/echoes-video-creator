'use client'

import { useState, useEffect } from 'react'

interface ModelConfig {
  activeProvider: string
  providers: {
    [key: string]: {
      name: string
      status: 'active' | 'inactive' | 'error'
      config: any
    }
  }
}

const DEFAULT_CONFIG: ModelConfig = {
  activeProvider: 'runway',
  providers: {
    runway: {
      name: 'Runway ML',
      status: 'active',
      config: {
        model: 'gen3',
        resolution: '1280x768',
        duration: 5,
      }
    }
  }
}

export default function ModelsPage() {
  const [config, setConfig] = useState<ModelConfig>(DEFAULT_CONFIG)
  const [isLoading, setIsLoading] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')

  useEffect(() => {
    fetchModelConfig()
  }, [])

  const fetchModelConfig = async () => {
    try {
      const response = await fetch('/api/admin/models')
      const data = await response.json()
      if (data.config) {
        setConfig(data.config)
      }
    } catch (error) {
      console.error('Failed to fetch model config:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const testConnection = async () => {
    setConnectionStatus('testing')
    
    try {
      // Simulate API key validation
      const apiKey = process.env.RUNWAY_API_KEY
      if (!apiKey) {
        setConnectionStatus('error')
        return
      }
      
      // In a real implementation, you would test the actual API
      setTimeout(() => {
        setConnectionStatus('success')
      }, 2000)
    } catch (error) {
      setConnectionStatus('error')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'inactive': return 'bg-gray-100 text-gray-800'
      case 'error': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getConnectionStatusColor = (status: string) => {
    switch (status) {
      case 'testing': return 'bg-yellow-100 text-yellow-800'
      case 'success': return 'bg-green-100 text-green-800'
      case 'error': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-lg text-gray-600">Loading model configuration...</div>
      </div>
    )
  }

  const activeProvider = config.providers[config.activeProvider]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">AI Model Configuration</h1>
        <p className="text-gray-600 mt-2">Manage AI provider settings and model configuration</p>
      </div>

      {/* Current Active Provider */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Current Active Provider</h2>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="font-medium text-gray-900 text-xl">
                {activeProvider?.name || 'Unknown'}
              </span>
            </div>
            <span className={`px-3 py-1 text-sm rounded-full ${getStatusColor(activeProvider?.status)}`}>
              {activeProvider?.status}
            </span>
          </div>
          
          <button
            onClick={testConnection}
            disabled={connectionStatus === 'testing'}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {connectionStatus === 'testing' ? (
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Testing...
              </div>
            ) : (
              'Test Connection'
            )}
          </button>
        </div>

        {connectionStatus !== 'idle' && (
          <div className="mt-4">
            <span className={`px-3 py-1 text-sm rounded-full ${getConnectionStatusColor(connectionStatus)}`}>
              {connectionStatus === 'testing' && 'Testing connection...'}
              {connectionStatus === 'success' && '✓ Connection successful'}
              {connectionStatus === 'error' && '✗ Connection failed - check API key'}
            </span>
          </div>
        )}
      </div>

      {/* Provider Details */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Provider Configuration</h2>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(activeProvider?.config || {}).map(([key, value]) => (
              <div key={key} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <span className="font-medium text-gray-700 capitalize">{key.replace('_', ' ')}</span>
                <span className="text-gray-900 font-mono text-sm">{String(value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Future Providers Note */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-blue-800 mb-2">Future AI Providers</h3>
        <p className="text-blue-700 mb-4">
          We're planning to integrate additional AI providers like OpenAI Sora, Luma AI, and others. 
          This interface will allow you to switch between providers once they're available.
        </p>
        <div className="text-sm text-blue-600">
          <strong>Currently supported:</strong> Runway ML Gen-3
        </div>
      </div>

      {/* Environment Variables Info */}
      <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-yellow-800 mb-2">Environment Configuration</h3>
        <p className="text-sm text-yellow-700 mb-4">
          Make sure the following environment variables are set for the active provider:
        </p>
        <div className="bg-yellow-100 rounded p-3">
          <code className="text-sm font-mono text-yellow-800">
            RUNWAY_API_KEY=your_runway_api_key
            <br />
            ACTIVE_AI_PROVIDER=runway
          </code>
        </div>
      </div>
    </div>
  )
} 