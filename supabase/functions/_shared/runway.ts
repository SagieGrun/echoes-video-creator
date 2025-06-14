// Deno-compatible Runway service for Supabase Edge Functions
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

// Declare Deno environment for TypeScript
declare const Deno: {
  env: {
    get(key: string): string | undefined
  }
}

interface GenerateVideoParams {
  image_url: string
  prompt: string
  duration?: number
}

interface RunwayJobStatus {
  id: string
  status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED'
  progress?: number
  failure_code?: string
  failure_reason?: string
  output?: string[]
  created_at: string
  started_at?: string
  ended_at?: string
}

interface VideoGenerationResult {
  task_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  video_url?: string
  error_message?: string
  estimated_time?: number
  runway_task?: RunwayJobStatus
}

// Supported aspect ratios for Runway Gen-4 Turbo
const SUPPORTED_RATIOS = {
  '1280:720': '1280:720',   // 16:9 landscape
  '1584:672': '1584:672',   // 2.36:1 cinematic
  '1104:832': '1104:832',   // 4:3 landscape
  '720:1280': '720:1280',   // 9:16 portrait
  '832:1104': '832:1104',   // 3:4 portrait
  '960:960': '960:960'      // 1:1 square
} as const

type SupportedRatio = keyof typeof SUPPORTED_RATIOS

class RunwayService {
  private readonly apiKey: string
  private readonly baseUrl = 'https://api.runwayml.com/v1'
  private readonly maxPollingAttempts = 60 // 10 minutes with 10s intervals
  private readonly pollingInterval = 10000 // 10 seconds

  constructor() {
    const apiKey = Deno.env.get('RUNWAY_API_SECRET')
    if (!apiKey) {
      throw new Error('RUNWAY_API_SECRET environment variable is required')
    }
    this.apiKey = apiKey
  }

  async generateVideo({ image_url, prompt, duration = 5 }: GenerateVideoParams): Promise<VideoGenerationResult> {
    const requestId = Math.random().toString(36).substring(2, 15)
    
    try {
      console.log(`[${requestId}] Starting Runway Gen-4 Turbo video generation:`, {
        image_url: image_url.substring(0, 100) + '...',
        image_url_length: image_url.length,
        prompt: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''),
        prompt_length: prompt.length,
        duration,
        timestamp: new Date().toISOString()
      })

      // Step 1: Download and validate image
      console.log(`[${requestId}] Step 1: Downloading image from URL`)
      const imageBuffer = await this.fetchImageBuffer(image_url)
      console.log(`[${requestId}] Image downloaded successfully:`, {
        size_mb: (imageBuffer.length / 1024 / 1024).toFixed(2),
        size_bytes: imageBuffer.length
      })

      // Step 2: Process image for Runway (simplified for now)
      console.log(`[${requestId}] Step 2: Converting image to data URI`)
      const processedImageUrl = await this.uploadProcessedImage(imageBuffer)
      
      // Use default aspect ratio for now (we'll improve this later)
      const targetRatio: SupportedRatio = '1280:720'

      // Step 3: Submit to Runway API
      console.log(`[${requestId}] Step 3: Submitting to Runway Gen-4 Turbo API`)
      const apiRequest = {
        model: 'gen4_turbo',
        promptImage: processedImageUrl,
        promptText: prompt,
        ratio: targetRatio,
        duration: 5, // Fixed duration for Gen-4 Turbo
      }

      const startTime = Date.now()
      const response = await fetch(`${this.baseUrl}/image_to_video`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Runway-Version': '2024-11-06'
        },
        body: JSON.stringify(apiRequest)
      })

      const apiCallDuration = Date.now() - startTime

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Runway API error: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const result = await response.json()
      const taskId = result.id

      console.log(`[${requestId}] Runway task created successfully:`, {
        taskId,
        apiCallDuration_ms: apiCallDuration,
        response: result
      })

      return {
        task_id: taskId,
        status: 'pending',
        progress: 0,
        estimated_time: this.getEstimatedTime(duration),
        runway_task: {
          id: taskId,
          status: 'PENDING',
          created_at: new Date().toISOString()
        }
      }

    } catch (error) {
      console.error(`[${requestId}] ERROR: Runway video generation failed:`, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        errorType: error?.constructor?.name || 'Unknown',
        timestamp: new Date().toISOString()
      })

      let errorMessage = 'Unknown error occurred'
      if (error instanceof Error) {
        errorMessage = error.message
        
        // Log specific error types for better debugging
        if (error.message.includes('rate limit')) {
          console.error(`[${requestId}] RATE LIMIT ERROR: Runway API rate limit exceeded`)
        } else if (error.message.includes('authentication') || error.message.includes('unauthorized')) {
          console.error(`[${requestId}] AUTH ERROR: Runway API authentication failed`)
        } else if (error.message.includes('network') || error.message.includes('timeout')) {
          console.error(`[${requestId}] NETWORK ERROR: Network issue with Runway API`)
        } else if (error.message.includes('image') || error.message.includes('format')) {
          console.error(`[${requestId}] IMAGE ERROR: Image processing or format issue`)
        }
      }

      console.error(`[${requestId}] Returning failed result:`, { errorMessage })

      return {
        task_id: '',
        status: 'failed',
        progress: 0,
        error_message: errorMessage
      }
    }
  }

  async getJobStatus(taskId: string): Promise<VideoGenerationResult> {
    const startTime = Date.now()
    
    try {
      console.log(`[STATUS] Checking Runway task status:`, { taskId, timestamp: new Date().toISOString() })
      
      const response = await fetch(`${this.baseUrl}/tasks/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Runway-Version': '2024-11-06'
        }
      })

      const apiCallDuration = Date.now() - startTime

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Runway API error: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const task = await response.json()
      
      console.log(`[STATUS] Runway API response received:`, {
        taskId,
        status: task.status,
        progress: task.progress,
        apiCallDuration_ms: apiCallDuration,
        hasOutput: !!task.output,
        outputLength: task.output?.length || 0,
        hasFailure: !!task.failure
      })
      
      const runwayStatus: RunwayJobStatus = {
        id: task.id,
        status: task.status,
        progress: task.progress,
        failure_code: undefined,
        failure_reason: typeof task.failure === 'string' ? task.failure : undefined,
        output: task.output,
        created_at: new Date().toISOString(),
        started_at: undefined,
        ended_at: undefined
      }

      // Map Runway status to our internal status
      const status = this.mapRunwayStatus(task.status)
      const progress = this.calculateProgress(runwayStatus)
      const estimatedTime = this.getEstimatedTimeRemaining(runwayStatus)

      let videoUrl: string | undefined
      if (task.status === 'SUCCEEDED' && task.output && task.output.length > 0) {
        videoUrl = task.output[0]
        console.log(`[STATUS] Generation completed successfully:`, {
          taskId,
          videoUrl: videoUrl ? videoUrl.substring(0, 100) + '...' : 'undefined',
          videoUrlLength: videoUrl ? videoUrl.length : 0
        })
      }

      let errorMessage: string | undefined
      if (task.status === 'FAILED') {
        errorMessage = typeof task.failure === 'string' ? task.failure : 'Video generation failed'
        console.error(`[STATUS] Generation failed:`, {
          taskId,
          errorMessage,
          failure: task.failure
        })
      }

      return {
        task_id: taskId,
        status,
        progress,
        video_url: videoUrl,
        error_message: errorMessage,
        estimated_time: estimatedTime,
        runway_task: runwayStatus
      }

    } catch (error) {
      const apiCallDuration = Date.now() - startTime
      
      console.error(`[STATUS] ERROR: Failed to get Runway job status:`, {
        taskId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        apiCallDuration_ms: apiCallDuration,
        timestamp: new Date().toISOString()
      })
      
      return {
        task_id: taskId,
        status: 'failed',
        progress: 0,
        error_message: error instanceof Error ? error.message : 'Failed to get job status'
      }
    }
  }

  private async fetchImageBuffer(imageUrl: string): Promise<Uint8Array> {
    try {
      const response = await fetch(imageUrl)
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`)
      }
      
      const arrayBuffer = await response.arrayBuffer()
      return new Uint8Array(arrayBuffer)
    } catch (error) {
      throw new Error(`Failed to download image: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async uploadProcessedImage(imageBuffer: Uint8Array): Promise<string> {
    // Convert to base64 data URI using a different approach for Deno
    let binary = ''
    for (let i = 0; i < imageBuffer.length; i++) {
      binary += String.fromCharCode(imageBuffer[i])
    }
    const base64 = btoa(binary)
    return `data:image/jpeg;base64,${base64}`
  }

  private mapRunwayStatus(runwayStatus: string): VideoGenerationResult['status'] {
    switch (runwayStatus) {
      case 'PENDING':
        return 'pending'
      case 'RUNNING':
        return 'processing'
      case 'SUCCEEDED':
        return 'completed'
      case 'FAILED':
        return 'failed'
      default:
        return 'pending'
    }
  }

  private calculateProgress(task: RunwayJobStatus): number {
    if (task.status === 'SUCCEEDED') return 100
    if (task.status === 'FAILED') return 0
    
    // Use task progress if available
    if (task.progress !== undefined) {
      return Math.round(task.progress * 100)
    }
    
    // Fallback to time-based estimation
    if (task.started_at) {
      const startTime = new Date(task.started_at).getTime()
      const currentTime = Date.now()
      const elapsed = currentTime - startTime
      
      // Estimate based on typical Gen-4 Turbo processing time (2-3 minutes)
      const estimatedTotal = 180000 // 3 minutes
      const progress = Math.min(90, (elapsed / estimatedTotal) * 100)
      
      return Math.round(progress)
    }
    
    return task.status === 'RUNNING' ? 10 : 5
  }

  private getEstimatedTime(duration: number): number {
    // Gen-4 Turbo typical processing times (in seconds)
    // Based on observed patterns: ~30-60 seconds per second of video
    return duration * 45 // Conservative estimate
  }

  private getEstimatedTimeRemaining(task: RunwayJobStatus): number | undefined {
    if (task.status === 'SUCCEEDED' || task.status === 'FAILED') {
      return 0
    }
    
    if (!task.started_at) {
      return this.getEstimatedTime(5) // Default 5-second video
    }
    
    const startTime = new Date(task.started_at).getTime()
    const currentTime = Date.now()
    const elapsed = (currentTime - startTime) / 1000 // Convert to seconds
    
    const estimatedTotal = this.getEstimatedTime(5)
    const remaining = Math.max(0, estimatedTotal - elapsed)
    
    return Math.round(remaining)
  }
}

// Factory function to create RunwayService instance
export function createRunwayService(): RunwayService {
  return new RunwayService()
}

export type { VideoGenerationResult, GenerateVideoParams, RunwayJobStatus } 