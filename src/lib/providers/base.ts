import { AIVideoProvider } from '@/types'

export interface ModelConfig {
  provider: string
  model: string
  defaultPrompt: string
  apiKey: string
  options?: Record<string, any>
}

// This will be replaced by admin panel configuration
const DEFAULT_CONFIG: ModelConfig = {
  provider: 'runway',
  model: 'gen-3-alpha',
  defaultPrompt: 'Create a beautiful animated clip from this photo',
  apiKey: process.env.RUNWAY_API_KEY || '',
}

export async function getActiveModelConfig(): Promise<ModelConfig> {
  // TODO: In the future, this will fetch from admin configuration in Supabase
  return DEFAULT_CONFIG
}

export async function getProvider(): Promise<AIVideoProvider> {
  const config = await getActiveModelConfig()
  
  switch (config.provider) {
    case 'runway':
      const { RunwayProvider } = await import('./runway')
      return new RunwayProvider(config)
    // Add more providers here as needed
    default:
      throw new Error(`Unknown provider: ${config.provider}`)
  }
} 