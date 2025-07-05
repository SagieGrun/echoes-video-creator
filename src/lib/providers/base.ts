import { AIVideoProvider } from '@/types'
import { supabase } from '@/lib/supabase'

export interface ModelConfig {
  provider: string
  model: string
  defaultPrompt: string
  apiKey: string
  options?: Record<string, any>
}

// Default configuration - will be overridden by admin_config
const DEFAULT_CONFIG: ModelConfig = {
  provider: 'runway',
  model: 'gen4_turbo',
  defaultPrompt: 'Create a beautiful animated clip from this photo',
  apiKey: process.env.RUNWAY_API_KEY || '',
}

export async function getActiveModelConfig(): Promise<ModelConfig> {
  try {
    // Try to get configuration from admin_config table
    const { data, error } = await supabase
      .from('admin_config')
      .select('value')
      .eq('key', 'model_config')
      .single()

    if (error || !data?.value) {
      console.warn('No model configuration found in admin_config, using default')
      return DEFAULT_CONFIG
    }

    const config = data.value
    const activeProvider = config.activeProvider || 'runway'
    const providerConfig = config.providers?.[activeProvider]

    if (!providerConfig) {
      console.warn(`No configuration found for provider: ${activeProvider}`)
      return DEFAULT_CONFIG
    }

    // Map admin config to ModelConfig interface
    const modelConfig: ModelConfig = {
      provider: activeProvider,
      model: providerConfig.config?.model || providerConfig.config?.modelId || 'gen4_turbo',
      defaultPrompt: 'Create a beautiful animated clip from this photo',
      apiKey: activeProvider === 'runway' ? 
        (process.env.RUNWAY_API_KEY || '') : 
        (process.env.AIMLAPI_API_KEY || ''),
      options: providerConfig.config
    }

    console.log('Loaded model configuration:', {
      provider: modelConfig.provider,
      model: modelConfig.model,
      hasApiKey: !!modelConfig.apiKey,
      options: modelConfig.options
    })

    return modelConfig
  } catch (error) {
    console.error('Error loading model configuration:', error)
    return DEFAULT_CONFIG
  }
}

export async function getProvider(): Promise<AIVideoProvider> {
  const config = await getActiveModelConfig()
  
  switch (config.provider) {
    case 'runway': {
      const { RunwayProvider } = await import('./runway')
      return new RunwayProvider(config)
    }
    case 'kling': {
      const { KlingProvider } = await import('./kling')
      return new KlingProvider(config)
    }
    default: {
      console.warn(`Unknown provider: ${config.provider}, falling back to Runway`)
      const { RunwayProvider } = await import('./runway')
      return new RunwayProvider({
        ...DEFAULT_CONFIG,
        provider: 'runway'
      })
    }
  }
} 