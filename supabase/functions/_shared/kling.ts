// Kling AI/ML API service for Supabase Edge Functions
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

// Kling V2 API service for AI/ML API platform
// Uses direct URL passing - no local image processing needed

interface VideoGenerationResult {
  task_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  video_url?: string
  error_message?: string
  estimated_time?: number
}

class KlingService {
  private readonly apiKey: string
  private readonly baseUrl = 'https://api.aimlapi.com/v2/generate/video/kling'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async generateVideo(params: {
    image_url: string
    prompt: string
    duration?: number
  }): Promise<VideoGenerationResult> {
    const requestId = Math.random().toString(36).substring(2, 15)
    
    try {
      console.log(`[KLING-EDGE-${requestId}] Starting generation with direct URL:`, {
        imageUrl: params.image_url.substring(0, 100) + '...',
        prompt: params.prompt.substring(0, 100) + (params.prompt.length > 100 ? '...' : ''),
        duration: params.duration || 5
      })

      // Use the image URL directly - no processing needed
      const requestBody = {
        model: 'klingai/v2-master-image-to-video',
        prompt: params.prompt,
        image_url: params.image_url, // Use direct URL as per API spec
        duration: params.duration || 5
      }

      console.log(`[KLING-EDGE-${requestId}] API request:`, {
        url: `${this.baseUrl}/generation`,
        model: requestBody.model,
        prompt: requestBody.prompt.substring(0, 100) + (requestBody.prompt.length > 100 ? '...' : ''),
        duration: requestBody.duration,
        imageType: 'direct_url'
      })

      const response = await fetch(`${this.baseUrl}/generation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[KLING-EDGE-${requestId}] API Error:`, {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        })
        throw new Error(`Kling API error: ${response.status} - ${errorText}`)
      }

      const result = await response.json()
      
      console.log(`[KLING-EDGE-${requestId}] Generation started successfully:`, {
        generationId: result.id, // API returns 'id' not 'generation_id'
        directUrl: true
      })

      return {
        task_id: result.id,
        status: 'pending',
        progress: 0,
        estimated_time: 30 // Kling is usually faster than Runway
      }
    } catch (error) {
      console.error(`[KLING-EDGE-${requestId}] Generation failed:`, {
        error: error instanceof Error ? error.message : String(error)
      })
      return {
        task_id: '',
        status: 'failed',
        progress: 0,
        error_message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async getGenerationStatus(generationId: string): Promise<{
    status: string
    video?: { url: string }
    error?: string
    failure_reason?: string
  }> {
    try {
      console.log(`[KLING-EDGE-STATUS] Checking status:`, { generationId })

      const response = await fetch(`${this.baseUrl}/generation?generation_id=${generationId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[KLING-EDGE-STATUS] API Error:`, {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        })
        throw new Error(`Kling status check failed: ${response.status} - ${errorText}`)
      }

      const result = await response.json()
      
      console.log(`[KLING-EDGE-STATUS] Status response:`, {
        generationId,
        status: result.status,
        hasVideo: !!result.video?.url
      })

      return result
    } catch (error) {
      console.error(`[KLING-EDGE-STATUS] Status check failed:`, {
        generationId,
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }

  // Unified interface for compatibility with clip-status function
  async getJobStatus(generationId: string): Promise<{
    task_id: string
    status: 'pending' | 'processing' | 'completed' | 'failed'
    progress: number
    video_url?: string
    error_message?: string
    estimated_time?: number
  }> {
    try {
      const result = await this.getGenerationStatus(generationId)
      
      // Map Kling status to standard format
      let mappedStatus: 'pending' | 'processing' | 'completed' | 'failed'
      let progress = 0
      
      switch (result.status) {
        case 'generating':
        case 'processing':
        case 'queued':
        case 'waiting':
        case 'active':
          mappedStatus = 'processing'
          progress = 50 // Estimate 50% when processing
          break
        case 'completed':
        case 'success':
          mappedStatus = 'completed'
          progress = 100
          break
        case 'failed':
        case 'error':
          mappedStatus = 'failed'
          progress = 0
          break
        default:
          mappedStatus = 'processing'
          progress = 25
      }

      return {
        task_id: generationId,
        status: mappedStatus,
        progress,
        video_url: result.video?.url,
        error_message: result.error || result.failure_reason,
        estimated_time: mappedStatus === 'processing' ? 30 : 0 // Kling is usually faster
      }
    } catch (error) {
      console.error(`[KLING-JOB-STATUS] Failed:`, error)
      return {
        task_id: generationId,
        status: 'failed',
        progress: 0,
        error_message: error instanceof Error ? error.message : 'Status check failed'
      }
    }
  }
}

export function createKlingService(): KlingService {
  // Handle both Deno (Edge Functions) and Node.js environments
  let apiKey: string | undefined
  try {
    // @ts-ignore - Deno is available in Edge Functions
    apiKey = Deno.env.get('AIMLAPI_API_KEY')
  } catch {
    // @ts-ignore - process is available in Node.js
    apiKey = process.env.AIMLAPI_API_KEY
  }
  
  if (!apiKey) {
    throw new Error('AIMLAPI_API_KEY environment variable is required')
  }
  return new KlingService(apiKey)
} 