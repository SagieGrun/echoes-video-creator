// Corrected Runway service following official API documentation
// Based on: https://docs.dev.runwayml.com/guides/using-the-api/
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

interface RunwayTask {
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
}

class RunwayService {
  private readonly apiKey: string
  // ✅ CORRECT API ENDPOINT from docs
  private readonly baseUrl = 'https://api.dev.runwayml.com/v1'
  // ✅ CORRECT API VERSION from docs
  private readonly apiVersion = '2024-11-06'

  constructor() {
    // ✅ CORRECT environment variable name from docs
    const apiKey = Deno.env.get('RUNWAYML_API_SECRET')
    if (!apiKey) {
      throw new Error('RUNWAYML_API_SECRET environment variable is required')
    }
    this.apiKey = apiKey
  }

  async generateVideo({ image_url, prompt, duration = 5 }: GenerateVideoParams): Promise<VideoGenerationResult> {
    const requestId = Math.random().toString(36).substring(2, 15)
    
    try {
      console.log(`[${requestId}] Starting Runway Gen-4 Turbo generation`)

      // ✅ CORRECT: Use exact API format from documentation
      const requestBody = {
        model: 'gen4_turbo',
        promptImage: image_url, // Direct URL - no processing needed
        promptText: prompt,
        ratio: '1280:720', // Default to 16:9 landscape
        duration: 5 // Gen-4 Turbo supports 5s or 10s
      }

      console.log(`[${requestId}] API Request:`, {
        url: `${this.baseUrl}/image_to_video`,
        body: requestBody,
        headers: {
          'Authorization': 'Bearer [REDACTED]',
          'X-Runway-Version': this.apiVersion
        }
      })

      const response = await fetch(`${this.baseUrl}/image_to_video`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // ✅ CORRECT: Authorization header format from docs
          'Authorization': `Bearer ${this.apiKey}`,
          // ✅ CORRECT: Version header from docs  
          'X-Runway-Version': this.apiVersion
        },
        body: JSON.stringify(requestBody)
      })

      console.log(`[${requestId}] Response status:`, response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[${requestId}] API Error:`, {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        })
        throw new Error(`Runway API error: ${response.status} - ${errorText}`)
      }

      const result = await response.json()
      console.log(`[${requestId}] Task created:`, result)

      return {
        task_id: result.id,
        status: 'pending',
        progress: 0,
        estimated_time: 120 // 2 minutes estimate
      }

    } catch (error) {
      console.error(`[${requestId}] Generation failed:`, error)
      return {
        task_id: '',
        status: 'failed',
        progress: 0,
        error_message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async getJobStatus(taskId: string): Promise<VideoGenerationResult> {
    try {
      console.log(`[STATUS] Checking task: ${taskId}`)

      // ✅ CORRECT: Task status endpoint from docs
      const response = await fetch(`${this.baseUrl}/tasks/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Runway-Version': this.apiVersion
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[STATUS] API Error:`, {
          status: response.status,
          body: errorText
        })
        throw new Error(`Status check failed: ${response.status} - ${errorText}`)
      }

      const task: RunwayTask = await response.json()
      console.log(`[STATUS] Task status:`, task)

      // ✅ CORRECT: Status mapping from docs
      const status = this.mapStatus(task.status)
      const progress = this.calculateProgress(task)
      
      let video_url: string | undefined
      if (task.status === 'SUCCEEDED' && task.output && task.output.length > 0) {
        video_url = task.output[0]
      }

      return {
        task_id: taskId,
        status,
        progress,
        video_url,
        error_message: task.failure_reason,
        estimated_time: this.getEstimatedTimeRemaining(task)
      }

    } catch (error) {
      console.error(`[STATUS] Status check failed:`, error)
      return {
        task_id: taskId,
        status: 'failed',
        progress: 0,
        error_message: error instanceof Error ? error.message : 'Status check failed'
      }
    }
  }

  // ✅ CORRECT: Map official Runway statuses
  private mapStatus(runwayStatus: string): VideoGenerationResult['status'] {
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

  private calculateProgress(task: RunwayTask): number {
    if (task.status === 'SUCCEEDED') return 100
    if (task.status === 'FAILED') return 0
    if (task.status === 'RUNNING') {
      // Estimate progress based on time elapsed
      if (task.started_at) {
        const startTime = new Date(task.started_at).getTime()
        const now = Date.now()
        const elapsed = (now - startTime) / 1000 // seconds
        
        // Gen-4 Turbo typically takes 60-120 seconds
        const estimatedTotal = 90 // seconds
        const progress = Math.min(90, (elapsed / estimatedTotal) * 100)
        return Math.round(progress)
      }
      return 20 // Default for running
    }
    return 0 // Pending
  }

  private getEstimatedTimeRemaining(task: RunwayTask): number {
    if (task.status === 'SUCCEEDED' || task.status === 'FAILED') return 0
    
    // Gen-4 Turbo typical generation time
    if (task.status === 'RUNNING' && task.started_at) {
      const startTime = new Date(task.started_at).getTime()
      const elapsed = (Date.now() - startTime) / 1000
      const remaining = Math.max(0, 90 - elapsed) // 90 seconds typical
      return Math.round(remaining)
    }
    
    return 120 // Default estimate: 2 minutes
  }
}

export function createRunwayService(): RunwayService {
  return new RunwayService()
}

export type { VideoGenerationResult, GenerateVideoParams, RunwayTask } 