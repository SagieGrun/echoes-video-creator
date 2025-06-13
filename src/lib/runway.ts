import RunwayML from '@runwayml/sdk'
import { processImageForRunway, findBestRatio, SUPPORTED_RATIOS, type SupportedRatio } from './image-processor'

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

class RunwayService {
  private client: RunwayML
  private readonly maxPollingAttempts = 60 // 10 minutes with 10s intervals
  private readonly pollingInterval = 10000 // 10 seconds (recommended by docs)

  constructor() {
    if (!process.env.RUNWAY_API_SECRET) {
      throw new Error('RUNWAY_API_SECRET environment variable is required')
    }

    this.client = new RunwayML({
      apiKey: process.env.RUNWAY_API_SECRET
    })
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

      // Step 2: Process image for Runway
      console.log(`[${requestId}] Step 2: Processing image for Runway compatibility`)
      const processedImage = await processImageForRunway(imageBuffer)
      
      console.log(`[${requestId}] Image processed successfully:`, {
        targetRatio: processedImage.targetRatio,
        cropped: processedImage.cropped,
        originalSize: (imageBuffer.length / 1024 / 1024).toFixed(2) + 'MB',
        processedSize: (processedImage.buffer.length / 1024 / 1024).toFixed(2) + 'MB',
        originalDimensions: `${processedImage.metadata.width}x${processedImage.metadata.height}`,
        aspectRatio: processedImage.metadata.aspectRatio.toFixed(3)
      })

      // Step 3: Upload processed image
      console.log(`[${requestId}] Step 3: Converting image to data URI`)
      const processedImageUrl = await this.uploadProcessedImage(processedImage.buffer)
      console.log(`[${requestId}] Image converted to data URI:`, {
        dataUri_length: processedImageUrl.length,
        dataUri_prefix: processedImageUrl.substring(0, 50) + '...'
      })

      // Step 4: Submit to Runway API
      console.log(`[${requestId}] Step 4: Submitting to Runway Gen-4 Turbo API`)
      const apiRequest = {
        model: 'gen4_turbo' as const,
        promptImage: processedImageUrl,
        promptText: prompt,
        ratio: processedImage.targetRatio as '1280:720' | '1584:672' | '1104:832' | '720:1280' | '832:1104' | '960:960',
        duration: 5 as const, // Fixed duration for Gen-4 Turbo
      }
      
      console.log(`[${requestId}] API Request parameters:`, {
        model: apiRequest.model,
        promptText: apiRequest.promptText.substring(0, 100) + (apiRequest.promptText.length > 100 ? '...' : ''),
        ratio: apiRequest.ratio,
        duration: apiRequest.duration,
        promptImage_size: apiRequest.promptImage.length
      })

      const startTime = Date.now()
      const imageToVideo = await this.client.imageToVideo.create(apiRequest)
      const apiCallDuration = Date.now() - startTime

      const taskId = imageToVideo.id
      console.log(`[${requestId}] Runway task created successfully:`, {
        taskId,
        apiCallDuration_ms: apiCallDuration,
        response: imageToVideo
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
      
      // Use official SDK to retrieve task status
      const task = await this.client.tasks.retrieve(taskId)
      const apiCallDuration = Date.now() - startTime
      
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
        status: task.status as RunwayJobStatus['status'],
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
          videoUrl: videoUrl.substring(0, 100) + '...',
          videoUrlLength: videoUrl.length
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

  async pollUntilComplete(taskId: string): Promise<VideoGenerationResult> {
    let attempts = 0
    
    while (attempts < this.maxPollingAttempts) {
      const result = await this.getJobStatus(taskId)
      
      if (result.status === 'completed' || result.status === 'failed') {
        return result
      }
      
      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, this.pollingInterval))
      attempts++
    }
    
    return {
      task_id: taskId,
      status: 'failed',
      progress: 0,
      error_message: 'Generation timed out after maximum polling attempts'
    }
  }

  private async fetchImageBuffer(imageUrl: string): Promise<Buffer> {
    try {
      const response = await fetch(imageUrl)
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`)
      }
      
      const arrayBuffer = await response.arrayBuffer()
      return Buffer.from(arrayBuffer)
    } catch (error) {
      throw new Error(`Failed to download image: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async uploadProcessedImage(imageBuffer: Buffer): Promise<string> {
    // For now, we'll use data URI since it's simpler
    // In production, you might want to upload to your own storage
    const base64 = imageBuffer.toString('base64')
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

// Singleton instance
let runwayServiceInstance: RunwayService | null = null

export function getRunwayService(): RunwayService {
  if (!runwayServiceInstance) {
    runwayServiceInstance = new RunwayService()
  }
  return runwayServiceInstance
}

export default getRunwayService 