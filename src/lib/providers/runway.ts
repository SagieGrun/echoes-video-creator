import { AIVideoProvider } from '@/types'
import { ModelConfig } from './base'

export class RunwayProvider implements AIVideoProvider {
  private config: ModelConfig
  private baseUrl = 'https://api.runwayml.com/v1'

  constructor(config: ModelConfig) {
    this.config = config
  }

  async generateClip(imageUrl: string, prompt?: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/inference`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          model: this.config.model,
          input: {
            image: imageUrl,
            prompt: prompt || this.config.defaultPrompt
          }
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to generate clip')
      }

      const data = await response.json()
      return data.id // This is the job ID
    } catch (error) {
      console.error('Error in Runway generation:', error)
      throw error
    }
  }

  async getJobStatus(jobId: string): Promise<{
    status: 'pending' | 'processing' | 'completed' | 'failed'
    result_url?: string
    error_message?: string
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/inference/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`
        }
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to check job status')
      }

      const data = await response.json()
      
      // Map Runway status to our status
      let status: 'pending' | 'processing' | 'completed' | 'failed'
      switch (data.status) {
        case 'starting':
        case 'processing':
          status = 'processing'
          break
        case 'complete':
          status = 'completed'
          break
        case 'failed':
          status = 'failed'
          break
        default:
          status = 'pending'
      }

      return {
        status,
        result_url: data.output?.video_url,
        error_message: data.error
      }
    } catch (error) {
      console.error('Error checking Runway job status:', error)
      throw error
    }
  }
} 